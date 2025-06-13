/*
  Warnings:

  - You are about to drop the column `supplier` on the `StockLot` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `StockMovement` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "salesOrderItemId" TEXT,
    "quantityReserved" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reservedBy" TEXT NOT NULL,
    "reservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedBy" TEXT,
    "releasedAt" DATETIME,
    "expiresAt" DATETIME,
    "notes" TEXT,
    CONSTRAINT "StockReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockReservation_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockReservation_salesOrderItemId_fkey" FOREIGN KEY ("salesOrderItemId") REFERENCES "SalesOrderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "creditLimit" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "routingNumber" TEXT,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "accountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" DATETIME,
    "requestedBy" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "shippingAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "receivedAmount" REAL NOT NULL DEFAULT 0,
    "invoicedAmount" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "shippingAddress" TEXT,
    "billingAddress" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "sentToSupplier" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "unitOfMeasureId" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "quantityReceived" REAL NOT NULL DEFAULT 0,
    "quantityInvoiced" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrderItem_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receiptDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryNote" TEXT,
    "receivedBy" TEXT NOT NULL,
    "condition" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoodsReceiptItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goodsReceiptId" TEXT NOT NULL,
    "purchaseOrderItemId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantityOrdered" REAL NOT NULL,
    "quantityReceived" REAL NOT NULL,
    "unitCost" REAL NOT NULL,
    "condition" TEXT,
    "notes" TEXT,
    CONSTRAINT "GoodsReceiptItem_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoodsReceiptItem_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodsReceiptItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paymentTerms" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "matchingStatus" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "journalEntryId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierInvoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupplierInvoice_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierInvoiceId" TEXT,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "baseAmount" REAL NOT NULL,
    "journalEntryId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierPayment_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupplierPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL DEFAULT 'EnXi ERP',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'WAREHOUSE',
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "postalCode" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
    "maxCapacity" REAL,
    "currentUtilization" REAL NOT NULL DEFAULT 0,
    "inventoryAccountId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Location_inventoryAccountId_fkey" FOREIGN KEY ("inventoryAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "availableQuantity" REAL NOT NULL DEFAULT 0,
    "reservedQuantity" REAL NOT NULL DEFAULT 0,
    "onOrderQuantity" REAL NOT NULL DEFAULT 0,
    "totalQuantity" REAL NOT NULL DEFAULT 0,
    "averageCost" REAL NOT NULL DEFAULT 0,
    "totalValue" REAL NOT NULL DEFAULT 0,
    "minStockLevel" REAL,
    "maxStockLevel" REAL,
    "reorderPoint" REAL,
    "lastMovementDate" DATETIME,
    "lastCountDate" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationStockLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "stockLotId" TEXT NOT NULL,
    "availableQty" REAL NOT NULL DEFAULT 0,
    "reservedQty" REAL NOT NULL DEFAULT 0,
    "zone" TEXT,
    "aisle" TEXT,
    "shelf" TEXT,
    "bin" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LocationStockLot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LocationStockLot_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "StockLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferNumber" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "transferDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "shippedBy" TEXT,
    "shippedAt" DATETIME,
    "receivedBy" TEXT,
    "receivedAt" DATETIME,
    "totalQuantity" REAL NOT NULL DEFAULT 0,
    "totalValue" REAL NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockTransferItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockTransferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stockLotId" TEXT,
    "requestedQuantity" REAL NOT NULL,
    "shippedQuantity" REAL NOT NULL DEFAULT 0,
    "receivedQuantity" REAL NOT NULL DEFAULT 0,
    "unitCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "condition" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "StockTransferItem_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "StockTransfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockTransferItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransferItem_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "StockLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhysicalCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countNumber" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "countDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countType" TEXT NOT NULL DEFAULT 'FULL',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "categoryFilter" TEXT,
    "itemFilter" TEXT,
    "zoneFilter" TEXT,
    "countedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "itemsCounted" INTEGER NOT NULL DEFAULT 0,
    "adjustmentsFound" INTEGER NOT NULL DEFAULT 0,
    "totalVarianceValue" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PhysicalCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhysicalCountItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "physicalCountId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stockLotId" TEXT,
    "systemQuantity" REAL NOT NULL,
    "countedQuantity" REAL NOT NULL,
    "variance" REAL NOT NULL DEFAULT 0,
    "variancePercent" REAL NOT NULL DEFAULT 0,
    "unitCost" REAL NOT NULL DEFAULT 0,
    "varianceValue" REAL NOT NULL DEFAULT 0,
    "confidence" TEXT,
    "recountRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "adjustmentCreated" BOOLEAN NOT NULL DEFAULT false,
    "adjustmentId" TEXT,
    CONSTRAINT "PhysicalCountItem_physicalCountId_fkey" FOREIGN KEY ("physicalCountId") REFERENCES "PhysicalCount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PhysicalCountItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PhysicalCountItem_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "StockLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StockLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "receivedDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "supplierName" TEXT,
    "supplierId" TEXT,
    "purchaseRef" TEXT,
    "receivedQty" REAL NOT NULL,
    "availableQty" REAL NOT NULL,
    "reservedQty" REAL NOT NULL DEFAULT 0,
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockLot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockLot_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StockLot" ("availableQty", "createdAt", "createdBy", "expiryDate", "id", "isActive", "itemId", "lotNumber", "purchaseRef", "receivedDate", "receivedQty", "reservedQty", "totalCost", "unitCost", "updatedAt") SELECT "availableQty", "createdAt", "createdBy", "expiryDate", "id", "isActive", "itemId", "lotNumber", "purchaseRef", "receivedDate", "receivedQty", "reservedQty", "totalCost", "unitCost", "updatedAt" FROM "StockLot";
DROP TABLE "StockLot";
ALTER TABLE "new_StockLot" RENAME TO "StockLot";
CREATE UNIQUE INDEX "StockLot_lotNumber_key" ON "StockLot"("lotNumber");
CREATE INDEX "StockLot_itemId_idx" ON "StockLot"("itemId");
CREATE INDEX "StockLot_receivedDate_idx" ON "StockLot"("receivedDate");
CREATE INDEX "StockLot_availableQty_idx" ON "StockLot"("availableQty");
CREATE TABLE "new_StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movementNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stockLotId" TEXT,
    "movementType" TEXT NOT NULL,
    "movementDate" DATETIME NOT NULL,
    "quantity" REAL NOT NULL,
    "unitCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "unitOfMeasureId" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "referenceNumber" TEXT,
    "locationId" TEXT,
    "locationName" TEXT,
    "journalEntryId" TEXT,
    "goodsReceiptId" TEXT,
    "notes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "StockLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StockMovement" ("approvedAt", "approvedBy", "createdAt", "createdBy", "id", "itemId", "journalEntryId", "locationId", "movementDate", "movementNumber", "movementType", "notes", "quantity", "referenceId", "referenceNumber", "referenceType", "stockLotId", "totalCost", "unitCost", "unitOfMeasureId", "updatedAt") SELECT "approvedAt", "approvedBy", "createdAt", "createdBy", "id", "itemId", "journalEntryId", "locationId", "movementDate", "movementNumber", "movementType", "notes", "quantity", "referenceId", "referenceNumber", "referenceType", "stockLotId", "totalCost", "unitCost", "unitOfMeasureId", "updatedAt" FROM "StockMovement";
DROP TABLE "StockMovement";
ALTER TABLE "new_StockMovement" RENAME TO "StockMovement";
CREATE UNIQUE INDEX "StockMovement_movementNumber_key" ON "StockMovement"("movementNumber");
CREATE INDEX "StockMovement_itemId_idx" ON "StockMovement"("itemId");
CREATE INDEX "StockMovement_movementType_idx" ON "StockMovement"("movementType");
CREATE INDEX "StockMovement_movementDate_idx" ON "StockMovement"("movementDate");
CREATE INDEX "StockMovement_referenceType_referenceId_idx" ON "StockMovement"("referenceType", "referenceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StockReservation_itemId_idx" ON "StockReservation"("itemId");

-- CreateIndex
CREATE INDEX "StockReservation_salesOrderId_idx" ON "StockReservation"("salesOrderId");

-- CreateIndex
CREATE INDEX "StockReservation_status_idx" ON "StockReservation"("status");

-- CreateIndex
CREATE INDEX "StockReservation_reservedAt_idx" ON "StockReservation"("reservedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_supplierNumber_key" ON "Supplier"("supplierNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_email_key" ON "Supplier"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_accountId_key" ON "Supplier"("accountId");

-- CreateIndex
CREATE INDEX "Supplier_supplierNumber_idx" ON "Supplier"("supplierNumber");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_isActive_idx" ON "Supplier"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_orderDate_idx" ON "PurchaseOrder"("orderDate");

-- CreateIndex
CREATE INDEX "PurchaseOrder_poNumber_idx" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_itemId_idx" ON "PurchaseOrderItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_receiptNumber_key" ON "GoodsReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "GoodsReceipt_purchaseOrderId_idx" ON "GoodsReceipt"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_receiptDate_idx" ON "GoodsReceipt"("receiptDate");

-- CreateIndex
CREATE INDEX "GoodsReceipt_status_idx" ON "GoodsReceipt"("status");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_goodsReceiptId_idx" ON "GoodsReceiptItem"("goodsReceiptId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_purchaseOrderItemId_idx" ON "GoodsReceiptItem"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_itemId_idx" ON "GoodsReceiptItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_invoiceNumber_key" ON "SupplierInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SupplierInvoice_supplierId_idx" ON "SupplierInvoice"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierInvoice_purchaseOrderId_idx" ON "SupplierInvoice"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "SupplierInvoice_status_idx" ON "SupplierInvoice"("status");

-- CreateIndex
CREATE INDEX "SupplierInvoice_invoiceDate_idx" ON "SupplierInvoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "SupplierInvoice_dueDate_idx" ON "SupplierInvoice"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_paymentNumber_key" ON "SupplierPayment"("paymentNumber");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierInvoiceId_idx" ON "SupplierPayment"("supplierInvoiceId");

-- CreateIndex
CREATE INDEX "SupplierPayment_paymentDate_idx" ON "SupplierPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "SupplierPayment_paymentMethod_idx" ON "SupplierPayment"("paymentMethod");

-- CreateIndex
CREATE INDEX "CompanySettings_isActive_idx" ON "CompanySettings"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Location_locationCode_key" ON "Location"("locationCode");

-- CreateIndex
CREATE INDEX "Location_locationCode_idx" ON "Location"("locationCode");

-- CreateIndex
CREATE INDEX "Location_type_idx" ON "Location"("type");

-- CreateIndex
CREATE INDEX "Location_isActive_idx" ON "Location"("isActive");

-- CreateIndex
CREATE INDEX "InventoryBalance_locationId_idx" ON "InventoryBalance"("locationId");

-- CreateIndex
CREATE INDEX "InventoryBalance_itemId_idx" ON "InventoryBalance"("itemId");

-- CreateIndex
CREATE INDEX "InventoryBalance_availableQuantity_idx" ON "InventoryBalance"("availableQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_locationId_itemId_key" ON "InventoryBalance"("locationId", "itemId");

-- CreateIndex
CREATE INDEX "LocationStockLot_locationId_idx" ON "LocationStockLot"("locationId");

-- CreateIndex
CREATE INDEX "LocationStockLot_stockLotId_idx" ON "LocationStockLot"("stockLotId");

-- CreateIndex
CREATE INDEX "LocationStockLot_availableQty_idx" ON "LocationStockLot"("availableQty");

-- CreateIndex
CREATE UNIQUE INDEX "LocationStockLot_locationId_stockLotId_key" ON "LocationStockLot"("locationId", "stockLotId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_transferNumber_key" ON "StockTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "StockTransfer_fromLocationId_idx" ON "StockTransfer"("fromLocationId");

-- CreateIndex
CREATE INDEX "StockTransfer_toLocationId_idx" ON "StockTransfer"("toLocationId");

-- CreateIndex
CREATE INDEX "StockTransfer_status_idx" ON "StockTransfer"("status");

-- CreateIndex
CREATE INDEX "StockTransfer_transferDate_idx" ON "StockTransfer"("transferDate");

-- CreateIndex
CREATE INDEX "StockTransferItem_stockTransferId_idx" ON "StockTransferItem"("stockTransferId");

-- CreateIndex
CREATE INDEX "StockTransferItem_itemId_idx" ON "StockTransferItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalCount_countNumber_key" ON "PhysicalCount"("countNumber");

-- CreateIndex
CREATE INDEX "PhysicalCount_locationId_idx" ON "PhysicalCount"("locationId");

-- CreateIndex
CREATE INDEX "PhysicalCount_countDate_idx" ON "PhysicalCount"("countDate");

-- CreateIndex
CREATE INDEX "PhysicalCount_status_idx" ON "PhysicalCount"("status");

-- CreateIndex
CREATE INDEX "PhysicalCountItem_physicalCountId_idx" ON "PhysicalCountItem"("physicalCountId");

-- CreateIndex
CREATE INDEX "PhysicalCountItem_itemId_idx" ON "PhysicalCountItem"("itemId");

-- CreateIndex
CREATE INDEX "PhysicalCountItem_variance_idx" ON "PhysicalCountItem"("variance");
