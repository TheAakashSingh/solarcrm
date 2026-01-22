import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Updating user passwords to strong passwords...');

  // Define strong passwords per role (change as needed)
  const users = [
    { email: 'admin@solarsync.com', password: 'Admin@2026#Secure!' },
    { email: 'director@solarsync.com', password: 'Director@2026#Secure!' },
    { email: 'salesman@solarsync.com', password: 'Sales@2026#Secure!' },
    { email: 'designer@solarsync.com', password: 'Design@2026#Secure!' },
    { email: 'production@solarsync.com', password: 'Prod@2026#Secure!' },
    { email: 'purchase@solarsync.com', password: 'Purchase@2026#Secure!' },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 12);

    await prisma.user.update({
      where: { email: user.email },
      data: { password: hashedPassword },
    });

    console.log(`✅ Password updated for ${user.email}`);
  }

  console.log('🎉 All passwords updated successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error updating passwords:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
