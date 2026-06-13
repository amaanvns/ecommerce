import { Router } from 'express';
import { z } from 'zod';
import { and, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { coupons } from '../../db/schema/index.js';
import { authenticate } from '../../middleware/auth.js';
import { validateAndCalculate } from './coupon-helpers.js';

export const couponsRouter = Router();

// GET /api/v1/coupons/available — public list of currently-usable offers to show
// at checkout. Defined before the authenticate guard so guests see offers too.
// firstOrderOnly coupons are excluded (we can't know eligibility here; they're
// still appliable by code).
couponsRouter.get('/available', async (_req, res, next) => {
  try {
    const now = new Date();
    const rows = await db
      .select({
        code: coupons.code,
        type: coupons.type,
        value: coupons.value,
        minSubtotal: coupons.minSubtotal,
        maxDiscount: coupons.maxDiscount,
      })
      .from(coupons)
      .where(
        and(
          eq(coupons.isActive, true),
          eq(coupons.firstOrderOnly, false),
          or(isNull(coupons.startsAt), lte(coupons.startsAt, now)),
          or(isNull(coupons.endsAt), gt(coupons.endsAt, now)),
          or(isNull(coupons.usageLimit), sql`${coupons.usedCount} < ${coupons.usageLimit}`),
        ),
      )
      .limit(10);

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

couponsRouter.use(authenticate);

const validateSchema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.number().nonnegative(),
});

// POST /api/v1/coupons/validate
couponsRouter.post('/validate', async (req, res, next) => {
  try {
    const parsed = validateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const result = await validateAndCalculate(
      parsed.data.code,
      parsed.data.subtotal,
      req.user!.sub,
    );

    res.json({
      data: {
        code: result.code,
        type: result.type,
        value: result.value,
        discount: result.discount,
      },
    });
  } catch (err) {
    next(err);
  }
});
