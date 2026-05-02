import { Router } from 'express';
import { z } from 'zod';
import { eq, desc, count, sum, sql, ilike, and, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users, orders, products, productVariants, categories } from '../../db/schema/index.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin', 'super_admin'));

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
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
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

adminRouter.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const body = updateOrderStatusSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);

    if (!order) throw new AppError(404, 'Order not found');

    const [updated] = await db
      .update(orders)
      .set({ status: body.data.status, updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ─── Products ────────────────────────────────────────────────────────────────

adminRouter.get('/products', async (req, res, next) => {
  try {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
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

const updateProductSchema = z.object({
  isPublished: z.boolean().optional(),
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
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

// ─── Users ───────────────────────────────────────────────────────────────────

adminRouter.get('/users', async (req, res, next) => {
  try {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
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
