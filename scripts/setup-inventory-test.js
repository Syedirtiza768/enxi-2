const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function setupInventoryTest() {
  try {
    console.log('=== Setting up test data ===\n');

    // 1. Create user if not exists
    let user = await prisma.user.findFirst({
      where: { username: 'admin' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@enxi.com',
          password: 'password123', // In real app, this should be hashed
          role: 'ADMIN'
        }
      });
      console.log('✓ Created admin user');
    } else {
      console.log('✓ Admin user already exists');
    }

    // 2. Create accounts
    const inventoryAccount = await prisma.account.upsert({
      where: { code: '1300' },
      update: {},
      create: {
        code: '1300',
        name: 'Inventory',
        type: 'ASSET',
        currency: 'USD',
        isSystemAccount: true,
        createdBy: user.id
      }
    });
    console.log('✓ Created/verified inventory account:', inventoryAccount.code);

    const cogsAccount = await prisma.account.upsert({
      where: { code: '5000' },
      update: {},
      create: {
        code: '5000',
        name: 'Cost of Goods Sold',
        type: 'EXPENSE',
        currency: 'USD',
        isSystemAccount: true,
        createdBy: user.id
      }
    });
    console.log('✓ Created/verified COGS account:', cogsAccount.code);

    const salesAccount = await prisma.account.upsert({
      where: { code: '4000' },
      update: {},
      create: {
        code: '4000',
        name: 'Sales Revenue',
        type: 'REVENUE',
        currency: 'USD',
        isSystemAccount: true,
        createdBy: user.id
      }
    });
    console.log('✓ Created/verified sales account:', salesAccount.code);

    const cashAccount = await prisma.account.upsert({
      where: { code: '1000' },
      update: {},
      create: {
        code: '1000',
        name: 'Cash',
        type: 'ASSET',
        currency: 'USD',
        isSystemAccount: true,
        createdBy: user.id
      }
    });
    console.log('✓ Created/verified cash account:', cashAccount.code);

    // 3. Create location
    const location = await prisma.location.upsert({
      where: { locationCode: 'WAREHOUSE-A' },
      update: {},
      create: {
        locationCode: 'WAREHOUSE-A',
        name: 'Main Warehouse',
        type: 'WAREHOUSE',
        address: '123 Warehouse St',
        city: 'New York',
        state: 'NY',
        country: 'US',
        isDefault: true,
        inventoryAccountId: inventoryAccount.id,
        createdBy: user.id
      }
    });
    console.log('✓ Created/verified location:', location.locationCode);

    // 4. Create category
    const category = await prisma.category.upsert({
      where: { code: 'ELECTRONICS' },
      update: {},
      create: {
        code: 'ELECTRONICS',
        name: 'Electronics',
        description: 'Electronic items',
        createdBy: user.id
      }
    });
    console.log('✓ Created/verified category:', category.code);

    // 5. Create unit of measure
    const unitOfMeasure = await prisma.unitOfMeasure.upsert({
      where: { code: 'UNIT' },
      update: {},
      create: {
        code: 'UNIT',
        name: 'Unit',
        symbol: 'ea',
        isBaseUnit: true,
        createdBy: user.id
      }
    });
    console.log('✓ Created/verified unit of measure:', unitOfMeasure.code);

    // 6. Create item
    const item = await prisma.item.upsert({
      where: { code: 'LAPTOP-001' },
      update: {},
      create: {
        code: 'LAPTOP-001',
        name: 'Dell Laptop 15"',
        description: 'Dell Inspiron 15" Laptop',
        categoryId: category.id,
        type: 'PRODUCT',
        unitOfMeasureId: unitOfMeasure.id,
        trackInventory: true,
        minStockLevel: 5,
        maxStockLevel: 100,
        reorderPoint: 10,
        standardCost: 500,
        listPrice: 750,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
        createdBy: user.id
      }
    });
    console.log('✓ Created/verified item:', item.code);

    console.log('\n=== Creating stock-in transaction ===\n');

    // 7. Create stock movement via API
    const stockMovementData = {
      itemId: item.id,
      movementType: 'STOCK_IN',
      movementDate: new Date().toISOString(),
      quantity: 10,
      unitCost: 500,
      unitOfMeasureId: unitOfMeasure.id,
      referenceType: 'MANUAL',
      referenceNumber: 'INITIAL-001',
      locationId: location.id,
      location: location.name,
      notes: 'Initial stock entry for testing',
      autoCreateLot: true,
      supplier: 'Dell Direct',
      purchaseRef: 'PO-2024-001'
    };

    console.log('Stock movement data:', JSON.stringify(stockMovementData, null, 2));

    // Make HTTP request to create stock movement
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

    console.log('\n✓ Stock movement created successfully!');
    console.log('Movement details:', {
      movementNumber: movement.movementNumber,
      itemCode: movement.item.code,
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      totalCost: movement.totalCost,
      location: movement.locationName,
      journalEntryId: movement.journalEntryId
    });

    // 8. Verify journal entry
    if (movement.journalEntryId) {
      const journalEntry = await prisma.journalEntry.findUnique({
        where: { id: movement.journalEntryId },
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

      console.log('\n=== Journal Entry Created ===');
      console.log('Entry Number:', journalEntry.entryNumber);
      console.log('Status:', journalEntry.status);
      console.log('Description:', journalEntry.description);
      console.log('\nJournal Lines:');
      journalEntry.lines.forEach(line => {
        console.log(`  ${line.account.code} - ${line.account.name}:`);
        console.log(`    Debit: $${line.debitAmount.toFixed(2)}, Credit: $${line.creditAmount.toFixed(2)}`);
      });
    }

    // 9. Check inventory balance
    const balance = await prisma.inventoryBalance.findUnique({
      where: {
        locationId_itemId: {
          locationId: location.id,
          itemId: item.id
        }
      }
    });

    console.log('\n=== Inventory Balance After Transaction ===');
    if (balance) {
      console.log(`Item: ${item.code} - ${item.name}`);
      console.log(`Location: ${location.name}`);
      console.log(`Available Quantity: ${balance.availableQuantity}`);
      console.log(`Total Quantity: ${balance.totalQuantity}`);
      console.log(`Average Cost: $${balance.averageCost.toFixed(2)}`);
      console.log(`Total Value: $${balance.totalValue.toFixed(2)}`);
    }

    // 10. Check stock lot
    const stockLot = await prisma.stockLot.findFirst({
      where: { itemId: item.id },
      orderBy: { createdAt: 'desc' }
    });

    if (stockLot) {
      console.log('\n=== Stock Lot Created ===');
      console.log(`Lot Number: ${stockLot.lotNumber}`);
      console.log(`Received Quantity: ${stockLot.receivedQty}`);
      console.log(`Available Quantity: ${stockLot.availableQty}`);
      console.log(`Unit Cost: $${stockLot.unitCost.toFixed(2)}`);
      console.log(`Total Cost: $${stockLot.totalCost.toFixed(2)}`);
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupInventoryTest();