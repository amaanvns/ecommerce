import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  carts,
  cartItems,
  productVariants,
  products,
  orders,
  orderItems,
  payments,
} from '../../db/schema/index.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';
import { env } from '../../config/env.js';

export const checkoutRouter = Router();
checkoutRouter.use(authenticate);

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
});

checkoutRouter.post('/create-order', async (req, res, next) => {
  try {
    const body = createOrderSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const userId = req.user!.sub;

    // Get user's cart
    const [cart] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);

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
    const total = subtotal; // No tax/shipping for now

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
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        shippingAddress: body.data.shippingAddress,
        notes: body.data.notes,
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

    const userId = req.user!.sub;

    // Fetch the order (must belong to this user)
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');
    if (order.paymentStatus === 'paid') {
      res.json({ data: { orderId: order.id, orderNumber: order.orderNumber } });
      return;
    }

    // Fetch order items to reduce stock
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    // Update stock, order status, create payment record — all in a transaction-like batch
    await Promise.all([
      // Mark order as confirmed + paid
      db
        .update(orders)
        .set({ status: 'confirmed', paymentStatus: 'paid', updatedAt: new Date() })
        .where(eq(orders.id, order.id)),

      // Record payment
      db.insert(payments).values({
        orderId: order.id,
        gateway: 'razorpay',
        gatewayRef: razorpayPaymentId,
        amount: order.total,
        currency: 'INR',
        status: 'paid',
        rawResponse: { razorpayOrderId, razorpayPaymentId, razorpaySignature },
      }),

      // Decrement stock for each variant
      ...items.map((item) =>
        item.variantId
          ? db
              .update(productVariants)
              .set({ stockQty: sql`${productVariants.stockQty} - ${item.qty}` })
              .where(eq(productVariants.id, item.variantId))
          : Promise.resolve(),
      ),
    ]);

    // Clear cart
    const [cart] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    if (cart) {
      await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    }

    res.json({ data: { orderId: order.id, orderNumber: order.orderNumber } });
  } catch (err) {
    next(err);
  }
});
