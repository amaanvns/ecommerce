import crypto from 'crypto';
import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { carts } from '../../db/schema/index.js';
import { env } from '../../config/env.js';

type Cart = typeof carts.$inferSelect;

export const CART_COOKIE = 'cartSession';

const isProd = env.NODE_ENV === 'production';

// Cross-site in production (web on Vercel, API on Render) requires SameSite=None;Secure.
// In dev over http://localhost, Lax + non-secure keeps the cookie working.
export const cartCookieOptions = {
  httpOnly: true,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  secure: isProd,
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  path: '/',
};

// clearCookie must match path/sameSite/secure/httpOnly but NOT carry maxAge,
// otherwise Express keeps the (empty) cookie alive instead of expiring it.
export const cartCookieClearOptions = {
  httpOnly: true,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  secure: isProd,
  path: '/',
};

/**
 * Resolve the active cart, creating one if needed. Logged-in users get their
 * user cart; guests get a cart keyed by an httpOnly session cookie (minted here
 * on first use). Requires `res` because it may set the cookie.
 */
export async function resolveCart(req: Request, res: Response): Promise<Cart> {
  if (req.user) {
    let [cart] = await db.select().from(carts).where(eq(carts.userId, req.user.sub)).limit(1);
    if (!cart) [cart] = await db.insert(carts).values({ userId: req.user.sub }).returning();
    return cart;
  }

  let sessionId = req.cookies?.[CART_COOKIE] as string | undefined;
  if (sessionId) {
    const [existing] = await db.select().from(carts).where(eq(carts.sessionId, sessionId)).limit(1);
    if (existing) return existing;
  } else {
    sessionId = crypto.randomUUID();
    res.cookie(CART_COOKIE, sessionId, cartCookieOptions);
  }

  const [cart] = await db.insert(carts).values({ sessionId }).returning();
  return cart;
}

/**
 * Look up the active cart WITHOUT creating one (read-only; used by checkout so an
 * empty/absent cart surfaces as "cart is empty" rather than silently creating one).
 */
export async function findCart(req: Request): Promise<Cart | null> {
  if (req.user) {
    const [cart] = await db.select().from(carts).where(eq(carts.userId, req.user.sub)).limit(1);
    return cart ?? null;
  }
  const sessionId = req.cookies?.[CART_COOKIE] as string | undefined;
  if (!sessionId) return null;
  const [cart] = await db.select().from(carts).where(eq(carts.sessionId, sessionId)).limit(1);
  return cart ?? null;
}
