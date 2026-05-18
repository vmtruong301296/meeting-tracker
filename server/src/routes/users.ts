import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /users — list all users (for assignee picker)
router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

// PATCH /users/me/theme
const themeSchema = z.object({ theme: z.enum(['DARK', 'LIGHT']) });

router.patch('/me/theme', async (req, res, next) => {
  try {
    const { theme } = themeSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { theme },
      select: { id: true, email: true, name: true, role: true, theme: true },
    });
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

export default router;
