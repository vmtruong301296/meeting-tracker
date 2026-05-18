import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const MEMBER_COLORS = ['sky', 'violet', 'rose', 'emerald', 'amber', 'slate'] as const;

const pickMemberColor = (position: number) => MEMBER_COLORS[position % MEMBER_COLORS.length];

async function checkMemberAccess(memberId: string, userId: string, role: string) {
  const m = await prisma.member.findUnique({
    where: { id: memberId },
    select: { group: { select: { meeting: { select: { ownerId: true } } } } },
  });
  if (!m) return 'notfound';
  if (role !== 'ADMIN' && m.group.meeting.ownerId !== userId) return 'forbidden';
  return 'ok';
}

const createSchema = z.object({
  groupId: z.string(),
  name: z.string().min(1).max(120),
  userId: z.string().nullable().optional(),
  color: z.enum(MEMBER_COLORS).optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const { groupId, name, userId, color } = createSchema.parse(req.body);
    const g = await prisma.group.findUnique({
      where: { id: groupId },
      select: { meeting: { select: { ownerId: true } } },
    });
    if (!g) return res.status(404).json({ error: 'Group not found' });
    if (req.user!.role !== 'ADMIN' && g.meeting.ownerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const count = await prisma.member.count({ where: { groupId } });
    const member = await prisma.member.create({
      data: {
        groupId,
        name,
        userId: userId || null,
        position: count,
        color: color ?? pickMemberColor(count),
      },
      include: { tasks: true },
    });
    res.status(201).json({ member });
  } catch (e) {
    next(e);
  }
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  userId: z.string().nullable().optional(),
  color: z.enum(MEMBER_COLORS).optional(),
  position: z.number().int().optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const access = await checkMemberAccess(req.params.id, req.user!.userId, req.user!.role);
    if (access === 'notfound') return res.status(404).json({ error: 'Member not found' });
    if (access === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    const data = updateSchema.parse(req.body);
    const member = await prisma.member.update({ where: { id: req.params.id }, data });
    res.json({ member });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const access = await checkMemberAccess(req.params.id, req.user!.userId, req.user!.role);
    if (access === 'notfound') return res.status(404).json({ error: 'Member not found' });
    if (access === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    await prisma.member.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
