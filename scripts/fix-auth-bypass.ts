#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

console.log('🔧 Creating temporary auth bypass for development...\n');

// Step 1: Modify getUserFromRequest to bypass auth
console.log('1️⃣ Modifying auth.ts to bypass authentication...');

const authPath = path.join(process.cwd(), 'lib/utils/auth.ts');
let authContent = fs.readFileSync(authPath, 'utf8');

// Add development bypass at the beginning of getUserFromRequest
if (!authContent.includes('BYPASS_AUTH')) {
  authContent = authContent.replace(
    'export async function getUserFromRequest(request: NextRequest): Promise<AuthUser> {',
    `export async function getUserFromRequest(request: NextRequest): Promise<AuthUser> {
  // TEMPORARY: Bypass auth in development
  const BYPASS_AUTH = true; // TODO: Remove this before production
  if (BYPASS_AUTH) {
    return {
      id: 'dev-user-1',
      username: 'devuser',
      email: 'dev@example.com',
      role: 'admin'
    };
  }
  `
  );
  
  fs.writeFileSync(authPath, authContent);
  console.log('  ✅ Added auth bypass to getUserFromRequest');
}

// Step 2: Ensure database has at least one user
console.log('\n2️⃣ Creating seed script...');

const seedScript = `import { PrismaClient } from "@prisma/client"
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: 'dev-user-1',
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    },
  })
  
  console.log('✅ Created admin user:', adminUser.email)
  
  // Create sample customer
  const customer = await prisma.customer.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      name: 'Sample Customer',
      email: 'customer@example.com',
      phone: '+1234567890',
      type: 'company',
      status: 'active',
      creditLimit: 50000,
      paymentTerms: 30,
    },
  })
  
  console.log('✅ Created sample customer:', customer.name)
  
  // Create sample product
  const product = await prisma.product.upsert({
    where: { code: 'PROD-001' },
    update: {},
    create: {
      code: 'PROD-001',
      name: 'Sample Product',
      description: 'A sample product for testing',
      price: 100,
      cost: 50,
      quantity: 100,
      minQuantity: 10,
      unit: 'piece',
      category: 'General',
      isActive: true,
    },
  })
  
  console.log('✅ Created sample product:', product.name)
  
  console.log('\\n✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
`;

fs.writeFileSync(path.join(process.cwd(), 'scripts/seed-dev-data.ts'), seedScript);
console.log('  ✅ Created seed script');

// Step 3: Update API client getAuthToken
console.log('\n3️⃣ Updating API client...');

const apiClientPath = path.join(process.cwd(), 'lib/api/client.ts');
let apiClientContent = fs.readFileSync(apiClientPath, 'utf8');

// Find and update getAuthToken function
const getAuthTokenMatch = apiClientContent.match(/function getAuthToken\(\)[^{]*{[^}]*}/s);
if (getAuthTokenMatch) {
  const newGetAuthToken = `function getAuthToken(): string | null {
  // TEMPORARY: Always return a token for development
  return 'dev-token-bypass';
}`;
  
  apiClientContent = apiClientContent.replace(getAuthTokenMatch[0], newGetAuthToken);
  fs.writeFileSync(apiClientPath, apiClientContent);
  console.log('  ✅ Updated getAuthToken to always return token');
}

console.log('\n✅ Auth bypass setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Seed the database:');
console.log('   npx tsx scripts/seed-dev-data.ts');
console.log('\n2. Rebuild the application:');
console.log('   npm run build');
console.log('\n3. Restart PM2:');
console.log('   pm2 restart enxi-erp');
console.log('\n4. Visit any page - data should now load without authentication');

console.log('\n⚠️  IMPORTANT: Remove BYPASS_AUTH flag before production deployment!');