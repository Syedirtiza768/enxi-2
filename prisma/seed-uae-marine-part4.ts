// Part 4 of UAE Marine Diesel seed functions

async function createQuotations(salesId: string, salesCases: any, items: any, vatRate: any) {
  // Quotation for DP World
  const dpWorldQuote = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2024-001',
      salesCaseId: salesCases.dpWorldCase.id,
      version: 1,
      status: QuotationStatus.SENT,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentTerms: '60 days net from invoice date',
      deliveryTerms: 'On-site service at customer location',
      notes: 'Comprehensive maintenance package includes all labor, standard parts, and consumables',
      subtotal: 2285714.29,
      taxAmount: 114285.71,
      discountAmount: 0,
      totalAmount: 2400000,
      createdBy: salesId,
      items: {
        create: [
          {
            lineNumber: 1,
            lineDescription: 'Scheduled Maintenance Services',
            isLineHeader: true,
            itemType: ItemType.SERVICE,
            itemId: items.majorService.id,
            itemCode: 'SRV-MAJOR',
            description: 'Quarterly major service for 12 tugboats (48 services/year)',
            quantity: 48,
            unitPrice: 30000,
            discount: 0,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 1440000,
            discountAmount: 0,
            taxAmount: 72000,
            totalAmount: 1512000,
            sortOrder: 1
          },
          {
            lineNumber: 2,
            lineDescription: 'Emergency Support Services',
            isLineHeader: true,
            itemType: ItemType.SERVICE,
            itemId: items.emergencyService.id,
            itemCode: 'SRV-EMERGENCY',
            description: '24/7 Emergency callout service (estimated 50 hours/year)',
            quantity: 50,
            unitPrice: 850,
            discount: 0,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 42500,
            discountAmount: 0,
            taxAmount: 2125,
            totalAmount: 44625,
            sortOrder: 2
          },
          {
            lineNumber: 3,
            lineDescription: 'Spare Parts Allowance',
            isLineHeader: true,
            itemType: ItemType.PRODUCT,
            itemId: items.oilFilter.id,
            itemCode: 'PARTS-ALLOW',
            description: 'Annual spare parts allowance for scheduled maintenance',
            quantity: 1,
            unitPrice: 803214.29,
            discount: 0,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 803214.29,
            discountAmount: 0,
            taxAmount: 40160.71,
            totalAmount: 843375,
            sortOrder: 3
          }
        ]
      }
    }
  })

  // Quotation for ADNOC
  const adnocQuote = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2024-002',
      salesCaseId: salesCases.adnocCase.id,
      version: 1,
      status: QuotationStatus.DRAFT,
      validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      paymentTerms: '30% advance, 70% on completion',
      deliveryTerms: 'Work to be performed at ADNOC facility',
      notes: 'Engine overhaul includes complete disassembly, inspection, parts replacement as needed',
      subtotal: 3428571.43,
      taxAmount: 171428.57,
      discountAmount: 0,
      totalAmount: 3600000,
      createdBy: salesId,
      items: {
        create: [
          {
            lineNumber: 1,
            lineDescription: 'Main Engine Overhaul',
            isLineHeader: true,
            itemType: ItemType.SERVICE,
            itemId: items.overhaulService.id,
            itemCode: 'SRV-OVERHAUL',
            description: 'Complete overhaul of 6 main engines (300 hours per engine)',
            quantity: 1800,
            unitPrice: 1200,
            discount: 0,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 2160000,
            discountAmount: 0,
            taxAmount: 108000,
            totalAmount: 2268000,
            sortOrder: 1
          },
          {
            lineNumber: 2,
            lineDescription: 'Major Engine Components',
            isLineHeader: true,
            itemType: ItemType.PRODUCT,
            itemId: items.piston.id,
            itemCode: 'PST-001',
            description: 'Pistons - 8 per engine x 6 engines',
            quantity: 48,
            unitPrice: 1200,
            discount: 0,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 57600,
            discountAmount: 0,
            taxAmount: 2880,
            totalAmount: 60480,
            sortOrder: 2
          },
          {
            lineNumber: 2,
            lineDescription: 'Major Engine Components',
            isLineHeader: false,
            itemType: ItemType.PRODUCT,
            itemId: items.injector.id,
            itemCode: 'INJ-001',
            description: 'Fuel injectors - 8 per engine x 6 engines',
            quantity: 48,
            unitPrice: 680,
            discount: 0,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 32640,
            discountAmount: 0,
            taxAmount: 1632,
            totalAmount: 34272,
            sortOrder: 3
          },
          {
            lineNumber: 3,
            lineDescription: 'Additional Parts & Consumables',
            isLineHeader: true,
            itemType: ItemType.PRODUCT,
            itemId: items.oilFilter.id,
            itemCode: 'PARTS-EST',
            description: 'Estimated additional parts and consumables',
            quantity: 1,
            unitPrice: 1178331.43,
            discount: 0,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 1178331.43,
            discountAmount: 0,
            taxAmount: 58916.57,
            totalAmount: 1237248,
            sortOrder: 4
          }
        ]
      }
    }
  })

  return { dpWorldQuote, adnocQuote }
}

