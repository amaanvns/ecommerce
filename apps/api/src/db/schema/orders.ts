import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  jsonb,
  pgEnum,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { productVariants } from './products.js';

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id),
  contactEmail: varchar('contact_email', { length: 255 }),
  status: orderStatusEnum('status').notNull().default('pending'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 10, scale: 2 }).notNull().default('0'),
  tax: numeric('tax', { precision: 10, scale: 2 }).notNull().default('0'),
  shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  // Payment-gateway order id (Razorpay order id). verify-payment matches on this so
  // a signature for one gateway order can never confirm a different store order.
  gatewayOrderRef: varchar('gateway_order_ref', { length: 255 }),
  shippingAddress: jsonb('shipping_address').notNull(),
  billingAddress: jsonb('billing_address'),
  couponId: uuid('coupon_id'),
  notes: text('notes'),
  placedAt: timestamp('placed_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => productVariants.id),
  productNameSnapshot: varchar('product_name_snapshot', { length: 500 }).notNull(),
  skuSnapshot: varchar('sku_snapshot', { length: 100 }),
  qty: integer('qty').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  gateway: varchar('gateway', { length: 50 }).notNull(),
  gatewayRef: varchar('gateway_ref', { length: 255 }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  status: varchar('status', { length: 50 }).notNull(),
  rawResponse: jsonb('raw_response'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const shipments = pgTable('shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  carrier: varchar('carrier', { length: 100 }),
  trackingNumber: varchar('tracking_number', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
