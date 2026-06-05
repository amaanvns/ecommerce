import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { cartItems, productVariants, products, orders, orderItems } from '../../db/schema/index.js';
import { optionalAuthenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';
import { env } from '../../config/env.js';
import { validateAndCalculate } from '../coupons/coupon-helpers.js';
import { fulfillOrder } from './checkout-helpers.js';
import { findCart } from '../cart/cart-helpers.js';

export const checkoutRouter = Router();
checkoutRouter.use(optionalAuthenticate);

const addressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2).default('IN'),
  phone: z.string().optional(),
});

/** Resolve the email to attach to an order: account email, or guest-supplied email. */
function resolveContactEmail(req: { user?: { email: string } }, guestEmail?: string): string {
  const email = req.user?.email ?? guestEmail;
  if (!email) throw new AppError(400, 'An email address is required to place your order');
  return email;
}

function getRazorpay() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, 'Payment gateway not configured');
  }
  return new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
}

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SZ-${ts}-${rand}`;
}

// POST /api/v1/checkout/create-order
const createOrderSchema = z.object({
  shippingAddress: addressSchema,
  notes: z.string().optional(),
  couponCode: z.string().trim().min(1).optional(),
  contactEmail: z.string().email().optional(), // required for guests (no account email)
});

checkoutRouter.post('/create-order', async (req, res, next) => {
  try {
    const body = createOrderSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const userId = req.user?.sub ?? null;
    const contactEmail = resolveContactEmail(req, body.data.contactEmail);

    // Resolve the active cart (user cart or guest cookie cart)
    const cart = await findCart(req);
    if (!cart) throw new AppError(400, 'Cart is empty');

    const cartRows = await db
      .select({
        id: cartItems.id,
        qty: cartItems.qty,
        priceSnapshot: cartItems.priceSnapshot,
        variantId: cartItems.variantId,
        sku: productVariants.sku,
        stockQty: productVariants.stockQty,
        productName: products.name,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(cartItems.cartId, cart.id));

    if (cartRows.length === 0) throw new AppError(400, 'Cart is empty');

    // Validate stock for each item
    for (const item of cartRows) {
      if (item.stockQty < item.qty) {
        throw new AppError(400, `Insufficient stock for "${item.productName}"`);
      }
    }

    const subtotal = cartRows.reduce((sum, i) => sum + i.qty * +i.priceSnapshot, 0);

    // Apply coupon if provided
    let couponId: string | null = null;
    let discount = 0;
    if (body.data.couponCode) {
      const resolved = await validateAndCalculate(body.data.couponCode, subtotal, userId);
      couponId = resolved.id;
      discount = resolved.discount;
    }

    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    const razorpay = getRazorpay();

    // Create Razorpay order (amount in paise)
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: generateOrderNumber(),
    });

    // Save pending order in DB
    const orderNumber = rzpOrder.receipt ?? generateOrderNumber();
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        userId,
        contactEmail,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        shippingAddress: body.data.shippingAddress,
        notes: body.data.notes,
        couponId,
        status: 'pending',
        paymentStatus: 'pending',
      })
      .returning();

    // Save order items
    await db.insert(orderItems).values(
      cartRows.map((i) => ({
        orderId: order.id,
        variantId: i.variantId,
        productNameSnapshot: i.productName,
        skuSnapshot: i.sku,
        qty: i.qty,
        unitPrice: i.priceSnapshot,
        lineTotal: (i.qty * +i.priceSnapshot).toFixed(2),
      })),
    );

    res.json({
      data: {
        orderId: order.id,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/checkout/verify-payment
const verifySchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

checkoutRouter.post('/verify-payment', async (req, res, next) => {
  try {
    const body = verifySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body.data;

    if (!env.RAZORPAY_KEY_SECRET) throw new AppError(503, 'Payment gateway not configured');

    // Verify HMAC-SHA256 signature
    const expectedSig = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSig !== razorpaySignature) {
      throw new AppError(400, 'Payment verification failed — invalid signature');
    }

    const userId = req.user?.sub ?? null;

    // Fetch the order — a logged-in user's own order, or a guest (userId IS NULL) order
    const [order] = await db
      .select()
      .from(orders)
      .where(
        userId
          ? and(eq(orders.id, orderId), eq(orders.userId, userId))
          : and(eq(orders.id, orderId), isNull(orders.userId)),
      )
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');
    if (order.paymentStatus === 'paid') {
      res.json({ data: { orderId: order.id, orderNumber: order.orderNumber } });
      return;
    }

    // Mark confirmed + paid, record payment, decrement stock, bump coupon usage
    await fulfillOrder(
      { id: order.id, total: order.total, currency: order.currency, couponId: order.couponId },
      {
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
        payment: {
          gateway: 'razorpay',
          gatewayRef: razorpayPaymentId,
          status: 'paid',
          rawResponse: { razorpayOrderId, razorpayPaymentId, razorpaySignature },
        },
      },
    );

    // Clear the cart that was checked out (user cart or guest cookie cart)
    const cart = await findCart(req);
    if (cart) {
      await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    }

    res.json({ data: { orderId: order.id, orderNumber: order.orderNumber } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/checkout/place-cod — place a Cash-on-Delivery order (no Razorpay)
checkoutRouter.post('/place-cod', async (req, res, next) => {
  try {
    const body = createOrderSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const userId = req.user?.sub ?? null;
    const contactEmail = resolveContactEmail(req, body.data.contactEmail);

    const cart = await findCart(req);
    if (!cart) throw new AppError(400, 'Cart is empty');

    const cartRows = await db
      .select({
        qty: cartItems.qty,
        priceSnapshot: cartItems.priceSnapshot,
        variantId: cartItems.variantId,
        sku: productVariants.sku,
        stockQty: productVariants.stockQty,
        productName: products.name,
        codAvailable: products.codAvailable,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(cartItems.cartId, cart.id));

    if (cartRows.length === 0) throw new AppError(400, 'Cart is empty');

    // Every item must be COD-eligible
    if (cartRows.some((i) => !i.codAvailable)) {
      throw new AppError(400, 'Some items in your bag are not available for Cash on Delivery');
    }

    // Validate stock for each item
    for (const item of cartRows) {
      if (item.stockQty < item.qty) {
        throw new AppError(400, `Insufficient stock for "${item.productName}"`);
      }
    }

    const subtotal = cartRows.reduce((sum, i) => sum + i.qty * +i.priceSnapshot, 0);

    // Apply coupon if provided
    let couponId: string | null = null;
    let discount = 0;
    if (body.data.couponCode) {
      const resolved = await validateAndCalculate(body.data.couponCode, subtotal, userId);
      couponId = resolved.id;
      discount = resolved.discount;
    }

    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    // Persist the order — confirmed immediately, payment pending until collected
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: generateOrderNumber(),
        userId,
        contactEmail,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        shippingAddress: body.data.shippingAddress,
        notes: body.data.notes,
        couponId,
        status: 'confirmed',
        paymentStatus: 'pending',
      })
      .returning();

    await db.insert(orderItems).values(
      cartRows.map((i) => ({
        orderId: order.id,
        variantId: i.variantId,
        productNameSnapshot: i.productName,
        skuSnapshot: i.sku,
        qty: i.qty,
        unitPrice: i.priceSnapshot,
        lineTotal: (i.qty * +i.priceSnapshot).toFixed(2),
      })),
    );

    // Decrement stock, record COD payment (pending), bump coupon usage
    await fulfillOrder(
      { id: order.id, total: order.total, currency: order.currency, couponId: order.couponId },
      {
        orderStatus: 'confirmed',
        paymentStatus: 'pending',
        payment: { gateway: 'cod', status: 'pending' },
      },
    );

    // Clear cart
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    res.json({ data: { orderId: order.id, orderNumber: order.orderNumber } });
  } catch (err) {
    next(err);
  }
});
