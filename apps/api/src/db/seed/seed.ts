import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../schema/index.js';

const sql = neon(process.env['DATABASE_URL']!);
const db = drizzle(sql, { schema });

const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', description: 'Gadgets and devices', sortOrder: 0 },
  { name: 'Clothing', slug: 'clothing', description: 'Fashion for everyone', sortOrder: 1 },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'For your living space',
    sortOrder: 2,
  },
  { name: 'Sports', slug: 'sports', description: 'Gear and equipment', sortOrder: 3 },
  { name: 'Books', slug: 'books', description: 'Expand your mind', sortOrder: 4 },
];

const PRODUCTS = [
  // Electronics
  {
    category: 'electronics',
    name: 'Wireless Noise-Cancelling Headphones',
    slug: 'wireless-nc-headphones',
    brand: 'SoundPro',
    description:
      'Premium over-ear headphones with active noise cancellation, 30-hour battery, and crystal-clear audio.',
    images: [
      'https://picsum.photos/seed/headphones1/800/800',
      'https://picsum.photos/seed/headphones2/800/800',
    ],
    variants: [
      {
        sku: 'SNP-HP-BLK',
        attributes: { Color: 'Black' },
        price: '149.99',
        compareAtPrice: '199.99',
        stock: 42,
      },
      {
        sku: 'SNP-HP-WHT',
        attributes: { Color: 'White' },
        price: '149.99',
        compareAtPrice: '199.99',
        stock: 18,
      },
    ],
  },
  {
    category: 'electronics',
    name: 'Smart Watch Series X',
    slug: 'smart-watch-series-x',
    brand: 'TechWear',
    description:
      'Track fitness, receive notifications, and monitor your health with this sleek smartwatch featuring GPS and a 7-day battery life.',
    images: [
      'https://picsum.photos/seed/watch1/800/800',
      'https://picsum.photos/seed/watch2/800/800',
    ],
    variants: [
      {
        sku: 'TW-SWX-40',
        attributes: { Size: '40mm', Color: 'Midnight' },
        price: '249.00',
        compareAtPrice: '299.00',
        stock: 30,
      },
      {
        sku: 'TW-SWX-44',
        attributes: { Size: '44mm', Color: 'Midnight' },
        price: '279.00',
        compareAtPrice: '329.00',
        stock: 25,
      },
      {
        sku: 'TW-SWX-40S',
        attributes: { Size: '40mm', Color: 'Silver' },
        price: '249.00',
        compareAtPrice: '299.00',
        stock: 12,
      },
    ],
  },
  {
    category: 'electronics',
    name: '4K Ultra HD Monitor 27"',
    slug: '4k-monitor-27',
    brand: 'ViewTech',
    description:
      '27-inch IPS display with 4K resolution, HDR support, USB-C, and 144Hz refresh rate — perfect for work and gaming.',
    images: [
      'https://picsum.photos/seed/monitor1/800/800',
      'https://picsum.photos/seed/monitor2/800/800',
    ],
    variants: [
      { sku: 'VT-MON-27', attributes: {}, price: '399.00', compareAtPrice: '499.00', stock: 15 },
    ],
  },
  {
    category: 'electronics',
    name: 'Portable Bluetooth Speaker',
    slug: 'portable-bluetooth-speaker',
    brand: 'SoundPro',
    description:
      'Waterproof IPX7 speaker with 360° sound, 20-hour playback, and built-in power bank.',
    images: ['https://picsum.photos/seed/speaker1/800/800'],
    variants: [
      {
        sku: 'SNP-SPK-BLU',
        attributes: { Color: 'Ocean Blue' },
        price: '79.99',
        compareAtPrice: null,
        stock: 60,
      },
      {
        sku: 'SNP-SPK-GRN',
        attributes: { Color: 'Forest Green' },
        price: '79.99',
        compareAtPrice: null,
        stock: 45,
      },
    ],
  },
  // Clothing
  {
    category: 'clothing',
    name: 'Classic Cotton T-Shirt',
    slug: 'classic-cotton-tshirt',
    brand: 'BasicWear',
    description: '100% organic cotton tee. Relaxed fit, pre-shrunk, available in 12 colours.',
    images: ['https://picsum.photos/seed/tshirt1/800/800'],
    variants: [
      {
        sku: 'BW-TS-WHT-S',
        attributes: { Color: 'White', Size: 'S' },
        price: '24.99',
        compareAtPrice: null,
        stock: 100,
      },
      {
        sku: 'BW-TS-WHT-M',
        attributes: { Color: 'White', Size: 'M' },
        price: '24.99',
        compareAtPrice: null,
        stock: 100,
      },
      {
        sku: 'BW-TS-WHT-L',
        attributes: { Color: 'White', Size: 'L' },
        price: '24.99',
        compareAtPrice: null,
        stock: 80,
      },
      {
        sku: 'BW-TS-BLK-S',
        attributes: { Color: 'Black', Size: 'S' },
        price: '24.99',
        compareAtPrice: null,
        stock: 90,
      },
      {
        sku: 'BW-TS-BLK-M',
        attributes: { Color: 'Black', Size: 'M' },
        price: '24.99',
        compareAtPrice: null,
        stock: 110,
      },
      {
        sku: 'BW-TS-BLK-L',
        attributes: { Color: 'Black', Size: 'L' },
        price: '24.99',
        compareAtPrice: null,
        stock: 75,
      },
    ],
  },
  {
    category: 'clothing',
    name: 'Slim Fit Chino Pants',
    slug: 'slim-fit-chino-pants',
    brand: 'UrbanEdge',
    description: 'Modern slim-fit chinos crafted from stretch-cotton blend. Wrinkle-resistant.',
    images: ['https://picsum.photos/seed/chino1/800/800'],
    variants: [
      {
        sku: 'UE-CH-KHK-30',
        attributes: { Color: 'Khaki', Waist: '30' },
        price: '59.99',
        compareAtPrice: '74.99',
        stock: 40,
      },
      {
        sku: 'UE-CH-KHK-32',
        attributes: { Color: 'Khaki', Waist: '32' },
        price: '59.99',
        compareAtPrice: '74.99',
        stock: 35,
      },
      {
        sku: 'UE-CH-NVY-30',
        attributes: { Color: 'Navy', Waist: '30' },
        price: '59.99',
        compareAtPrice: '74.99',
        stock: 28,
      },
    ],
  },
  // Home & Garden
  {
    category: 'home-garden',
    name: 'Ergonomic Office Chair',
    slug: 'ergonomic-office-chair',
    brand: 'ComfortSeat',
    description:
      'Fully adjustable lumbar support, breathable mesh back, 4D armrests. Built for long work sessions.',
    images: [
      'https://picsum.photos/seed/chair1/800/800',
      'https://picsum.photos/seed/chair2/800/800',
    ],
    variants: [
      {
        sku: 'CS-CHAIR-BLK',
        attributes: { Color: 'Black' },
        price: '349.00',
        compareAtPrice: '449.00',
        stock: 20,
      },
      {
        sku: 'CS-CHAIR-GRY',
        attributes: { Color: 'Grey' },
        price: '349.00',
        compareAtPrice: '449.00',
        stock: 10,
      },
    ],
  },
  {
    category: 'home-garden',
    name: 'Ceramic Plant Pot Set',
    slug: 'ceramic-plant-pot-set',
    brand: 'GreenHome',
    description: 'Set of 3 handcrafted ceramic pots with drainage holes and matching saucers.',
    images: ['https://picsum.photos/seed/pots1/800/800'],
    variants: [
      {
        sku: 'GH-POT-TER',
        attributes: { Color: 'Terracotta' },
        price: '34.99',
        compareAtPrice: null,
        stock: 55,
      },
      {
        sku: 'GH-POT-WHT',
        attributes: { Color: 'White' },
        price: '34.99',
        compareAtPrice: null,
        stock: 48,
      },
    ],
  },
  // Sports
  {
    category: 'sports',
    name: 'Yoga Mat Premium',
    slug: 'yoga-mat-premium',
    brand: 'FlexFit',
    description:
      '6mm thick non-slip TPE yoga mat with carrying strap. Eco-friendly and sweat-resistant.',
    images: ['https://picsum.photos/seed/yoga1/800/800'],
    variants: [
      {
        sku: 'FF-YM-PUR',
        attributes: { Color: 'Purple' },
        price: '44.99',
        compareAtPrice: '59.99',
        stock: 70,
      },
      {
        sku: 'FF-YM-BLU',
        attributes: { Color: 'Blue' },
        price: '44.99',
        compareAtPrice: '59.99',
        stock: 65,
      },
    ],
  },
  {
    category: 'sports',
    name: 'Adjustable Dumbbell Set',
    slug: 'adjustable-dumbbell-set',
    brand: 'IronCore',
    description:
      'Space-saving adjustable dumbbells ranging 5–52.5 lbs per hand with quick-change dial.',
    images: ['https://picsum.photos/seed/dumbbell1/800/800'],
    variants: [
      { sku: 'IC-DB-SET', attributes: {}, price: '299.00', compareAtPrice: '349.00', stock: 22 },
    ],
  },
  // Books
  {
    category: 'books',
    name: 'Clean Code',
    slug: 'clean-code',
    brand: 'Prentice Hall',
    description:
      'A handbook of agile software craftsmanship by Robert C. Martin. Essential reading for every developer.',
    images: ['https://picsum.photos/seed/cleancode/800/800'],
    variants: [
      {
        sku: 'BK-CC-PB',
        attributes: { Format: 'Paperback' },
        price: '39.99',
        compareAtPrice: null,
        stock: 200,
      },
      {
        sku: 'BK-CC-EB',
        attributes: { Format: 'eBook' },
        price: '19.99',
        compareAtPrice: null,
        stock: 9999,
      },
    ],
  },
  {
    category: 'books',
    name: 'The Pragmatic Programmer',
    slug: 'pragmatic-programmer',
    brand: 'Addison-Wesley',
    description: '20th Anniversary Edition. Timeless lessons on software engineering excellence.',
    images: ['https://picsum.photos/seed/pragprog/800/800'],
    variants: [
      {
        sku: 'BK-PP-PB',
        attributes: { Format: 'Paperback' },
        price: '44.99',
        compareAtPrice: null,
        stock: 150,
      },
      {
        sku: 'BK-PP-EB',
        attributes: { Format: 'eBook' },
        price: '24.99',
        compareAtPrice: null,
        stock: 9999,
      },
    ],
  },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // Insert categories
  console.log('  → categories');
  await db.insert(schema.categories).values(CATEGORIES).onConflictDoNothing();

  // Build slug → id map (merge newly inserted + already existing)
  const allCats = await db
    .select({ id: schema.categories.id, slug: schema.categories.slug })
    .from(schema.categories);
  const catMap = new Map(allCats.map((c) => [c.slug, c.id]));

  console.log(`     ${catMap.size} categories ready`);

  // Insert products + images + variants
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
      p.variants.map((v) => ({
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
