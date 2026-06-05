import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),

    // Neon PostgreSQL
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_URL_UNPOOLED: z.string().optional(),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // CORS — comma-separated list of allowed origins for production
    // (e.g. "https://shop.example.com,https://admin.example.com")
    CLIENT_URL: z.string().default('http://localhost:4200'),

    // Razorpay (optional — checkout returns 503 without these)
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),

    // Observability (optional — no-op without DSN)
    SENTRY_DSN: z.string().url().optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  })
  .superRefine((env, ctx) => {
    // In production, require Razorpay keys and a real (non-default) CLIENT_URL.
    // These can be missing in dev for partial-stack workflows.
    if (env.NODE_ENV === 'production') {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production',
        });
      }
      if (env.CLIENT_URL === 'http://localhost:4200') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CLIENT_URL must be set to the production web origin',
        });
      }
      // JWT secrets must not be the example values
      if (env.JWT_SECRET.includes('change_me') || env.JWT_REFRESH_SECRET.includes('change_me')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT secrets are still placeholders — generate real ones for production',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  console.error(parsed.error.flatten().formErrors);
  process.exit(1);
}

export const env = parsed.data;

/**
 * CLIENT_URL parsed as an array — supports comma-separated origins for CORS.
 * Trailing slashes are stripped so `https://x.vercel.app/` and `https://x.vercel.app`
 * both match the browser's Origin header (which never has a trailing slash).
 */
export const clientOrigins = env.CLIENT_URL.split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);
