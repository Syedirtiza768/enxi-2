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
    
    // Get all admin users
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    })
    
    console.log(`Found ${adminUsers.length} admin users`)
    
    // Grant permissions to all admin users
    for (const user of adminUsers) {
      console.log(`Granting permissions to ${user.username}...`)
      
      for (const permission of permissions) {
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: user.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            userId: user.id,
            permissionId: permission.id
          }
        })
      }
    }
    
    // Also grant to MANAGER and WAREHOUSE role users
    const managerUsers = await prisma.user.findMany({
      where: { role: 'MANAGER' }
    })
    
    const warehouseUsers = await prisma.user.findMany({
      where: { role: 'WAREHOUSE' }
    })
    
    // Grant read and create to managers
    const managerPerms = permissions.filter(p => 
      p.code === 'shipments.read' || p.code === 'shipments.create'
    )
    
    for (const user of managerUsers) {
      console.log(`Granting limited permissions to manager ${user.username}...`)
      
      for (const permission of managerPerms) {
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: user.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            userId: user.id,
            permissionId: permission.id
          }
        })
      }
    }
    
    // Grant all shipments permissions to warehouse users
    for (const user of warehouseUsers) {
      console.log(`Granting all permissions to warehouse user ${user.username}...`)
      
      for (const permission of permissions) {
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: user.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            userId: user.id,
            permissionId: permission.id
          }
        })
      }
    }
    
    console.log('\n✅ Successfully granted all shipments permissions!')
    
    // Verify permissions for admin user
    const adminUser = await prisma.user.findFirst({
      where: { username: 'admin' },
      include: {
        userPermissions: {
          include: { permission: true }
        }
      }
    })
    
    if (adminUser) {
      console.log(`\nAdmin user permissions (${adminUser.userPermissions.length} total):`)
      const shipmentPerms = adminUser.userPermissions.filter(up => 
        up.permission.code.startsWith('shipments.')
      )
      console.log(`- Shipments permissions: ${shipmentPerms.length}`)
      shipmentPerms.forEach(up => {
        console.log(`  - ${up.permission.code}`)
      })
    }
    
  } catch (error) {
    console.error('Error granting permissions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

grantShipmentsPermissions()