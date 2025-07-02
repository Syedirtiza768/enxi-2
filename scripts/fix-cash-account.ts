import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixCashAccount() {
  try {
    console.log('💵 Fixing Cash on Hand account...')
    
    // Check if we already have a Cash on Hand account
    const existingCash = await prisma.account.findFirst({
      where: { 
        OR: [
          { code: '1000' },
          { name: { contains: 'Cash' } }
        ]
      }
    })
    
    if (existingCash) {
      console.log('✅ Found existing cash account:', existingCash.code, '-', existingCash.name)
      
      // Check if it's using the right code
      if (existingCash.code === '1000') {
        console.log('✅ Cash account is using code 1000 (Cash - AED)')
        // Update the default accounts to use 1000 instead of 1100 for cash
        return
      }
    }
    
    // Create a new Cash on Hand account with code 1105
    const cashAccount = await prisma.account.create({
      data: {
        code: '1105',
        name: 'Cash on Hand',
        type: 'ASSET',
        currency: 'AED',
        isSystemAccount: true,
        description: 'Physical cash in registers and safes',
        parentId: await getParentAccountId('1000'), // Parent is Assets
        status: 'ACTIVE',
        createdBy: 'system'
      }
    })
    
    console.log('✅ Created Cash on Hand account:', cashAccount.code, '-', cashAccount.name)
    
  } catch (error) {
    console.error('❌ Error fixing cash account:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function getParentAccountId(parentCode: string): Promise<string | null> {
  const parent = await prisma.account.findFirst({
    where: { code: parentCode }
  })
  return parent?.id || null
}

fixCashAccount()