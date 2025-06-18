const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function debugInventory() {
  try {
    console.log('=== Debugging Inventory Data ===\n');

    // Check stock movements
    const movements = await prisma.stockMovement.findMany({
      include: {
        item: true,
        journalEntry: true,
        stockLot: true,
        location: true
      }
    });
    console.log('Stock Movements:', JSON.stringify(movements, null, 2));

    // Check journal entries  
    const journalEntries = await prisma.journalEntry.findMany({
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    });
    console.log('\nJournal Entries:', JSON.stringify(journalEntries, null, 2));

    // Check inventory balances
    const balances = await prisma.inventoryBalance.findMany({
      include: {
        item: true,
        location: true
      }
    });
    console.log('\nInventory Balances:', JSON.stringify(balances, null, 2));

    // Check if inventory account is set on item
    const items = await prisma.item.findMany({
      include: {
        inventoryAccount: true,
        cogsAccount: true,
        salesAccount: true
      }
    });
    console.log('\nItems with Accounts:', JSON.stringify(items, null, 2));

  } catch (error) {
    console.error('Error debugging inventory:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugInventory();