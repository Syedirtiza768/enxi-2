const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log('Testing database connection...\n');
  
  try {
    // Test 1: Check if we can connect to the database
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully!\n');
    
    // Test 2: Count users
    console.log('2. Counting users in the database...');
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in the database\n`);
    
    // Test 3: List first 5 users (if any)
    if (userCount > 0) {
      console.log('3. Fetching first 5 users...');
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });
      
      console.log('✅ Users found:');
      users.forEach((user, index) => {
        console.log(`\n   User ${index + 1}:`);
        console.log(`   - Username: ${user.username}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Active: ${user.isActive}`);
        console.log(`   - Created: ${user.createdAt.toISOString()}`);
      });
      console.log('');
    }
    
    // Test 4: Check other important tables
    console.log('4. Checking other tables...');
    const counts = await Promise.all([
      prisma.customer.count(),
      prisma.lead.count(),
      prisma.salesCase.count(),
      prisma.quotation.count(),
      prisma.salesOrder.count(),
      prisma.invoice.count(),
      prisma.item.count(),
      prisma.supplier.count()
    ]);
    
    console.log('✅ Table record counts:');
    console.log(`   - Customers: ${counts[0]}`);
    console.log(`   - Leads: ${counts[1]}`);
    console.log(`   - Sales Cases: ${counts[2]}`);
    console.log(`   - Quotations: ${counts[3]}`);
    console.log(`   - Sales Orders: ${counts[4]}`);
    console.log(`   - Invoices: ${counts[5]}`);
    console.log(`   - Items: ${counts[6]}`);
    console.log(`   - Suppliers: ${counts[7]}\n`);
    
    // Test 5: Look for test/demo users
    console.log('5. Looking for test/demo users...');
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: 'test' } },
          { username: { contains: 'demo' } },
          { username: { contains: 'admin' } },
          { email: { contains: 'test' } },
          { email: { contains: 'demo' } },
          { email: { contains: 'example' } }
        ]
      },
      select: {
        username: true,
        email: true,
        role: true
      }
    });
    
    if (testUsers.length > 0) {
      console.log('✅ Found potential test users:');
      testUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) - Role: ${user.role}`);
      });
    } else {
      console.log('❌ No test/demo users found');
    }
    
    console.log('\n✅ All database tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseConnection();