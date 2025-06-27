import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function grantSalesProcessPermission() {
  try {
    console.log('Starting to grant sales_orders.process permission...')

    // First, ensure the permission exists
    const permission = await prisma.permission.upsert({
      where: { code: 'sales_orders.process' },
      create: {
        code: 'sales_orders.process',
        name: 'Process Sales Orders',
        description: 'Start processing sales orders',
        module: 'sales_orders',
        action: 'process'
      },
      update: {
        name: 'Process Sales Orders',
        description: 'Start processing sales orders'
      }
    })
    console.log('✓ Permission ensured:', permission.name)

    // Define roles that should have this permission
    const rolesToGrant = ['Admin', 'Sales Manager', 'Sales Supervisor', 'Warehouse']

    // Grant permission to each role
    for (const roleName of rolesToGrant) {
      const existingRolePermission = await prisma.rolePermission.findUnique({
        where: {
          role_permissionId: {
            role: roleName,
            permissionId: permission.id
          }
        }
      })

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            role: roleName,
            permissionId: permission.id
          }
        })
        console.log(`✓ Granted permission to role: ${roleName}`)
      } else {
        console.log(`- Role ${roleName} already has the permission`)
      }
    }

    // Grant to admin user directly
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@enxi-erp.com' },
          { role: 'ADMIN' }
        ]
      }
    })

    if (adminUser) {
      const existingPermission = await prisma.userPermission.findUnique({
        where: {
          userId_permissionId: {
            userId: adminUser.id,
            permissionId: permission.id
          }
        }
      })

      if (!existingPermission) {
        await prisma.userPermission.create({
          data: {
            userId: adminUser.id,
            permissionId: permission.id
          }
        })
        console.log(`✓ Granted permission directly to user: ${adminUser.email}`)
      } else {
        console.log(`- User ${adminUser.email} already has the permission`)
      }
    }

    console.log('\n✅ Successfully granted sales_orders.process permission!')

  } catch (error) {
    console.error('Error granting permission:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

grantSalesProcessPermission()