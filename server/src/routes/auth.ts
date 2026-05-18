import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { comparePassword, hashPassword, signToken } from '../lib/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(6).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, name, password } = registerSchema.parse(req.body);
    // First user becomes ADMIN automatically
    const count = await prisma.user.count();
    const role = count === 0 ? 'ADMIN' : 'MEMBER';
    const user = await prisma.user.create({
      data: { email, name, password: await hashPassword(password), role },
      select: { id: true, email: true, name: true, role: true, theme: true },
    });
    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({ user, token });
  } catch (e) {
    next(e);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({ userId: user.id, role: user.role });
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, theme: user.theme },
      token,
    });
  } catch (e) {
    next(e);
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, theme: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

export default router;
