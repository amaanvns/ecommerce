import { Router } from 'express';
import { eq, isNull, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { products, categories } from '../../db/schema/index.js';
import { env } from '../../config/env.js';

export const seoRouter = Router();

const STATIC_ROUTES: { path: string; priority: number; changefreq: string }[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/products', priority: 0.9, changefreq: 'daily' },
  { path: '/auth/login', priority: 0.3, changefreq: 'monthly' },
  { path: '/auth/register', priority: 0.3, changefreq: 'monthly' },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: number): string {
  const parts = [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority !== undefined) parts.push(`    <priority>${priority.toFixed(1)}</priority>`);
  parts.push(`  </url>`);
  return parts.join('\n');
}

// GET /sitemap.xml
seoRouter.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const baseUrl = env.CLIENT_URL.replace(/\/$/, '');

    const [productRows, categoryRows] = await Promise.all([
      db
        .select({
          slug: products.slug,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(and(eq(products.isPublished, true), isNull(products.deletedAt))),
      db.select({ slug: categories.slug }).from(categories),
    ]);

    const entries: string[] = [];

    for (const r of STATIC_ROUTES) {
      entries.push(urlEntry(`${baseUrl}${r.path}`, undefined, r.changefreq, r.priority));
    }

    for (const c of categoryRows) {
      entries.push(
        urlEntry(
          `${baseUrl}/products?category=${encodeURIComponent(c.slug)}`,
          undefined,
          'weekly',
          0.7,
        ),
      );
    }

    for (const p of productRows) {
      const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : undefined;
      entries.push(urlEntry(`${baseUrl}/products/${p.slug}`, lastmod, 'weekly', 0.8));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

// GET /robots.txt
seoRouter.get('/robots.txt', (_req, res) => {
  const baseUrl = env.CLIENT_URL.replace(/\/$/, '');
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /account',
    'Disallow: /checkout',
    'Disallow: /orders',
    'Disallow: /wishlist',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(body);
});
