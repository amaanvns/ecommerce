import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, ne } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { addresses } from '../../db/schema/index.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';

export const addressesRouter = Router();
addressesRouter.use(authenticate);

const addressSchema = z.object({
  label: z.string().max(100).optional(),
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2).default('IN'),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// GET /api/v1/addresses — list (default first, then newest)
addressesRouter.get('/', async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, req.user!.sub))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/addresses — create
addressesRouter.post('/', async (req, res, next) => {
  try {
    const body = addressSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }
    const userId = req.user!.sub;

    const existing = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId));

    if (existing.length >= 20) {
      throw new AppError(400, 'Address limit reached — delete an old address first');
    }

    // First address is always the default; otherwise honour the flag
    const makeDefault = body.data.isDefault || existing.length === 0;

    if (makeDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    }

    const [created] = await db
      .insert(addresses)
      .values({ ...body.data, userId, isDefault: makeDefault })
      .returning();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/addresses/:id — update
addressesRouter.patch('/:id', async (req, res, next) => {
  try {
    const body = addressSchema.partial().safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }
    const userId = req.user!.sub;

    const [existing] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, req.params.id), eq(addresses.userId, userId)))
      .limit(1);
    if (!existing) throw new AppError(404, 'Address not found');

    if (body.data.isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(and(eq(addresses.userId, userId), ne(addresses.id, existing.id)));
    }

    const [updated] = await db
      .update(addresses)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(addresses.id, existing.id))
      .returning();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/addresses/:id — delete (promote another to default if needed)
addressesRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const [existing] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, req.params.id), eq(addresses.userId, userId)))
      .limit(1);
    if (!existing) throw new AppError(404, 'Address not found');

    await db.delete(addresses).where(eq(addresses.id, existing.id));

    // If we removed the default, promote the most recent remaining address
    if (existing.isDefault) {
      const [next] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.createdAt))
        .limit(1);
      if (next) {
        await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
      }
    }

    res.json({ data: { id: existing.id } });
  } catch (err) {
    next(err);
  }
});
