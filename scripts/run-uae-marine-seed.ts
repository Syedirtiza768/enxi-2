import { execSync } from 'child_process'

async function main() {
  console.log('🌊 Running UAE Marine Comprehensive Seed...')
  console.log('📝 Note: This will add to existing data without removing it')
  
  try {
    // Set environment variable to skip clearing data
    process.env.CLEAR_DATA = 'false'
    
    // Run the UAE marine seed
    execSync('npx tsx prisma/seed-uae-marine-comprehensive-fixed.ts', { 
      stdio: 'inherit',
      env: { ...process.env, CLEAR_DATA: 'false' }
    })
    
    console.log('\n✅ UAE Marine seed completed successfully!')
    console.log('\n📊 Your database now contains:')
    console.log('   - Marine industry customers')
    console.log('   - Marine engine parts and services')
    console.log('   - 24 months of historical data')
    console.log('   - Complete business workflow (leads → quotes → orders → invoices)')
    
  } catch (error) {
    console.error('❌ Error running seed:', error)
    process.exit(1)
  }
}

main().catch(console.error)