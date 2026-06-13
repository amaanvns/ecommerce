import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { rateLimit } from 'express-rate-limit';
import { eq, and, isNull, lt, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  carts,
  cartItems,
  productVariants,
  products,
  orders,
  orderItems,
} from '../../db/schema/index.js';
import { optionalAuthenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';
import { env } from '../../config/env.js';
import { validateAndCalculate } from '../coupons/coupon-helpers.js';
import { fulfillOrder, reserveStock } from './checkout-helpers.js';
import { findCart, CART_COOKIE } from '../cart/cart-helpers.js';
import { sendOrderConfirmation } from '../../lib/email.js';

export const checkoutRouter = Router();
checkoutRouter.use(optionalAuthenticate);

// COD has no payment barrier, so rate-limit it separately to slow down order spam
const codLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many orders placed. Please try again later.' },
}) as unknown as RequestHandler;

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
  return email.toLowerCase();
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

interface CheckoutCartRow {
  qty: number;
  priceSnapshot: string;
  variantId: string;
  sku: string;
  stockQty: number;
  productName: string;
  codAvailable: boolean;
  isPublished: boolean;
  deletedAt: Date | null;
}

/**
 * Load the cart's lines with everything checkout needs, and run the validations
 * shared by both payment paths: cart non-empty, every product still published
 * (not soft-deleted), and stock sufficient at read time.
 */
async function loadCheckoutCart(cartId: string): Promise<CheckoutCartRow[]> {
  const rows = await db
    .select({
      qty: cartItems.qty,
      priceSnapshot: cartItems.priceSnapshot,
      variantId: cartItems.variantId,
      sku: productVariants.sku,
      stockQty: productVariants.stockQty,
      productName: products.name,
      codAvailable: products.codAvailable,
      isPublished: products.isPublished,
      deletedAt: products.deletedAt,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(cartItems.cartId, cartId));

  if (rows.length === 0) throw new AppError(400, 'Cart is empty');

  const unavailable = rows.find((r) => !r.isPublished || r.deletedAt !== null);
  if (unavailable) {
    throw new AppError(
      400,
      `"${unavailable.productName}" is no longer available — please remove it from your bag`,
    );
  }

  for (const item of rows) {
    if (item.stockQty < item.qty) {
      throw new AppError(400, `Insufficient stock for "${item.productName}"`);
    }
  }

  return rows;
}

/**
 * Opportunistic cleanup: drop this purchaser's own stale Razorpay attempts
 * (still pending + unpaid after 45 min) so abandoned "Pay securely" clicks don't
 * pile up as orphan orders. Stock/coupons/payments are untouched for these rows.
 */
async function cleanupStalePendingOrders(userId: string | null, contactEmail: string) {
  const cutoff = new Date(Date.now() - 45 * 60 * 1000);
  await db
    .delete(orders)
    .where(
      and(
        eq(orders.status, 'pending'),
        eq(orders.paymentStatus, 'pending'),
        lt(orders.placedAt, cutoff),
        userId
          ? eq(orders.userId, userId)
          : and(isNull(orders.userId), sql`lower(${orders.contactEmail}) = ${contactEmail}`),
      ),
    );
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

    const cartRows = await loadCheckoutCart(cart.id);

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

    // Razorpay's minimum charge is ₹1 — a fully-discounted order can't go online
    if (total < 1) {
      throw new AppError(
        400,
        'Order total is too low for online payment — please use Cash on Delivery',
      );
    }

    await cleanupStalePendingOrders(userId, contactEmail);

    const razorpay = getRazorpay();

    // Create Razorpay order (amount in paise)
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: generateOrderNumber(),
    });

    // Save pending order in DB, keyed to the gateway order so verification can
    // prove the signature belongs to THIS order
    const orderNumber = rzpOrder.receipt ?? generateOrderNumber();
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        userId,
        contactEmail,
        gatewayOrderRef: rzpOrder.id,
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

    // Match the order by id AND the gateway order the signature belongs to.
    // This proves the payment was for THIS order (a signature for a cheap order
    // can't confirm a different one), and it keeps working even if the order was
    // claimed onto an account mid-payment.
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.gatewayOrderRef, razorpayOrderId)))
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
        decrementStock: true,
      },
    );

    // Clear the cart(s) this browser session checked out from. The user may have
    // logged in between create-order and verify, so clear both the guest cookie
    // cart and (when authenticated) the user cart.
    await clearCheckoutCarts(req);

    // Confirmation email (best-effort)
    const paidItems = await db
      .select({
        productNameSnapshot: orderItems.productNameSnapshot,
        qty: orderItems.qty,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    sendOrderConfirmation(
      {
        orderNumber: order.orderNumber,
        total: order.total,
        paymentStatus: 'paid',
        contactEmail: order.contactEmail,
        items: paidItems,
      },
      false,
    );

    res.json({ data: { orderId: order.id, orderNumber: order.orderNumber } });
  } catch (err) {
    next(err);
  }
});

async function clearCheckoutCarts(req: {
  user?: { sub: string };
  cookies?: Record<string, string>;
}): Promise<void> {
  const cartIds: string[] = [];

  const sessionId = req.cookies?.[CART_COOKIE];
  if (sessionId) {
    const [guestCart] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .limit(1);
    if (guestCart) cartIds.push(guestCart.id);
  }

  if (req.user) {
    const [userCart] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, req.user.sub))
      .limit(1);
    if (userCart) cartIds.push(userCart.id);
  }

  for (const id of cartIds) {
    await db.delete(cartItems).where(eq(cartItems.cartId, id));
  }
}

// POST /api/v1/checkout/place-cod — place a Cash-on-Delivery order (no Razorpay)
checkoutRouter.post('/place-cod', codLimiter, async (req, res, next) => {
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

    const cartRows = await loadCheckoutCart(cart.id);

    // Every item must be COD-eligible
    if (cartRows.some((i) => !i.codAvailable)) {
      throw new AppError(400, 'Some items in your bag are not available for Cash on Delivery');
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

    // Reserve stock atomically BEFORE taking the order — no payment is captured
    // for COD, so we can safely reject when a concurrent order beat us to it
    const reserved = await reserveStock(
      cartRows.map((i) => ({ variantId: i.variantId, qty: i.qty })),
    );
    if (!reserved.ok) {
      const failedItem = cartRows.find((i) => i.variantId === reserved.failed);
      throw new AppError(
        400,
        `Insufficient stock for "${failedItem?.productName ?? 'an item in your bag'}"`,
      );
    }

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

    // Record COD payment (pending) + bump coupon usage — stock already reserved
    await fulfillOrder(
      { id: order.id, total: order.total, currency: order.currency, couponId: order.couponId },
      {
        orderStatus: 'confirmed',
        paymentStatus: 'pending',
        payment: { gateway: 'cod', status: 'pending' },
        decrementStock: false,
      },
    );

    // Clear cart
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    // Confirmation email (best-effort)
    sendOrderConfirmation(
      {
        orderNumber: order.orderNumber,
        total: order.total,
        paymentStatus: order.paymentStatus,
        contactEmail: order.contactEmail,
        items: cartRows.map((i) => ({
          productNameSnapshot: i.productName,
          qty: i.qty,
          lineTotal: (i.qty * +i.priceSnapshot).toFixed(2),
        })),
      },
      true,
    );

    res.json({ data: { orderId: order.id, orderNumber: order.orderNumber } });
  } catch (err) {
    next(err);
  }
});
