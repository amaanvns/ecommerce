# E-Commerce Platform — Master Plan

**Stack:** Angular (frontend) · Express.js + Node (backend) · PostgreSQL on Neon (cloud DB) · TypeScript end-to-end

---

## 1. High-Level Architecture

```
┌──────────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│   Angular SPA        │       │  Express.js API      │       │  Neon PostgreSQL    │
│  - Customer app      │ HTTPS │  - REST + JSON       │  TLS  │  - Branching for    │
│  - Admin app (lazy)  │◄─────►│  - JWT auth          │◄─────►│    dev/staging/prod │
│  - Tailwind / Mat    │       │  - Role middleware   │       │  - Auto-scale       │
└──────────────────────┘       └──────────────────────┘       └─────────────────────┘
         │                              │     │
         │                              │     ├──► Stripe / Razorpay (payments)
         │                              │     ├──► Cloudinary / S3 (images)
         │                              │     ├──► Resend / SendGrid (email)
         │                              │     ├──► Redis (sessions/cache)  [optional]
         │                              │     └──► Algolia / Meilisearch (search) [optional]
         └──► CDN / Vercel / Netlify    └──► Render / Railway / Fly.io / AWS
```

### Project layout (monorepo)
```
Ecommerce/
├── apps/
│   ├── web/                 # Angular customer + admin (single app, lazy-loaded admin module)
│   └── api/                 # Express + TypeScript
├── packages/
│   └── shared-types/        # DTOs, enums shared across web + api
├── db/
│   ├── migrations/          # SQL migrations (node-pg-migrate or Prisma migrate)
│   └── seeds/
├── docker-compose.yml       # Local Postgres (mirrors Neon schema)
└── PLAN.md
```

---

## 2. User Roles & Views

| Role | Capabilities |
|---|---|
| **Guest** | Browse catalog, search, filter, view product, add to cart (local), register/login |
| **Customer** | Everything Guest + persistent cart, wishlist, checkout, orders, addresses, reviews, profile |
| **Admin** | Full dashboard: products, categories, inventory, orders, users, coupons, analytics, CMS |
| **Super Admin** | Manage admins, roles, system settings (optional tier) |

---

## 3. Feature Set

### 3.1 Customer Features
- **Auth:** signup, login, email verification, password reset, Google OAuth, JWT + refresh tokens
- **Catalog:** product listing with pagination, infinite scroll, category tree, brand filter, price range, attributes (size/color), sort (price, rating, newest, popularity)
- **Search:** full-text search (Postgres `tsvector` initially; Meilisearch/Algolia later)
- **Product page:** image gallery + zoom, variants, stock indicator, reviews + ratings, related products, recently viewed
- **Cart:** add/update/remove, quantity, persistent across devices, merge guest cart on login
- **Wishlist:** add/remove, share
- **Checkout:** multi-step (address → shipping → payment → review), saved addresses, guest checkout, coupon/discount, tax + shipping calculation
- **Payments:** Stripe (cards, wallets), Razorpay/UPI (India), COD option
- **Orders:** order history, status tracking, invoice PDF, cancel/return request, reorder
- **Account:** profile, addresses, payment methods, notifications, change password, delete account (GDPR)
- **Reviews:** rating + comment + images, only for purchased items, helpful/not-helpful votes
- **Notifications:** email (order placed/shipped/delivered), in-app toast, optional SMS

### 3.2 Admin Features
- **Dashboard:** KPIs (revenue, orders, AOV, conversion), charts (sales over time), low-stock alerts
- **Products:** CRUD, bulk import (CSV), variants, image upload (multi), SEO fields, draft/publish, soft-delete
- **Categories:** nested tree, drag-reorder
- **Inventory:** stock per variant, restock log, low-stock thresholds
- **Orders:** list with filters, view detail, update status (pending → packed → shipped → delivered → returned), refund, print invoice/label
- **Customers:** list, view profile + order history, block/unblock
- **Coupons & Promotions:** percentage/fixed, min cart value, product/category scope, usage limits, expiry, first-order only
- **Reviews moderation:** approve/reject/flag
- **CMS:** banners, homepage sections, hero carousel, static pages (About, Privacy, Terms)
- **Reports:** sales by period/category/product, tax report, export CSV
- **Settings:** shipping zones + rates, tax rules, payment gateway keys, store info
- **Audit log:** every admin action recorded
- **Roles & permissions:** super admin manages admin users (optional)

### 3.3 Cross-Cutting
- Mobile-first responsive UI
- i18n-ready (Angular i18n) and currency formatting
- Dark mode (optional)
- Accessibility (WCAG AA)
- SEO: SSR via Angular Universal for catalog/product pages, sitemap, structured data (Product, Breadcrumb, Review)
- PWA: installable, offline catalog browsing, push notifications

---

## 4. Database Schema (PostgreSQL — Neon)

Core tables (simplified):

