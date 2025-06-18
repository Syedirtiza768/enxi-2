const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function testAnotherStockIn() {
  try {
    console.log('=== Testing Another Stock-In Transaction ===\n');

    // Get the existing item and location
    const item = await prisma.item.findFirst({
      where: { code: 'LAPTOP-001' }
    });

    const location = await prisma.location.findFirst({
      where: { locationCode: 'WAREHOUSE-A' }
    });

    const unitOfMeasure = await prisma.unitOfMeasure.findFirst({
      where: { code: 'UNIT' }
    });

    if (!item || !location || !unitOfMeasure) {
      throw new Error('Required data not found');
    }

    // Create another stock-in via API
    const stockMovementData = {
      itemId: item.id,
      movementType: 'STOCK_IN',
      movementDate: new Date().toISOString(),
      quantity: 5,
      unitCost: 520, // Different cost to test weighted average
      unitOfMeasureId: unitOfMeasure.id,
      referenceType: 'MANUAL',
      referenceNumber: 'TEST-002',
      locationId: location.id,
      location: location.name,
      notes: 'Second stock entry for testing weighted average',
      autoCreateLot: true,
      supplier: 'Dell Direct',
      purchaseRef: 'PO-2024-002'
    };

    const response = await fetch('http://localhost:3000/api/inventory/stock-movements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stockMovementData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create stock movement: ${response.status} - ${error}`);
    }

    const movement = await response.json();
    console.log('✓ Stock movement created:', movement.movementNumber);

    // Check inventory balance after second movement
    const balance = await prisma.inventoryBalance.findUnique({
      where: {
        locationId_itemId: {
          locationId: location.id,
          itemId: item.id
        }
      }
    });

    if (balance) {
      console.log('\n=== Inventory Balance After Second Transaction ===');
      console.log(`Total Quantity: ${balance.totalQuantity}`);
      console.log(`Available Quantity: ${balance.availableQuantity}`);
      console.log(`Average Cost: $${balance.averageCost.toFixed(2)}`);
      console.log(`Total Value: $${balance.totalValue.toFixed(2)}`);
      
      // Verify weighted average calculation
      // Expected: (10 * 500 + 5 * 520) / 15 = (5000 + 2600) / 15 = 506.67
      const expectedAvgCost = (10 * 500 + 5 * 520) / 15;
      console.log(`\nExpected Average Cost: $${expectedAvgCost.toFixed(2)}`);
      console.log(`Actual Average Cost: $${balance.averageCost.toFixed(2)}`);
      console.log(`Match: ${Math.abs(balance.averageCost - expectedAvgCost) < 0.01 ? '✓' : '✗'}`);
    } else {
      console.log('\n❌ No inventory balance found!');
    }

    // Check all stock movements
    const movements = await prisma.stockMovement.findMany({
      where: { itemId: item.id },
      orderBy: { createdAt: 'asc' },
      include: {
        journalEntry: true,
        stockLot: true
      }
    });

    console.log('\n=== All Stock Movements ===');
    movements.forEach(m => {
      console.log(`${m.movementNumber}: ${m.quantity} @ $${m.unitCost} = $${m.totalCost}`);
      console.log(`  Journal Entry: ${m.journalEntry?.entryNumber || 'None'}`);
      console.log(`  Stock Lot: ${m.stockLot?.lotNumber || 'None'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAnotherStockIn();