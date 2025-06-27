import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createMissingBankAccount() {
  try {
    console.log('🏦 Creating missing bank account...')
    
    // Check if account 1110 exists
    const existingAccount = await prisma.account.findFirst({
      where: { code: '1110' }
    })
    
    if (existingAccount) {
      console.log('✅ Bank account 1110 already exists:', existingAccount.name)
      return
    }
    
    // Create the bank account
    const bankAccount = await prisma.account.create({
      data: {
        code: '1110',
        name: 'Bank Accounts',
        type: 'ASSET',
        currency: 'AED',
        isSystemAccount: true,
        description: 'All bank and financial institution accounts',
        parentId: await getParentAccountId('1000'), // Parent is Assets (1000)
        status: 'ACTIVE',
        createdBy: 'system'
      }
    })
    
    console.log('✅ Created bank account:', bankAccount.code, '-', bankAccount.name)
    
    // Also ensure Cash on Hand account exists with correct code
    const cashAccount = await prisma.account.findFirst({
      where: { code: '1100' }
    })
    
    if (cashAccount && cashAccount.name !== 'Cash on Hand') {
      console.log('⚠️  Account 1100 exists but has wrong name:', cashAccount.name)
      console.log('   Expected: Cash on Hand')
      console.log('   You may need to update this manually or handle it differently')
    }
    
    // Create Cash on Hand if it doesn't exist
    const cashOnHand = await prisma.account.findFirst({
      where: { 
        OR: [
          { code: '1000' },
          { name: 'Cash on Hand' }
        ]
      }
    })
    
    if (!cashOnHand || cashOnHand.code !== '1100') {
      console.log('⚠️  Cash on Hand account needs to be created or has wrong code')
      // We might need to create a new account or update the existing one
    }
    
  } catch (error) {
    console.error('❌ Error creating bank account:', error)
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

createMissingBankAccount()