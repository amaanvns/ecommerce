import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Sentry stub. The real `@sentry/node` package isn't installed yet — when you
 * sign up for Sentry and want to enable it, run:
 *
 *     npm install --workspace=apps/api @sentry/node
 *
 * then replace the body of `initSentry` with the actual init + integrations.
 * Until then, this just logs that the DSN was detected. The application
 * already works without Sentry — this exists so adding it later is a one-file
 * change rather than a refactor.
 */
export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    if (env.NODE_ENV === 'production') {
      logger.warn('SENTRY_DSN not set — error tracking is disabled. Add a Sentry DSN to enable.');
    }
    return;
  }

  // Real init goes here once @sentry/node is installed:
  //
  //   import * as Sentry from '@sentry/node';
  //   Sentry.init({
  //     dsn: env.SENTRY_DSN,
  //     environment: env.NODE_ENV,
  //     tracesSampleRate: 0.1,
  //   });
  //
  // Then call `app.use(Sentry.Handlers.requestHandler())` early in server.ts
  // and `app.use(Sentry.Handlers.errorHandler())` before our `errorHandler`.

  logger.info(
    { dsn: env.SENTRY_DSN.slice(0, 30) + '…' },
    'Sentry stub: DSN present, install @sentry/node to activate',
  );
}

/** Safely report an error if Sentry is wired. No-op until activated. */
export function captureError(_err: unknown, _context?: Record<string, unknown>): void {
  // Real impl: Sentry.captureException(err, { extra: context });
}
