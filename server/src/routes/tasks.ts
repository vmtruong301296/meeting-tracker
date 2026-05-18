import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'ISSUE', 'CANCELLED'] as const;

async function checkTaskAccess(taskId: string, userId: string, role: string) {
  const t = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      member: {
        select: {
          userId: true,
          group: { select: { meeting: { select: { ownerId: true } } } },
        },
      },
    },
  });
  if (!t) return { state: 'notfound' as const };
  const ownerId = t.member.group.meeting.ownerId;
  if (role === 'ADMIN' || ownerId === userId) return { state: 'ok' as const, isOwner: ownerId === userId };
  // Member with assignment can edit own task
  if (t.member.userId === userId) return { state: 'ok' as const, isOwner: false };
  return { state: 'forbidden' as const };
}

const createSchema = z.object({
  memberId: z.string(),
  title: z.string().min(1).max(500),
  note: z.string().optional(),
  status: z.enum(STATUSES).optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const { memberId, title, note, status } = createSchema.parse(req.body);
    const m = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        userId: true,
        group: { select: { meeting: { select: { ownerId: true } } } },
      },
    });
    if (!m) return res.status(404).json({ error: 'Member not found' });
    const owner = m.group.meeting.ownerId;
    if (req.user!.role !== 'ADMIN' && owner !== req.user!.userId && m.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const count = await prisma.task.count({ where: { memberId } });
    const task = await prisma.task.create({
      data: {
        memberId,
        title,
        note: note ?? null,
        status: status ?? 'TODO',
        position: count,
      },
      include: { comments: { include: { author: { select: { id: true, name: true } } } } },
    });
    res.status(201).json({ task });
  } catch (e) {
    next(e);
  }
});

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  note: z.string().nullable().optional(),
  status: z.enum(STATUSES).optional(),
  position: z.number().int().optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const access = await checkTaskAccess(req.params.id, req.user!.userId, req.user!.role);
    if (access.state === 'notfound') return res.status(404).json({ error: 'Task not found' });
    if (access.state === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    const data = updateSchema.parse(req.body);
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: { comments: { include: { author: { select: { id: true, name: true } } } } },
    });
    res.json({ task });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const access = await checkTaskAccess(req.params.id, req.user!.userId, req.user!.role);
    if (access.state === 'notfound') return res.status(404).json({ error: 'Task not found' });
    if (access.state === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// --- Comments ---
const commentSchema = z.object({ content: z.string().min(1).max(2000) });

router.post('/:id/comments', async (req, res, next) => {
  try {
    const access = await checkTaskAccess(req.params.id, req.user!.userId, req.user!.role);
    if (access.state === 'notfound') return res.status(404).json({ error: 'Task not found' });
    if (access.state === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    const { content } = commentSchema.parse(req.body);
    const comment = await prisma.taskComment.create({
      data: { taskId: req.params.id, authorId: req.user!.userId, content },
      include: { author: { select: { id: true, name: true } } },
    });
    res.status(201).json({ comment });
  } catch (e) {
    next(e);
  }
});

router.delete('/comments/:commentId', async (req, res, next) => {
  try {
    const c = await prisma.taskComment.findUnique({
      where: { id: req.params.commentId },
      select: { authorId: true },
    });
    if (!c) return res.status(404).json({ error: 'Comment not found' });
    if (c.authorId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.taskComment.delete({ where: { id: req.params.commentId } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
