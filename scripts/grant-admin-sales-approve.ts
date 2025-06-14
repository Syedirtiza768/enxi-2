#!/usr/bin/env npx tsx

import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

async function grantSalesApprovePermission(): Promise<void> {
  try {
    // First, check if the permission exists
    let permission = await prisma.permission.findUnique({
      where: { code: 'sales.approve' }
    });

    if (!permission) {
      // Create the permission if it doesn't exist
      permission = await prisma.permission.create({
        data: {
          code: 'sales.approve',
          name: 'Approve Sales Orders',
          description: 'Permission to approve sales orders',
          module: 'sales',
          action: 'approve'
        }
      });
      console.log('✅ Created sales.approve permission');
    }

    // Grant the permission to SUPER_ADMIN role
    const existing = await prisma.rolePermission.findUnique({
      where: {
        role_permissionId: {
          role: 'SUPER_ADMIN',
          permissionId: permission.id
        }
      }
    });

    if (!existing) {
      await prisma.rolePermission.create({
        data: {
          role: 'SUPER_ADMIN',
          permissionId: permission.id
        }
      });
      console.log('✅ Granted sales.approve permission to SUPER_ADMIN role');
    } else {
      console.log('ℹ️  SUPER_ADMIN already has sales.approve permission');
    }

    // Also grant directly to admin user
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (adminUser) {
      const userPermission = await prisma.userPermission.findUnique({
        where: {
          userId_permissionId: {
            userId: adminUser.id,
            permissionId: permission.id
          }
        }
      });

      if (!userPermission) {
        await prisma.userPermission.create({
          data: {
            userId: adminUser.id,
            permissionId: permission.id,
            granted: true
          }
        });
        console.log('✅ Granted sales.approve permission directly to admin user');
      } else {
        console.log('ℹ️  Admin user already has sales.approve permission');
      }
    }

  } catch (error) {
    console.error('❌ Error granting permission:', error);
  } finally {
    await prisma.$disconnect();
  }
}

grantSalesApprovePermission();