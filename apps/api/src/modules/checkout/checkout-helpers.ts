import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { orders, orderItems, payments, productVariants, coupons } from '../../db/schema/index.js';
import { logger } from '../../lib/logger.js';

/**
 * Minimal slice of an order row needed to fulfill it. Both the Razorpay and the
 * Cash-on-Delivery paths build this from the freshly-inserted order.
 */
export interface FulfillableOrder {
  id: string;
  total: string;
  currency: string;
  couponId: string | null;
}

export interface FulfillOptions {
  /** Order workflow status to move to (both paths confirm the order). */
  orderStatus: 'confirmed';
  /** 'paid' for online (Razorpay verified), 'pending' for COD (collected on delivery). */
  paymentStatus: 'paid' | 'pending';
  payment: {
    gateway: 'razorpay' | 'cod';
    gatewayRef?: string | null;
    /** payments.status — 'paid' for online, 'pending' for COD until collected. */
    status: string;
    rawResponse?: unknown;
  };
  /**
   * Whether fulfillOrder should decrement stock. The COD path reserves stock
   * up-front via reserveStock() (so it can reject before taking the order) and
   * passes false; the Razorpay path decrements here (payment already captured,
   * so we never reject — see decrementStockClamped).
   */
  decrementStock: boolean;
}

interface StockLine {
  variantId: string | null;
  qty: number;
}

/**
 * Atomically reserve stock for a set of lines: each decrement only applies when
 * enough stock remains (WHERE stock_qty >= qty), so concurrent orders can never
 * drive stock negative. If any line can't be reserved, the ones already taken
 * are returned and the function reports failure — the caller should reject the
 * order. (neon-http has no transactions, so this is compensating-action style.)
 */
export async function reserveStock(lines: StockLine[]): Promise<{ ok: boolean; failed?: string }> {
  const taken: StockLine[] = [];
  for (const line of lines) {
    if (!line.variantId) continue;
    const updated = await db
      .update(productVariants)
      .set({ stockQty: sql`${productVariants.stockQty} - ${line.qty}` })
      .where(and(eq(productVariants.id, line.variantId), gte(productVariants.stockQty, line.qty)))
      .returning({ id: productVariants.id });

    if (updated.length === 0) {
      // Roll back what we already took
      for (const t of taken) {
        await db
          .update(productVariants)
          .set({ stockQty: sql`${productVariants.stockQty} + ${t.qty}` })
          .where(eq(productVariants.id, t.variantId!));
      }
      return { ok: false, failed: line.variantId };
    }
    taken.push(line);
  }
  return { ok: true };
}

/**
 * Decrement stock for a paid order. Payment is already captured, so we must not
 * fail: decrement conditionally, and if stock is no longer sufficient (lost a
 * race), clamp to zero and log — the store owner oversold by one and needs to
 * resolve it manually, but stock never goes negative.
 */
async function decrementStockClamped(lines: StockLine[], orderId: string): Promise<void> {
  for (const line of lines) {
    if (!line.variantId) continue;
    const updated = await db
      .update(productVariants)
      .set({ stockQty: sql`${productVariants.stockQty} - ${line.qty}` })
      .where(and(eq(productVariants.id, line.variantId), gte(productVariants.stockQty, line.qty)))
      .returning({ id: productVariants.id });

    if (updated.length === 0) {
      await db
        .update(productVariants)
        .set({ stockQty: 0 })
        .where(eq(productVariants.id, line.variantId));
      logger.warn(
        { orderId, variantId: line.variantId, qty: line.qty },
        'Oversold: paid order exceeded remaining stock; clamped to 0',
      );
    }
  }
}

/**
 * Shared post-order fulfillment: set order status/paymentStatus, record a payment
 * row, optionally decrement variant stock, and increment coupon usage. Used by
 * both the Razorpay verify-payment flow and the COD place-order flow so the two
 * paths stay in sync. Does NOT clear the cart — callers do that against the
 * resolved cart.
 */
export async function fulfillOrder(order: FulfillableOrder, opts: FulfillOptions): Promise<void> {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  if (opts.decrementStock) {
    await decrementStockClamped(
      items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
      order.id,
    );
  }

  await Promise.all([
    db
      .update(orders)
      .set({ status: opts.orderStatus, paymentStatus: opts.paymentStatus, updatedAt: new Date() })
      .where(eq(orders.id, order.id)),

    db.insert(payments).values({
      orderId: order.id,
      gateway: opts.payment.gateway,
      gatewayRef: opts.payment.gatewayRef ?? null,
      amount: order.total,
      currency: order.currency,
      status: opts.payment.status,
      rawResponse: (opts.payment.rawResponse ?? null) as object | null,
    }),

    // Conditional increment so concurrent orders can't push usage past the limit
    order.couponId
      ? db
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(
            and(
              eq(coupons.id, order.couponId),
              sql`(${coupons.usageLimit} IS NULL OR ${coupons.usedCount} < ${coupons.usageLimit})`,
            ),
          )
      : Promise.resolve(),
  ]);
}
