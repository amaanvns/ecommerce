import { eq, and, count } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { coupons, orders } from '../../db/schema/index.js';
import { AppError } from '../../middleware/error.js';

export interface ResolvedCoupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
  discount: number;
}

/**
 * Resolves a coupon code against the given subtotal and (optional) user.
 * Returns the matching coupon row plus the calculated discount, or throws AppError.
 *
 * Used by both:
 *  - public POST /coupons/validate (preview)
 *  - POST /checkout/create-order (apply)
 */
export async function validateAndCalculate(
  rawCode: string,
  subtotal: number,
  userId: string | null,
): Promise<ResolvedCoupon> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new AppError(400, 'Enter a coupon code');

  const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);

  if (!coupon) throw new AppError(404, 'This code isn’t valid.');
  if (!coupon.isActive) throw new AppError(400, 'This code is no longer active.');

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    throw new AppError(400, 'This code isn’t active yet.');
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    throw new AppError(400, 'This code has expired.');
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(400, 'This code has reached its usage limit.');
  }

  const minSubtotal = coupon.minSubtotal != null ? Number(coupon.minSubtotal) : null;
  if (minSubtotal != null && subtotal < minSubtotal) {
    throw new AppError(400, `Minimum order of ₹${minSubtotal.toFixed(0)} required.`);
  }

  if (coupon.firstOrderOnly) {
    if (!userId) throw new AppError(400, 'Sign in to use this code.');
    const [{ paidCount }] = await db
      .select({ paidCount: count() })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.paymentStatus, 'paid')));
    if (Number(paidCount) > 0) {
      throw new AppError(400, 'This code is for first orders only.');
    }
  }

  // Compute discount
  let discount = 0;
  const value = Number(coupon.value);
  if (coupon.type === 'percent') {
    discount = subtotal * (value / 100);
    const maxDisc = coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null;
    if (maxDisc != null && discount > maxDisc) discount = maxDisc;
  } else {
    discount = Math.min(value, subtotal);
  }

  // Round to 2 decimals, never negative
  discount = Math.max(0, Math.round(discount * 100) / 100);

  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value,
    minSubtotal,
    maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null,
    discount,
  };
}
