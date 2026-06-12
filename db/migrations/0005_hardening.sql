-- Hardening batch (bug-audit fixes). One statement per chunk — the Neon HTTP
-- driver rejects multiple commands in a single prepared statement.

-- verify-payment now matches orders by the Razorpay order id, so a payment
-- signature can only ever confirm the order it was created for.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gateway_order_ref" varchar(255);
--> statement-breakpoint
-- Guest cart sessions must be unique; concurrent first requests previously could
-- create two carts for one cookie.
CREATE UNIQUE INDEX IF NOT EXISTS "carts_session_id_unique" ON "carts" ("session_id") WHERE "session_id" IS NOT NULL;
--> statement-breakpoint
-- Auto-claim runs lower(contact_email) on every login; index it.
CREATE INDEX IF NOT EXISTS "orders_contact_email_lower_idx" ON "orders" (lower("contact_email"));
--> statement-breakpoint
-- Auth now lowercases emails; normalize existing rows. (Fails loudly if two
-- accounts differ only by case — resolve manually if that ever happens.)
UPDATE "users" SET "email" = lower("email") WHERE "email" <> lower("email");
--> statement-breakpoint
-- One review per user per product: dedupe (keep newest id), then enforce.
DELETE FROM "reviews" a USING "reviews" b WHERE a."user_id" = b."user_id" AND a."product_id" = b."product_id" AND a."id" < b."id";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_product_unique" ON "reviews" ("user_id", "product_id");
--> statement-breakpoint
-- Wishlist items unique per wishlist: dedupe, then enforce.
DELETE FROM "wishlist_items" a USING "wishlist_items" b WHERE a."wishlist_id" = b."wishlist_id" AND a."product_id" = b."product_id" AND a."id" < b."id";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_unique" ON "wishlist_items" ("wishlist_id", "product_id");
