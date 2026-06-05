import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { notInArray } from 'drizzle-orm';
import * as schema from '../schema/index.js';

const sql = neon(process.env['DATABASE_URL']!);
const db = drizzle(sql, { schema });

// Keyword-based photos so each item shows a relevant picture.
// `lock` keeps the same image for the same item on every load.
const lf = (keywords: string, lock: number) =>
  `https://loremflickr.com/800/1000/${keywords}?lock=${lock}`;
const lfTile = (keywords: string, lock: number) =>
  `https://loremflickr.com/1200/900/${keywords}?lock=${lock}`;

const CATEGORIES = [
  {
    name: 'Kurtas',
    slug: 'kurtas',
    description: 'Everyday and occasion kurtas',
    imageUrl: lfTile('kurta,indian', 31),
    sortOrder: 0,
  },
  {
    name: 'Sarees',
    slug: 'sarees',
    description: 'Handwoven and silk sarees',
    imageUrl: lfTile('saree', 32),
    sortOrder: 1,
  },
  {
    name: 'Lehengas',
    slug: 'lehengas',
    description: 'Festive and bridal wear',
    imageUrl: lfTile('lehenga', 33),
    sortOrder: 2,
  },
  {
    name: 'Sherwanis',
    slug: 'sherwanis',
    description: 'Sherwanis and ethnic jackets',
    imageUrl: lfTile('sherwani', 34),
    sortOrder: 3,
  },
  {
    name: 'Dupattas',
    slug: 'dupattas',
    description: 'Dupattas, stoles and finishing pieces',
    imageUrl: lfTile('dupatta', 35),
    sortOrder: 4,
  },
  {
    name: 'Home',
    slug: 'home',
    description: 'A small edit of handcrafted objects',
    imageUrl: lfTile('blockprint,textile', 36),
    sortOrder: 5,
  },
];

const SIZES = ['S', 'M', 'L', 'XL'];
const FREE = ['One Size'];

const PRODUCTS = [
  // ── Kurtas ──────────────────────────────────────────────────────────────────
  {
    category: 'kurtas',
    name: 'Chikankari Cotton Kurta',
    slug: 'chikankari-cotton-kurta',
    brand: 'Lucknow Atelier',
    description:
      'A hand-embroidered Lucknowi chikankari kurta in breathable cotton. Light, airy, and made for everyday ease.',
    images: [lf('kurta,indian', 41), lf('chikankari', 42)],
    sizes: SIZES,
    colors: ['Ivory', 'Powder Blue'],
    price: '2200.00',
    compareAtPrice: '2800.00',
  },
  {
    category: 'kurtas',
    name: 'Silk Bandhgala Kurta',
    slug: 'silk-bandhgala-kurta',
    brand: 'Banaras Loom',
    description:
      'A festive bandhgala-collar kurta in a soft silk blend with subtle self-weave. Pairs with churidar or trousers.',
    images: [lf('kurta,silk', 43)],
    sizes: SIZES,
    colors: ['Maroon', 'Bottle Green'],
    price: '3400.00',
    compareAtPrice: null,
  },
  // ── Sarees ──────────────────────────────────────────────────────────────────
  {
    category: 'sarees',
    name: 'Banarasi Silk Saree',
    slug: 'banarasi-silk-saree',
    brand: 'Banaras Loom',
    description:
      'A pure Banarasi silk saree with intricate zari work and a contrast pallu. Comes with an unstitched blouse piece.',
    images: [lf('saree,silk', 44), lf('banarasi', 45)],
    sizes: FREE,
    colors: ['Deep Red', 'Royal Blue', 'Emerald'],
    price: '8900.00',
    compareAtPrice: '11500.00',
  },
  {
    category: 'sarees',
    name: 'Handwoven Cotton Saree',
    slug: 'handwoven-cotton-saree',
    brand: 'Kashida',
    description:
      'A lightweight handloom cotton saree with a woven temple border. Everyday elegance, made to drape softly.',
    images: [lf('cotton,saree', 46)],
    sizes: FREE,
    colors: ['Mustard', 'Indigo'],
    price: '3200.00',
    compareAtPrice: null,
  },
  // ── Lehengas ────────────────────────────────────────────────────────────────
  {
    category: 'lehengas',
    name: 'Embroidered Bridal Lehenga',
    slug: 'embroidered-bridal-lehenga',
    brand: 'Jaipur Atelier',
    description:
      'A hand-embroidered bridal lehenga with sequin and zardozi work, a flared skirt, blouse, and net dupatta.',
    images: [lf('lehenga,bridal', 47), lf('lehenga', 48)],
    sizes: ['S', 'M', 'L'],
    colors: ['Rani Pink', 'Wine'],
    price: '18500.00',
    compareAtPrice: '24000.00',
  },
  {
    category: 'lehengas',
    name: 'Georgette Anarkali Suit',
    slug: 'georgette-anarkali-suit',
    brand: 'Anaya',
    description:
      'A floor-length Anarkali in flowing georgette with a fitted yoke and matching dupatta. Festive without the weight.',
    images: [lf('anarkali,suit', 49)],
    sizes: ['S', 'M', 'L'],
    colors: ['Teal', 'Blush'],
    price: '5600.00',
    compareAtPrice: null,
  },
  // ── Sherwanis & Jackets ─────────────────────────────────────────────────────
  {
    category: 'sherwanis',
    name: 'Classic Sherwani',
    slug: 'classic-sherwani',
    brand: 'Jaipur Atelier',
    description:
      'A regal sherwani in textured jacquard with thread embroidery and covered buttons. Includes a churidar.',
    images: [lf('sherwani', 50), lf('sherwani,groom', 51)],
    sizes: SIZES,
    colors: ['Cream', 'Gold'],
    price: '12900.00',
    compareAtPrice: null,
  },
  {
    category: 'sherwanis',
    name: 'Nehru Jacket',
    slug: 'nehru-jacket',
    brand: 'Indigo & Ochre',
    description:
      'A tailored bandhgala Nehru jacket in handwoven cotton-silk. Layer it over a kurta for an instant occasion look.',
    images: [lf('nehru,jacket', 52)],
    sizes: SIZES,
    colors: ['Black', 'Rust'],
    price: '3800.00',
    compareAtPrice: '4600.00',
  },
  // ── Dupattas & Accessories ──────────────────────────────────────────────────
  {
    category: 'dupattas',
    name: 'Phulkari Dupatta',
    slug: 'phulkari-dupatta',
    brand: 'Kashida',
    description:
      'A hand-embroidered Phulkari dupatta in vibrant floss silk on a soft cotton base. A finishing piece for any kurta.',
    images: [lf('dupatta,phulkari', 53)],
    sizes: FREE,
    colors: ['Fuchsia', 'Marigold'],
    price: '1900.00',
    compareAtPrice: null,
  },
  {
    category: 'dupattas',
    name: 'Embroidered Potli Bag',
    slug: 'embroidered-potli-bag',
    brand: 'Anaya',
    description:
      'A drawstring potli clutch with zardozi embroidery and a beaded handle. Just enough room for the essentials.',
    images: [lf('potli,clutch', 54)],
    sizes: FREE,
    colors: ['Gold', 'Maroon'],
    price: '1400.00',
    compareAtPrice: null,
  },
  // ── Home (the few handcrafted objects) ──────────────────────────────────────
  {
    category: 'home',
    name: 'Block-Print Cushion Cover',
    slug: 'block-print-cushion-cover',
    brand: 'Mitti Studio',
    description:
      'A hand block-printed cotton cushion cover in natural dyes. Set of two, 16×16 inch, covers only.',
    images: [lf('blockprint,cushion', 55)],
    sizes: FREE,
    colors: ['Indigo', 'Madder Red'],
    price: '850.00',
    compareAtPrice: null,
  },
  {
    category: 'home',
    name: 'Brass Diya Set',
    slug: 'brass-diya-set',
    brand: 'Mitti Studio',
    description:
      'A set of five hand-finished brass diyas with a warm antique patina. For festivals and quiet evenings alike.',
    images: [lf('brass,diya', 56)],
    sizes: FREE,
    colors: ['Antique Brass'],
    price: '1200.00',
    compareAtPrice: '1500.00',
  },
];

