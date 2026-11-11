'use strict';

/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * Idempotent seed script: creates a demo user with a few tasks.
 * Run with: npm run db:seed
 */
async function main() {
  const email = process.env.SEED_EMAIL || 'demo@example.com';
  const password = process.env.SEED_PASSWORD || 'demo12345';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Demo User',
      password: await bcrypt.hash(password, 10),
      role: 'user'
    }
  });

  const existing = await prisma.task.count({ where: { userId: user.id } });
  if (existing === 0) {
    await prisma.task.createMany({
      data: [
        { title: 'Review pull request', status: 'todo', priority: 'high', userId: user.id },
        { title: 'Write runbook', status: 'in_progress', priority: 'medium', userId: user.id },
        { title: 'Ship release v1.0.0', status: 'done', priority: 'low', userId: user.id }
      ]
    });
  }

  console.log(`Seeded demo user ${email} (password: ${password})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
