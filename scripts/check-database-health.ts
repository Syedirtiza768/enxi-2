import { prisma } from '@/lib/db/prisma'
import { dbHealthMonitor } from '@/lib/utils/db-health'

async function checkDatabaseHealth() {
  console.log('🔍 Checking database health...\n')
  
  try {
    // 1. Check basic connectivity
    console.log('1. Testing database connection...')
    const startTime = Date.now()
    await prisma.$connect()
    const connectTime = Date.now() - startTime
    console.log(`✅ Connected successfully (${connectTime}ms)\n`)
    
    // 2. Test query execution
    console.log('2. Testing query execution...')
    const queryStart = Date.now()
    await prisma.$queryRaw`SELECT 1 as test`
    const queryTime = Date.now() - queryStart
    console.log(`✅ Query executed successfully (${queryTime}ms)\n`)
    
    // 3. Check database version
    console.log('3. Checking database info...')
    const dbUrl = process.env.DATABASE_URL || ''
    if (dbUrl.includes('sqlite')) {
      const sqliteVersion = await prisma.$queryRaw`SELECT sqlite_version() as version`
      console.log('✅ Database: SQLite')
      console.log(`   Version: ${(sqliteVersion as any)[0].version}`)
    }
    console.log(`   URL: ${dbUrl.replace(/\/\/.*@/, '//<hidden>@')}\n`)
    
    // 4. Check table counts
    console.log('4. Checking table statistics...')
    const tables = [
      { name: 'User', model: prisma.user },
      { name: 'Lead', model: prisma.lead },
      { name: 'Customer', model: prisma.customer },
      { name: 'SalesCase', model: prisma.salesCase },
      { name: 'CompanySettings', model: prisma.companySettings }
    ]
    
    for (const table of tables) {
      try {
        const count = await table.model.count()
        console.log(`   ${table.name}: ${count} records`)
      } catch (error) {
        console.log(`   ${table.name}: ❌ Error - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    console.log('')
    
    // 5. Test health monitor
    console.log('5. Testing health monitor...')
    const health = await dbHealthMonitor.checkHealth()
    console.log(`✅ Health monitor status:`)
    console.log(`   Connected: ${health.isConnected}`)
    console.log(`   Latency: ${health.latency}ms`)
    console.log(`   Last checked: ${health.lastChecked.toISOString()}`)
    if (health.error) {
      console.log(`   Error: ${health.error}`)
    }
    console.log('')
    
    // 6. Test transaction support
    console.log('6. Testing transaction support...')
    const transactionStart = Date.now()
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1`
    })
    const transactionTime = Date.now() - transactionStart
    console.log(`✅ Transaction executed successfully (${transactionTime}ms)\n`)
    
    console.log('✅ All database health checks passed!')
    
  } catch (error) {
    console.error('\n❌ Database health check failed:')
    console.error(error)
    
    if (error instanceof Error) {
      console.error('\nError details:')
      console.error('  Message:', error.message)
      console.error('  Name:', error.name)
      console.error('  Stack:', error.stack)
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the health check
checkDatabaseHealth()