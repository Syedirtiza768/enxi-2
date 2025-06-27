import { prisma } from '@/lib/db/prisma'

async function grantShipmentsPermissions() {
  try {
    console.log('Granting shipments permissions...')
    
    // Define shipments permissions
    const shipmentPermissions = [
      { code: 'shipments.read', name: 'View Shipments', description: 'View shipments', module: 'shipments', action: 'read' },
      { code: 'shipments.create', name: 'Create Shipments', description: 'Create shipments', module: 'shipments', action: 'create' },
      { code: 'shipments.update', name: 'Update Shipments', description: 'Update shipments', module: 'shipments', action: 'update' },
      { code: 'shipments.delete', name: 'Delete Shipments', description: 'Delete shipments', module: 'shipments', action: 'delete' },
      { code: 'shipments.manage', name: 'Manage Shipments', description: 'Manage all shipments', module: 'shipments', action: 'manage' },
    ]
    
    // Create permissions if they don't exist
    for (const perm of shipmentPermissions) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: perm
      })
    }
    console.log('✅ Created shipments permissions')
    
    // Get relevant permissions
    const permissions = await prisma.permission.findMany({
      where: {
        code: { in: shipmentPermissions.map(p => p.code) }
      }
    })
    
    // Grant to ADMIN role
    const adminRole = await prisma.role.findFirst({
      where: { name: 'ADMIN' }
    })
    
    if (adminRole) {
      for (const permission of permissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        })
      }
      console.log('✅ Granted shipments permissions to ADMIN role')
    }
    
    // Grant to MANAGER role (read and create only)
    const managerRole = await prisma.role.findFirst({
      where: { name: 'MANAGER' }
    })
    
    if (managerRole) {
      const managerPerms = permissions.filter(p => 
        p.code === 'shipments.read' || p.code === 'shipments.create'
      )
      
      for (const permission of managerPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: managerRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: managerRole.id,
            permissionId: permission.id
          }
        })
      }
      console.log('✅ Granted shipments permissions to MANAGER role')
    }
    
    // Grant to WAREHOUSE role (all shipments permissions)
    const warehouseRole = await prisma.role.findFirst({
      where: { name: 'WAREHOUSE' }
    })
    
    if (warehouseRole) {
      for (const permission of permissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: warehouseRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: warehouseRole.id,
            permissionId: permission.id
          }
        })
      }
      console.log('✅ Granted shipments permissions to WAREHOUSE role')
    }
    
    // Also grant directly to admin user
    const adminUser = await prisma.user.findFirst({
      where: { username: 'admin' }
    })
    
    if (adminUser) {
      for (const permission of permissions) {
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: adminUser.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            userId: adminUser.id,
            permissionId: permission.id
          }
        })
      }
      console.log('✅ Granted shipments permissions directly to admin user')
    }
    
    console.log('\n✅ Successfully granted all shipments permissions!')
    
  } catch (error) {
    console.error('Error granting permissions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

grantShipmentsPermissions()