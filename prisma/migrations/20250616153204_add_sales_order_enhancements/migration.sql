-- CreateTable
CREATE TABLE "QuotationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "notes" TEXT,
    "footerNotes" TEXT,
    "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuotationTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL DEFAULT 1,
    "lineDescription" TEXT,
    "isLineHeader" BOOLEAN NOT NULL DEFAULT false,
    "itemType" TEXT NOT NULL DEFAULT 'PRODUCT',
    "itemId" TEXT,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "internalDescription" TEXT,
    "defaultQuantity" REAL NOT NULL DEFAULT 1,
    "defaultUnitPrice" REAL NOT NULL DEFAULT 0,
    "unitOfMeasureId" TEXT,
    "defaultDiscount" REAL NOT NULL DEFAULT 0,
    "defaultTaxRate" REAL NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuotationTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuotationTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationTemplateItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuotationTemplateItem_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuotationTemplateItem_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesOrderTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paymentTerms" TEXT,
    "shippingTerms" TEXT,
    "shippingAddress" TEXT,
    "billingAddress" TEXT,
    "notes" TEXT,
    "defaultLeadDays" INTEGER NOT NULL DEFAULT 7,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalesOrderTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL DEFAULT 1,
    "lineDescription" TEXT,
    "isLineHeader" BOOLEAN NOT NULL DEFAULT false,
    "itemType" TEXT NOT NULL DEFAULT 'PRODUCT',
    "itemId" TEXT,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "internalDescription" TEXT,
    "defaultQuantity" REAL NOT NULL DEFAULT 1,
    "defaultUnitPrice" REAL NOT NULL DEFAULT 0,
    "unitOfMeasureId" TEXT,
    "defaultDiscount" REAL NOT NULL DEFAULT 0,
    "defaultTaxRate" REAL NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SalesOrderTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SalesOrderTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderTemplateItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderTemplateItem_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderTemplateItem_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL DEFAULT 'EnXi ERP',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "defaultTaxRateId" TEXT,
    "taxRegistrationNumber" TEXT,
    "quotationTermsAndConditions" TEXT,
    "quotationFooterNotes" TEXT,
    "quotationValidityDays" INTEGER NOT NULL DEFAULT 30,
    "quotationPrefix" TEXT NOT NULL DEFAULT 'QUOT',
    "quotationNumberFormat" TEXT NOT NULL DEFAULT 'PREFIX-YYYY-NNNN',
    "orderPrefix" TEXT NOT NULL DEFAULT 'SO',
    "orderNumberFormat" TEXT NOT NULL DEFAULT 'PREFIX-YYYY-NNNN',
    "defaultOrderPaymentTerms" TEXT,
    "defaultOrderShippingTerms" TEXT,
    "defaultShippingMethod" TEXT,
    "autoReserveInventory" BOOLEAN NOT NULL DEFAULT true,
    "requireCustomerPO" BOOLEAN NOT NULL DEFAULT false,
    "orderApprovalThreshold" REAL,
    "orderConfirmationTemplate" TEXT,
    "showCompanyLogoOnQuotations" BOOLEAN NOT NULL DEFAULT true,
    "showCompanyLogoOnOrders" BOOLEAN NOT NULL DEFAULT true,
    "showTaxBreakdown" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);
INSERT INTO "new_CompanySettings" ("address", "companyName", "createdAt", "defaultCurrency", "defaultTaxRateId", "email", "id", "isActive", "logoUrl", "phone", "taxRegistrationNumber", "updatedAt", "updatedBy", "website") SELECT "address", "companyName", "createdAt", "defaultCurrency", "defaultTaxRateId", "email", "id", "isActive", "logoUrl", "phone", "taxRegistrationNumber", "updatedAt", "updatedBy", "website" FROM "CompanySettings";
DROP TABLE "CompanySettings";
ALTER TABLE "new_CompanySettings" RENAME TO "CompanySettings";
CREATE INDEX "CompanySettings_isActive_idx" ON "CompanySettings"("isActive");
CREATE TABLE "new_SalesOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesOrderId" TEXT NOT NULL,
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
    "quantityReserved" REAL NOT NULL DEFAULT 0,
    "quantityShipped" REAL NOT NULL DEFAULT 0,
    "quantityInvoiced" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderItem_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderItem_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SalesOrderItem" ("description", "discount", "discountAmount", "id", "itemCode", "itemId", "quantity", "quantityInvoiced", "quantityReserved", "quantityShipped", "salesOrderId", "sortOrder", "subtotal", "taxAmount", "taxRate", "taxRateId", "totalAmount", "unitOfMeasureId", "unitPrice") SELECT "description", "discount", "discountAmount", "id", "itemCode", "itemId", "quantity", "quantityInvoiced", "quantityReserved", "quantityShipped", "salesOrderId", "sortOrder", "subtotal", "taxAmount", "taxRate", "taxRateId", "totalAmount", "unitOfMeasureId", "unitPrice" FROM "SalesOrderItem";
DROP TABLE "SalesOrderItem";
ALTER TABLE "new_SalesOrderItem" RENAME TO "SalesOrderItem";
CREATE INDEX "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");
CREATE INDEX "SalesOrderItem_itemId_idx" ON "SalesOrderItem"("itemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "QuotationTemplate_isActive_idx" ON "QuotationTemplate"("isActive");

-- CreateIndex
CREATE INDEX "QuotationTemplate_name_idx" ON "QuotationTemplate"("name");

-- CreateIndex
CREATE INDEX "QuotationTemplateItem_templateId_idx" ON "QuotationTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "QuotationTemplateItem_itemId_idx" ON "QuotationTemplateItem"("itemId");

-- CreateIndex
CREATE INDEX "SalesOrderTemplate_isActive_idx" ON "SalesOrderTemplate"("isActive");

-- CreateIndex
CREATE INDEX "SalesOrderTemplate_name_idx" ON "SalesOrderTemplate"("name");

-- CreateIndex
CREATE INDEX "SalesOrderTemplateItem_templateId_idx" ON "SalesOrderTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "SalesOrderTemplateItem_itemId_idx" ON "SalesOrderTemplateItem"("itemId");
