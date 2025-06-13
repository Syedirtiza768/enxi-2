const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        username: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('All users in the database:\n');
    users.forEach(user => {
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Created: ${user.createdAt.toISOString()}`);
      console.log('---');
    });
    
    console.log('\nDefault password for all seeded users is typically: demo123');
    console.log('\nBased on the users found:');
    console.log('- Admin user: admin@enxi.com (password likely: demo123)');
    console.log('- System user: system@enxi.com (may have different password)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();