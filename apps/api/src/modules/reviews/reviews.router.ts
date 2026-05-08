import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  reviews,
  products,
  users,
  orders,
  orderItems,
  productVariants,
} from '../../db/schema/index.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';

export const reviewsRouter = Router();

// ─── Public: list approved reviews for a product ──────────────────────────────
//   GET /api/v1/reviews/product/:productId
reviewsRouter.get('/product/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;

    const [items, [agg]] = await Promise.all([
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          title: reviews.title,
          body: reviews.body,
          createdAt: reviews.createdAt,
          authorName: users.name,
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.userId, users.id))
        .where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')))
        .orderBy(desc(reviews.createdAt)),
      db
        .select({
          total: count(),
          avg: sql<string>`COALESCE(AVG(${reviews.rating})::numeric(10,2), 0)`,
        })
        .from(reviews)
        .where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved'))),
    ]);

    res.json({
      data: items,
      meta: {
        total: Number(agg?.total ?? 0),
        average: Number(agg?.avg ?? 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Everything below requires auth ──────────────────────────────────────────
reviewsRouter.use(authenticate);

// GET /api/v1/reviews/eligibility/:productId
reviewsRouter.get('/eligibility/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user!.sub;

    const [purchase] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .where(
        and(
          eq(orders.userId, userId),
          eq(productVariants.productId, productId),
          eq(orders.paymentStatus, 'paid'),
        ),
      )
      .limit(1);

    const [existing] = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        status: reviews.status,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.userId, userId)))
      .limit(1);

    res.json({
      data: {
        purchased: !!purchase,
        existing: existing ?? null,
        canReview: !!purchase && !existing,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/reviews
const createSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(255).optional().or(z.literal('')),
  body: z.string().trim().max(4000).optional().or(z.literal('')),
});

reviewsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { productId, rating, title, body } = parsed.data;
    const userId = req.user!.sub;

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product) throw new AppError(404, 'Product not found');

    const [purchase] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .where(
        and(
          eq(orders.userId, userId),
          eq(productVariants.productId, productId),
          eq(orders.paymentStatus, 'paid'),
        ),
      )
      .limit(1);
    if (!purchase) throw new AppError(403, 'You can only review products you have purchased.');

    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.userId, userId)))
      .limit(1);
    if (existing) throw new AppError(409, 'You have already reviewed this product.');

    const [created] = await db
      .insert(reviews)
      .values({
        productId,
        userId,
        rating,
        title: title?.trim() || null,
        body: body?.trim() || null,
        status: 'pending',
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/reviews/:id
reviewsRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const [existing] = await db
      .select({ id: reviews.id, userId: reviews.userId })
      .from(reviews)
      .where(eq(reviews.id, req.params.id))
      .limit(1);

    if (!existing) throw new AppError(404, 'Review not found');
    if (existing.userId !== userId) throw new AppError(403, 'Cannot delete another user’s review');

    await db.delete(reviews).where(eq(reviews.id, req.params.id));
    res.json({ data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
});
