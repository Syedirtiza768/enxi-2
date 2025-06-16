const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function createTestQuotation() {
  try {
    // Get the sales case and items we created
    const salesCase = await prisma.salesCase.findFirst({
      where: { caseNumber: 'SC-2025-0151' },
      include: { customer: true }
    });

    const items = await prisma.item.findMany({
      where: {
        code: {
          in: ['ERP-LIC-ENT', 'ERP-IMPL-SVC', 'ERP-TRAIN-DAY', 'ERP-SUPPORT-YR']
        }
      }
    });

    if (!salesCase || items.length === 0) {
      console.error('Test data not found. Please run create-test-data.js first.');
      return null;
    }

    console.log('Using Sales Case:', salesCase.caseNumber);
    console.log('Customer:', salesCase.customer.name);

    // Create quotation data
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quotationData = {
      salesCaseId: salesCase.id,
      validUntil: validUntil.toISOString(),
      paymentTerms: 'Net 30 days. 50% advance payment required upon order confirmation.',
      deliveryTerms: 'Implementation will begin within 2 weeks of order confirmation.',
      notes: 'This quotation includes all software licenses, implementation services, training, and first-year support.',
      internalNotes: 'Customer has budget approval. Decision expected by end of month.',
      items: [
        {
          lineNumber: 1,
          lineDescription: 'Software License',
          isLineHeader: true,
          itemType: 'PRODUCT',
          itemId: items.find(i => i.code === 'ERP-LIC-ENT').id,
          itemCode: 'ERP-LIC-ENT',
          description: 'Enterprise ERP License - Unlimited Users',
          internalDescription: 'Includes all modules: Finance, Sales, Inventory, HR',
          quantity: 1,
          unitPrice: 25000,
          discount: 10,
          taxRate: 8,
          sortOrder: 1
        },
        {
          lineNumber: 2,
          lineDescription: 'Professional Services',
          isLineHeader: true,
          itemType: 'SERVICE',
          itemId: items.find(i => i.code === 'ERP-IMPL-SVC').id,
          itemCode: 'ERP-IMPL-SVC',
          description: 'Implementation and Configuration Services',
          internalDescription: 'Estimated 30 days of implementation',
          quantity: 30,
          unitPrice: 1000,
          discount: 5,
          taxRate: 8,
          sortOrder: 2
        },
        {
          lineNumber: 2,
          lineDescription: 'Professional Services',
          isLineHeader: false,
          itemType: 'SERVICE',
          itemId: items.find(i => i.code === 'ERP-TRAIN-DAY').id,
          itemCode: 'ERP-TRAIN-DAY',
          description: 'On-site Training Sessions',
          quantity: 5,
          unitPrice: 1500,
          discount: 5,
          taxRate: 8,
          sortOrder: 3
        },
        {
          lineNumber: 3,
          lineDescription: 'Support & Maintenance',
          isLineHeader: true,
          itemType: 'SERVICE',
          itemId: items.find(i => i.code === 'ERP-SUPPORT-YR').id,
          itemCode: 'ERP-SUPPORT-YR',
          description: 'Annual Premium Support Package',
          internalDescription: 'First year included, renewable annually',
          quantity: 1,
          unitPrice: 5000,
          discount: 0,
          taxRate: 8,
          sortOrder: 4
        }
      ]
    };

    // Generate quotation number
    const quotationCount = await prisma.quotation.count();
    const quotationNumber = `QUOT-${new Date().getFullYear()}-${String(quotationCount + 1).padStart(4, '0')}`;
    
    console.log('\nCreating quotation...');
    
    // Calculate totals for each item
    const itemsWithTotals = quotationData.items.map(item => {
      const subtotal = item.quantity * item.unitPrice;
      const discountAmount = subtotal * (item.discount || 0) / 100;
      const discountedAmount = subtotal - discountAmount;
      const taxAmount = discountedAmount * (item.taxRate || 0) / 100;
      const totalAmount = discountedAmount + taxAmount;
      
      return {
        ...item,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount
      };
    });
    
    // Calculate quotation totals
    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = itemsWithTotals.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxAmount = itemsWithTotals.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal - discountAmount + taxAmount;
    
    // Create quotation with items
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        salesCaseId: quotationData.salesCaseId,
        version: 1,
        status: 'DRAFT',
        validUntil: new Date(quotationData.validUntil),
        paymentTerms: quotationData.paymentTerms,
        deliveryTerms: quotationData.deliveryTerms,
        notes: quotationData.notes,
        internalNotes: quotationData.internalNotes,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        createdBy: 'system',
        items: {
          create: itemsWithTotals
        }
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    });

    console.log('\n✓ Quotation created successfully!');
    console.log('  Quotation Number:', quotation.quotationNumber);
    console.log('  Customer:', quotation.salesCase.customer.name);
    console.log('  Status:', quotation.status);
    console.log('  Valid Until:', new Date(quotation.validUntil).toLocaleDateString());
    console.log('\n  Financial Summary:');
    console.log('    Subtotal:  $', quotation.subtotal.toFixed(2));
    console.log('    Discount:  $', quotation.discountAmount.toFixed(2));
    console.log('    Tax:       $', quotation.taxAmount.toFixed(2));
    console.log('    Total:     $', quotation.totalAmount.toFixed(2));
    console.log('\n  Items:');
    
    quotation.items.forEach(item => {
      console.log(`    - ${item.description}`);
      console.log(`      Qty: ${item.quantity} x $${item.unitPrice} = $${item.totalAmount.toFixed(2)}`);
    });

    console.log('\n  Quotation ID:', quotation.id);
    console.log('\n  To view PDF, visit: http://localhost:3000/api/quotations/' + quotation.id + '/pdf');
    
    return quotation;
  } catch (error) {
    console.error('Error creating quotation:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestQuotation().catch(console.error);