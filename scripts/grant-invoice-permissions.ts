import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function grantInvoicePermissions() {
  try {
    console.log('Starting to grant invoice permissions...')

    // Define invoice permissions
    const invoicePermissions = [
      { code: 'invoices.create', name: 'Create Invoices', action: 'create' },
      { code: 'invoices.read', name: 'Read Invoices', action: 'read' },
      { code: 'invoices.update', name: 'Update Invoices', action: 'update' },
      { code: 'invoices.delete', name: 'Delete Invoices', action: 'delete' }
    ]

    // Create or update permissions
    for (const perm of invoicePermissions) {
      const permission = await prisma.permission.upsert({
        where: { code: perm.code },
        create: {
          code: perm.code,
          name: perm.name,
          description: `${perm.name} permission`,
          module: 'invoices',
          action: perm.action
        },
        update: {
          name: perm.name,
          description: `${perm.name} permission`
        }
      })
      console.log(`✓ Permission ensured: ${permission.name}`)

      // Grant to relevant roles
      const rolesToGrant = ['Admin', 'Sales Manager', 'Accountant']
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
          console.log(`  ✓ Granted to role: ${roleName}`)
        }
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
      for (const perm of invoicePermissions) {
        const permission = await prisma.permission.findUnique({
          where: { code: perm.code }
        })
        
        if (permission) {
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
            console.log(`✓ Granted ${perm.code} directly to user: ${adminUser.email}`)
          }
        }
      }
    }

    console.log('\n✅ Successfully granted invoice permissions!')

  } catch (error) {
    console.error('Error granting permissions:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

grantInvoicePermissions()