async function createSalesOrders(salesId: string, quotations: any, customers: any) {
  // Sales Order from DP World quotation
  const dpWorldOrder = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2024-001',
      quotationId: quotations.dpWorldQuote.id,
      salesCaseId: quotations.dpWorldQuote.salesCaseId,
      status: SalesOrderStatus.CONFIRMED,
      orderDate: new Date(),
      requestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      promisedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subtotal: 2285714.29,
      taxAmount: 114285.71,
      discountAmount: 0,
      shippingAmount: 0,
      totalAmount: 2400000,
      paymentTerms: '60 days net from invoice date',
      shippingTerms: 'On-site service',
      billingAddress: 'DP World Jebel Ali, Dubai, UAE',
      customerPO: 'PO-DPW-2024-1234',
      notes: 'Annual maintenance contract effective from order date',
      createdBy: salesId,
      approvedBy: salesId,
      approvedAt: new Date(),
      items: {
        create: [
          {
            lineNumber: 1,
            lineDescription: 'Scheduled Maintenance Services',
            isLineHeader: true,
            itemType: ItemType.SERVICE,
            itemId: quotations.dpWorldQuote.items[0].itemId,
            itemCode: 'SRV-MAJOR',
            description: 'Quarterly major service for 12 tugboats (48 services/year)',
            quantity: 48,
            unitPrice: 30000,
            discount: 0,
            taxRate: 5,
            taxRateId: quotations.dpWorldQuote.items[0].taxRateId,
            subtotal: 1440000,
            discountAmount: 0,
            taxAmount: 72000,
            totalAmount: 1512000,
            sortOrder: 1
          },
          {
            lineNumber: 2,
            lineDescription: 'Emergency Support Services',
            isLineHeader: true,
            itemType: ItemType.SERVICE,
            itemId: quotations.dpWorldQuote.items[1].itemId,
            itemCode: 'SRV-EMERGENCY',
            description: '24/7 Emergency callout service (estimated 50 hours/year)',
            quantity: 50,
            unitPrice: 850,
            discount: 0,
            taxRate: 5,
            taxRateId: quotations.dpWorldQuote.items[1].taxRateId,
            subtotal: 42500,
            discountAmount: 0,
            taxAmount: 2125,
            totalAmount: 44625,
            sortOrder: 2
          }
        ]
      }
    },
    include: {
      items: true
    }
  })

  // Create customer PO record
  await prisma.customerPO.create({
    data: {
      poNumber: 'PO-DPW-2024-1234',
      customerId: customers.dpWorld.id,
      quotationId: quotations.dpWorldQuote.id,
      salesCaseId: quotations.dpWorldQuote.salesCaseId,
      salesOrderId: dpWorldOrder.id,
      poDate: new Date(),
      poAmount: 2400000,
      currency: 'AED',
      exchangeRate: 1.0,
      isAccepted: true,
      acceptedAt: new Date(),
      acceptedBy: salesId,
      createdBy: salesId
    }
  })

  return { dpWorldOrder }
}