```sql
users(id PK, email UNIQUE, password_hash, name, phone, role[customer|admin|super_admin],
      email_verified_at, created_at, updated_at)

addresses(id PK, user_id FK, line1, line2, city, state, postal_code, country, is_default, type[shipping|billing])

categories(id PK, parent_id FK self, name, slug UNIQUE, image_url, sort_order)

products(id PK, name, slug UNIQUE, description, brand, category_id FK, base_price,
         is_published, search_vector tsvector, created_at, updated_at, deleted_at)

product_images(id PK, product_id FK, url, alt, sort_order)

product_variants(id PK, product_id FK, sku UNIQUE, attributes JSONB, price, compare_at_price,
                 stock_qty, low_stock_threshold)

reviews(id PK, product_id FK, user_id FK, rating 1-5, title, body, status, created_at)

carts(id PK, user_id FK NULL, session_id NULL, created_at, updated_at)
cart_items(id PK, cart_id FK, variant_id FK, qty, price_snapshot)

wishlists(id PK, user_id FK)
wishlist_items(id PK, wishlist_id FK, product_id FK)

coupons(id PK, code UNIQUE, type[percent|fixed], value, min_subtotal, max_discount,
        starts_at, ends_at, usage_limit, used_count, scope JSONB)

orders(id PK, order_number UNIQUE, user_id FK, status, subtotal, discount, tax, shipping,
       total, currency, payment_status, shipping_address JSONB, billing_address JSONB,
       coupon_id FK, placed_at, updated_at)

order_items(id PK, order_id FK, variant_id FK, product_name_snapshot, qty, unit_price, line_total)

payments(id PK, order_id FK, gateway, gateway_ref, amount, status, raw_response JSONB, created_at)

shipments(id PK, order_id FK, carrier, tracking_number, status, shipped_at, delivered_at)

refunds(id PK, order_id FK, amount, reason, status, created_at)

audit_logs(id PK, actor_user_id FK, action, target_type, target_id, diff JSONB, created_at)

settings(key PK, value JSONB)        -- store config (tax, shipping zones, etc.)
banners(id PK, image_url, link, sort_order, active, starts_at, ends_at)
```

**Indexes:** `products(search_vector) GIN`, `products(category_id, is_published)`, `orders(user_id, placed_at DESC)`, `cart_items(cart_id)`, `product_variants(product_id)`.

