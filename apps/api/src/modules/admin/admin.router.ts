import { Router } from 'express';
import { z } from 'zod';
import { eq, desc, count, sum, sql, ilike, and, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  users,
  orders,
  orderItems,
  payments,
  products,
  productVariants,
  productImages,
  categories,
  reviews,
  coupons,
} from '../../db/schema/index.js';
import { gte, lte } from 'drizzle-orm';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';
import { sendOrderShipped } from '../../lib/email.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin', 'super_admin'));

/** Parse a pagination param defensively: NaN/negative/absurd values get clamped. */
function pageParams(query: Record<string, unknown>): { page: number; limit: number } {
  const rawPage = Number(query['page'] ?? 1);
  const rawLimit = Number(query['limit'] ?? 20);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 20;
  return { page, limit };
}

// ─── Stats ──────────────────────────────────────────────────────────────────

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [
      [{ totalOrders }],
      [{ totalRevenue }],
      [{ totalUsers }],
      [{ totalProducts }],
      recentOrders,
      ordersByStatus,
    ] = await Promise.all([
      db.select({ totalOrders: count() }).from(orders),
      db
        .select({ totalRevenue: sum(orders.total) })
        .from(orders)
        .where(eq(orders.paymentStatus, 'paid')),
      db.select({ totalUsers: count() }).from(users),
      db.select({ totalProducts: count() }).from(products).where(isNull(products.deletedAt)),
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          total: orders.total,
          placedAt: orders.placedAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.placedAt))
        .limit(5),
      db.select({ status: orders.status, count: count() }).from(orders).groupBy(orders.status),
    ]);

    res.json({
      data: {
        totalOrders: Number(totalOrders),
        totalRevenue: Number(totalRevenue ?? 0),
        totalUsers: Number(totalUsers),
        totalProducts: Number(totalProducts),
        recentOrders,
        ordersByStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Orders ─────────────────────────────────────────────────────────────────

adminRouter.get('/orders', async (req, res, next) => {
  try {
    const { page, limit } = pageParams(req.query);
    const status = req.query['status'] as string | undefined;
    const offset = (page - 1) * limit;

    const where = status ? [eq(orders.status, status as never)] : [];

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          total: orders.total,
          placedAt: orders.placedAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(and(...where))
        .orderBy(desc(orders.placedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(orders)
        .where(and(...where)),
    ]);

    res.json({
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    next(err);
  }
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']),
});

// Forward-only workflow; cancelled/delivered are terminal for the admin dropdown
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'shipped', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  return_requested: ['returned', 'cancelled'],
  returned: [],
};

adminRouter.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const body = updateOrderStatusSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);

    if (!order) throw new AppError(404, 'Order not found');

    const target = body.data.status;
    if (target === order.status) {
      res.json({ data: order });
      return;
    }
    if (!(ALLOWED_TRANSITIONS[order.status] ?? []).includes(target)) {
      throw new AppError(400, `Cannot move an order from "${order.status}" to "${target}"`);
    }

    // Cancelling restores stock (same as the customer cancel flow) and flips a
    // paid order to refunded so the books stay consistent
    if (target === 'cancelled') {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      await Promise.all(
        items
          .filter((i) => i.variantId)
          .map((i) =>
            db
              .update(productVariants)
              .set({ stockQty: sql`${productVariants.stockQty} + ${i.qty}` })
              .where(eq(productVariants.id, i.variantId!)),
          ),
      );
    }

    const [updated] = await db
      .update(orders)
      .set({
        status: target,
        paymentStatus:
          target === 'cancelled' && order.paymentStatus === 'paid'
            ? 'refunded'
            : order.paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
      .returning();

    if (target === 'shipped') {
      sendOrderShipped({ orderNumber: updated.orderNumber, contactEmail: updated.contactEmail });
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['pending', 'paid', 'refunded']),
});

// Mark an order's payment as collected/refunded — primarily for COD orders
adminRouter.patch('/orders/:id/payment-status', async (req, res, next) => {
  try {
    const body = updatePaymentStatusSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);

    if (!order) throw new AppError(404, 'Order not found');

    const [updated] = await db
      .update(orders)
      .set({ paymentStatus: body.data.paymentStatus, updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();

    // Keep the related payment row in sync (COD orders have a pending payment
    // record). Only pending attempts are flipped — settled/failed attempts from
    // earlier retries keep their real status.
    await db
      .update(payments)
      .set({ status: body.data.paymentStatus })
      .where(and(eq(payments.orderId, order.id), eq(payments.status, 'pending')));

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ─── Products ────────────────────────────────────────────────────────────────

adminRouter.get('/products', async (req, res, next) => {
  try {
    const { page, limit } = pageParams(req.query);
    const q = req.query['q'] as string | undefined;
    const offset = (page - 1) * limit;

    const where = [isNull(products.deletedAt)];
    if (q) where.push(ilike(products.name, `%${q}%`));

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          brand: products.brand,
          isPublished: products.isPublished,
          createdAt: products.createdAt,
          categoryName: categories.name,
          totalStock: sql<number>`COALESCE(SUM(${productVariants.stockQty}), 0)`,
          variantCount: sql<number>`COUNT(${productVariants.id})`,
          minPrice: sql<string>`MIN(${productVariants.price}::numeric)`,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(productVariants, eq(productVariants.productId, products.id))
        .where(and(...where))
        .groupBy(products.id, categories.name)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(products)
        .where(and(...where)),
    ]);

    res.json({
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    next(err);
  }
});

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, hyphens only'),
  brand: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isPublished: z.boolean().default(false),
  codAvailable: z.boolean().optional(),
});

adminRouter.post('/products', async (req, res, next) => {
  try {
    const body = createProductSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const [created] = await db.insert(products).values(body.data).returning();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/products/:id', async (req, res, next) => {
  try {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, req.params.id), isNull(products.deletedAt)))
      .limit(1);

    if (!product) throw new AppError(404, 'Product not found');

    const [variants, images] = await Promise.all([
      db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
        .orderBy(productVariants.createdAt),
      db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(productImages.sortOrder),
    ]);

    res.json({ data: { ...product, variants, images } });
  } catch (err) {
    next(err);
  }
});

const updateProductSchema = z.object({
  isPublished: z.boolean().optional(),
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  codAvailable: z.boolean().optional(),
});

adminRouter.patch('/products/:id', async (req, res, next) => {
  try {
    const body = updateProductSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, req.params.id), isNull(products.deletedAt)))
      .limit(1);

    if (!product) throw new AppError(404, 'Product not found');

    const [updated] = await db
      .update(products)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(products.id, product.id))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/products/:id', async (req, res, next) => {
  try {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, req.params.id), isNull(products.deletedAt)))
      .limit(1);

    if (!product) throw new AppError(404, 'Product not found');

    await db
      .update(products)
      .set({ deletedAt: new Date(), isPublished: false })
      .where(eq(products.id, product.id));

    res.json({ data: { id: product.id } });
  } catch (err) {
    next(err);
  }
});