async function createPurchaseWorkflow(purchasingId: string, suppliers: any, items: any, warehouse: any, vatRate: any) {
  // Purchase Order to Fleetguard for filters
  const filtersPO = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2024-001',
      supplierId: suppliers.fleetguardSupplier.id,
      status: PurchaseOrderStatus.APPROVED,
      orderDate: new Date(),
      expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      requestedBy: purchasingId,
      subtotal: 32500,
      taxAmount: 1625,
      discountAmount: 3250,
      shippingAmount: 500,
      totalAmount: 31375,
      paymentTerms: '30 days net',
      deliveryTerms: 'DDP Dubai Warehouse',
      shippingAddress: warehouse.address,
      notes: 'Regular stock replenishment order',
      approvedBy: purchasingId,
      approvedAt: new Date(),
      sentToSupplier: true,
      sentAt: new Date(),
      currency: 'AED',
      exchangeRate: 1.0,
      createdBy: purchasingId,
      items: {
        create: [
          {
            itemId: items.oilFilter.id,
            itemCode: 'FLT-OIL-001',
            description: 'Marine Oil Filter',
            quantity: 100,
            unitPrice: 85,
            discount: 10,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 8500,
            discountAmount: 850,
            taxAmount: 382.5,
            totalAmount: 8032.5,
            sortOrder: 1
          },
          {
            itemId: items.fuelFilter.id,
            itemCode: 'FLT-FUEL-001',
            description: 'Marine Fuel Filter',
            quantity: 80,
            unitPrice: 120,
            discount: 10,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 9600,
            discountAmount: 960,
            taxAmount: 432,
            totalAmount: 9072,
            sortOrder: 2
          },
          {
            itemId: items.airFilter.id,
            itemCode: 'FLT-AIR-001',
            description: 'Marine Air Filter',
            quantity: 60,
            unitPrice: 150,
            discount: 10,
            taxRate: 5,
            taxRateId: vatRate.id,
            subtotal: 9000,
            discountAmount: 900,
            taxAmount: 405,
            totalAmount: 8505,
            sortOrder: 3
          }
        ]
      }
    },
    include: {
      items: true
    }
  })

  // Goods Receipt for the PO
  const goodsReceipt = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: 'GR-2024-001',
      purchaseOrderId: filtersPO.id,
      receiptDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      deliveryNote: 'DN-FG-2024-1234',
      receivedBy: purchasingId,
      condition: 'Good',
      notes: 'All items received in good condition',
      status: 'COMPLETED',
      createdBy: purchasingId,
      items: {
        create: [
          {
            purchaseOrderItemId: filtersPO.items[0].id,
            itemId: items.oilFilter.id,
            itemCode: 'FLT-OIL-001',
            description: 'Marine Oil Filter',
            quantityOrdered: 100,
            quantityReceived: 100,
            unitCost: 76.5,
            condition: 'Good'
          },
          {
            purchaseOrderItemId: filtersPO.items[1].id,
            itemId: items.fuelFilter.id,
            itemCode: 'FLT-FUEL-001',
            description: 'Marine Fuel Filter',
            quantityOrdered: 80,
            quantityReceived: 80,
            unitCost: 108,
            condition: 'Good'
          },
          {
            purchaseOrderItemId: filtersPO.items[2].id,
            itemId: items.airFilter.id,
            itemCode: 'FLT-AIR-001',
            description: 'Marine Air Filter',
            quantityOrdered: 60,
            quantityReceived: 60,
            unitCost: 135,
            condition: 'Good'
          }
        ]
      }
    }
  })

  // Supplier Invoice
  const supplierInvoice = await prisma.supplierInvoice.create({
    data: {
      invoiceNumber: 'INV-FG-2024-5678',
      supplierId: suppliers.fleetguardSupplier.id,
      purchaseOrderId: filtersPO.id,
      invoiceDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 44 * 24 * 60 * 60 * 1000),
      paymentTerms: '30 days net',
      subtotal: 32500,
      taxAmount: 1625,
      discountAmount: 3250,
      totalAmount: 31375,
      paidAmount: 0,
      status: SupplierInvoiceStatus.APPROVED,
      matchingStatus: 'MATCHED',
      approvedBy: purchasingId,
      approvedAt: new Date(),
      currency: 'AED',
      exchangeRate: 1.0,
      createdBy: purchasingId
    }
  })

  return { filtersPO, goodsReceipt, supplierInvoice }
}

