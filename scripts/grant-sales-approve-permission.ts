import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function grantSalesApprovePermission() {
  try {
    console.log('Starting to grant sales_orders.approve permission...')

    // First, ensure the permission exists
    const permission = await prisma.permission.upsert({
      where: { code: 'sales_orders.approve' },
      create: {
        code: 'sales_orders.approve',
        name: 'Approve Sales Orders',
        description: 'Approve sales orders',
        module: 'sales_orders',
        action: 'approve'
      },
      update: {
        name: 'Approve Sales Orders',
        description: 'Approve sales orders'
      }
    })
    console.log('✓ Permission ensured:', permission.name)

    // Define roles that should have this permission
    const rolesToGrant = ['Admin', 'Sales Manager', 'Sales Supervisor']

    // Grant permission to each role
    for (const roleName of rolesToGrant) {
      // Check if role already has permission
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

    // Also grant to roles that have sales_orders.create permission
    const salesCreatePermission = await prisma.permission.findFirst({
      where: { code: 'sales_orders.create' }
    })

    if (salesCreatePermission) {
      const rolesWithSalesCreate = await prisma.rolePermission.findMany({
        where: { permissionId: salesCreatePermission.id },
        select: { role: true }
      })

      for (const rolePermission of rolesWithSalesCreate) {
        const existingPermission = await prisma.rolePermission.findUnique({
          where: {
            role_permissionId: {
              role: rolePermission.role,
              permissionId: permission.id
            }
          }
        })

        if (!existingPermission) {
          await prisma.rolePermission.create({
            data: {
              role: rolePermission.role,
              permissionId: permission.id
            }
          })
          console.log(`✓ Granted permission to role: ${rolePermission.role} (has sales_orders.create)`)
        }
      }
    }

    // Check for UserPermission model
    if (salesCreatePermission) {
      const usersWithSalesCreate = await prisma.userPermission.findMany({
        where: { permissionId: salesCreatePermission.id },
        include: { user: true }
      })

      for (const userPermission of usersWithSalesCreate) {
        const existingPermission = await prisma.userPermission.findUnique({
          where: {
            userId_permissionId: {
              userId: userPermission.userId,
              permissionId: permission.id
            }
          }
        })

        if (!existingPermission) {
          await prisma.userPermission.create({
            data: {
              userId: userPermission.userId,
              permissionId: permission.id
            }
          })
          console.log(`✓ Granted permission directly to user: ${userPermission.user.email}`)
        }
      }
    }

    console.log('\n✅ Successfully granted sales_orders.approve permission!')
    
    // Show summary
    const rolesWithPermission = await prisma.rolePermission.findMany({
      where: { permissionId: permission.id },
      select: { role: true }
    })

    console.log('\nRoles with sales_orders.approve permission:')
    for (const rolePermission of rolesWithPermission) {
      console.log(`- ${rolePermission.role}`)
    }

    const userCount = await prisma.userPermission.count({
      where: { permissionId: permission.id }
    })
    console.log(`\nTotal users with direct permission: ${userCount}`)

  } catch (error) {
    console.error('Error granting permission:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

grantSalesApprovePermission()