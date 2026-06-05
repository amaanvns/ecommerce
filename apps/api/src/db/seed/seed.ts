import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { notInArray } from 'drizzle-orm';
import * as schema from '../schema/index.js';

const sql = neon(process.env['DATABASE_URL']!);
const db = drizzle(sql, { schema });

// Editorial scene photos (proven to load) used for the department tiles.
const SCENE = {
  rack: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80',
  store: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
  folded: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80',
  fashionA: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=1200&q=80',
  fashionB: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=1200&q=80',
  fashionC: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200&q=80',
};

// Keyword-based product photos so each item shows a relevant picture.
// `lock` keeps the same image for the same product on every load.
const lf = (keywords: string, lock: number) =>
  `https://loremflickr.com/800/1000/${keywords}?lock=${lock}`;

const CATEGORIES = [
  {
    name: 'Shirts',
    slug: 'shirts',
    description: 'Considered everyday shirting',
    imageUrl: SCENE.folded,
    sortOrder: 0,
  },
  {
    name: 'Trousers',
    slug: 'trousers',
    description: 'Tailored and relaxed fits',
    imageUrl: SCENE.fashionB,
    sortOrder: 1,
  },
  {
    name: 'Outerwear',
    slug: 'outerwear',
    description: 'Coats and jackets for every season',
    imageUrl: SCENE.rack,
    sortOrder: 2,
  },
  {
    name: 'Knitwear',
    slug: 'knitwear',
    description: 'Natural-fibre knits, made to last',
    imageUrl: SCENE.fashionC,
    sortOrder: 3,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Bags, caps and finishing pieces',
    imageUrl: SCENE.fashionA,
    sortOrder: 4,
  },
  {
    name: 'Home',
    slug: 'home',
    description: 'A small edit of objects for the home',
    imageUrl: SCENE.store,
    sortOrder: 5,
  },
];

const SIZES = ['S', 'M', 'L'];
const WAISTS = ['30', '32', '34'];