async function createStockMovements(warehouseId: string, items: any, locations: any, goodsReceipts: any) {
  // Opening stock for main items
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-001',
      itemId: items.piston.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 50,
      unitCost: 850,
      totalCost: 42500,
      unitOfMeasureId: items.piston.unitOfMeasureId,
      locationId: locations.mainWarehouse.id,
      notes: 'Opening stock balance',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-PST-001',
          itemId: items.piston.id,
          receivedDate: new Date('2024-01-01'),
          receivedQty: 50,
          availableQty: 50,
          unitCost: 850,
          totalCost: 42500,
          createdBy: warehouseId
        }
      }
    }
  })

  await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-002',
      itemId: items.injector.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 100,
      unitCost: 450,
      totalCost: 45000,
      unitOfMeasureId: items.injector.unitOfMeasureId,
      locationId: locations.mainWarehouse.id,
      notes: 'Opening stock balance',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-INJ-001',
          itemId: items.injector.id,
          receivedDate: new Date('2024-01-01'),
          receivedQty: 100,
          availableQty: 100,
          unitCost: 450,
          totalCost: 45000,
          createdBy: warehouseId
        }
      }
    }
  })

  // Stock in from goods receipt
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-001',
      itemId: items.oilFilter.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      quantity: 100,
      unitCost: 76.5,
      totalCost: 7650,
      unitOfMeasureId: items.oilFilter.unitOfMeasureId,
      referenceType: 'GOODS_RECEIPT',
      referenceNumber: goodsReceipts.goodsReceipt.receiptNumber,
      goodsReceiptId: goodsReceipts.goodsReceipt.id,
      locationId: locations.mainWarehouse.id,
      notes: 'Stock received from Fleetguard',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-OIL-001',
          itemId: items.oilFilter.id,
          receivedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          receivedQty: 100,
          availableQty: 100,
          unitCost: 76.5,
          totalCost: 7650,
          supplierName: 'Fleetguard Filters Gulf',
          supplierId: goodsReceipts.filtersPO.supplierId,
          purchaseRef: goodsReceipts.filtersPO.poNumber,
          createdBy: warehouseId
        }
      }
    }
  })

  // Create inventory balances
  await prisma.inventoryBalance.create({
    data: {
      locationId: locations.mainWarehouse.id,
      itemId: items.piston.id,
      availableQuantity: 50,
      reservedQuantity: 0,
      onOrderQuantity: 0,
      totalQuantity: 50,
      averageCost: 850,
      totalValue: 42500,
      minStockLevel: items.piston.minStockLevel,
      maxStockLevel: items.piston.maxStockLevel,
      reorderPoint: items.piston.reorderPoint
    }
  })

  await prisma.inventoryBalance.create({
    data: {
      locationId: locations.mainWarehouse.id,
      itemId: items.injector.id,
      availableQuantity: 100,
      reservedQuantity: 0,
      onOrderQuantity: 0,
      totalQuantity: 100,
      averageCost: 450,
      totalValue: 45000,
      minStockLevel: items.injector.minStockLevel,
      maxStockLevel: items.injector.maxStockLevel,
      reorderPoint: items.injector.reorderPoint
    }
  })

  await prisma.inventoryBalance.create({
    data: {
      locationId: locations.mainWarehouse.id,
      itemId: items.oilFilter.id,
      availableQuantity: 100,
      reservedQuantity: 0,
      onOrderQuantity: 0,
      totalQuantity: 100,
      averageCost: 76.5,
      totalValue: 7650,
      minStockLevel: items.oilFilter.minStockLevel,
      maxStockLevel: items.oilFilter.maxStockLevel,
      reorderPoint: items.oilFilter.reorderPoint
    }
  })
}

async function createShipments(warehouseId: string, salesOrders: any, warehouse: any) {
  // For service orders, we create a "shipment" for tracking service delivery
  const serviceShipment = await prisma.shipment.create({
    data: {
      shipmentNumber: 'SHP-2024-001',
      salesOrderId: salesOrders.dpWorldOrder.id,
      status: ShipmentStatus.PREPARING,
      shipToAddress: 'DP World Jebel Ali, Dubai, UAE',
      shipFromAddress: warehouse.address,
      shippingMethod: 'On-site Service',
      createdBy: warehouseId,
      items: {
        create: [
          {
            salesOrderItemId: salesOrders.dpWorldOrder.items[0].id,
            itemId: salesOrders.dpWorldOrder.items[0].itemId!,
            itemCode: 'SRV-MAJOR',
            description: 'Major Engine Service - First Quarter',
            quantityShipped: 12 // First quarter services
          }
        ]
      }
    }
  })

  return { serviceShipment }
}

