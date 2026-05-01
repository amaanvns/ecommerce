import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { users, refreshTokens } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signTokens(userId: string, role: string, email: string) {
  const payload = { sub: userId, role, email };
  const opts = (exp: string): jwt.SignOptions => ({
    expiresIn: exp as jwt.SignOptions['expiresIn'],
  });
  const accessToken = jwt.sign(payload, env.JWT_SECRET, opts(env.JWT_EXPIRES_IN));
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, opts(env.JWT_REFRESH_EXPIRES_IN));
  return { accessToken, refreshToken };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });
    if (existing) throw new AppError(409, 'Email already registered');

    const passwordHash = await argon2.hash(body.password);
    const [user] = await db
      .insert(users)
      .values({ name: body.name, email: body.email, passwordHash })
      .returning({ id: users.id, email: users.email, role: users.role, name: users.name });

    const { accessToken, refreshToken } = signTokens(user.id, user.role, user.email);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({ userId: user.id, token: refreshToken, expiresAt });

    res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
    if (!user || !user.passwordHash) throw new AppError(401, 'Invalid credentials');
    if (user.isBlocked) throw new AppError(403, 'Account blocked');

    const valid = await argon2.verify(user.passwordHash, body.password);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const { accessToken, refreshToken } = signTokens(user.id, user.role, user.email);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({ userId: user.id, token: refreshToken, expiresAt });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);

    let payload: { sub: string; role: string; email: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as typeof payload;
    } catch {
      throw new AppError(401, 'Invalid refresh token');
    }

    const stored = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, refreshToken),
    });
    if (!stored || stored.expiresAt < new Date()) throw new AppError(401, 'Refresh token expired');

    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));

    const tokens = signTokens(payload.sub, payload.role, payload.email);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db
      .insert(refreshTokens)
      .values({ userId: payload.sub, token: tokens.refreshToken, expiresAt });

    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
