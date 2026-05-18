import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', name: 'Admin', password, role: 'ADMIN' },
  });

  const memberPwd = await bcrypt.hash('member123', 10);
  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: { email: 'member@example.com', name: 'Member', password: memberPwd, role: 'MEMBER' },
  });

  const exists = await prisma.meeting.findFirst({ where: { ownerId: admin.id } });
  if (!exists) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const meeting = await prisma.meeting.create({
      data: {
        ownerId: admin.id,
        date: new Date(),
        title: 'Sample meeting',
        groups: {
          create: [
            {
              name: 'Nhóm X',
              color: 'amber',
              position: 0,
              members: {
                create: [
                  {
                    name: 'Thành viên X1', position: 0,
                  },
                  {
                    name: 'Thành viên X2', position: 1,
                  },
                ],
              },
            },
            {
              name: 'Nhóm Y',
              color: 'sky',
              position: 1,
              members: {
                create: [{ name: 'Thành viên Y1', position: 0 }],
              },
            },
            {
              name: 'Nhóm Z',
              color: 'emerald',
              position: 2,
              members: { create: [{ name: 'Thành viên Z1', position: 0 }] },
            },
          ],
        },
      },
      include: { groups: { include: { members: true } } },
    });

    // Add tasks with deadlines + sub-tasks for Thành viên X1
    const x1 = meeting.groups[0].members[0];
    const taskA = await prisma.task.create({
      data: {
        memberId: x1.id, title: 'Task A — Plan sprint', position: 0,
        deadline: tomorrow,
        assigneeId: member.id,
        assigneeNote: 'Cần xong trước EOD thứ Sáu',
      },
    });
    await prisma.task.create({
      data: { memberId: x1.id, title: 'Sub: Define epics', position: 0, parentId: taskA.id },
    });
    await prisma.task.create({
      data: { memberId: x1.id, title: 'Sub: Estimate stories', position: 1, parentId: taskA.id },
    });

    await prisma.task.create({
      data: { memberId: x1.id, title: 'Task B', position: 1, deadline: nextWeek, status: 'IN_PROGRESS' },
    });
    await prisma.task.create({
      data: { memberId: x1.id, title: 'Task C', position: 2 },
    });

    const x2 = meeting.groups[0].members[1];
    await prisma.task.createMany({
      data: [
        { memberId: x2.id, title: 'Task D', position: 0 },
        { memberId: x2.id, title: 'Task E', position: 1, status: 'ISSUE', note: 'Blocked on API access' },
      ],
    });

    const y1 = meeting.groups[1].members[0];
    await prisma.task.createMany({
      data: [
        { memberId: y1.id, title: 'Task F', position: 0, status: 'DONE' },
        { memberId: y1.id, title: 'Task G', position: 1 },
      ],
    });

    const z1 = meeting.groups[2].members[0];
    await prisma.task.create({
      data: { memberId: z1.id, title: 'Task K', position: 0 },
    });
  }
  console.log('✓ Seed done. Login:');
  console.log('  admin@example.com / admin123 (ADMIN)');
  console.log('  member@example.com / member123 (MEMBER)');
}

main().finally(() => prisma.$disconnect());
