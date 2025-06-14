import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import {
  Role,
  AccountType,
  AccountStatus,
  CustomerStatus,
  LeadStatus,
  LeadSource,
  SalesCaseStatus,
  QuotationStatus,
  OrderStatus,
  ShipmentStatus,
  InvoiceType,
  InvoiceStatus,
  PaymentMethod,
  ExpenseStatus,
  ItemType,
  MovementType,
  POStatus,
  ReceiptStatus,
  SupplierInvoiceStatus,
  LocationType,
  TransferStatus,
  CountType,
  CountStatus,
} from "@/lib/generated/prisma";

// Simple helper to create users with hashed password
async function createUsers(): Promise<T> {
  const password = await bcrypt.hash("demo123", 10);
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@example.com",
      password,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  await logAction(admin.id, "User", admin.id);
  const sales = await prisma.user.create({
    data: {
      username: "sales",
      email: "sales@example.com",
      password,
      role: Role.USER,
      isActive: true,
    },
  });
  await logAction(sales.id, "User", sales.id);
  const accountant = await prisma.user.create({
    data: {
      username: "accountant",
      email: "accountant@example.com",
      password,
      role: Role.USER,
      isActive: true,
    },
  });
  await logAction(accountant.id, "User", accountant.id);
  const warehouse = await prisma.user.create({
    data: {
      username: "warehouse",
      email: "warehouse@example.com",
      password,
      role: Role.USER,
      isActive: true,
    },
  });
  await logAction(warehouse.id, "User", warehouse.id);
  return { admin, sales, accountant, warehouse };
}

async function createPermissions(): Promise<T> {
  const perms = await Promise.all([
    prisma.permission.create({
      data: {
        code: "sales.manage",
        name: "Manage Sales",
        module: "sales",
        action: "manage",
      },
    }),
    prisma.permission.create({
      data: {
        code: "inventory.manage",
        name: "Manage Inventory",
        module: "inventory",
        action: "manage",
      },
    }),
    prisma.permission.create({
      data: {
        code: "accounting.manage",
        name: "Manage Accounting",
        module: "accounting",
        action: "manage",
      },
    }),
  ]);
  await Promise.all(
    perms.map((p) =>
      prisma.rolePermission.create({
        data: { role: Role.ADMIN, permissionId: p.id },
      }),
    ),
  );
  return perms;
}

async function createAccounts(userId: string) {
  const cash = await prisma.account.create({
    data: {
      code: "1000",
      name: "Cash",
      type: AccountType.ASSET,
      status: AccountStatus.ACTIVE,
      createdBy: userId,
    },
  });
  const ar = await prisma.account.create({
    data: {
      code: "1200",
      name: "Accounts Receivable",
      type: AccountType.ASSET,
      status: AccountStatus.ACTIVE,
      createdBy: userId,
    },
  });
  const ap = await prisma.account.create({
    data: {
      code: "2000",
      name: "Accounts Payable",
      type: AccountType.LIABILITY,
      status: AccountStatus.ACTIVE,
      createdBy: userId,
    },
  });
  const sales = await prisma.account.create({
    data: {
      code: "4000",
      name: "Sales Revenue",
      type: AccountType.INCOME,
      status: AccountStatus.ACTIVE,
      createdBy: userId,
    },
  });
  const cogs = await prisma.account.create({
    data: {
      code: "5000",
      name: "Cost of Goods Sold",
      type: AccountType.EXPENSE,
      status: AccountStatus.ACTIVE,
      createdBy: userId,
    },
  });
  return { cash, ar, ap, sales, cogs };
}

async function createCategoriesAndUnits(userId: string) {
  const pcs = await prisma.unitOfMeasure.create({
    data: { code: "PCS", name: "Pieces", isBaseUnit: true, createdBy: userId },
  });
  const cat = await prisma.category.create({
    data: { code: "GEN", name: "General", createdBy: userId },
  });
  return { pcs, cat };
}

async function createItems(userId: string, accounts: any, setup: any) {
  const item = await prisma.item.create({
    data: {
      code: "ITM-001",
      name: "Demo Item",
      categoryId: setup.cat.id,
      unitOfMeasureId: setup.pcs.id,
      type: ItemType.PRODUCT,
      trackInventory: true,
      standardCost: 10,
      listPrice: 20,
      inventoryAccountId: accounts.cogs.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.sales.id,
      createdBy: userId,
    },
  });
  return { item };
}

