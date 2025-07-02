import { prisma } from '../lib/db/prisma';
import { Role } from '../lib/types/shared-enums';

async function grantRolesPermissions() {
  try {
    console.log('Granting roles.permissions permission to ADMIN and SUPER_ADMIN roles...');

    // First, ensure the permission exists
    const permission = await prisma.permission.upsert({
      where: { code: 'roles.permissions' },
      update: {},
      create: {
        code: 'roles.permissions',
        name: 'Manage Role Permissions',
        description: 'Ability to manage permissions for roles',
        module: 'roles',
        action: 'manage',
      },
    });

    console.log('Permission ensured:', permission);

    // Grant to SUPER_ADMIN role
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: Role.SUPER_ADMIN,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: Role.SUPER_ADMIN,
        permissionId: permission.id,
      },
    });
    console.log('Permission granted to SUPER_ADMIN');

    // Grant to ADMIN role
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: Role.ADMIN,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: Role.ADMIN,
        permissionId: permission.id,
      },
    });
    console.log('Permission granted to ADMIN');

    // Also ensure other role management permissions exist
    const rolePermissions = [
      { code: 'roles.view', name: 'View Roles', description: 'View roles and their permissions', action: 'view' },
      { code: 'roles.create', name: 'Create Roles', description: 'Create new roles', action: 'create' },
      { code: 'roles.update', name: 'Update Roles', description: 'Update existing roles', action: 'update' },
      { code: 'roles.delete', name: 'Delete Roles', description: 'Delete roles', action: 'delete' },
    ];

    for (const perm of rolePermissions) {
      const createdPerm = await prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: {
          ...perm,
          module: 'roles',
        },
      });

      // Grant to both SUPER_ADMIN and ADMIN
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: Role.SUPER_ADMIN,
            permissionId: createdPerm.id,
          },
        },
        update: {},
        create: {
          role: Role.SUPER_ADMIN,
          permissionId: createdPerm.id,
        },
      });

      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: Role.ADMIN,
            permissionId: createdPerm.id,
          },
        },
        update: {},
        create: {
          role: Role.ADMIN,
          permissionId: createdPerm.id,
        },
      });
    }

    console.log('All role management permissions granted successfully');
  } catch (error) {
    console.error('Error granting permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
grantRolesPermissions();