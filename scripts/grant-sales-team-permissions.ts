import { prisma } from '../lib/db/prisma';
import { Role } from '../lib/types/shared-enums';

async function grantSalesTeamPermissions() {
  try {
    console.log('🔧 Granting sales team permissions to relevant roles...\n');

    // Define all sales team permissions
    const salesTeamPermissions = [
      { 
        code: 'sales_team.read', 
        name: 'View Sales Team', 
        description: 'View sales team information',
        module: 'sales_team',
        action: 'read'
      },
      { 
        code: 'sales_team.update', 
        name: 'Update Sales Team', 
        description: 'Update sales team assignments',
        module: 'sales_team',
        action: 'update'
      },
      { 
        code: 'sales_team.assign', 
        name: 'Assign Sales Team', 
        description: 'Assign customers to sales team members',
        module: 'sales_team',
        action: 'assign'
      },
      { 
        code: 'sales_team.view_all', 
        name: 'View All Teams', 
        description: 'View all sales teams (admin only)',
        module: 'sales_team',
        action: 'view_all'
      }
    ];

    // Create/update all permissions
    for (const perm of salesTeamPermissions) {
      const permission = await prisma.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          description: perm.description,
          module: perm.module,
          action: perm.action,
        },
        create: perm,
      });
      console.log(`✅ Permission ensured: ${permission.code}`);
    }

    // Grant permissions to roles
    const rolePermissionMappings = [
      // ADMIN gets all permissions
      { role: Role.ADMIN, permissions: ['sales_team.read', 'sales_team.update', 'sales_team.assign', 'sales_team.view_all'] },
      // MANAGER gets read, update, and assign
      { role: Role.MANAGER, permissions: ['sales_team.read', 'sales_team.update', 'sales_team.assign'] },
      // SALES_REP gets read only
      { role: Role.SALES_REP, permissions: ['sales_team.read'] },
    ];

    for (const mapping of rolePermissionMappings) {
      console.log(`\n📋 Granting permissions to ${mapping.role}:`);
      
      for (const permCode of mapping.permissions) {
        const permission = await prisma.permission.findUnique({
          where: { code: permCode }
        });

        if (!permission) {
          console.error(`❌ Permission ${permCode} not found!`);
          continue;
        }

        await prisma.rolePermission.upsert({
          where: {
            role_permissionId: {
              role: mapping.role,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            role: mapping.role,
            permissionId: permission.id,
          },
        });
        console.log(`  ✅ ${permCode} granted to ${mapping.role}`);
      }
    }

    // List users who now have sales team access
    console.log('\n👥 Users with sales team access:');
    const managers = await prisma.user.findMany({
      where: { role: Role.MANAGER },
      select: { id: true, username: true, email: true, role: true }
    });
    
    const salesReps = await prisma.user.findMany({
      where: { role: Role.SALES_REP },
      select: { id: true, username: true, email: true, role: true }
    });

    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true, username: true, email: true, role: true }
    });

    [...admins, ...managers, ...salesReps].forEach(user => {
      console.log(`  - ${user.username} (${user.role}): ${user.email}`);
    });

    console.log('\n✅ Sales team permissions granted successfully!');
  } catch (error) {
    console.error('❌ Error granting permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
grantSalesTeamPermissions();