async function createInvoices(accountantId: string, salesOrders: any, customers: any) {
  // First quarter invoice for DP World
  const dpWorldInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-001',
      salesOrderId: salesOrders.dpWorldOrder.id,
      customerId: customers.dpWorld.id,
      type: 'SALES',
      status: InvoiceStatus.SENT,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      subtotal: 571428.57,
      taxAmount: 28571.43,
      discountAmount: 0,
      totalAmount: 600000,
      paidAmount: 0,
      balanceAmount: 600000,
      paymentTerms: '60 days net',
      billingAddress: 'DP World Jebel Ali, Dubai, UAE',
      notes: 'First quarter services - Annual maintenance contract',
      createdBy: accountantId,
      sentBy: accountantId,
      sentAt: new Date(),
      items: {
        create: [
          {
            itemId: salesOrders.dpWorldOrder.items[0].itemId,
            itemCode: 'SRV-MAJOR',
            description: 'Q1 2024 - Quarterly major service for 12 tugboats',
            quantity: 12,
            unitPrice: 30000,
            discount: 0,
            taxRate: 5,
            taxRateId: salesOrders.dpWorldOrder.items[0].taxRateId,
            subtotal: 360000,
            discountAmount: 0,
            taxAmount: 18000,
            totalAmount: 378000
          },
          {
            itemId: salesOrders.dpWorldOrder.items[1].itemId,
            itemCode: 'SRV-EMERGENCY',
            description: 'Q1 2024 - Emergency support allocation',
            quantity: 12.5,
            unitPrice: 850,
            discount: 0,
            taxRate: 5,
            taxRateId: salesOrders.dpWorldOrder.items[1].taxRateId,
            subtotal: 10625,
            discountAmount: 0,
            taxAmount: 531.25,
            totalAmount: 11156.25
          },
          {
            itemCode: 'PARTS-Q1',
            description: 'Q1 2024 - Spare parts allocation',
            quantity: 1,
            unitPrice: 200803.57,
            discount: 0,
            taxRate: 5,
            subtotal: 200803.57,
            discountAmount: 0,
            taxAmount: 10040.18,
            totalAmount: 210843.75
          }
        ]
      }
    }
  })

  return { dpWorldInvoice }
}

async function createPayments(accountantId: string, invoices: any, customers: any) {
  // Partial payment from DP World
  const dpWorldPayment = await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2024-001',
      invoiceId: invoices.dpWorldInvoice.id,
      customerId: customers.dpWorld.id,
      amount: 300000,
      paymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentMethod: 'BANK_TRANSFER',
      reference: 'ENBD-REF-123456',
      notes: 'Partial payment - 50% of invoice',
      createdBy: accountantId
    }
  })

  // Update invoice paid amount
  await prisma.invoice.update({
    where: { id: invoices.dpWorldInvoice.id },
    data: {
      paidAmount: 300000,
      balanceAmount: 300000,
      status: InvoiceStatus.PARTIAL_PAID
    }
  })

  return { dpWorldPayment }
}

async function createSupplierPayments(accountantId: string, supplierInvoices: any, suppliers: any) {
  const filterPayment = await prisma.supplierPayment.create({
    data: {
      paymentNumber: 'SPAY-2024-001',
      supplierId: suppliers.fleetguardSupplier.id,
      supplierInvoiceId: supplierInvoices.supplierInvoice.id,
      paymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentMethod: 'BANK_TRANSFER',
      amount: 31375,
      reference: 'ENBD-OUT-789012',
      notes: 'Full payment for filter order',
      currency: 'AED',
      exchangeRate: 1.0,
      baseAmount: 31375,
      createdBy: accountantId
    }
  })

  // Update supplier invoice
  await prisma.supplierInvoice.update({
    where: { id: supplierInvoices.supplierInvoice.id },
    data: {
      paidAmount: 31375,
      status: SupplierInvoiceStatus.PAID
    }
  })

  return { filterPayment }
}

