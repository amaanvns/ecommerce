import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: '../../db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL']!,
  },
  verbose: true,
  strict: true,
});
