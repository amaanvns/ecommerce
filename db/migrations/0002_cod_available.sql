-- Phase A — Cash on Delivery
-- Per-product flag controlling whether an item may be paid for via Cash on Delivery.
-- Defaults to false: COD is opt-in per product from the admin dashboard.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cod_available" boolean DEFAULT false NOT NULL;
