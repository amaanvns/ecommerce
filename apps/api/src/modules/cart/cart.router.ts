import { Router } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  carts,
  cartItems,
  productVariants,
  products,
  productImages,
} from '../../db/schema/index.js';
import { optionalAuthenticate, authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';
import { resolveCart, CART_COOKIE, cartCookieClearOptions } from './cart-helpers.js';

export const cartRouter = Router();
cartRouter.use(optionalAuthenticate);

async function buildCartResponse(cartId: string) {
  const rows = await db
    .select({
      id: cartItems.id,
      qty: cartItems.qty,
      priceSnapshot: cartItems.priceSnapshot,
      variantId: cartItems.variantId,
      sku: productVariants.sku,
      attributes: productVariants.attributes,
      price: productVariants.price,
      compareAtPrice: productVariants.compareAtPrice,
      stockQty: productVariants.stockQty,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      productBrand: products.brand,
      codAvailable: products.codAvailable,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(cartItems.cartId, cartId));

  if (rows.length === 0) return [];

  // Fetch primary image for each product
  const productIds = [...new Set(rows.map((r) => r.productId))];
  const images = await db
    .select({ productId: productImages.productId, url: productImages.url, alt: productImages.alt })
    .from(productImages)
    .where(
      and(
        sql`${productImages.productId} = ANY(ARRAY[${sql.join(
          productIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}])`,
        eq(productImages.sortOrder, 0),
      ),
    );
  const imageMap = new Map(images.map((i) => [i.productId, i]));

  return rows.map((r) => ({
    ...r,
    image: imageMap.get(r.productId) ?? null,
  }));
}

// GET /api/v1/cart
cartRouter.get('/', async (req, res, next) => {
  try {
    const cart = await resolveCart(req, res);
    const items = await buildCartResponse(cart.id);
    const total = items.reduce((sum, i) => sum + i.qty * +i.priceSnapshot, 0);
    res.json({ data: { id: cart.id, items, total: total.toFixed(2) } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/cart/items — add item
const addItemSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(99).default(1),
});

cartRouter.post('/items', async (req, res, next) => {
  try {
    const body = addItemSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }
    const { variantId, qty } = body.data;

    // Validate variant exists and has stock
    const [variant] = await db
      .select({
        id: productVariants.id,
        price: productVariants.price,
        stockQty: productVariants.stockQty,
      })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    if (!variant) throw new AppError(404, 'Variant not found');
    if (variant.stockQty < qty) throw new AppError(400, 'Insufficient stock');

    const cart = await resolveCart(req, res);

    // Upsert: if same variant already in cart, increment qty
    const [existing] = await db
      .select({ id: cartItems.id, qty: cartItems.qty })
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)))
      .limit(1);

    if (existing) {
      const newQty = Math.min(existing.qty + qty, 99);
      await db.update(cartItems).set({ qty: newQty }).where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({
        cartId: cart.id,
        variantId,
        qty,
        priceSnapshot: variant.price,
      });
    }

    // Update cart updatedAt
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

    const items = await buildCartResponse(cart.id);
    const total = items.reduce((sum, i) => sum + i.qty * +i.priceSnapshot, 0);
    res.json({ data: { id: cart.id, items, total: total.toFixed(2) } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/cart/items/:itemId — update qty (qty=0 removes)
const updateQtySchema = z.object({ qty: z.number().int().min(0).max(99) });

cartRouter.patch('/items/:itemId', async (req, res, next) => {
  try {
    const body = updateQtySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }
    const { qty } = body.data;

    const cart = await resolveCart(req, res);

    const [item] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, req.params.itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);

    if (!item) throw new AppError(404, 'Cart item not found');

    if (qty === 0) {
      await db.delete(cartItems).where(eq(cartItems.id, item.id));
    } else {
      await db.update(cartItems).set({ qty }).where(eq(cartItems.id, item.id));
    }

    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

    const items = await buildCartResponse(cart.id);
    const total = items.reduce((sum, i) => sum + i.qty * +i.priceSnapshot, 0);
    res.json({ data: { id: cart.id, items, total: total.toFixed(2) } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/cart/items/:itemId — remove single item
cartRouter.delete('/items/:itemId', async (req, res, next) => {
  try {
    const cart = await resolveCart(req, res);

    const [item] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, req.params.itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);

    if (!item) throw new AppError(404, 'Cart item not found');

    await db.delete(cartItems).where(eq(cartItems.id, item.id));
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

    const items = await buildCartResponse(cart.id);
    const total = items.reduce((sum, i) => sum + i.qty * +i.priceSnapshot, 0);
    res.json({ data: { id: cart.id, items, total: total.toFixed(2) } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/cart — clear all items
cartRouter.delete('/', async (req, res, next) => {
  try {
    const cart = await resolveCart(req, res);
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
    res.json({ data: { id: cart.id, items: [], total: '0.00' } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/cart/merge — fold a guest (cookie) cart into the logged-in user's cart
cartRouter.post('/merge', authenticate, async (req, res, next) => {
  try {
    const sessionId = req.cookies?.[CART_COOKIE] as string | undefined;
    const userCart = await resolveCart(req, res); // req.user is set → user cart

    if (sessionId) {
      const [guestCart] = await db
        .select()
        .from(carts)
        .where(eq(carts.sessionId, sessionId))
        .limit(1);

      if (guestCart && guestCart.id !== userCart.id) {
        const guestItems = await db
          .select()
          .from(cartItems)
          .where(eq(cartItems.cartId, guestCart.id));

        for (const gi of guestItems) {
          const [existing] = await db
            .select({ id: cartItems.id, qty: cartItems.qty })
            .from(cartItems)
            .where(and(eq(cartItems.cartId, userCart.id), eq(cartItems.variantId, gi.variantId)))
            .limit(1);

          if (existing) {
            await db
              .update(cartItems)
              .set({ qty: Math.min(existing.qty + gi.qty, 99) })
              .where(eq(cartItems.id, existing.id));
          } else {
            await db.insert(cartItems).values({
              cartId: userCart.id,
              variantId: gi.variantId,
              qty: gi.qty,
              priceSnapshot: gi.priceSnapshot,
            });
          }
        }

        await db.delete(carts).where(eq(carts.id, guestCart.id)); // cascades cart_items
      }

      res.clearCookie(CART_COOKIE, cartCookieClearOptions);
    }

    const items = await buildCartResponse(userCart.id);
    const total = items.reduce((sum, i) => sum + i.qty * +i.priceSnapshot, 0);
    res.json({ data: { id: userCart.id, items, total: total.toFixed(2) } });
  } catch (err) {
    next(err);
  }
});
