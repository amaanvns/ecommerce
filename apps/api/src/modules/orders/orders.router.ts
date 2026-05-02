import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { orders, orderItems, payments, productVariants } from '../../db/schema/index.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';

export const ordersRouter = Router();
ordersRouter.use(authenticate);

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
