import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { orders, orderItems, payments, productVariants } from '../../db/schema/index.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';

export const ordersRouter = Router();

// GET /api/v1/orders/guest/:id?email=… — public lookup gated by the checkout email.
// Defined BEFORE the authenticate guard so guests can view their confirmation.
// Deliberately NOT restricted to userId IS NULL: the email is the proof of access,
// and a guest must keep their tracking link working even after the order is later
// claimed onto an account.
const guestLookupSchema = z.object({ email: z.string().email() });

ordersRouter.get('/guest/:id', async (req, res, next) => {
  try {
    const query = guestLookupSchema.safeParse(req.query);
    if (!query.success) throw new AppError(400, 'A valid email is required');

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, req.params.id),
          sql`lower(${orders.contactEmail}) = lower(${query.data.email})`,
        ),
      )
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    res.json({ data: { ...order, items } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders/track?orderNumber=…&email=… — public "track order" for guests,
// who know their order number (not the internal id). Returns the order if the email
// matches. Order numbers are generated uppercase, so normalize the input.
const guestTrackSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.toUpperCase()),
  email: z.string().email(),
});

ordersRouter.get('/track', async (req, res, next) => {
  try {
    const query = guestTrackSchema.safeParse(req.query);
    if (!query.success) throw new AppError(400, 'Order number and a valid email are required');

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderNumber, query.data.orderNumber),
          sql`lower(${orders.contactEmail}) = lower(${query.data.email})`,
        ),
      )
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    res.json({ data: { ...order, items } });
  } catch (err) {
    next(err);
  }
});

ordersRouter.use(authenticate);

// POST /api/v1/orders/claim — link a past guest order to the current account.
// Proof of ownership = order number + the email it was placed under (works even
// when that email differs from the account email).
const claimSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.toUpperCase()),
  email: z.string().email(),
});

ordersRouter.post('/claim', async (req, res, next) => {
  try {
    const body = claimSchema.safeParse(req.body);
    if (!body.success) throw new AppError(400, 'Order number and a valid email are required');

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderNumber, body.data.orderNumber),
          isNull(orders.userId),
          sql`lower(${orders.contactEmail}) = lower(${body.data.email})`,
        ),
      )
      .limit(1);

    if (!order) {
      throw new AppError(404, 'No matching guest order found for that order number and email');
    }

    const [updated] = await db
      .update(orders)
      .set({ userId: req.user!.sub, updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders — list user's orders
ordersRouter.get('/', async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, req.user!.sub))
      .orderBy(desc(orders.placedAt));

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders/:id — order detail with items and payment
ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, req.params.id), eq(orders.userId, req.user!.sub)))
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');

    const [items, [payment]] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
      db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1),
    ]);

    res.json({ data: { ...order, items, payment: payment ?? null } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/orders/:id/cancel — cancel order if still pending/confirmed
ordersRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, req.params.id), eq(orders.userId, req.user!.sub)))
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');

    const cancellable = ['pending', 'confirmed'];
    if (!cancellable.includes(order.status)) {
      throw new AppError(400, `Cannot cancel an order with status "${order.status}"`);
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    await Promise.all([
      db
        .update(orders)
        .set({
          status: 'cancelled',
          paymentStatus: order.paymentStatus === 'paid' ? 'refunded' : order.paymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id)),

      // Restore stock for each variant
      ...items
        .filter((i) => i.variantId)
        .map((i) =>
          db
            .update(productVariants)
            .set({ stockQty: sql`${productVariants.stockQty} + ${i.qty}` })
            .where(eq(productVariants.id, i.variantId!)),
        ),
    ]);

    const [updated] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/orders/:id/return-request — request a return on a delivered order
// within the return window (7 days of being marked delivered).
ordersRouter.post('/:id/return-request', async (req, res, next) => {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, req.params.id), eq(orders.userId, req.user!.sub)))
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');
    if (order.status !== 'delivered') {
      throw new AppError(400, 'Only delivered orders can be returned');
    }
    const windowMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(order.updatedAt).getTime() > windowMs) {
      throw new AppError(400, 'The 7-day return window for this order has passed');
    }

    const [updated] = await db
      .update(orders)
      .set({ status: 'return_requested', updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
