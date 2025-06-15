-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "defaultTaxRateId" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN "taxRegistrationNumber" TEXT;

-- CreateTable
CREATE TABLE "TaxCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rate" REAL NOT NULL,
    "categoryId" TEXT NOT NULL,
    "taxType" TEXT NOT NULL DEFAULT 'SALES',
    "appliesTo" TEXT NOT NULL DEFAULT 'ALL',
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isCompound" BOOLEAN NOT NULL DEFAULT false,
    "collectedAccountId" TEXT,
    "paidAccountId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxRate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaxCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaxRate_collectedAccountId_fkey" FOREIGN KEY ("collectedAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TaxRate_paidAccountId_fkey" FOREIGN KEY ("paidAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxExemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "taxRateId" TEXT,
    "exemptionNumber" TEXT,
    "reason" TEXT,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" DATETIME,
    "attachmentUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxExemption_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceItem" ("description", "discount", "discountAmount", "id", "invoiceId", "itemCode", "itemId", "quantity", "subtotal", "taxAmount", "taxRate", "totalAmount", "unitPrice") SELECT "description", "discount", "discountAmount", "id", "invoiceId", "itemCode", "itemId", "quantity", "subtotal", "taxAmount", "taxRate", "totalAmount", "unitPrice" FROM "InvoiceItem";
DROP TABLE "InvoiceItem";
ALTER TABLE "new_InvoiceItem" RENAME TO "InvoiceItem";
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX "InvoiceItem_itemId_idx" ON "InvoiceItem"("itemId");
CREATE TABLE "new_PurchaseOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
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
    CONSTRAINT "PurchaseOrderItem_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrderItem_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseOrderItem" ("description", "discount", "discountAmount", "id", "itemCode", "itemId", "purchaseOrderId", "quantity", "quantityInvoiced", "quantityReceived", "sortOrder", "subtotal", "taxAmount", "taxRate", "totalAmount", "unitOfMeasureId", "unitPrice") SELECT "description", "discount", "discountAmount", "id", "itemCode", "itemId", "purchaseOrderId", "quantity", "quantityInvoiced", "quantityReceived", "sortOrder", "subtotal", "taxAmount", "taxRate", "totalAmount", "unitOfMeasureId", "unitPrice" FROM "PurchaseOrderItem";
DROP TABLE "PurchaseOrderItem";
ALTER TABLE "new_PurchaseOrderItem" RENAME TO "PurchaseOrderItem";
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX "PurchaseOrderItem_itemId_idx" ON "PurchaseOrderItem"("itemId");
CREATE TABLE "new_QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL DEFAULT 1,
    "lineDescription" TEXT,
    "isLineHeader" BOOLEAN NOT NULL DEFAULT false,
    "itemType" TEXT NOT NULL DEFAULT 'PRODUCT',
    "itemId" TEXT,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "internalDescription" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "cost" REAL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
    "unitOfMeasureId" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "availabilityStatus" TEXT,
    "availableQuantity" REAL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuotationItem_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuotationItem_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuotationItem" ("availabilityStatus", "availableQuantity", "cost", "description", "discount", "discountAmount", "id", "internalDescription", "isLineHeader", "itemCode", "itemId", "itemType", "lineDescription", "lineNumber", "quantity", "quotationId", "sortOrder", "subtotal", "taxAmount", "taxRate", "totalAmount", "unitOfMeasureId", "unitPrice") SELECT "availabilityStatus", "availableQuantity", "cost", "description", "discount", "discountAmount", "id", "internalDescription", "isLineHeader", "itemCode", "itemId", "itemType", "lineDescription", "lineNumber", "quantity", "quotationId", "sortOrder", "subtotal", "taxAmount", "taxRate", "totalAmount", "unitOfMeasureId", "unitPrice" FROM "QuotationItem";
DROP TABLE "QuotationItem";
ALTER TABLE "new_QuotationItem" RENAME TO "QuotationItem";
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
CREATE INDEX "QuotationItem_itemId_idx" ON "QuotationItem"("itemId");
CREATE TABLE "new_SalesOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesOrderId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
    "unitOfMeasureId" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "quantityReserved" REAL NOT NULL DEFAULT 0,
    "quantityShipped" REAL NOT NULL DEFAULT 0,
    "quantityInvoiced" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderItem_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderItem_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SalesOrderItem" ("description", "discount", "discountAmount", "id", "itemCode", "itemId", "quantity", "quantityInvoiced", "quantityReserved", "quantityShipped", "salesOrderId", "sortOrder", "subtotal", "taxAmount", "taxRate", "totalAmount", "unitOfMeasureId", "unitPrice") SELECT "description", "discount", "discountAmount", "id", "itemCode", "itemId", "quantity", "quantityInvoiced", "quantityReserved", "quantityShipped", "salesOrderId", "sortOrder", "subtotal", "taxAmount", "taxRate", "totalAmount", "unitOfMeasureId", "unitPrice" FROM "SalesOrderItem";
DROP TABLE "SalesOrderItem";
ALTER TABLE "new_SalesOrderItem" RENAME TO "SalesOrderItem";
CREATE INDEX "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");
CREATE INDEX "SalesOrderItem_itemId_idx" ON "SalesOrderItem"("itemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TaxCategory_code_key" ON "TaxCategory"("code");

-- CreateIndex
CREATE INDEX "TaxCategory_code_idx" ON "TaxCategory"("code");

-- CreateIndex
CREATE INDEX "TaxCategory_isActive_idx" ON "TaxCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_code_key" ON "TaxRate"("code");

-- CreateIndex
CREATE INDEX "TaxRate_code_idx" ON "TaxRate"("code");

-- CreateIndex
CREATE INDEX "TaxRate_categoryId_idx" ON "TaxRate"("categoryId");

-- CreateIndex
CREATE INDEX "TaxRate_taxType_idx" ON "TaxRate"("taxType");

-- CreateIndex
CREATE INDEX "TaxRate_isActive_idx" ON "TaxRate"("isActive");

-- CreateIndex
CREATE INDEX "TaxRate_effectiveFrom_effectiveTo_idx" ON "TaxRate"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "TaxExemption_entityType_entityId_idx" ON "TaxExemption"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "TaxExemption_taxRateId_idx" ON "TaxExemption"("taxRateId");

-- CreateIndex
CREATE INDEX "TaxExemption_isActive_idx" ON "TaxExemption"("isActive");

-- CreateIndex
CREATE INDEX "TaxExemption_effectiveFrom_effectiveTo_idx" ON "TaxExemption"("effectiveFrom", "effectiveTo");