// Build variant rows: one per colour × size combination.
function buildVariants(p: (typeof PRODUCTS)[number]) {
  const sizeKey = (p as { sizeLabel?: string }).sizeLabel ?? 'Size';
  const skuBase = p.slug
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 6)
    .toUpperCase();
  const rows: {
    sku: string;
    attributes: Record<string, string>;
    price: string;
    compareAtPrice: string | null;
    stock: number;
  }[] = [];

  let n = 1;
  for (const color of p.colors) {
    for (const size of p.sizes) {
      const attributes: Record<string, string> = { Color: color };
      if (size !== 'One Size') attributes[sizeKey] = size;
      rows.push({
        sku: `${skuBase}-${String(n).padStart(3, '0')}`,
        attributes,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        stock: 20 + ((n * 7) % 60),
      });
      n++;
    }
  }
  return rows;
}

async function seed() {
  console.log('🌱 Seeding database (Indian wear catalogue)...');

  // ── Reset: hide any previously-seeded demo products that aren't part of this
  // catalogue, and clear the old categories. Soft-delete (not row delete) keeps
  // things FK-safe for any orders/reviews that reference them. Scoped by slug so
  // re-running this seed doesn't hide the current products.
  console.log('  → resetting old demo data');
  const keepSlugs = PRODUCTS.map((p) => p.slug);
  await db
    .update(schema.products)
    .set({ isPublished: false, deletedAt: new Date(), categoryId: null })
    .where(notInArray(schema.products.slug, keepSlugs));
  await db.delete(schema.categories).where(
    notInArray(
      schema.categories.slug,
      CATEGORIES.map((c) => c.slug),
    ),
  );

  // ── Categories
  console.log('  → categories');
  await db.insert(schema.categories).values(CATEGORIES).onConflictDoNothing();
  const allCats = await db
    .select({ id: schema.categories.id, slug: schema.categories.slug })
    .from(schema.categories);
  const catMap = new Map(allCats.map((c) => [c.slug, c.id]));
  console.log(`     ${catMap.size} categories ready`);

  // ── Products
  let productCount = 0;
  for (const p of PRODUCTS) {
    const categoryId = catMap.get(p.category);
    if (!categoryId) {
      console.warn(`  ⚠ Category "${p.category}" not found, skipping ${p.slug}`);
      continue;
    }

    const [inserted] = await db
      .insert(schema.products)
      .values({
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        description: p.description,
        categoryId,
        isPublished: true,
      })
      .onConflictDoNothing()
      .returning({ id: schema.products.id });

    if (!inserted) {
      console.log(`  → skip existing: ${p.slug}`);
      continue;
    }

    const productId = inserted.id;

    await db
      .insert(schema.productImages)
      .values(p.images.map((url, i) => ({ productId, url, alt: p.name, sortOrder: i })));

    await db.insert(schema.productVariants).values(
      buildVariants(p).map((v) => ({
        productId,
        sku: v.sku,
        attributes: v.attributes,
        price: v.price,
        compareAtPrice: v.compareAtPrice ?? null,
        stockQty: v.stock,
      })),
    );

    productCount++;
  }

  console.log(`  → ${productCount} products seeded`);
  console.log('✅ Done!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
