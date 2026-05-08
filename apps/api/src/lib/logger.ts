import pino from 'pino';
import { env } from '../config/env.js';

const baseLevel = env.LOG_LEVEL ?? (env.NODE_ENV === 'development' ? 'debug' : 'info');

export const logger = pino(
  env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } }, level: baseLevel }
    : { level: baseLevel },
);
