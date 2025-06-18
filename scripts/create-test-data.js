const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Create category
    const category = await prisma.category.findFirst({
      where: { code: 'SOFTWARE' }
    }) || await prisma.category.create({
      data: {
        code: 'SOFTWARE',
        name: 'Software Products',
        description: 'Software licenses and services',
        isActive: true,
        createdBy: 'system'
      }
    });
    
    // Create unit of measure
    const uom = await prisma.unitOfMeasure.findFirst({
      where: { code: 'EA' }
    }) || await prisma.unitOfMeasure.create({
      data: {
        code: 'EA',
        name: 'Each',
        description: 'Each unit',
        symbol: 'ea',
        isActive: true,
        isBaseUnit: true,
        createdBy: 'system'
      }
    });
    
    // Create items for quotation
    const items = [
      {
        code: 'ERP-LIC-ENT',
        name: 'Enterprise ERP License',
        description: 'Complete ERP system license for unlimited users',
        type: 'PRODUCT',
        unitOfMeasureId: uom.id,
        categoryId: category.id,
        trackInventory: false,
        standardCost: 15000,
        listPrice: 25000,
        isSaleable: true,
        isPurchaseable: false,
        isActive: true,
        createdBy: 'system'
      },
      {
        code: 'ERP-IMPL-SVC',
        name: 'ERP Implementation Service',
        description: 'Professional implementation and configuration service',
        type: 'SERVICE',
        unitOfMeasureId: uom.id,
        categoryId: category.id,
        trackInventory: false,
        standardCost: 500,
        listPrice: 1000,
        isSaleable: true,
        isPurchaseable: false,
        isActive: true,
        createdBy: 'system'
      },
      {
        code: 'ERP-TRAIN-DAY',
        name: 'Training Day',
        description: 'On-site training session (per day)',
        type: 'SERVICE',
        unitOfMeasureId: uom.id,
        categoryId: category.id,
        trackInventory: false,
        standardCost: 800,
        listPrice: 1500,
        isSaleable: true,
        isPurchaseable: false,
        isActive: true,
        createdBy: 'system'
      },
      {
        code: 'ERP-SUPPORT-YR',
        name: 'Annual Support Package',
        description: '12-month premium support and maintenance',
        type: 'SERVICE',
        unitOfMeasureId: uom.id,
        categoryId: category.id,
        trackInventory: false,
        standardCost: 3000,
        listPrice: 5000,
        isSaleable: true,
        isPurchaseable: false,
        isActive: true,
        createdBy: 'system'
      }
    ];
    
    for (const itemData of items) {
      const existing = await prisma.item.findUnique({
        where: { code: itemData.code }
      });
      
      if (!existing) {
        const item = await prisma.item.create({ data: itemData });
        console.log('Created item:', item.code, '-', item.name);
      } else {
        console.log('Item already exists:', existing.code);
      }
    }
    
    console.log('Test data setup completed!');
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();