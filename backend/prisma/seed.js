import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@solarsync.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@solarsync.com',
      password: hashedPassword,
      role: 'superadmin',
      workflowStatus: [
        'Enquiry', 'Design', 'BOQ', 'ReadyForProduction',
        'PurchaseWaiting', 'InProduction', 'ProductionComplete',
        'Hotdip', 'ReadyForDispatch', 'Dispatched'
      ]
    }
  });

  const director = await prisma.user.upsert({
    where: { email: 'director@solarsync.com' },
    update: {},
    create: {
      name: 'Director',
      email: 'director@solarsync.com',
      password: hashedPassword,
      role: 'director',
      workflowStatus: [
        'Enquiry', 'Design', 'BOQ', 'ReadyForProduction',
        'PurchaseWaiting', 'InProduction', 'ProductionComplete',
        'Hotdip', 'ReadyForDispatch', 'Dispatched'
      ]
    }
  });

  const salesman = await prisma.user.upsert({
    where: { email: 'salesman@solarsync.com' },
    update: {},
    create: {
      name: 'Sales Person',
      email: 'salesman@solarsync.com',
      password: hashedPassword,
      role: 'salesman',
      workflowStatus: [
        'Enquiry', 'Design', 'BOQ', 'ReadyForProduction',
        'PurchaseWaiting', 'InProduction', 'ProductionComplete',
        'Hotdip', 'ReadyForDispatch', 'Dispatched'
      ]
    }
  });

  const designer = await prisma.user.upsert({
    where: { email: 'designer@solarsync.com' },
    update: {},
    create: {
      name: 'Designer',
      email: 'designer@solarsync.com',
      password: hashedPassword,
      role: 'designer',
      workflowStatus: ['Design']
    }
  });

  const production = await prisma.user.upsert({
    where: { email: 'production@solarsync.com' },
    update: {},
    create: {
      name: 'Production Lead',
      email: 'production@solarsync.com',
      password: hashedPassword,
      role: 'production',
      workflowStatus: [
        'ReadyForProduction', 'InProduction', 'ProductionComplete',
        'Hotdip', 'ReadyForDispatch', 'Dispatched'
      ]
    }
  });

  const purchase = await prisma.user.upsert({
    where: { email: 'purchase@solarsync.com' },
    update: {},
    create: {
      name: 'Purchase Manager',
      email: 'purchase@solarsync.com',
      password: hashedPassword,
      role: 'purchase',
      workflowStatus: ['PurchaseWaiting']
    }
  });

  console.log('✅ Users created');

  console.log('🎉 Database seed completed!');
  console.log('\n📝 Default login credentials:');
  console.log('   Super Admin: admin@solarsync.com / password123');
  console.log('   Director: director@solarsync.com / password123');
  console.log('   Salesman: salesman@solarsync.com / password123');
  console.log('   Designer: designer@solarsync.com / password123');
  console.log('   Production: production@solarsync.com / password123');
  console.log('   Purchase: purchase@solarsync.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