// ─── Product Variants ────────────────────────────────────────────────────────

const variantSchema = z.object({
  sku: z.string().min(1),
  attributes: z.record(z.string()).default({}),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price'),
  compareAtPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .nullable()
    .optional(),
  stockQty: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
});

adminRouter.post('/products/:id/variants', async (req, res, next) => {
  try {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, req.params.id), isNull(products.deletedAt)))
      .limit(1);

    if (!product) throw new AppError(404, 'Product not found');

    const body = variantSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const [created] = await db
      .insert(productVariants)
      .values({ ...body.data, productId: product.id })
      .returning();

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/products/:id/variants/:variantId', async (req, res, next) => {
  try {
    const body = variantSchema.partial().safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const [variant] = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, req.params.variantId),
          eq(productVariants.productId, req.params.id),
        ),
      )
      .limit(1);

    if (!variant) throw new AppError(404, 'Variant not found');

    const [updated] = await db
      .update(productVariants)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(productVariants.id, variant.id))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/products/:id/variants/:variantId', async (req, res, next) => {
  try {
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, req.params.variantId),
          eq(productVariants.productId, req.params.id),
        ),
      )
      .limit(1);

    if (!variant) throw new AppError(404, 'Variant not found');

    await db.delete(productVariants).where(eq(productVariants.id, variant.id));

    res.json({ data: { id: variant.id } });
  } catch (err) {
    next(err);
  }
});

// ─── Product images ─────────────────────────────────────────────────────────

const imageBodySchema = z.object({
  url: z.string().url().max(2048),
  alt: z.string().max(255).optional().or(z.literal('')),
});

