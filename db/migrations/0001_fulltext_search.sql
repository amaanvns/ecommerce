-- Phase 8 — Full-text search for products
-- The 0000 snapshot created `search_vector` as plain text.
-- Replace it with a Postgres-generated tsvector column + GIN index so we can
-- run weighted full-text search across name (A), brand (B), and description (C).

ALTER TABLE "products" DROP COLUMN IF EXISTS "search_vector";
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("brand", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'C')
) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_search_vector_idx" ON "products" USING GIN ("search_vector");
