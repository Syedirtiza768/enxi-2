const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function checkInventoryData() {
  try {
    console.log('=== Checking Locations ===');
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        locationCode: true,
        name: true,
        type: true,
        isActive: true,
        isDefault: true
      }
    });
    console.log('Locations:', JSON.stringify(locations, null, 2));

    console.log('\n=== Checking Items ===');
    const items = await prisma.item.findMany({
      where: {
        code: {
          contains: 'LAPTOP'
        }
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        trackInventory: true,
        standardCost: true,
        listPrice: true
      }
    });
    console.log('Items with LAPTOP code:', JSON.stringify(items, null, 2));

    console.log('\n=== Checking Current Inventory Balances ===');
    if (items.length > 0 && locations.length > 0) {
      const balances = await prisma.inventoryBalance.findMany({
        where: {
          itemId: items[0].id
        },
        include: {
          location: {
            select: {
              locationCode: true,
              name: true
            }
          },
          item: {
            select: {
              code: true,
              name: true
            }
          }
        }
      });
      console.log('Current inventory balances:', JSON.stringify(balances, null, 2));
    }

    console.log('\n=== Checking Recent Stock Movements ===');
    const movements = await prisma.stockMovement.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        item: {
          select: {
            code: true,
            name: true
          }
        },
        location: {
          select: {
            locationCode: true,
            name: true
          }
        }
      }
    });
    console.log('Recent stock movements:', JSON.stringify(movements, null, 2));

    console.log('\n=== Checking Journal Entries ===');
    const journalEntries = await prisma.journalEntry.findMany({
      take: 3,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        lines: {
          include: {
            account: {
              select: {
                code: true,
                name: true
              }
            }
          }
        }
      }
    });
    console.log('Recent journal entries:', JSON.stringify(journalEntries, null, 2));

    console.log('\n=== Checking Accounts ===');
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { type: 'ASSET' },
          { code: { contains: 'inventory' } },
          { name: { contains: 'Inventory' } }
        ]
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true
      },
      take: 10
    });
    console.log('Inventory-related accounts:', JSON.stringify(accounts, null, 2));

  } catch (error) {
    console.error('Error checking inventory data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInventoryData();