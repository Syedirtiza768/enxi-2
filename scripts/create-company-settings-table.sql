-- Create CompanySettings table
CREATE TABLE IF NOT EXISTS "CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL DEFAULT 'EnXi ERP',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT
);

-- Create index on isActive
CREATE INDEX IF NOT EXISTS "CompanySettings_isActive_idx" ON "CompanySettings"("isActive");

-- Insert default record if none exists
INSERT INTO "CompanySettings" ("id", "companyName", "defaultCurrency", "isActive", "createdAt", "updatedAt")
SELECT 
    lower(hex(randomblob(16))),
    'EnXi ERP',
    'USD',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "CompanySettings" WHERE "isActive" = 1);