-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "defaultInventoryAccountId" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN "defaultCogsAccountId" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN "defaultSalesAccountId" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN "defaultTrackInventory" BOOLEAN NOT NULL DEFAULT true;