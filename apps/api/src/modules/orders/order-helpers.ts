import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { orders } from '../../db/schema/index.js';

/**
 * Attach any guest orders (userId IS NULL) whose contactEmail matches the account
 * email to that account. Called on register and login so a guest who later signs
 * up / signs in with the same email sees their past orders under "My Orders".
 * Returns the number of orders claimed.
 */
export async function claimGuestOrdersByEmail(userId: string, email: string): Promise<number> {
  const claimed = await db
    .update(orders)
    .set({ userId, updatedAt: new Date() })
    .where(and(isNull(orders.userId), sql`lower(${orders.contactEmail}) = lower(${email})`))
    .returning({ id: orders.id });
  return claimed.length;
}
