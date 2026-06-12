import { and, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { orders } from '../../db/schema/index.js';

/**
 * Attach any guest orders (userId IS NULL) whose contactEmail matches the account
 * email to that account. Called on register and login so a guest who later signs
 * up / signs in with the same email sees their past orders under "My Orders".
 *
 * Orders still in status 'pending' are excluded: those are mid-payment Razorpay
 * attempts (or abandoned ones) — claiming one while its payment is in flight
 * would race the verification step, and abandoned ones are junk anyway.
 *
 * Returns the number of orders claimed.
 */
export async function claimGuestOrdersByEmail(userId: string, email: string): Promise<number> {
  const claimed = await db
    .update(orders)
    .set({ userId, updatedAt: new Date() })
    .where(
      and(
        isNull(orders.userId),
        ne(orders.status, 'pending'),
        sql`lower(${orders.contactEmail}) = lower(${email})`,
      ),
    )
    .returning({ id: orders.id });
  return claimed.length;
}
