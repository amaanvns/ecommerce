# Runbook

Operational guide for the Shopzone platform. This document is the source of truth
for **how to deploy, recover, and debug** in production. Keep it next to PLAN.md.

---

## 1. Architecture at a glance

|          | Component       | Stack                          | Where it runs                               |
| -------- | --------------- | ------------------------------ | ------------------------------------------- |
| Web      | `apps/web`      | Angular 19 SSR + Tailwind      | Vercel / Netlify / any Node host            |
| API      | `apps/api`      | Express + TypeScript + Drizzle | Render / Railway / Fly / any container host |
| DB       | Neon PostgreSQL | branched per env               | Neon Cloud                                  |
| Payments | Razorpay        | webhook + SDK                  | razorpay.com dashboard                      |

The web and API are **independently deployable**. The web talks to the API over
HTTPS; in production the same root domain should also serve `/sitemap.xml` and
`/robots.txt` from the API (rewrite or proxy).

---

## 2. Environments

Three Neon branches, three deployments:

| Env        | Neon branch | Web host               | API host                   |
| ---------- | ----------- | ---------------------- | -------------------------- |
| local      | `dev`       | `localhost:4200`       | `localhost:3000`           |
| staging    | `staging`   | `staging.shopzone.com` | `api-staging.shopzone.com` |
| production | `main`      | `shopzone.com`         | `api.shopzone.com`         |

Promote in order: **local → staging → production**. Never push to production
without a staging soak first (see §6).

---

## 3. Required environment variables

### API (`apps/api`)

```
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://…@ep-xxx-pooler.neon.tech/db?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://…@ep-xxx.neon.tech/db?sslmode=require   # for migrations

JWT_SECRET=<64-byte hex>           # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_REFRESH_SECRET=<64-byte hex>   # different from JWT_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CLIENT_URL=https://shopzone.com,https://www.shopzone.com   # comma-separated for CORS

RAZORPAY_KEY_ID=rzp_live_…
RAZORPAY_KEY_SECRET=…

SENTRY_DSN=https://…@…ingest.sentry.io/…   # optional, error tracking
LOG_LEVEL=info                              # optional, default info in prod
```

The API **fails fast at boot** if any production-required var is missing or still
holds a placeholder value (see [src/config/env.ts](apps/api/src/config/env.ts)).
Misconfigured deploys exit with code 1 — the orchestrator's restart loop catches
it before serving traffic.

### Web (`apps/web`)

The Angular build embeds the API URL into the bundle via `src/environments/environment.ts`.
For production, edit `environment.prod.ts` (or `environment.ts` if no prod variant
exists yet) so `apiUrl` points at the deployed API:

```ts
export const environment = {
  production: true,
  apiUrl: 'https://api.shopzone.com/api/v1',
};
```

---

## 4. Deploying

### One-time setup

1. **Create Neon branches.** In the Neon console, click _Branches → Create branch_ twice — name them `staging` and `main` (or use the default `main` for production).
2. **Run migrations on each branch.** Set the env var temporarily and run:
   ```
   DATABASE_URL_UNPOOLED=<neon staging unpooled url> npm run db:migrate -w apps/api
   ```
   Repeat for production. Migrations live in `db/migrations/`; drizzle tracks state in `_journal.json`.
3. **(Optional) Seed staging** with `npm run db:seed -w apps/api`. Never seed production.
4. **Razorpay keys.** Test keys for staging, live keys for production. From https://dashboard.razorpay.com/app/keys.

### API — deploy via Docker

The repo ships [apps/api/Dockerfile](apps/api/Dockerfile) (multi-stage, Node 22 alpine, runs as non-root, includes a HEALTHCHECK against `/api/health`).

**Render** (recommended for simplicity):

- New → Web Service → Connect repo
- Runtime: _Docker_
- Dockerfile path: `apps/api/Dockerfile`
- Build context: repo root
- Add env vars from §3
- Health check path: `/api/ready` (waits for DB)
- Auto-deploy on push to `main` branch

**Railway / Fly.io / Cloud Run / Kubernetes**: same Dockerfile, point platform's
build at the repo root. Set env vars. Done.

### Web — deploy via Vercel/Netlify

Angular SSR builds into `apps/web/dist/web/` with both prerendered `browser/` and
SSR `server/`. Either platform handles this.

**Vercel:**

- Import repo
- Framework preset: _Angular_
- Build command: `npm run build --workspace=apps/web`
- Output dir: `apps/web/dist/web`
- Add env: `NODE_ENV=production`
- (Optional) Add a rewrite so `/sitemap.xml` and `/robots.txt` proxy to the API:
  ```json
  {
    "rewrites": [
      { "source": "/(sitemap.xml|robots.txt)", "destination": "https://api.shopzone.com/$1" }
    ]
  }
  ```

### Domains & TLS

DNS:

- `shopzone.com` → web host
- `api.shopzone.com` → API host

TLS is automatic on all the recommended hosts (Vercel/Render/Netlify/Fly).

---

## 5. Database migrations

**Apply** (CI/deploy step, never auto-run from app boot):

```
DATABASE_URL_UNPOOLED=<unpooled-url> npm run db:migrate -w apps/api
```

**Generate** a new migration after schema edits:

```
npm run db:generate -w apps/api
```

Drizzle writes a SQL file in `db/migrations/` and updates `_journal.json`.
Review the SQL **before committing** — generated DDL on a live table can lock it.

