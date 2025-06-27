import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.warn('🔍 Checking users in database...\n')

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
    
    console.warn(`Total users: ${users.length}`)
    if (users.length > 0) {
      users.forEach(user => {
        console.warn(`\n👤 User:`)
        console.warn(`  - Username: ${user.username}`)
        console.warn(`  - Email: ${user.email}`)
        console.warn(`  - Role: ${user.role}`)
        console.warn(`  - Active: ${user.isActive}`)
        console.warn(`  - ID: ${user.id}`)
      })
    } else {
      console.warn('No users found!')
    }

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })