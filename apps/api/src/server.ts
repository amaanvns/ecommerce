import express, { RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.router.js';
import { categoriesRouter } from './modules/categories/categories.router.js';
import { productsRouter } from './modules/products/products.router.js';
import { cartRouter } from './modules/cart/cart.router.js';
import { wishlistRouter } from './modules/wishlist/wishlist.router.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/wishlist', wishlistRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`API server running on http://localhost:${env.PORT}`);
});
