import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const fullInclude = {
  groups: {
    orderBy: { position: 'asc' as const },
    include: {
      members: {
        orderBy: { position: 'asc' as const },
        include: {
          tasks: {
            orderBy: { position: 'asc' as const },
            include: {
              comments: {
                orderBy: { createdAt: 'asc' as const },
                include: { author: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  },
};

// Permission helper: admin sees all, member sees only their own
async function ensureCanAccessMeeting(meetingId: string, userId: string, role: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, ownerId: true },
  });
  if (!meeting) return null;
  if (role !== 'ADMIN' && meeting.ownerId !== userId) return 'forbidden';
  return meeting;
}

// GET /meetings  (list — admin sees all, member sees own)
router.get('/', async (req, res, next) => {
  try {
    const where = req.user!.role === 'ADMIN' ? {} : { ownerId: req.user!.userId };
    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        title: true,
        createdAt: true,
        ownerId: true,
        owner: { select: { id: true, name: true } },
        _count: { select: { groups: true } },
      },
    });
    res.json({ meetings });
  } catch (e) {
    next(e);
  }
});

// GET /meetings/:id  (full tree)
router.get('/:id', async (req, res, next) => {
  try {
    const access = await ensureCanAccessMeeting(req.params.id, req.user!.userId, req.user!.role);
    if (!access) return res.status(404).json({ error: 'Meeting not found' });
    if (access === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      include: fullInclude,
    });
    res.json({ meeting });
  } catch (e) {
    next(e);
  }
});

// POST /meetings  (create, optionally carry over from previous)
const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(200).optional(),
  carryOverFromId: z.string().optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const { date, title, carryOverFromId } = createSchema.parse(req.body);
    const meeting = await prisma.$transaction(async (tx) => {
      const created = await tx.meeting.create({
        data: {
          date: new Date(date + 'T00:00:00Z'),
          title,
          ownerId: req.user!.userId,
        },
      });
      if (carryOverFromId) {
        const src = await tx.meeting.findUnique({
          where: { id: carryOverFromId },
          include: {
            groups: {
              include: { members: { include: { tasks: true } } },
              orderBy: { position: 'asc' },
            },
          },
        });
        if (src && (req.user!.role === 'ADMIN' || src.ownerId === req.user!.userId)) {
          for (const [gi, g] of src.groups.entries()) {
            const newG = await tx.group.create({
              data: {
                name: g.name, position: gi, collapsed: g.collapsed,
                meetingId: created.id,
              },
            });
            for (const [mi, m] of g.members.entries()) {
              const newM = await tx.member.create({
                data: { name: m.name, position: mi, groupId: newG.id, userId: m.userId },
              });
              const pending = m.tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED');
              if (pending.length) {
                await tx.task.createMany({
                  data: pending.map((t, ti) => ({
                    title: t.title, note: t.note, status: t.status,
                    position: ti, memberId: newM.id,
                  })),
                });
              }
            }
          }
        }
      }
      return tx.meeting.findUnique({ where: { id: created.id }, include: fullInclude });
    });
    res.status(201).json({ meeting });
  } catch (e) {
    next(e);
  }
});

// PATCH /meetings/:id
const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  title: z.string().max(200).nullable().optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const access = await ensureCanAccessMeeting(req.params.id, req.user!.userId, req.user!.role);
    if (!access) return res.status(404).json({ error: 'Meeting not found' });
    if (access === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    const data = updateSchema.parse(req.body);
    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: {
        ...(data.date && { date: new Date(data.date + 'T00:00:00Z') }),
        ...(data.title !== undefined && { title: data.title }),
      },
    });
    res.json({ meeting });
  } catch (e) {
    next(e);
  }
});

// DELETE /meetings/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const access = await ensureCanAccessMeeting(req.params.id, req.user!.userId, req.user!.role);
    if (!access) return res.status(404).json({ error: 'Meeting not found' });
    if (access === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    await prisma.meeting.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
