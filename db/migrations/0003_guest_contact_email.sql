-- Phase B — Guest checkout
-- Store a contact email on guest orders (userId is null) so guests can look up
-- their order and receive confirmation. Logged-in orders keep using the account email.

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "contact_email" varchar(255);