async function createLocations(userId: string, accounts: any) {
  const loc = await prisma.location.create({
    data: {
      locationCode: "MAIN",
      name: "Main Warehouse",
      type: LocationType.WAREHOUSE,
      inventoryAccountId: accounts.cogs.id,
      createdBy: userId,
    },
  });
  return { loc };
}

async function createInventory(userId: string, item: any, loc: any) {
  const lot = await prisma.stockLot.create({
    data: {
      lotNumber: "LOT-001",
      itemId: item.id,
      receivedDate: new Date(),
      receivedQty: 100,
      availableQty: 100,
      unitCost: 10,
      totalCost: 1000,
      createdBy: userId,
    },
  });
  await prisma.stockMovement.create({
    data: {
      movementNumber: "M-001",
      itemId: item.id,
      stockLotId: lot.id,
      movementType: MovementType.OPENING,
      movementDate: new Date(),
      quantity: 100,
      unitCost: 10,
      totalCost: 1000,
      unitOfMeasureId: item.unitOfMeasureId,
      locationId: loc.id,
      createdBy: userId,
    },
  });
  await prisma.inventoryBalance.create({
    data: { locationId: loc.id, itemId: item.id, availableQuantity: 100 },
  });
  await prisma.locationStockLot.create({
    data: { locationId: loc.id, stockLotId: lot.id, availableQty: 100 },
  });
  return { lot };
}

async function createCustomers(userId: string, salesId: string, accounts: any) {
  const cust = await prisma.customer.create({
    data: {
      customerNumber: "CUST-001",
      name: "Acme Corp",
      email: "info@acme.com",
      currency: "USD",
      status: CustomerStatus.ACTIVE,
      createdBy: userId,
      accountId: accounts.ar.id,
      assignedToId: salesId,
    },
  });
  return { cust };
}

async function createLeads(salesId: string) {
  const lead = await prisma.lead.create({
    data: {
      firstName: "John",
      lastName: "Lead",
      email: "lead@example.com",
      source: LeadSource.WEBSITE,
      status: LeadStatus.NEW,
      createdBy: salesId,
    },
  });
  return { lead };
}

async function createSalesCases(salesId: string, cust: any, lead: any) {
  const sc = await prisma.salesCase.create({
    data: {
      caseNumber: "SC-001",
      customerId: cust.id,
      title: "Demo Deal",
      status: SalesCaseStatus.OPEN,
      createdBy: salesId,
    },
  });
  await logAction(salesId, "SalesCase", sc.id);
  return { sc };
}

async function createQuotations(salesId: string, salesCase: any, item: any) {
  const quote = await prisma.quotation.create({
    data: {
      quotationNumber: "Q-001",
      salesCaseId: salesCase.id,
      validUntil: new Date(Date.now() + 86400000),
      createdBy: salesId,
      items: {
        create: {
          itemId: item.id,
          itemCode: item.code,
          description: item.name,
          quantity: 2,
          unitPrice: 20,
        },
      },
    },
  });
  return { quote };
}

async function createSalesOrders(salesId: string, quote: any) {
  const order = await prisma.salesOrder.create({
    data: {
      orderNumber: "SO-001",
      salesCaseId: quote.salesCaseId,
      quotationId: quote.id,
      status: OrderStatus.PENDING,
      createdBy: salesId,
    },
  });
  await prisma.salesOrderItem.create({
    data: {
      salesOrderId: order.id,
      itemId: quote.items[0].itemId,
      itemCode: "ITM-001",
      description: "Demo Item",
      quantity: 2,
      unitPrice: 20,
    },
  });
  return { order };
}

