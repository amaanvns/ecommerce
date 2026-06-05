import express, { RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { sql } from 'drizzle-orm';
import { env, clientOrigins } from './config/env.js';
import { logger } from './lib/logger.js';
import { initSentry } from './lib/sentry.js';
import { db } from './db/client.js';
import { errorHandler } from './middleware/error.js';
import { requestId } from './middleware/request-id.js';
import { authRouter } from './modules/auth/auth.router.js';
import { categoriesRouter } from './modules/categories/categories.router.js';
import { productsRouter } from './modules/products/products.router.js';
import { cartRouter } from './modules/cart/cart.router.js';
import { wishlistRouter } from './modules/wishlist/wishlist.router.js';
import { checkoutRouter } from './modules/checkout/checkout.router.js';
import { ordersRouter } from './modules/orders/orders.router.js';
import { adminRouter } from './modules/admin/admin.router.js';
import { reviewsRouter } from './modules/reviews/reviews.router.js';
import { couponsRouter } from './modules/coupons/coupons.router.js';
import { seoRouter } from './modules/seo/seo.router.js';

initSentry();

const app = express();
const startedAt = Date.now();

app.set('trust proxy', 1); // honour X-Forwarded-For from a single upstream proxy
app.use(requestId);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / curl / health checks (no Origin header)
      if (!origin) return callback(null, true);
      if (clientOrigins.includes(origin)) return callback(null, true);
      // Log every rejection so misconfigurations are visible in the host logs
      logger.warn({ origin, allowed: clientOrigins }, 'CORS: origin rejected');
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }) as unknown as RequestHandler;
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests',
}) as unknown as RequestHandler;

// Liveness — fast, no DB. Used by load-balancer health checks.
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Readiness — verifies the DB is reachable. Use this for deploy gates.
app.get('/api/ready', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: 'ready',
      database: 'ok',
      uptime: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Readiness check failed: database unreachable');
    res.status(503).json({
      status: 'unready',
      database: 'unreachable',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/wishlist', wishlistRouter);
app.use('/api/v1/checkout', checkoutRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/coupons', couponsRouter);
app.use('/api/v1/admin', adminRouter);

// Sitemap + robots: served at root paths (not under /api) so search engines find them
app.use('/', seoRouter);

app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, allowedOrigins: clientOrigins },
    `API server running on http://localhost:${env.PORT}`,
  );
});

// Graceful shutdown — gives in-flight requests a chance to finish before exit.
// Render/Railway/Fly send SIGTERM; the 10s window is shorter than their default
// kill timer (~30s).
function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received, closing HTTP server');
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during server close');
      process.exit(1);
    }
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn('Force-exiting after 10s grace period');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
