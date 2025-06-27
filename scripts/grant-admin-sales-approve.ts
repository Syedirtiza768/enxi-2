import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function grantAdminSalesApprove() {
  try {
    console.log('Granting sales_orders.approve permission to admin user...')

    // Get the admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@enxi-erp.com' },
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' }
        ]
      }
    })

    if (!adminUser) {
      console.error('No admin user found!')
      return
    }

    console.log(`Found admin user: ${adminUser.email}`)

    // Get the permission
    const permission = await prisma.permission.findUnique({
      where: { code: 'sales_orders.approve' }
    })

    if (!permission) {
      console.error('Permission sales_orders.approve not found!')
      return
    }

    // Check if user already has the permission
    const existingPermission = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId: adminUser.id,
          permissionId: permission.id
        }
      }
    })

    if (existingPermission) {
      console.log('User already has the permission')
    } else {
      // Grant the permission
      await prisma.userPermission.create({
        data: {
          userId: adminUser.id,
          permissionId: permission.id
        }
      })
      console.log('✓ Permission granted successfully!')
    }

    // Also ensure the user has the Admin role permission
    const adminRolePermission = await prisma.rolePermission.findUnique({
      where: {
        role_permissionId: {
          role: 'Admin',
          permissionId: permission.id
        }
      }
    })

    if (adminRolePermission && (adminUser.role === 'ADMIN' || adminUser.role === 'Admin')) {
      console.log('✓ User has Admin role which includes this permission')
    }

    // List all permissions for this user
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId: adminUser.id },
      include: { permission: true }
    })

    console.log(`\nUser ${adminUser.email} has ${userPermissions.length} direct permissions`)
    if (userPermissions.length > 0) {
      console.log('Direct permissions:')
      userPermissions.forEach(up => {
        console.log(`- ${up.permission.code}`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

grantAdminSalesApprove()