async function createShipments(
  userId: string,
  order: any,
  item: any,
  loc: any,
  lot: any,
) {
  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber: "SHIP-001",
      salesOrderId: order.id,
      status: ShipmentStatus.SHIPPED,
      shipToAddress: "123 Road",
      createdBy: userId,
      shipmentDate: new Date(),
    },
  });
  await prisma.shipmentItem.create({
    data: {
      shipmentId: shipment.id,
      salesOrderItemId: order.items ? order.items[0].id : "",
      itemId: item.id,
      itemCode: item.code,
      description: item.name,
      quantityShipped: 2,
    },
  });
  // Record stock movement and update balances
  await prisma.stockMovement.create({
    data: {
      movementNumber: "M-002",
      itemId: item.id,
      stockLotId: lot.id,
      movementType: MovementType.STOCK_OUT,
      movementDate: new Date(),
      quantity: -2,
      unitCost: 10,
      totalCost: -20,
      unitOfMeasureId: item.unitOfMeasureId,
      locationId: loc.id,
      referenceType: "SALE",
      referenceId: shipment.id,
      referenceNumber: shipment.shipmentNumber,
      createdBy: userId,
    },
  });
  await prisma.inventoryBalance.update({
    where: { locationId_itemId: { locationId: loc.id, itemId: item.id } },
    data: { availableQuantity: { decrement: 2 } },
  });
  await prisma.locationStockLot.update({
    where: {
      locationId_stockLotId: { locationId: loc.id, stockLotId: lot.id },
    },
    data: { availableQty: { decrement: 2 } },
  });
  return { shipment };
}

async function createInvoices(
  accountantId: string,
  order: any,
  cust: any,
  item: any,
) {
  const inv = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-001",
      customerId: cust.id,
      salesOrderId: order.id,
      type: InvoiceType.SALES,
      status: InvoiceStatus.SENT,
      createdBy: accountantId,
    },
  });
  await prisma.invoiceItem.create({
    data: {
      invoiceId: inv.id,
      itemId: item.id,
      itemCode: item.code,
      description: item.name,
      quantity: 2,
      unitPrice: 20,
    },
  });
  await logAction(accountantId, "Invoice", inv.id);
  return { inv };
}

async function createPayments(
  accountantId: string,
  invoice: any,
  accounts: any,
) {
  const pay = await prisma.payment.create({
    data: {
      paymentNumber: "PAY-001",
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      paymentDate: new Date(),
      amount: 40,
      paymentMethod: PaymentMethod.CASH,
      accountId: accounts.cash.id,
      createdBy: accountantId,
    },
  });
  await logAction(accountantId, "Payment", pay.id);
}

async function createSuppliers(userId: string, accounts: any) {
  const sup = await prisma.supplier.create({
    data: {
      supplierNumber: "SUP-001",
      name: "Supply Co",
      currency: "USD",
      createdBy: userId,
      accountId: accounts.ap.id,
    },
  });
  return { sup };
}

async function createPurchaseOrders(userId: string, sup: any, item: any) {
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-001",
      supplierId: sup.id,
      status: POStatus.ORDERED,
      createdBy: userId,
      items: {
        create: {
          itemId: item.id,
          itemCode: item.code,
          description: item.name,
          quantity: 10,
          unitPrice: 8,
        },
      },
    },
  });
  return { po };
}

async function createGoodsReceipts(userId: string, po: any, item: any) {
  const receipt = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: "GR-001",
      purchaseOrderId: po.id,
      receivedBy: userId,
      status: ReceiptStatus.COMPLETED,
      createdBy: userId,
    },
  });
  await prisma.goodsReceiptItem.create({
    data: {
      goodsReceiptId: receipt.id,
      purchaseOrderItemId: po.items[0].id,
      itemId: item.id,
      itemCode: item.code,
      description: item.name,
      quantityOrdered: 10,
      quantityReceived: 10,
      unitCost: 8,
    },
  });
  return { receipt };
}

async function createSupplierInvoices(accountantId: string, sup: any, po: any) {
  const sinv = await prisma.supplierInvoice.create({
    data: {
      invoiceNumber: "SI-001",
      supplierId: sup.id,
      purchaseOrderId: po.id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 86400000 * 30),
      status: SupplierInvoiceStatus.RECEIVED,
      createdBy: accountantId,
    },
  });
  return { sinv };
}

