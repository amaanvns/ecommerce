import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../../../../db/migrations');

const databaseUrl = process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('DATABASE_URL or DATABASE_URL_UNPOOLED is required for migrations');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

console.log('Running migrations from:', migrationsFolder);
await migrate(db, { migrationsFolder });
console.log('Migrations complete');
process.exit(0);
