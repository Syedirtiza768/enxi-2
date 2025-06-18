const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function checkAllBalances() {
  try {
    console.log('=== Checking All Inventory Data ===\n');

    // Get all inventory balances
    const balances = await prisma.inventoryBalance.findMany({
      include: {
        item: true,
        location: true
      }
    });
    
    console.log('Inventory Balances:');
    balances.forEach(b => {
      console.log(`- Item: ${b.item.code}, Location: ${b.location.name}`);
      console.log(`  Total Qty: ${b.totalQuantity}, Available: ${b.availableQuantity}`);
      console.log(`  Avg Cost: $${b.averageCost.toFixed(2)}, Total Value: $${b.totalValue.toFixed(2)}`);
      console.log(`  Last Movement: ${b.lastMovementDate}\n`);
    });

    // Get all stock movements
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        item: true,
        location: true
      }
    });

    console.log('\nAll Stock Movements:');
    movements.forEach(m => {
      console.log(`- ${m.movementNumber}: ${m.item.code} @ ${m.location?.name || 'No location'}`);
      console.log(`  Qty: ${m.quantity}, Cost: $${m.unitCost}, Total: $${m.totalCost}`);
      console.log(`  Date: ${m.movementDate}`);
      console.log(`  Location ID: ${m.locationId || 'NULL'}\n`);
    });

    // Check for movements without locationId
    const movementsWithoutLocation = movements.filter(m => !m.locationId);
    if (movementsWithoutLocation.length > 0) {
      console.log('⚠️  WARNING: Found movements without locationId:', movementsWithoutLocation.length);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllBalances();