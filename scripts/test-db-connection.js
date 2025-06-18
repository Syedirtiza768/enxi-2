const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/prisma/prisma/dev.db'
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

async function test() {
  try {
    console.log('Testing database connection...');
    
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Test if we can query
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log('Tables found:', tables);
    
    await prisma.$disconnect();
    console.log('✅ Disconnected from database');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

test();