async function createSampleJournalEntries(accountantId: string, accounts: any) {
  // Opening balance entry
  const openingEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0001',
      date: new Date('2024-01-01'),
      description: 'Opening balances',
      reference: 'OPENING',
      currency: 'AED',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-01'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  // Opening balance lines
  await prisma.journalLine.createMany({
    data: [
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.bankAED.id,
        description: 'Opening bank balance - AED',
        debitAmount: 1000000,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 1000000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.bankUSD.id,
        description: 'Opening bank balance - USD',
        debitAmount: 100000,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 3.6725,
        baseDebitAmount: 367250,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.inventory.id,
        description: 'Opening inventory',
        debitAmount: 500000,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 500000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.workshopEquipment.id,
        description: 'Workshop equipment',
        debitAmount: 2000000,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 2000000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.vehicles.id,
        description: 'Service vehicles',
        debitAmount: 800000,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 800000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.capitalStock.id,
        description: 'Share capital',
        debitAmount: 0,
        creditAmount: 4667250,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 4667250
      }
    ]
  })

  // Monthly rent payment
  const rentEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0002',
      date: new Date('2024-01-05'),
      description: 'Workshop rent payment - January',
      reference: 'RENT-JAN-2024',
      currency: 'AED',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-05'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await prisma.journalLine.createMany({
    data: [
      {
        journalEntryId: rentEntry.id,
        accountId: accounts.rentExpense.id,
        description: 'Workshop rent - January',
        debitAmount: 25000,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 25000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: rentEntry.id,
        accountId: accounts.bankAED.id,
        description: 'Bank payment for rent',
        debitAmount: 0,
        creditAmount: 25000,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 25000
      }
    ]
  })

  // Service revenue recognition
  const revenueEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0003',
      date: new Date(),
      description: 'Q1 Service revenue recognition - DP World',
      reference: 'INV-2024-001',
      currency: 'AED',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      postedAt: new Date(),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await prisma.journalLine.createMany({
    data: [
      {
        journalEntryId: revenueEntry.id,
        accountId: accounts.accountsReceivable.id,
        description: 'Invoice to DP World',
        debitAmount: 600000,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 600000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: revenueEntry.id,
        accountId: accounts.serviceRevenue.id,
        description: 'Service revenue',
        debitAmount: 0,
        creditAmount: 360000,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 360000
      },
      {
        journalEntryId: revenueEntry.id,
        accountId: accounts.emergencyServiceRevenue.id,
        description: 'Emergency service revenue',
        debitAmount: 0,
        creditAmount: 10625,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 10625
      },
      {
        journalEntryId: revenueEntry.id,
        accountId: accounts.partsRevenue.id,
        description: 'Parts revenue',
        debitAmount: 0,
        creditAmount: 200803.57,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 200803.57
      },
      {
        journalEntryId: revenueEntry.id,
        accountId: accounts.vatPayable.id,
        description: 'VAT collected',
        debitAmount: 0,
        creditAmount: 28571.43,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 28571.43
      }
    ]
  })

  // Staff salaries
  const salaryEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0004',
      date: new Date('2024-01-31'),
      description: 'Staff salaries - January',
      reference: 'SAL-JAN-2024',
      currency: 'AED',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-31'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await prisma.journalLine.createMany({
    data: [
      {
        journalEntryId: salaryEntry.id,
        accountId: accounts.salariesExpense.id,
        description: 'Administrative staff salaries',
        debitAmount: 75000,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 75000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: salaryEntry.id,
        accountId: accounts.directLabor.id,
        description: 'Service engineers salaries',
        debitAmount: 120000,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 120000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: salaryEntry.id,
        accountId: accounts.bankAED.id,
        description: 'Salaries paid',
        debitAmount: 0,
        creditAmount: 195000,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 195000
      }
    ]
  })
}

export {
  createQuotations,
  createSalesOrders,
  createPurchaseWorkflow,
  createStockMovements,
  createShipments,
  createInvoices,
  createPayments,
  createSupplierPayments,
  createSampleJournalEntries
}