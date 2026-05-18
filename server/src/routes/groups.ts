import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

async function checkGroupAccess(groupId: string, userId: string, role: string) {
  const g = await prisma.group.findUnique({
    where: { id: groupId },
    select: { meeting: { select: { ownerId: true } } },
  });
  if (!g) return 'notfound';
  if (role !== 'ADMIN' && g.meeting.ownerId !== userId) return 'forbidden';
  return 'ok';
}

const GROUP_COLORS = ['amber', 'rose', 'emerald', 'sky', 'violet', 'slate'] as const;

const createSchema = z.object({
  meetingId: z.string(),
  name: z.string().min(1).max(120),
  color: z.enum(GROUP_COLORS).optional(),
  position: z.number().int().optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const { meetingId, name, color, position } = createSchema.parse(req.body);
    const m = await prisma.meeting.findUnique({ where: { id: meetingId }, select: { ownerId: true } });
    if (!m) return res.status(404).json({ error: 'Meeting not found' });
    if (req.user!.role !== 'ADMIN' && m.ownerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const count = await prisma.group.count({ where: { meetingId } });
    const group = await prisma.group.create({
      data: { meetingId, name, color: color ?? 'amber', position: position ?? count },
      include: { members: { include: { tasks: true } } },
    });
    res.status(201).json({ group });
  } catch (e) {
    next(e);
  }
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  color: z.enum(GROUP_COLORS).optional(),
  collapsed: z.boolean().optional(),
  position: z.number().int().optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const access = await checkGroupAccess(req.params.id, req.user!.userId, req.user!.role);
    if (access === 'notfound') return res.status(404).json({ error: 'Group not found' });
    if (access === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    const data = updateSchema.parse(req.body);
    const group = await prisma.group.update({ where: { id: req.params.id }, data });
    res.json({ group });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const access = await checkGroupAccess(req.params.id, req.user!.userId, req.user!.role);
    if (access === 'notfound') return res.status(404).json({ error: 'Group not found' });
    if (access === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    await prisma.group.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
