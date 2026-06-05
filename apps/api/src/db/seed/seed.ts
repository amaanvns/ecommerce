import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, notInArray } from 'drizzle-orm';
import * as schema from '../schema/index.js';

const sql = neon(process.env['DATABASE_URL']!);
const db = drizzle(sql, { schema });

// Curated, hand-checked Unsplash photos (all verified to load) so each item
// and department shows a clear, relevant picture.
const u = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80`;

const CATEGORIES = [
  {
    name: 'Kurtas',
    slug: 'kurtas',
    description: 'Everyday and occasion kurtas',
    imageUrl: u('1620730389810-9076d9dfff84', 1200),
    sortOrder: 0,
  },
  {
    name: 'Sarees',
    slug: 'sarees',
    description: 'Handwoven and silk sarees',
    imageUrl: u('1615886753866-79396abc446e', 1200),
    sortOrder: 1,
  },
  {
    name: 'Lehengas',
    slug: 'lehengas',
    description: 'Festive and bridal wear',
    imageUrl: u('1601571115502-83ca3095735b', 1200),
    sortOrder: 2,
  },
  {
    name: 'Sherwanis',
    slug: 'sherwanis',
    description: 'Sherwanis and ethnic jackets',
    imageUrl: u('1534217466718-ef4950786e24', 1200),
    sortOrder: 3,
  },
  {
    name: 'Dupattas',
    slug: 'dupattas',
    description: 'Dupattas, stoles and finishing pieces',
    imageUrl: u('1717585679395-bbe39b5fb6bc', 1200),
    sortOrder: 4,
  },
  {
    name: 'Home',
    slug: 'home',
    description: 'A small edit of handcrafted objects',
    imageUrl: u('1766994063823-ed214f883548', 1200),
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
    images: [u('1727835523545-70ee992b5763'), u('1622780432053-767528938f34')],
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
    images: [u('1628250521470-28c1fc54616c'), u('1667665970124-2273c6ef3489')],
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
    images: [u('1618901185975-d59f7091bcfe'), u('1617627143750-d86bc21e42bb')],
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
    images: [u('1610030469983-98e550d6193c'), u('1609748340041-f5d61e061ebc')],
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
    images: [u('1668371679302-a8ec781e876e'), u('1619715613791-89d35b51ff81')],
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
    images: [u('1574847872646-abff244bbd87'), u('1602210901882-071c6b9e239d')],
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
    images: [u('1610047402714-307d99a677db'), u('1534217466718-ef4950786e24')],
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
    images: [u('1555447405-057915b40299')],
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
    images: [u('1717586756136-d9a3eeb1fa6f')],
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
    images: [u('1714525316498-138fa36e2ddd')],
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
    images: [u('1773846012458-e6a66c26e49f'), u('1768651925876-637f68cd64f6')],
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
    images: [u('1605292356183-a77d0a9c9d1d'), u('1574266742257-41460b7992ee')],
    sizes: FREE,
    colors: ['Antique Brass'],
    price: '1200.00',
    compareAtPrice: '1500.00',
  },
];

// Build variant rows: one per colour × size combination.
// `index` is the product's position in PRODUCTS — it's baked into the SKU so
// two products that share the same opening letters can't collide.
function buildVariants(p: (typeof PRODUCTS)[number], index: number) {
  const sizeKey = (p as { sizeLabel?: string }).sizeLabel ?? 'Size';
  const skuBase = `${p.slug
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 4)
    .toUpperCase()}${index + 1}`;
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

  // ── Reset: hide demo products that aren't part of this catalogue, and remove
  // stale categories. Soft-delete keeps it FK-safe for existing orders/reviews.
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

  // ── Categories (upsert: insert new, refresh image/description on existing)
  console.log('  → categories');
  for (const c of CATEGORIES) {
    const [existing] = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.slug, c.slug))
      .limit(1);
    if (existing) {
      await db
        .update(schema.categories)
        .set({
          name: c.name,
          description: c.description,
          imageUrl: c.imageUrl,
          sortOrder: c.sortOrder,
        })
        .where(eq(schema.categories.id, existing.id));
    } else {
      await db.insert(schema.categories).values(c);
    }
  }
  const allCats = await db
    .select({ id: schema.categories.id, slug: schema.categories.slug })
    .from(schema.categories);
  const catMap = new Map(allCats.map((c) => [c.slug, c.id]));
  console.log(`     ${catMap.size} categories ready`);

  // ── Products (upsert by slug). Images are always refreshed (no inbound FK,
  // so safe to replace). Variants are only created when missing — never deleted
  // — so existing test orders that reference them stay intact.
  let productCount = 0;
  for (const [pi, p] of PRODUCTS.entries()) {
    const categoryId = catMap.get(p.category);
    if (!categoryId) {
      console.warn(`  ⚠ Category "${p.category}" not found, skipping ${p.slug}`);
      continue;
    }

    const [existing] = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, p.slug))
      .limit(1);

    let productId: string;
    if (existing) {
      await db
        .update(schema.products)
        .set({
          name: p.name,
          brand: p.brand,
          description: p.description,
          categoryId,
          isPublished: true,
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, existing.id));
      productId = existing.id;
    } else {
      const [ins] = await db
        .insert(schema.products)
        .values({
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          description: p.description,
          categoryId,
          isPublished: true,
        })
        .returning({ id: schema.products.id });
      productId = ins.id;
    }

    // Refresh images (delete + reinsert — images have no inbound FK).
    await db.delete(schema.productImages).where(eq(schema.productImages.productId, productId));
    await db
      .insert(schema.productImages)
      .values(p.images.map((url, i) => ({ productId, url, alt: p.name, sortOrder: i })));

    // Ensure variants exist (create only when the product has none).
    const variants = await db
      .select({ id: schema.productVariants.id })
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, productId));
    if (variants.length === 0) {
      await db.insert(schema.productVariants).values(
        buildVariants(p, pi).map((v) => ({
          productId,
          sku: v.sku,
          attributes: v.attributes,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          stockQty: v.stock,
        })),
      );
    }

    productCount++;
  }

  console.log(`  → ${productCount} products ready`);
  console.log('✅ Done!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