async function createSupplierPayments(
  accountantId: string,
  sup: any,
  sinv: any,
  accounts: any,
) {
  await prisma.supplierPayment.create({
    data: {
      paymentNumber: "SP-001",
      supplierId: sup.id,
      supplierInvoiceId: sinv.id,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      amount: 80,
      createdBy: accountantId,
      currency: "USD",
      baseAmount: 80,
      accountId: accounts.cash.id,
    },
  });
}

// Customer purchase order referencing the quotation
async function createCustomerPO(
  salesId: string,
  cust: any,
  sc: any,
  quote: any,
) {
  const cpo = await prisma.customerPO.create({
    data: {
      poNumber: "CPO-001",
      customerId: cust.id,
      quotationId: quote.id,
      salesCaseId: sc.id,
      poDate: new Date(),
      poAmount: 40,
      isAccepted: true,
      createdBy: salesId,
    },
  });
  return { cpo };
}

// Expense recorded against the sales case
async function createCaseExpenses(
  accountantId: string,
  sc: any,
  accounts: any,
) {
  await prisma.caseExpense.create({
    data: {
      salesCaseId: sc.id,
      expenseDate: new Date(),
      category: "Travel",
      description: "Client visit",
      amount: 15,
      currency: "USD",
      exchangeRate: 1,
      baseAmount: 15,
      status: ExpenseStatus.APPROVED,
      accountId: accounts.cogs.id,
      createdBy: accountantId,
    },
  });
}

function logAction(
  userId: string,
  entity: string,
  entityId: string,
  action = "CREATE",
) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType: entity,
      entityId,
      timestamp: new Date(),
    },
  });
}

// Update profitability metrics on the sales case
async function updateProfitability(sc: any, inv: any) {
  const revenue = 40;
  const cost = 35;
  const margin = ((revenue - cost) / revenue) * 100;
  await prisma.salesCase.update({
    where: { id: sc.id },
    data: {
      actualValue: revenue,
      cost,
      profitMargin: margin,
      status: SalesCaseStatus.WON,
    },
  });
  await logAction(sc.createdBy, "SalesCase", sc.id, "UPDATE");
}

async function main(): Promise<void> {
  await prisma.$transaction([
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.user.deleteMany(),
    prisma.account.deleteMany(),
    prisma.category.deleteMany(),
    prisma.unitOfMeasure.deleteMany(),
    prisma.item.deleteMany(),
    prisma.location.deleteMany(),
    prisma.stockLot.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.inventoryBalance.deleteMany(),
    prisma.locationStockLot.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.salesCase.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.salesOrderItem.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.shipmentItem.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.supplierPayment.deleteMany(),
    prisma.supplierInvoice.deleteMany(),
    prisma.goodsReceiptItem.deleteMany(),
    prisma.goodsReceipt.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.supplier.deleteMany(),
  ]);

  const users = await createUsers();
  await createPermissions();
  const accounts = await createAccounts(users.admin.id);
  const setup = await createCategoriesAndUnits(users.admin.id);
  const { item } = await createItems(users.admin.id, accounts, setup);
  const { loc } = await createLocations(users.admin.id, accounts);
  const { lot } = await createInventory(users.warehouse.id, item, loc);
  const { cust } = await createCustomers(
    users.admin.id,
    users.sales.id,
    accounts,
  );
  const { lead } = await createLeads(users.sales.id);
  const { sc } = await createSalesCases(users.sales.id, cust, lead);
  const { quote } = await createQuotations(users.sales.id, sc, item);
  const { order } = await createSalesOrders(users.sales.id, quote);
  const { cpo } = await createCustomerPO(users.sales.id, cust, sc, quote);
  await createShipments(users.warehouse.id, order, item, loc, lot);
  const { inv } = await createInvoices(users.accountant.id, order, cust, item);
  await createPayments(users.accountant.id, inv, accounts);
  await createCaseExpenses(users.accountant.id, sc, accounts);
  await updateProfitability(sc, inv);
  const { sup } = await createSuppliers(users.admin.id, accounts);
  const { po } = await createPurchaseOrders(users.admin.id, sup, item);
  await createGoodsReceipts(users.warehouse.id, po, item);
  const { sinv } = await createSupplierInvoices(users.accountant.id, sup, po);
  await createSupplierPayments(users.accountant.id, sup, sinv, accounts);
}

main()
  .then(() => {
    console.warn("✅ Database seeded");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
