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

  // Create sample clients
  const client1 = await prisma.client.create({
    data: {
      clientName: 'SunPower Industries',
      email: 'contact@sunpower.com',
      contactNo: '+91 98765 43210',
      contactPerson: 'Mr. Anil Verma',
      address: '123 Industrial Area, Jaipur, Rajasthan 302001'
    }
  });

  const client2 = await prisma.client.create({
    data: {
      clientName: 'Green Energy Solutions',
      email: 'info@greenenergy.co.in',
      contactNo: '+91 87654 32109',
      contactPerson: 'Ms. Sunita Rao',
      address: '456 Tech Park, Bangalore, Karnataka 560001'
    }
  });

  console.log('✅ Clients created');

  // Create sample enquiries
  const enquiry1 = await prisma.enquiry.create({
    data: {
      enquiryNum: 'ENQ-2024-001',
      clientId: client1.id,
      materialType: 'Aluminium',
      enquiryDetail: 'Solar panel mounting structure for 100kW installation',
      enquiryBy: salesman.id,
      enquiryAmount: 1250000,
      deliveryAddress: '123 Industrial Area, Jaipur, Rajasthan 302001',
      status: 'Enquiry',
      currentAssignedPerson: salesman.id
    }
  });

  const enquiry2 = await prisma.enquiry.create({
    data: {
      enquiryNum: 'ENQ-2024-002',
      clientId: client2.id,
      materialType: 'GI',
      enquiryDetail: 'Ground mount structure for 50kW solar system',
      enquiryBy: salesman.id,
      enquiryAmount: 875000,
      deliveryAddress: '456 Tech Park, Bangalore, Karnataka 560001',
      status: 'Design',
      currentAssignedPerson: designer.id
    }
  });

  console.log('✅ Enquiries created');

  // Create status history
  await prisma.enquiryStatusHistory.createMany({
    data: [
      {
        enquiryId: enquiry1.id,
        status: 'Enquiry',
        assignedPerson: salesman.id,
        note: 'Enquiry created'
      },
      {
        enquiryId: enquiry2.id,
        status: 'Enquiry',
        assignedPerson: salesman.id,
        note: 'Enquiry created'
      },
      {
        enquiryId: enquiry2.id,
        status: 'Design',
        assignedPerson: designer.id,
        note: 'Assigned to designer'
      }
    ]
  });

  console.log('✅ Status history created');

  // Create design work for enquiry2
  await prisma.designWork.create({
    data: {
      enquiryId: enquiry2.id,
      designerId: designer.id,
      designerNotes: 'Initial design in progress',
      clientRequirements: 'Ground mount structure with wind load capacity',
      designStatus: 'in_progress'
    }
  });

  console.log('✅ Design work created');

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
