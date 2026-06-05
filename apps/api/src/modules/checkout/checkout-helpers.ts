import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { orders, orderItems, payments, productVariants, coupons } from '../../db/schema/index.js';

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
}

/**
 * Shared post-order fulfillment: set order status/paymentStatus, record a payment
 * row, decrement variant stock, and increment coupon usage. Used by both the
 * Razorpay verify-payment flow and the COD place-order flow so the two paths stay
 * in sync. Does NOT clear the cart — callers do that against the resolved cart.
 */
export async function fulfillOrder(order: FulfillableOrder, opts: FulfillOptions): Promise<void> {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

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

    ...items.map((item) =>
      item.variantId
        ? db
            .update(productVariants)
            .set({ stockQty: sql`${productVariants.stockQty} - ${item.qty}` })
            .where(eq(productVariants.id, item.variantId))
        : Promise.resolve(),
    ),

    order.couponId
      ? db
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, order.couponId))
      : Promise.resolve(),
  ]);
}
