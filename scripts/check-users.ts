import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking users in database...\n')

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      }
    })
    
    console.log(`Total users: ${users.length}`)
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`\n👤 User:`)
        console.log(`  - Username: ${user.username}`)
        console.log(`  - Email: ${user.email}`)
        console.log(`  - Role: ${user.role}`)
        console.log(`  - Active: ${user.isActive}`)
        console.log(`  - ID: ${user.id}`)
      })
    } else {
      console.log('No users found!')
    }

  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })