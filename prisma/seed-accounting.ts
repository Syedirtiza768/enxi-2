import { PrismaClient, AccountType, JournalStatus, Role } from '../lib/generated/prisma'
import { ChartOfAccountsService } from '../lib/services/accounting/chart-of-accounts.service'
import { JournalEntryService } from '../lib/services/accounting/journal-entry.service'

const prisma = new PrismaClient()

async function seedAccounting(): Promise<void> {
  console.warn('🌱 Seeding accounting data...')

  try {
    // Create admin user if not exists
    let adminUser = await prisma.user.findFirst({
      where: { username: 'admin' }
    })

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password: '$2a$10$fUHoHJHMNJpNSz8lUcKlZ.HuEM8/DsAqGUxR1J.bN7tKpCqYNJAGa', // 'password123'
          role: Role.ADMIN,
          isActive: true
        }
      })
    }

    const userId = adminUser.id
    const coaService = new ChartOfAccountsService()
    const journalService = new JournalEntryService()

    // Check if COA already exists
    const existingAccounts = await coaService.getAllAccounts()
    if (existingAccounts.length === 0) {
      console.warn('Creating standard Chart of Accounts...')
      await coaService.createStandardCOA('USD', userId)
    }

    // Get key accounts for transactions
    const accounts = await coaService.getAllAccounts()
    const getAccountId = (code: string) => {
      const account = accounts.find(a => a.code === code)
      if (!account) throw new Error(`Account ${code} not found`)
      return account.id
    }

    // Define realistic business transactions
    const transactions = [
      // Initial capital investment
      {
        date: new Date('2024-01-01'),
        description: 'Initial capital investment from shareholders',
        reference: 'CAP-001',
        lines: [
          { accountId: getAccountId('1110'), debit: 100000, credit: 0 }, // Cash
          { accountId: getAccountId('3100'), debit: 0, credit: 100000 }  // Share Capital
        ]
      },
      // Equipment purchase
      {
        date: new Date('2024-01-05'),
        description: 'Purchase office equipment',
        reference: 'PO-001',
        lines: [
          { accountId: getAccountId('1210'), debit: 15000, credit: 0 }, // Equipment
          { accountId: getAccountId('1110'), debit: 0, credit: 15000 }  // Cash
        ]
      },
      // First month rent payment
      {
        date: new Date('2024-01-10'),
        description: 'Office rent payment - January',
        reference: 'RENT-2024-01',
        lines: [
          { accountId: getAccountId('5220'), debit: 3000, credit: 0 }, // Rent Expense
          { accountId: getAccountId('1110'), debit: 0, credit: 3000 }  // Cash
        ]
      },
      // Sales revenue - cash
      {
        date: new Date('2024-01-15'),
        description: 'Sales revenue - Product A',
        reference: 'INV-001',
        lines: [
          { accountId: getAccountId('1110'), debit: 12000, credit: 0 }, // Cash
          { accountId: getAccountId('4100'), debit: 0, credit: 12000 }  // Sales Revenue
        ]
      },
      // Sales revenue - credit
      {
        date: new Date('2024-01-20'),
        description: 'Sales revenue on credit - Product B',
        reference: 'INV-002',
        lines: [
          { accountId: getAccountId('1120'), debit: 8000, credit: 0 }, // Accounts Receivable
          { accountId: getAccountId('4100'), debit: 0, credit: 8000 }  // Sales Revenue
        ]
      },
      // Purchase inventory on credit
      {
        date: new Date('2024-01-22'),
        description: 'Purchase inventory on credit',
        reference: 'PO-002',
        lines: [
          { accountId: getAccountId('1130'), debit: 5000, credit: 0 }, // Inventory
          { accountId: getAccountId('2110'), debit: 0, credit: 5000 }  // Accounts Payable
        ]
      },
      // Cost of goods sold
      {
        date: new Date('2024-01-23'),
        description: 'Cost of goods sold for January sales',
        reference: 'COGS-2024-01',
        lines: [
          { accountId: getAccountId('5100'), debit: 7000, credit: 0 }, // COGS
          { accountId: getAccountId('1130'), debit: 0, credit: 7000 }  // Inventory
        ]
      },
      // Salary payment
      {
        date: new Date('2024-01-31'),
        description: 'Salary payment for January',
        reference: 'SAL-2024-01',
        lines: [
          { accountId: getAccountId('5210'), debit: 15000, credit: 0 }, // Salaries and Wages
          { accountId: getAccountId('1110'), debit: 0, credit: 15000 }  // Cash
        ]
      },
      // Utility bills
      {
        date: new Date('2024-01-31'),
        description: 'Utility bills - January',
        reference: 'UTIL-2024-01',
        lines: [
          { accountId: getAccountId('5230'), debit: 800, credit: 0 }, // Utilities Expense
          { accountId: getAccountId('1110'), debit: 0, credit: 800 }  // Cash
        ]
      },
      // Customer payment received
      {
        date: new Date('2024-02-05'),
        description: 'Payment received from customer - INV-002',
        reference: 'REC-001',
        lines: [
          { accountId: getAccountId('1110'), debit: 8000, credit: 0 },  // Cash
          { accountId: getAccountId('1120'), debit: 0, credit: 8000 }   // Accounts Receivable
        ]
      },
      // Service revenue
      {
        date: new Date('2024-02-10'),
        description: 'Consulting service revenue',
        reference: 'SRV-001',
        lines: [
          { accountId: getAccountId('1110'), debit: 5000, credit: 0 },  // Cash
          { accountId: getAccountId('4200'), debit: 0, credit: 5000 }   // Service Revenue
        ]
      },
      // Pay supplier
      {
        date: new Date('2024-02-15'),
        description: 'Payment to supplier - PO-002',
        reference: 'PAY-001',
        lines: [
          { accountId: getAccountId('2110'), debit: 5000, credit: 0 },  // Accounts Payable
          { accountId: getAccountId('1110'), debit: 0, credit: 5000 }   // Cash
        ]
      },
      // February rent
      {
        date: new Date('2024-02-10'),
        description: 'Office rent payment - February',
        reference: 'RENT-2024-02',
        lines: [
          { accountId: getAccountId('5220'), debit: 3000, credit: 0 }, // Rent Expense
          { accountId: getAccountId('1110'), debit: 0, credit: 3000 }  // Cash
        ]
      },
      // More sales
      {
        date: new Date('2024-02-20'),
        description: 'Sales revenue - Multiple products',
        reference: 'INV-003',
        lines: [
          { accountId: getAccountId('1110'), debit: 18000, credit: 0 }, // Cash
          { accountId: getAccountId('4100'), debit: 0, credit: 18000 }  // Sales Revenue
        ]
      },
      // Loan from bank
      {
        date: new Date('2024-02-25'),
        description: 'Bank loan received',
        reference: 'LOAN-001',
        lines: [
          { accountId: getAccountId('1110'), debit: 25000, credit: 0 }, // Cash
          { accountId: getAccountId('2200'), debit: 0, credit: 25000 }  // Long-term Liabilities
        ]
      }
    ]

    console.warn('Creating journal entries...')
    let createdCount = 0
    let postedCount = 0

    for (const txn of transactions) {
      try {
        // Create journal entry
        const entry = await journalService.createJournalEntry({
          date: txn.date,
          description: txn.description,
          reference: txn.reference,
          currency: 'USD',
          exchangeRate: 1.0,
          lines: txn.lines.map(line => ({
            accountId: line.accountId,
            description: txn.description,
            debitAmount: line.debit,
            creditAmount: line.credit
          })),
          createdBy: userId
        })
        createdCount++

        // Post the entry
        await journalService.postJournalEntry(entry.id, userId)
        postedCount++
      } catch (error: any) {
        console.warn(`⚠️  Skipping transaction: ${txn.description} - ${error.message}`)
      }
    }

    console.warn(`✅ Created ${createdCount} journal entries`)
    console.warn(`✅ Posted ${postedCount} journal entries`)

    // Calculate and display summary
    const trialBalance = await prisma.account.findMany({
      where: { balance: { not: 0 } },
      orderBy: { code: 'asc' }
    })

    console.warn('\n📊 Account Balances:')
    trialBalance.forEach(account => {
      console.warn(`   ${account.code} - ${account.name}: ${account.currency} ${account.balance.toFixed(2)}`)
    })
  } catch (error) {
    console.error('Error in seedAccounting:', error)
    throw error
  }
}

// Run the seed function
seedAccounting()
  .then(() => {
    console.warn('✅ Accounting data seeded successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })