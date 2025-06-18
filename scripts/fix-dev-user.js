const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if dev-user exists
    let devUser = await prisma.user.findUnique({
      where: { id: 'dev-user' }
    });

    if (!devUser) {
      console.log('Creating dev-user...');
      devUser = await prisma.user.create({
        data: {
          id: 'dev-user',
          email: 'dev@example.com',
          name: 'Development User',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('Dev user created successfully:', devUser);
    } else {
      console.log('Dev user already exists:', devUser);
    }

    // Test creating a sales case
    console.log('\nTesting sales case creation...');
    
    // First, get a customer
    let customer = await prisma.customer.findFirst();

    if (!customer) {
      console.log('No customers found. Creating one...');
      customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '1234567890',
          currency: 'USD',
          creditLimit: 10000,
          paymentTerms: 30,
          createdBy: 'dev-user'
        }
      });
      console.log('Customer created:', customer);
    }

    // Create a test sales case
    const testCase = await prisma.salesCase.create({
      data: {
        customerId: customer?.id || 'test-customer-id',
        title: 'Test Sales Case',
        description: 'This is a test sales case',
        status: 'LEAD',
        estimatedValue: 10000,
        assignedTo: 'dev-user',
        createdBy: 'dev-user'
      }
    });

    console.log('Sales case created successfully:', testCase);

  } catch (error) {
    console.error('Error:', error);
    console.error('Error details:', error.message);
    if (error.code) console.error('Error code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();