**Rollback** Drizzle migrations are forward-only. To roll back:

1. Restore the DB to pre-migration state via Neon's point-in-time-restore (§7)
2. Revert the migration commit
3. Redeploy

---

## 6. Pre-launch checklist

Run through this before flipping DNS to production.

- [ ] `npm run build` succeeds at repo root (api + web)
- [ ] `npm run db:migrate -w apps/api` applied on production branch
- [ ] All §3 env vars set on the production hosts
- [ ] Razorpay live keys configured + a webhook signing secret if you've added one
- [ ] `GET /api/health` returns 200 from the deployed API
- [ ] `GET /api/ready` returns 200 (DB reachable)
- [ ] `GET /sitemap.xml` and `/robots.txt` return correctly
- [ ] Web hits the deployed API (check Network tab on `/products`)
- [ ] Sentry DSN set (or accept unmonitored errors)
- [ ] Test order placed via Razorpay test mode on staging — payment verifies, stock decrements, coupon usage increments
- [ ] Lighthouse run on staging — perf > 90 on home + product detail
- [ ] Try `/admin` while signed in as admin
- [ ] CORS origins in `CLIENT_URL` include both apex and `www.`

---

## 7. Backups & disaster recovery

**Backups are automatic** on Neon — point-in-time-restore is built in.

**To restore:**

1. Neon console → Branches → click the affected branch
2. _Restore from history_ → pick a timestamp before the incident
3. Update the production API's `DATABASE_URL` to the restored branch
4. Roll a deploy to pick up the new connection string

**Retention:**

- Free tier: 24h history
- Paid tiers: 7–30 days

For longer retention, schedule a weekly `pg_dump` to S3 (TODO — not yet wired).

---

## 8. Incident response

### "The site is down"

1. **Check API health:**

   ```
   curl -i https://api.shopzone.com/api/ready
   ```

   - 200 → API up, look at web host
   - 503 → DB unreachable, check Neon dashboard
   - timeout / 5xx → check API host's logs

2. **Check the web:** load the site in a browser. If SSR is broken, the HTML response is empty / errors at the top.

3. **Recent deploys:** roll back to the previous deploy on the affected host. Both Render and Vercel have one-click rollback in their UI.

### "Payments are failing"

1. Check Razorpay dashboard → _Payments_ → recent attempts. The error code there is authoritative.
2. Check API logs for `verify-payment` errors, grep by request ID.
3. Common causes:
   - Wrong `RAZORPAY_KEY_SECRET` → signature check fails
   - Webhook ngrok URL stale (staging only)
   - Order amount mismatch (rare; check `subtotal − discount` math)

### "A user can't log in"

1. Confirm the user exists: `SELECT id, email, is_blocked FROM users WHERE email = ?`
2. If `is_blocked = true`, that's expected — admin blocked them.
3. If they say "wrong password", they need a password reset (TODO: feature not yet built; manually update `password_hash` only in true emergencies).

### "Coupons are exhausted but shouldn't be"

`coupons.used_count` is incremented at payment-confirm time. To audit:

```sql
SELECT c.code, c.usage_limit, c.used_count, COUNT(o.id) AS actual_paid_orders
FROM coupons c
LEFT JOIN orders o ON o.coupon_id = c.id AND o.payment_status = 'paid'
GROUP BY c.id;
```

If `actual_paid_orders < used_count`, something incremented without a paid order. Reset:

```sql
UPDATE coupons SET used_count = (SELECT COUNT(*) FROM orders WHERE coupon_id = coupons.id AND payment_status = 'paid');
```

---

## 9. Common operational tasks

### Promote a user to admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'someone@example.com';
```

### Tail production logs

Render: dashboard → Logs tab. Railway: `railway logs`. Fly: `fly logs`.

Logs include a request ID — grep for `"id":"<uuid>"` to follow a single request.

### Rebuild the FTS index

The `search_vector` column is generated, so it auto-updates on every product
INSERT/UPDATE. To force a rebuild after schema changes:

```sql
REINDEX INDEX products_search_vector_idx;
```

### Export a CSV of paid orders for accounting

Hit `/api/v1/admin/exports/orders.csv?status=paid` while signed in as admin, or
use the _Export orders CSV_ button on the admin dashboard.

---

## 10. Monitoring & alerting

**Currently wired:**

- Sentry stub (set `SENTRY_DSN` to activate, then `npm install --workspace=apps/api @sentry/node` and replace the stub body in [apps/api/src/lib/sentry.ts](apps/api/src/lib/sentry.ts))
- Pino structured logs with request IDs

**Recommended additions (not yet wired):**

- UptimeRobot / BetterStack pinging `/api/ready` every minute → SMS/email on failure
- Sentry alert rule: > 5 errors in 5 minutes
- Razorpay webhook to capture failed payments

---

## 11. Rollback playbook

| Scenario           | Action                                                                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bad API deploy     | Roll back on host UI (Render/Railway/Fly all support 1-click)                                                                                                        |
| Bad web deploy     | Same — Vercel/Netlify rollback to previous deployment                                                                                                                |
| Bad migration      | Restore Neon branch to pre-migration timestamp, then revert + redeploy                                                                                               |
| Compromised secret | Rotate immediately on the host's env panel; force-restart; invalidate sessions by changing `JWT_SECRET` (logs everyone out — coordinate with users if non-emergency) |
