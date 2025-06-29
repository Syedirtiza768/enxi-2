import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log('🧹 Cleaning database...')
  
  // Drop all tables by resetting the database
  try {
    console.log('📦 Resetting database schema...')
    execSync('npx prisma db push --force-reset --skip-generate', { stdio: 'inherit' })
    console.log('✅ Database reset complete')
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    process.exit(1)
  }
}

async function runSeed() {
  console.log('🌱 Running comprehensive seed...')
  
  try {
    // Try to run the simple comprehensive seed first
    execSync('npx tsx scripts/simple-comprehensive-seed.ts', { stdio: 'inherit' })
    console.log('✅ Seeding complete!')
  } catch (error) {
    console.log('⚠️  Simple seed failed, trying basic seed...')
    try {
      execSync('npx tsx scripts/seed-simple.ts', { stdio: 'inherit' })
      console.log('✅ Basic seeding complete!')
    } catch (error2) {
      console.error('❌ All seed attempts failed')
      process.exit(1)
    }
  }
}

async function main() {
  console.log('🚀 Starting clean and seed process...')
  
  await cleanDatabase()
  await runSeed()
  
  console.log('🎉 Database successfully populated with comprehensive data!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})