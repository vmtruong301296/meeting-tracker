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
  await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: { email: 'member@example.com', name: 'Member', password: memberPwd, role: 'MEMBER' },
  });

  const exists = await prisma.meeting.findFirst({ where: { ownerId: admin.id } });
  if (!exists) {
    await prisma.meeting.create({
      data: {
        ownerId: admin.id,
        date: new Date(),
        title: 'Sample meeting',
        groups: {
          create: [
            {
              name: 'Nhóm X', position: 0,
              members: {
                create: [
                  {
                    name: 'Thành viên X1', position: 0,
                    tasks: {
                      create: [
                        { title: 'Task A', position: 0 },
                        { title: 'Task B', position: 1 },
                        { title: 'Task C', position: 2 },
                      ],
                    },
                  },
                  {
                    name: 'Thành viên X2', position: 1,
                    tasks: {
                      create: [
                        { title: 'Task D', position: 0 },
                        { title: 'Task E', position: 1 },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }
  console.log('Seed done. admin@example.com / admin123');
}

main().finally(() => prisma.$disconnect());
