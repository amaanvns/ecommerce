import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // Postgres 22P02 (invalid_text_representation): a malformed id in the URL
  // (e.g. /orders/abc where a uuid is expected) is the client's mistake, not a
  // server fault — answer 400 instead of leaking a 500.
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '22P02'
  ) {
    res.status(400).json({ success: false, error: 'Invalid identifier' });
    return;
  }

  logger.error(err, 'Unhandled error');
  res.status(500).json({ success: false, error: 'Internal server error' });
}
