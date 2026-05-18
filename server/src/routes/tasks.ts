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
      assigneeId: true,
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
  if (role === 'ADMIN' || ownerId === userId) return { state: 'ok' as const };
  if (t.member.userId === userId || t.assigneeId === userId) return { state: 'ok' as const };
  return { state: 'forbidden' as const };
}

// Nested include for sub-tasks (3 levels deep — enough for typical use cases)
const taskInclude = {
  assignee: { select: { id: true, name: true } },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, name: true } } },
  },
  subtasks: {
    orderBy: { position: 'asc' as const },
    include: {
      assignee: { select: { id: true, name: true } },
      subtasks: {
        orderBy: { position: 'asc' as const },
        include: { assignee: { select: { id: true, name: true } } },
      },
    },
  },
};

const createSchema = z.object({
  memberId: z.string(),
  parentId: z.string().nullable().optional(),
  title: z.string().min(1).max(500),
  note: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeNote: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(), // ISO date or datetime
});

router.post('/', async (req, res, next) => {
  try {
    const { memberId, parentId, title, note, status, assigneeId, assigneeNote, deadline } =
      createSchema.parse(req.body);
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
    // count siblings (top-level or under parent)
    const count = await prisma.task.count({
      where: { memberId, parentId: parentId ?? null },
    });
    const task = await prisma.task.create({
      data: {
        memberId,
        parentId: parentId ?? null,
        title,
        note: note ?? null,
        status: status ?? 'TODO',
        assigneeId: assigneeId ?? null,
        assigneeNote: assigneeNote ?? null,
        deadline: deadline ? new Date(deadline) : null,
        position: count,
      },
      include: taskInclude,
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
  assigneeId: z.string().nullable().optional(),
  assigneeNote: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const access = await checkTaskAccess(req.params.id, req.user!.userId, req.user!.role);
    if (access.state === 'notfound') return res.status(404).json({ error: 'Task not found' });
    if (access.state === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    const parsed = updateSchema.parse(req.body);
    const data: Record<string, unknown> = { ...parsed };
    if ('deadline' in parsed) data.deadline = parsed.deadline ? new Date(parsed.deadline) : null;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: taskInclude,
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
