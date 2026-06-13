import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { products, productImages, productVariants, categories } from '../../db/schema/index.js';
import { and, eq, ilike, asc, desc, count, sql, isNull } from 'drizzle-orm';

export const productsRouter = Router();

const listSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'name_asc']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
});

async function resolveCategoryId(slug: string | undefined): Promise<string | undefined> {
  if (!slug) return undefined;
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return cat?.id;
}

productsRouter.get('/', async (req, res, next) => {
  try {
    const query = listSchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.flatten() });
      return;
    }
    const { q, category, brand, color, size, minPrice, maxPrice, sort, page, limit } = query.data;

    const where = [eq(products.isPublished, true), isNull(products.deletedAt)];

    // Variant-attribute filters (Color / Size live in product_variants.attributes JSONB)
    if (color) {
      where.push(
        sql`EXISTS (SELECT 1 FROM ${productVariants} WHERE ${productVariants.productId} = ${products.id} AND lower(${productVariants.attributes}->>'Color') = lower(${color}))` as ReturnType<
          typeof eq
        >,
      );
    }
    if (size) {
      where.push(
        sql`EXISTS (SELECT 1 FROM ${productVariants} WHERE ${productVariants.productId} = ${products.id} AND lower(${productVariants.attributes}->>'Size') = lower(${size}))` as ReturnType<
          typeof eq
        >,
      );
    }

    // Full-text search against the weighted tsvector (name=A, brand=B, description=C).
    // websearch_to_tsquery accepts natural phrasing, quoted exact matches, and -word exclusions.
    if (q) {
      where.push(
        sql`search_vector @@ websearch_to_tsquery('english', ${q})` as ReturnType<typeof eq>,
      );
    }
    if (brand) where.push(ilike(products.brand, `%${brand}%`));

    // Filter by category slug — resolve to id first
    const categoryId = await resolveCategoryId(category);
    if (categoryId) where.push(eq(products.categoryId, categoryId));

    // Min/max price filters are applied via a subquery on variants
    const priceFilter =
      minPrice !== undefined || maxPrice !== undefined
        ? sql`EXISTS (
            SELECT 1 FROM ${productVariants}
            WHERE ${productVariants.productId} = ${products.id}
            ${minPrice !== undefined ? sql`AND ${productVariants.price}::numeric >= ${minPrice}` : sql``}
            ${maxPrice !== undefined ? sql`AND ${productVariants.price}::numeric <= ${maxPrice}` : sql``}
          )`
        : undefined;

    if (priceFilter) where.push(priceFilter as ReturnType<typeof eq>);

    const orderBy =
      sort === 'price_asc'
        ? asc(
            sql`(SELECT MIN(price::numeric) FROM ${productVariants} WHERE product_id = ${products.id})`,
          )
        : sort === 'price_desc'
          ? desc(
              sql`(SELECT MIN(price::numeric) FROM ${productVariants} WHERE product_id = ${products.id})`,
            )
          : sort === 'name_asc'
            ? asc(products.name)
            : desc(products.createdAt);

    const offset = (page - 1) * limit;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          brand: products.brand,
          categoryId: products.categoryId,
          codAvailable: products.codAvailable,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(and(...where))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(products)
        .where(and(...where)),
    ]);

    // Fetch primary image + min price for each product
    const ids = rows.map((r) => r.id);
    const [images, prices] = await Promise.all([
      ids.length
        ? db
            .select({
              productId: productImages.productId,
              url: productImages.url,
              alt: productImages.alt,
            })
            .from(productImages)
            .where(
              and(
                sql`${productImages.productId} = ANY(ARRAY[${sql.join(
                  ids.map((id) => sql`${id}::uuid`),
                  sql`, `,
                )}])`,
                eq(productImages.sortOrder, 0),
              ),
            )
        : [],
      ids.length
        ? db
            .select({
              productId: productVariants.productId,
              minPrice: sql<string>`MIN(${productVariants.price}::numeric)`,
              maxPrice: sql<string>`MAX(${productVariants.price}::numeric)`,
              minCompare: sql<string>`MIN(${productVariants.compareAtPrice}::numeric)`,
            })
            .from(productVariants)
            .where(
              sql`${productVariants.productId} = ANY(ARRAY[${sql.join(
                ids.map((id) => sql`${id}::uuid`),
                sql`, `,
              )}])`,
            )
            .groupBy(productVariants.productId)
        : [],
    ]);

    const imageMap = new Map(images.map((i) => [i.productId, i]));
    const priceMap = new Map(prices.map((p) => [p.productId, p]));

    const data = rows.map((r) => ({
      ...r,
      image: imageMap.get(r.id) ?? null,
      minPrice: priceMap.get(r.id)?.minPrice ?? null,
      maxPrice: priceMap.get(r.id)?.maxPrice ?? null,
      compareAtPrice: priceMap.get(r.id)?.minCompare ?? null,
    }));

    res.json({
      data,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/facets?category=… — distinct Color/Size values for filter chips.
// Registered before /:slug so "facets" isn't treated as a product slug.
productsRouter.get('/facets', async (req, res, next) => {
  try {
    const categoryId = await resolveCategoryId(req.query['category'] as string | undefined);
    const base = [eq(products.isPublished, true), isNull(products.deletedAt)];
    if (categoryId) base.push(eq(products.categoryId, categoryId));

    const distinctValues = async (key: 'Color' | 'Size') => {
      const rows = await db
        .selectDistinct({ v: sql<string>`${productVariants.attributes}->>${key}` })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(and(...base, sql`${productVariants.attributes}->>${key} IS NOT NULL`));
      return rows
        .map((r) => r.v)
        .filter((v): v is string => !!v && v !== 'One Size')
        .sort();
    };

    const [colors, sizes] = await Promise.all([distinctValues('Color'), distinctValues('Size')]);
    res.json({ data: { colors, sizes } });
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/:slug', async (req, res, next) => {
  try {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.slug, req.params.slug),
          eq(products.isPublished, true),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const [images, variants, [category]] = await Promise.all([
      db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(asc(productImages.sortOrder)),
      db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
        .orderBy(asc(productVariants.createdAt)),
      product.categoryId
        ? db
            .select({ id: categories.id, name: categories.name, slug: categories.slug })
            .from(categories)
            .where(eq(categories.id, product.categoryId))
            .limit(1)
        : [null],
    ]);

    res.json({ data: { ...product, images, variants, category: category ?? null } });
  } catch (err) {
    next(err);
  }
});
