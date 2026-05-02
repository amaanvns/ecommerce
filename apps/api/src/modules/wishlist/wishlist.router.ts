import { Router } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  wishlists,
  wishlistItems,
  products,
  productImages,
  productVariants,
} from '../../db/schema/index.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';

export const wishlistRouter = Router();
wishlistRouter.use(authenticate);

async function getOrCreateWishlist(userId: string) {
  let [wl] = await db.select().from(wishlists).where(eq(wishlists.userId, userId)).limit(1);
  if (!wl) {
    [wl] = await db.insert(wishlists).values({ userId }).returning();
  }
  return wl;
}

// GET /api/v1/wishlist
wishlistRouter.get('/', async (req, res, next) => {
  try {
    const wl = await getOrCreateWishlist(req.user!.sub);

    const items = await db
      .select({
        id: wishlistItems.id,
        productId: wishlistItems.productId,
        createdAt: wishlistItems.createdAt,
        name: products.name,
        slug: products.slug,
        brand: products.brand,
      })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.wishlistId, wl.id))
      .orderBy(wishlistItems.createdAt);

    if (items.length === 0) {
      res.json({ data: [] });
      return;
    }

    const productIds = items.map((i) => i.productId);

    const [images, prices] = await Promise.all([
      db
        .select({
          productId: productImages.productId,
          url: productImages.url,
          alt: productImages.alt,
        })
        .from(productImages)
        .where(
          and(
            sql`${productImages.productId} = ANY(ARRAY[${sql.join(
              productIds.map((id) => sql`${id}::uuid`),
              sql`, `,
            )}])`,
            eq(productImages.sortOrder, 0),
          ),
        ),
      db
        .select({
          productId: productVariants.productId,
          minPrice: sql<string>`MIN(${productVariants.price}::numeric)`,
          minCompare: sql<string>`MIN(${productVariants.compareAtPrice}::numeric)`,
        })
        .from(productVariants)
        .where(
          sql`${productVariants.productId} = ANY(ARRAY[${sql.join(
            productIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}])`,
        )
        .groupBy(productVariants.productId),
    ]);

    const imageMap = new Map(images.map((i) => [i.productId, i]));
    const priceMap = new Map(prices.map((p) => [p.productId, p]));

    const data = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      slug: item.slug,
      brand: item.brand,
      image: imageMap.get(item.productId) ?? null,
      minPrice: priceMap.get(item.productId)?.minPrice ?? null,
      compareAtPrice: priceMap.get(item.productId)?.minCompare ?? null,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/wishlist — add product
const addSchema = z.object({ productId: z.string().uuid() });

wishlistRouter.post('/', async (req, res, next) => {
  try {
    const body = addSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }
    const { productId } = body.data;

    // Validate product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product) throw new AppError(404, 'Product not found');

    const wl = await getOrCreateWishlist(req.user!.sub);

    // Idempotent insert
    const [existing] = await db
      .select({ id: wishlistItems.id })
      .from(wishlistItems)
      .where(and(eq(wishlistItems.wishlistId, wl.id), eq(wishlistItems.productId, productId)))
      .limit(1);

    if (!existing) {
      await db.insert(wishlistItems).values({ wishlistId: wl.id, productId });
    }

    res.status(201).json({ data: { productId } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/wishlist/:productId — remove product
wishlistRouter.delete('/:productId', async (req, res, next) => {
  try {
    const wl = await getOrCreateWishlist(req.user!.sub);
    await db
      .delete(wishlistItems)
      .where(
        and(eq(wishlistItems.wishlistId, wl.id), eq(wishlistItems.productId, req.params.productId)),
      );
    res.json({ data: { productId: req.params.productId } });
  } catch (err) {
    next(err);
  }
});