const PRODUCTS = [
  // ── Shirts ─────────────────────────────────────────────────────────────────
  {
    category: 'shirts',
    name: 'The Oxford Shirt',
    slug: 'the-oxford-shirt',
    brand: 'Atelier Nord',
    description:
      'A button-down in heavyweight organic Oxford cotton. Cut for an easy, regular fit with a soft collar that wears in beautifully.',
    images: [lf('white,shirt', 11), lf('folded,shirt', 12)],
    sizes: SIZES,
    colors: ['White', 'Sky Blue'],
    price: '2400.00',
    compareAtPrice: '2900.00',
  },
  {
    category: 'shirts',
    name: 'Linen Camp Shirt',
    slug: 'linen-camp-shirt',
    brand: 'Maison Indigo',
    description:
      'A relaxed open-collar shirt in pure European linen. Breathable, lightly textured, and made for warm days.',
    images: [lf('linen,shirt', 13)],
    sizes: SIZES,
    colors: ['Sand', 'Olive'],
    price: '2650.00',
    compareAtPrice: null,
  },
  // ── Trousers ───────────────────────────────────────────────────────────────
  {
    category: 'trousers',
    name: 'Pleated Wool Trouser',
    slug: 'pleated-wool-trouser',
    brand: 'Atelier Nord',
    description:
      'A single-pleat trouser in a mid-weight wool blend with a clean, tapered leg. Smart enough for the office, soft enough for the weekend.',
    images: [lf('wool,trousers', 14)],
    sizes: WAISTS,
    colors: ['Charcoal', 'Stone'],
    price: '3800.00',
    compareAtPrice: null,
    sizeLabel: 'Waist',
  },
  {
    category: 'trousers',
    name: 'Organic Cotton Chino',
    slug: 'organic-cotton-chino',
    brand: 'Field & Co.',
    description:
      'A garment-dyed chino in stretch organic cotton. Wrinkle-resistant with a slim-straight cut.',
    images: [lf('chino,trousers', 15)],
    sizes: WAISTS,
    colors: ['Khaki', 'Navy'],
    price: '2200.00',
    compareAtPrice: '2800.00',
    sizeLabel: 'Waist',
  },
  // ── Outerwear ──────────────────────────────────────────────────────────────
  {
    category: 'outerwear',
    name: 'The Linen Overcoat',
    slug: 'the-linen-overcoat',
    brand: 'Maison Indigo',
    description:
      'An unstructured overcoat in a heavy linen-wool blend. Fully lined, with patch pockets and a single-breasted front.',
    images: [lf('wool,coat', 16), lf('overcoat', 17)],
    sizes: SIZES,
    colors: ['Bone', 'Camel'],
    price: '8900.00',
    compareAtPrice: '11000.00',
  },
  {
    category: 'outerwear',
    name: 'Quilted Field Jacket',
    slug: 'quilted-field-jacket',
    brand: 'Field & Co.',
    description:
      'A diamond-quilted jacket with a corduroy collar and snap front. Lightweight warmth for the in-between months.',
    images: [lf('jacket', 18)],
    sizes: SIZES,
    colors: ['Forest', 'Black'],
    price: '6500.00',
    compareAtPrice: null,
  },
  // ── Knitwear ───────────────────────────────────────────────────────────────
  {
    category: 'knitwear',
    name: 'Merino Crew Knit',
    slug: 'merino-crew-knit',
    brand: 'The Knittery',
    description:
      'A fine-gauge crew-neck in extra-fine merino wool. Soft, breathable, and easy to layer.',
    images: [lf('sweater,knit', 19)],
    sizes: SIZES,
    colors: ['Oatmeal', 'Navy', 'Charcoal'],
    price: '3400.00',
    compareAtPrice: null,
  },
  {
    category: 'knitwear',
    name: 'Lambswool Cardigan',
    slug: 'lambswool-cardigan',
    brand: 'The Knittery',
    description: 'A relaxed cardigan in brushed lambswool with corozo buttons and ribbed cuffs.',
    images: [lf('cardigan,wool', 20)],
    sizes: SIZES,
    colors: ['Moss', 'Ecru'],
    price: '4200.00',
    compareAtPrice: '4900.00',
  },
  // ── Accessories ────────────────────────────────────────────────────────────
  {
    category: 'accessories',
    name: 'Leather Holdall',
    slug: 'leather-holdall',
    brand: 'Hide & Stitch',
    description:
      'A weekend holdall in vegetable-tanned leather that patinas with use. Cotton-twill lining and a detachable strap.',
    images: [lf('leather,bag', 21)],
    sizes: ['One Size'],
    colors: ['Tan', 'Dark Brown'],
    price: '7800.00',
    compareAtPrice: null,
  },
  {
    category: 'accessories',
    name: 'Wool Baker Cap',
    slug: 'wool-baker-cap',
    brand: 'Hide & Stitch',
    description: 'A classic baker-boy cap in a herringbone wool tweed with a quilted lining.',
    images: [lf('flat,cap', 22)],
    sizes: ['One Size'],
    colors: ['Grey', 'Brown'],
    price: '1300.00',
    compareAtPrice: null,
  },
  // ── Home (the few non-clothing pieces) ──────────────────────────────────────
  {
    category: 'home',
    name: 'Soy Wax Candle',
    slug: 'soy-wax-candle',
    brand: 'Ember & Co.',
    description:
      'A hand-poured soy candle with notes of cedar, vetiver and a trace of smoke. 50-hour burn time.',
    images: [lf('candle', 23)],
    sizes: ['One Size'],
    colors: ['Cedar & Smoke'],
    price: '950.00',
    compareAtPrice: null,
  },
  {
    category: 'home',
    name: 'Linen Throw Blanket',
    slug: 'linen-throw-blanket',
    brand: 'Ember & Co.',
    description:
      'A stonewashed linen throw with hand-knotted fringe. Light enough for summer, layered for winter.',
    images: [lf('blanket,linen', 24)],
    sizes: ['One Size'],
    colors: ['Flax', 'Slate'],
    price: '3600.00',
    compareAtPrice: '4200.00',
  },
];

// Build the variant rows for a product: one per colour × size combination.
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
  console.log('🌱 Seeding database (clothing catalogue)...');

  // ── Reset: hide any previously-seeded demo products that aren't part of this
  // clothing catalogue, and clear the old categories. Soft-delete (not row
  // delete) keeps things FK-safe for any orders/reviews that reference them.
  // Scoped by slug so re-running this seed doesn't hide the clothing products.
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
