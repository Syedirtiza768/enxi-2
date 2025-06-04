-- CreateTable
CREATE TABLE "CustomerPO" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "salesCaseId" TEXT NOT NULL,
    "poDate" DATETIME NOT NULL,
    "poAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "attachmentUrl" TEXT,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" DATETIME,
    "acceptedBy" TEXT,
    "salesOrderId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerPO_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerPO_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerPO_salesCaseId_fkey" FOREIGN KEY ("salesCaseId") REFERENCES "SalesCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerPO_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPO_poNumber_key" ON "CustomerPO"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPO_salesOrderId_key" ON "CustomerPO"("salesOrderId");

-- CreateIndex
CREATE INDEX "CustomerPO_customerId_idx" ON "CustomerPO"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPO_quotationId_idx" ON "CustomerPO"("quotationId");

-- CreateIndex
CREATE INDEX "CustomerPO_salesCaseId_idx" ON "CustomerPO"("salesCaseId");

-- CreateIndex
CREATE INDEX "CustomerPO_poDate_idx" ON "CustomerPO"("poDate");
