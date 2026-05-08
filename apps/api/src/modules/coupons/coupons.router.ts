import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validateAndCalculate } from './coupon-helpers.js';

export const couponsRouter = Router();
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