adminRouter.post('/products/:id/images', async (req, res, next) => {
  try {
    const parsed = imageBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, req.params.id), isNull(products.deletedAt)))
      .limit(1);
    if (!product) throw new AppError(404, 'Product not found');

    // Append to end: sortOrder = (max + 1)
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${productImages.sortOrder}), -1)` })
      .from(productImages)
      .where(eq(productImages.productId, product.id));

    const [created] = await db
      .insert(productImages)
      .values({
        productId: product.id,
        url: parsed.data.url,
        alt: parsed.data.alt?.trim() || null,
        sortOrder: Number(maxOrder) + 1,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

const updateImageSchema = z.object({
  alt: z.string().max(255).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

adminRouter.patch('/products/:id/images/:imageId', async (req, res, next) => {
  try {
    const parsed = updateImageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const [image] = await db
      .select()
      .from(productImages)
      .where(
        and(eq(productImages.id, req.params.imageId), eq(productImages.productId, req.params.id)),
      )
      .limit(1);
    if (!image) throw new AppError(404, 'Image not found');

    const [updated] = await db
      .update(productImages)
      .set({
        ...(parsed.data.alt !== undefined ? { alt: parsed.data.alt?.trim() || null } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      })
      .where(eq(productImages.id, image.id))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

const reorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});

// Reorder all images at once. Body: { order: [imageId, imageId, ...] }
adminRouter.post('/products/:id/images/reorder', async (req, res, next) => {
  try {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    await Promise.all(
      parsed.data.order.map((id, index) =>
        db
          .update(productImages)
          .set({ sortOrder: index })
          .where(and(eq(productImages.id, id), eq(productImages.productId, req.params.id))),
      ),
    );

    const rows = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, req.params.id))
      .orderBy(productImages.sortOrder);

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/products/:id/images/:imageId', async (req, res, next) => {
  try {
    const [image] = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(
        and(eq(productImages.id, req.params.imageId), eq(productImages.productId, req.params.id)),
      )
      .limit(1);
    if (!image) throw new AppError(404, 'Image not found');

    await db.delete(productImages).where(eq(productImages.id, image.id));
    res.json({ data: { id: image.id } });
  } catch (err) {
    next(err);
  }
});

// ─── Users ───────────────────────────────────────────────────────────────────

adminRouter.get('/users', async (req, res, next) => {
  try {
    const { page, limit } = pageParams(req.query);
    const q = req.query['q'] as string | undefined;
    const offset = (page - 1) * limit;

    const where = q
      ? [sql`(${ilike(users.name, `%${q}%`)} OR ${ilike(users.email, `%${q}%`)})`]
      : [];

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isBlocked: users.isBlocked,
          createdAt: users.createdAt,
          orderCount: sql<number>`(SELECT COUNT(*) FROM ${orders} WHERE ${orders.userId} = ${users.id})`,
        })
        .from(users)
        .where(and(...where))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(users)
        .where(and(...where)),
    ]);

    res.json({
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id/block', async (req, res, next) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);

    if (!user) throw new AppError(404, 'User not found');

    const [updated] = await db
      .update(users)
      .set({ isBlocked: !user.isBlocked })
      .where(eq(users.id, user.id))
      .returning();

    res.json({ data: { id: updated.id, isBlocked: updated.isBlocked } });
  } catch (err) {
    next(err);
  }
});

// ─── Reviews moderation ─────────────────────────────────────────────────────

adminRouter.get('/reviews', async (req, res, next) => {
  try {
    const { page, limit } = pageParams(req.query);
    const status = req.query['status'] as string | undefined;
    const offset = (page - 1) * limit;

    const where = status ? [eq(reviews.status, status as never)] : [];

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          title: reviews.title,
          body: reviews.body,
          status: reviews.status,
          createdAt: reviews.createdAt,
          productId: reviews.productId,
          productName: products.name,
          productSlug: products.slug,
          authorName: users.name,
          authorEmail: users.email,
        })
        .from(reviews)
        .innerJoin(products, eq(reviews.productId, products.id))
        .innerJoin(users, eq(reviews.userId, users.id))
        .where(and(...where))
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(reviews)
        .where(and(...where)),
    ]);

    res.json({
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    next(err);
  }
});

const moderateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
});

adminRouter.patch('/reviews/:id', async (req, res, next) => {
  try {
    const body = moderateSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.id, req.params.id))
      .limit(1);
    if (!existing) throw new AppError(404, 'Review not found');

    const [updated] = await db
      .update(reviews)
      .set({ status: body.data.status, updatedAt: new Date() })
      .where(eq(reviews.id, existing.id))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/reviews/:id', async (req, res, next) => {
  try {
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.id, req.params.id))
      .limit(1);
    if (!existing) throw new AppError(404, 'Review not found');

    await db.delete(reviews).where(eq(reviews.id, existing.id));
    res.json({ data: { id: existing.id } });
  } catch (err) {
    next(err);
  }
});

// ─── Coupons ─────────────────────────────────────────────────────────────────

adminRouter.get('/coupons', async (req, res, next) => {
  try {
    const { page, limit } = pageParams(req.query);
    const offset = (page - 1) * limit;

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(coupons),
    ]);

    res.json({
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    next(err);
  }
});

const couponBodySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, dashes or underscores only'),
  type: z.enum(['percent', 'fixed']),
  value: z.number().positive(),
  minSubtotal: z.number().nonnegative().optional().nullable(),
  // (percent coupons are additionally capped at 100 below)
  maxDiscount: z.number().nonnegative().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  firstOrderOnly: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

adminRouter.post('/coupons', async (req, res, next) => {
  try {
    const parsed = couponBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const data = parsed.data;

    if (data.type === 'percent' && data.value > 100) {
      throw new AppError(400, 'Percent discount cannot exceed 100');
    }

    const code = data.code.toUpperCase();
    const [existing] = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);
    if (existing) throw new AppError(409, 'A coupon with this code already exists.');

    const [created] = await db
      .insert(coupons)
      .values({
        code,
        type: data.type,
        value: data.value.toFixed(2),
        minSubtotal: data.minSubtotal != null ? data.minSubtotal.toFixed(2) : null,
        maxDiscount: data.maxDiscount != null ? data.maxDiscount.toFixed(2) : null,
        usageLimit: data.usageLimit ?? null,
        firstOrderOnly: data.firstOrderOnly ?? false,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive ?? true,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/coupons/:id', async (req, res, next) => {
  try {
    const parsed = couponBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const data = parsed.data;

    const [existing] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, req.params.id))
      .limit(1);
    if (!existing) throw new AppError(404, 'Coupon not found');

    const effType = data.type ?? existing.type;
    const effValue = data.value ?? Number(existing.value);
    if (effType === 'percent' && effValue > 100) {
      throw new AppError(400, 'Percent discount cannot exceed 100');
    }

    // If code is changing, check for collision
    if (data.code && data.code.toUpperCase() !== existing.code) {
      const newCode = data.code.toUpperCase();
      const [collision] = await db
        .select({ id: coupons.id })
        .from(coupons)
        .where(eq(coupons.code, newCode))
        .limit(1);
      if (collision) throw new AppError(409, 'A coupon with this code already exists.');
    }

    const updates: Record<string, unknown> = {};
    if (data.code !== undefined) updates['code'] = data.code.toUpperCase();
    if (data.type !== undefined) updates['type'] = data.type;
    if (data.value !== undefined) updates['value'] = data.value.toFixed(2);
    if (data.minSubtotal !== undefined)
      updates['minSubtotal'] = data.minSubtotal != null ? data.minSubtotal.toFixed(2) : null;
    if (data.maxDiscount !== undefined)
      updates['maxDiscount'] = data.maxDiscount != null ? data.maxDiscount.toFixed(2) : null;
    if (data.usageLimit !== undefined) updates['usageLimit'] = data.usageLimit;
    if (data.firstOrderOnly !== undefined) updates['firstOrderOnly'] = data.firstOrderOnly;
    if (data.startsAt !== undefined)
      updates['startsAt'] = data.startsAt ? new Date(data.startsAt) : null;
    if (data.endsAt !== undefined) updates['endsAt'] = data.endsAt ? new Date(data.endsAt) : null;
    if (data.isActive !== undefined) updates['isActive'] = data.isActive;

    const [updated] = await db
      .update(coupons)
      .set(updates)
      .where(eq(coupons.id, existing.id))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/coupons/:id', async (req, res, next) => {
  try {
    const [existing] = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.id, req.params.id))
      .limit(1);
    if (!existing) throw new AppError(404, 'Coupon not found');

    await db.delete(coupons).where(eq(coupons.id, existing.id));
    res.json({ data: { id: existing.id } });
  } catch (err) {
    next(err);
  }
});

// ─── Analytics ───────────────────────────────────────────────────────────────

// GET /admin/analytics/sales-trend?days=30
// Returns daily revenue + order count for paid orders in the window.
adminRouter.get('/analytics/sales-trend', async (req, res, next) => {
  try {
    const rawDays = Number(req.query['days'] ?? 30);
    const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 7), 365) : 30;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const rows = await db
      .select({
        date: sql<string>`TO_CHAR(${orders.placedAt}::date, 'YYYY-MM-DD')`,
        revenue: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)`,
        orderCount: count(),
      })
      .from(orders)
      .where(and(eq(orders.paymentStatus, 'paid'), gte(orders.placedAt, since)))
      .groupBy(sql`${orders.placedAt}::date`)
      .orderBy(sql`${orders.placedAt}::date`);

    const map = new Map(rows.map((r) => [r.date, r]));

    // Fill gaps so the chart has a continuous series
    const series: { date: string; revenue: number; orderCount: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const found = map.get(key);
      series.push({
        date: key,
        revenue: found ? Number(found.revenue) : 0,
        orderCount: found ? Number(found.orderCount) : 0,
      });
    }

    res.json({ data: series });
  } catch (err) {
    next(err);
  }
});

