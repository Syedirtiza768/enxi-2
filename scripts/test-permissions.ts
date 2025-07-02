#!/usr/bin/env npx tsx

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function testPermissions() {
  console.log('🔍 Testing permissions...\n');

  // Check if permissions exist
  const permissionCount = await prisma.permission.count();
  console.log(`✅ Total permissions in database: ${permissionCount}`);

  // Get first 5 permissions
  const permissions = await prisma.permission.findMany({
    take: 5,
  });
  console.log('\n📋 Sample permissions:');
  permissions.forEach(p => {
    console.log(`  - ${p.code}: ${p.name} (${p.module})`);
  });

  // Check role permissions
  console.log('\n🔐 Role permissions count:');
  const roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'ACCOUNTANT', 'WAREHOUSE', 'VIEWER', 'USER'];
  
  for (const role of roles) {
    const count = await prisma.rolePermission.count({
      where: { role: role as any }
    });
    console.log(`  ${role}: ${count} permissions`);
  }

  // Test the API endpoint simulation
  console.log('\n🌐 Testing API endpoint simulation:');
  
  // Simulate what the /api/permissions endpoint does
  const apiPermissions = await prisma.permission.findMany({
    orderBy: [
      { module: 'asc' },
      { action: 'asc' },
    ],
  });

  const groupedPermissions = apiPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, typeof apiPermissions>);

  console.log(`  Total permissions returned: ${apiPermissions.length}`);
  console.log(`  Total modules: ${Object.keys(groupedPermissions).length}`);
  console.log(`  Modules: ${Object.keys(groupedPermissions).join(', ')}`);

  await prisma.$disconnect();
}

testPermissions().catch(console.error);