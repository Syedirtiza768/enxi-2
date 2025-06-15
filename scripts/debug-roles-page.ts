#!/usr/bin/env npx tsx

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function debugRolesPage() {
  console.log('🔍 Debugging roles page issues...\n');

  // 1. Check if permissions exist
  const permissionCount = await prisma.permission.count();
  console.log(`✅ Total permissions in database: ${permissionCount}`);

  // 2. Check if role permissions exist
  const rolePermissionCount = await prisma.rolePermission.count();
  console.log(`✅ Total role permissions in database: ${rolePermissionCount}`);

  // 3. Check a specific user's permissions
  const testUser = await prisma.user.findFirst({
    where: {
      OR: [
        { role: 'SUPER_ADMIN' },
        { role: 'ADMIN' }
      ]
    },
    include: {
      profile: true,
      userPermissions: {
        include: {
          permission: true
        }
      }
    }
  });

  if (testUser) {
    console.log(`\n👤 Test user: ${testUser.email} (${testUser.role})`);
    console.log(`  Direct permissions: ${testUser.userPermissions.length}`);
    
    // Get role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: testUser.role },
      include: { permission: true }
    });
    
    console.log(`  Role permissions: ${rolePermissions.length}`);
    
    // Check if user can access the permissions endpoints
    const hasPermissionAccess = testUser.role === 'SUPER_ADMIN' || testUser.role === 'ADMIN';
    console.log(`  Can access permissions endpoints: ${hasPermissionAccess ? '✅ Yes' : '❌ No'}`);
  }

  // 4. Simulate the API response
  console.log('\n📋 Simulating API response structure:');
  const permissions = await prisma.permission.findMany({
    take: 3,
    orderBy: [
      { module: 'asc' },
      { action: 'asc' },
    ],
  });

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const apiResponse = {
    permissions,
    groupedPermissions,
    modules: Object.keys(groupedPermissions),
  };

  console.log('API Response structure:');
  console.log(JSON.stringify(apiResponse, null, 2));

  await prisma.$disconnect();
}

debugRolesPage().catch(console.error);