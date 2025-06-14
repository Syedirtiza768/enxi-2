import { PrismaClient, SalesCaseStatus } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function checkSalesCases(): Promise<boolean> {
  try {
    const openCases = await prisma.salesCase.findMany({
      where: { status: SalesCaseStatus.OPEN },
      include: { 
        customer: true,
        quotations: true
      }
    });
    
    console.log(`Found ${openCases.length} open sales cases:`);
    
    openCases.forEach(c => {
      console.log(`\n- ID: ${c.id}`);
      console.log(`  Customer: ${c.customer.name}`);
      console.log(`  Created: ${c.createdAt}`);
      console.log(`  Quotations: ${c.quotations.length}`);
    });
    
    if (openCases.length === 0) {
      console.log('\nNo open sales cases found. Checking all sales cases:');
      const allCases = await prisma.salesCase.findMany({
        include: { customer: true }
      });
      
      allCases.forEach(c => {
        console.log(`\n- ID: ${c.id}`);
        console.log(`  Status: ${c.status}`);
        console.log(`  Customer: ${c.customer.name}`);
      });
      
      if (allCases.length === 0) {
        console.log('\nNo sales cases found at all!');
      }
    }
  } catch (error) {
    console.error('Error checking sales cases:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSalesCases();