import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/**
 * Attach a request ID to every incoming request and echo it on the response.
 * Trusts an inbound `X-Request-Id` header if present (e.g. from a load
 * balancer that already issued one), otherwise generates a fresh UUID.
 *
 * Use the request ID to correlate logs across services when debugging
 * production incidents.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
  (req as unknown as { id: string }).id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
