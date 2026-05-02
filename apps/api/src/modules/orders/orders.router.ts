import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { orders, orderItems, payments } from '../../db/schema/index.js';
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