// GET /admin/analytics/top-products?limit=10
adminRouter.get('/analytics/top-products', async (req, res, next) => {
  try {
    const rawLimit = Number(req.query['limit'] ?? 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10;

    const rows = await db
      .select({
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        unitsSold: sql<string>`COALESCE(SUM(${orderItems.qty}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${orderItems.lineTotal}::numeric), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(orders.paymentStatus, 'paid'))
      .groupBy(products.id)
      .orderBy(sql`SUM(${orderItems.qty}) DESC`)
      .limit(limit);

    res.json({
      data: rows.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        productSlug: r.productSlug,
        unitsSold: Number(r.unitsSold),
        revenue: Number(r.revenue),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/analytics/sales-by-category
adminRouter.get('/analytics/sales-by-category', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        revenue: sql<string>`COALESCE(SUM(${orderItems.lineTotal}::numeric), 0)`,
        unitsSold: sql<string>`COALESCE(SUM(${orderItems.qty}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(orders.paymentStatus, 'paid'))
      .groupBy(categories.id)
      .orderBy(sql`SUM(${orderItems.lineTotal}::numeric) DESC`);

    res.json({
      data: rows.map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        revenue: Number(r.revenue),
        unitsSold: Number(r.unitsSold),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── CSV order export ───────────────────────────────────────────────────────
// GET /admin/exports/orders.csv?from=YYYY-MM-DD&to=YYYY-MM-DD&status=paid

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Neutralize spreadsheet formula injection: a leading = + - @ (or tab/CR) makes
  // Excel/Sheets execute the cell as a formula when the admin opens the export
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

adminRouter.get('/exports/orders.csv', async (req, res, next) => {
  try {
    const from = req.query['from'] as string | undefined;
    const to = req.query['to'] as string | undefined;
    const status = req.query['status'] as string | undefined;

    const where = [];
    if (from) where.push(gte(orders.placedAt, new Date(from)));
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      where.push(lte(orders.placedAt, toDate));
    }
    if (status === 'paid') where.push(eq(orders.paymentStatus, 'paid'));

    const rows = await db
      .select({
        orderNumber: orders.orderNumber,
        placedAt: orders.placedAt,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        subtotal: orders.subtotal,
        discount: orders.discount,
        total: orders.total,
        currency: orders.currency,
        userName: users.name,
        userEmail: users.email,
        shippingAddress: orders.shippingAddress,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(desc(orders.placedAt));

    const header = [
      'order_number',
      'placed_at',
      'status',
      'payment_status',
      'subtotal',
      'discount',
      'total',
      'currency',
      'customer_name',
      'customer_email',
      'shipping_city',
      'shipping_state',
      'shipping_postal_code',
    ];

    const lines = [header.join(',')];
    for (const r of rows) {
      const addr = (r.shippingAddress as Record<string, string>) ?? {};
      lines.push(
        [
          csvEscape(r.orderNumber),
          csvEscape(r.placedAt.toISOString()),
          csvEscape(r.status),
          csvEscape(r.paymentStatus),
          csvEscape(r.subtotal),
          csvEscape(r.discount),
          csvEscape(r.total),
          csvEscape(r.currency),
          csvEscape(r.userName),
          csvEscape(r.userEmail),
          csvEscape(addr['city']),
          csvEscape(addr['state']),
          csvEscape(addr['postalCode']),
        ].join(','),
      );
    }

    const csv = lines.join('\n');
    const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