**Neon specifics:** use a separate branch per environment (dev/staging/prod), enable connection pooling (PgBouncer endpoint), store `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (for migrations).

---

## 5. Backend (Express + TypeScript)

### Stack
- Express 4, TypeScript, Zod (validation), Drizzle ORM **or** Prisma (Drizzle is lighter, Prisma has nicer DX — pick one early)
- `pg` driver via Neon serverless driver for edge-friendliness
- Auth: `argon2` for hashing, `jsonwebtoken` for JWT, refresh-token rotation
- Logging: `pino`; Error tracking: Sentry
- Testing: Vitest + Supertest

### Folder structure
```
apps/api/src/
├── config/           # env loader (zod-validated)
├── db/               # drizzle client, schema, migrations runner
├── modules/
│   ├── auth/         # routes, controllers, services, dto
│   ├── users/
│   ├── products/
│   ├── categories/
│   ├── cart/
│   ├── orders/
│   ├── payments/
│   ├── coupons/
│   ├── reviews/
│   ├── admin/        # admin-only endpoints
│   └── webhooks/     # stripe, razorpay
├── middleware/       # auth, role, rate-limit, error
├── lib/              # mailer, storage, pdf, search
├── jobs/             # bullmq workers (email, invoice)
└── server.ts
```

### Key REST endpoints (versioned `/api/v1`)
- `POST /auth/register | /auth/login | /auth/refresh | /auth/logout | /auth/forgot | /auth/reset`
- `GET /products?category=&q=&minPrice=&sort=&page=` · `GET /products/:slug`
- `GET /categories` (tree)
- `POST /cart/items` · `PATCH /cart/items/:id` · `DELETE /cart/items/:id` · `GET /cart`
- `POST /orders` (checkout) · `GET /orders` · `GET /orders/:id` · `POST /orders/:id/cancel`
- `POST /payments/intent` · `POST /webhooks/stripe`
- `POST /reviews` · `GET /products/:id/reviews`
- **Admin:** `/admin/products`, `/admin/orders`, `/admin/users`, `/admin/coupons`, `/admin/reports/*`, `/admin/settings`

### Security
- Helmet, CORS allowlist, rate limit (`express-rate-limit`) on auth + checkout
- CSRF for cookie-based admin (or stick to bearer JWT everywhere)
- Input validation with Zod on every route
- Output: never return password hashes; serialize via DTOs
- HTTPS only, HSTS, secure cookies (`SameSite=Strict`)
- Webhook signature verification (Stripe)
- Idempotency keys on `POST /orders` and payments

---

## 6. Frontend (Angular)

### Stack
- Angular 17+ standalone components, Signals, new control flow (`@if`, `@for`)
- State: NgRx **or** Signals + services (Signals are enough for medium scale — start there)
- UI: Angular Material **or** Tailwind + headless components (Tailwind recommended for ecommerce look)
- Forms: Reactive Forms with typed forms
- HTTP: `HttpClient` + interceptors (auth, error, retry)
- SSR: Angular Universal for SEO on catalog/product
- Testing: Karma+Jasmine or migrate to Vitest

### App structure
```
apps/web/src/app/
├── core/               # guards, interceptors, services (auth, cart, api)
├── shared/             # ui components, pipes, directives
├── features/
│   ├── home/
│   ├── catalog/        # listing, filters
│   ├── product/
│   ├── cart/
│   ├── checkout/
│   ├── account/        # profile, orders, addresses
│   └── auth/
├── admin/              # lazy-loaded module, separate routes /admin/*
│   ├── dashboard/
│   ├── products/
│   ├── orders/
│   ├── customers/
│   ├── coupons/
│   └── settings/
└── layouts/            # customer-layout, admin-layout
```

### Routing & guards
- `AuthGuard` — protects `/account`, `/checkout`
- `AdminGuard` — protects `/admin/**`, checks role from JWT claims
- Lazy-load admin bundle so customers never download it

### UX details that matter
- Skeleton loaders on lists
- Optimistic cart updates
- Debounced search-as-you-type
- Image lazy-loading + `srcset`
- Sticky add-to-cart on mobile product page
- Address autocomplete (Google Places / postal API)

---

## 7. Phased Roadmap

| Phase | Scope | Outcome |
|---|---|---|
| **0. Setup** | Monorepo, Neon project + branches, Angular + Express scaffolds, CI (GitHub Actions), env management, ESLint/Prettier, Husky | Hello-world deployed |
| **1. Auth** | Register/login/refresh, password reset, role middleware, Angular auth flow + guard | Users can sign in |
| **2. Catalog** | Categories + products + variants + images, listing with filters/sort/pagination, product detail | Public store browsable |
| **3. Cart & Checkout** | Cart (guest + user), address, shipping calc, order creation, Stripe integration, order confirmation | First test purchase end-to-end |
| **4. Account** | Order history, addresses, profile, password change | Customer self-service |
| **5. Admin core** | Admin layout, products CRUD, categories, orders list + status updates, customer list | Operate the store |
| **6. Reviews & Wishlist** | Review submission + moderation, wishlist | Engagement features |
| **7. Coupons & Promos** | Coupon engine, apply at checkout, admin CRUD | Marketing levers |
| **8. Search & SEO** | Postgres FTS, Angular Universal SSR, sitemap, structured data | Discoverability |
| **9. Analytics & Reports** | Admin dashboard charts, CSV exports, audit log | Business visibility |
| **10. Polish** | PWA, i18n, accessibility audit, performance budget (Lighthouse > 90), load test | Production-ready |
| **11. Launch** | Staging soak, security review, backups verified, runbook, monitoring (Sentry + uptime) | Go live |

A solo dev should plan ~10–14 weeks for Phase 0–7, plus 3–4 weeks for 8–11.

---

## 8. DevOps & Environments

- **Environments:** `local` (Docker Postgres) → `dev` (Neon dev branch) → `staging` (Neon staging branch) → `prod` (Neon main).
- **CI/CD:** GitHub Actions — lint, typecheck, test, build, then deploy api to Render/Railway and web to Vercel.
- **Migrations:** run on deploy via a one-shot job; never auto-migrate from app boot.
- **Secrets:** `.env` locally, platform secret store in cloud — never commit.
- **Observability:** Sentry (errors), Logtail/Axiom (logs), UptimeRobot (uptime), Stripe dashboard (payments).
- **Backups:** Neon point-in-time restore + weekly logical dump to S3.

---

## 9. Open Decisions to Make Before Phase 0

1. **ORM:** Drizzle (lighter, SQL-first) vs Prisma (richer DX, slower cold start) — recommend **Drizzle** for Neon serverless.
2. **State management:** Signals + services (recommended) vs NgRx (only if app grows complex).
3. **UI library:** Tailwind + headless (recommended for ecommerce) vs Angular Material.
4. **Payments primary:** Stripe (global) vs Razorpay (India-first). Can add the other later.
5. **Search:** start with Postgres FTS, migrate to Meilisearch only when latency/relevance demands it.
6. **Hosting:** API on Render vs Railway vs Fly.io; Web on Vercel vs Netlify vs Cloudflare Pages.

---

## 10. What's NOT in v1 (deliberate cuts)

Deferred to v2 to keep scope tight: marketplace/multi-vendor, subscriptions/recurring, loyalty points, gift cards, A/B testing, recommendation engine, live chat, mobile native apps. Build clean interfaces now so these slot in later.
