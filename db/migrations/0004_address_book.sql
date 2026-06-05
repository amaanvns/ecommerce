-- Saved address book: the addresses table predates shipping use and lacked the
-- recipient name + phone + an updatedAt. Add them (table is currently empty, so a
-- NOT NULL name without a default is safe). One statement per chunk — the Neon HTTP
-- driver rejects multiple commands in a single prepared statement.

ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "name" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "phone" varchar(30);
--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
