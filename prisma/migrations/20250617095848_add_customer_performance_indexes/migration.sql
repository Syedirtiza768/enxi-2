-- CreateIndex
CREATE INDEX "Account_balance_idx" ON "Account"("balance");

-- CreateIndex
CREATE INDEX "Account_type_balance_idx" ON "Account"("type", "balance");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_customerNumber_idx" ON "Customer"("customerNumber");

-- CreateIndex
CREATE INDEX "Customer_currency_idx" ON "Customer"("currency");

-- CreateIndex
CREATE INDEX "Customer_industry_idx" ON "Customer"("industry");

-- CreateIndex
CREATE INDEX "Customer_updatedAt_idx" ON "Customer"("updatedAt");

-- CreateIndex
CREATE INDEX "Customer_accountId_idx" ON "Customer"("accountId");

-- CreateIndex
CREATE INDEX "Customer_currency_createdAt_idx" ON "Customer"("currency", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_industry_createdAt_idx" ON "Customer"("industry", "createdAt");
