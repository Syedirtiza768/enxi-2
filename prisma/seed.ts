import { PrismaClient, Role } from '@/lib/generated/prisma'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { createInterface } from 'readline'

const BATCH = parseInt(process.env.SEED_BATCH || '1000', 10)
const SEED_MONTHS = parseInt(process.env.SEED_MONTHS || '24', 10)
const DEBUG = process.env.DEBUG_SEED === '1'

const idDir = '/tmp/ids'

const prisma = new PrismaClient({ log: DEBUG ? ['query', 'error', 'warn'] : ['error'] })

function log(...args: unknown[]) {
  if (DEBUG) console.log(...args)
}

export async function pushIds(model: string, ids: string[]): Promise<void> {
  await fs.promises.mkdir(idDir, { recursive: true })
  const file = path.join(idDir, `${model}.ndjson`)
  await fs.promises.appendFile(file, ids.map((id) => JSON.stringify(id)).join('\n') + '\n')
}

export async function* pullIds<T = string>(model: string): AsyncGenerator<T> {
  const file = path.join(idDir, `${model}.ndjson`)
  if (!fs.existsSync(file)) return
  const rl = createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })
  for await (const line of rl) {
    if (line.trim()) yield JSON.parse(line)
  }
}

type GeneratorFn = (month: number) => AsyncGenerator<Record<string, unknown>>

async function insertFromGenerator(
  model: keyof PrismaClient,
  tx: PrismaClient,
  gen: AsyncGenerator<Record<string, unknown>>,
) {
  const ids: string[] = []
  let batch: Record<string, unknown>[] = []
  for await (const record of gen) {
    batch.push(record)
    if (batch.length >= BATCH) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any)[model].createMany({ data: batch })
      ids.push(...batch.map((r) => String(r.id)))
      batch = []
    }
  }
  if (batch.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (tx as any)[model].createMany({ data: batch })
    ids.push(...batch.map((r) => String(r.id)))
  }
  await pushIds(String(model), ids)
}

function monthDate(month: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - month)
  return d
}

export async function* generateUsers(month: number) {
  if (month !== SEED_MONTHS - 1) return
  const password = await bcrypt.hash('demo123', 10)
  const roles = [Role.ADMIN, Role.SALES_REP, Role.ACCOUNTANT, Role.WAREHOUSE]
  for (const role of roles) {
    const id = randomUUID()
    yield {
      id,
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password,
      role,
      isActive: true,
      createdAt: monthDate(month),
      updatedAt: monthDate(month),
    }
  }
}

export async function* generateCustomers(month: number) {
  const creatorIds = []
  for await (const id of pullIds('user')) {
    creatorIds.push(String(id))
  }
  if (!creatorIds.length) return
  const count = 5
  for (let i = 0; i < count; i++) {
    const id = randomUUID()
    yield {
      id,
      customerNumber: `CUST-${faker.string.alphanumeric(8)}`,
      name: faker.company.name(),
      email: faker.internet.email(),
      createdBy: faker.helpers.arrayElement(creatorIds),
      createdAt: monthDate(month),
      updatedAt: monthDate(month),
    }
  }
}

export async function* generateLeads(month: number) {
  const creatorIds = []
  for await (const id of pullIds('user')) {
    creatorIds.push(String(id))
  }
  if (!creatorIds.length) return
  const count = 5
  for (let i = 0; i < count; i++) {
    const id = randomUUID()
    yield {
      id,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      createdBy: faker.helpers.arrayElement(creatorIds),
      createdAt: monthDate(month),
      updatedAt: monthDate(month),
    }
  }
}

export async function* generateSalesCases(month: number) {
  const customerIds = []
  for await (const id of pullIds('customer')) {
    customerIds.push(String(id))
  }
  if (!customerIds.length) return
  const count = 3
  for (let i = 0; i < count; i++) {
    const id = randomUUID()
    yield {
      id,
      caseNumber: `SC-${faker.string.alphanumeric(8)}`,
      customerId: faker.helpers.arrayElement(customerIds),
      title: faker.company.catchPhrase(),
      createdBy: customerIds[0],
      createdAt: monthDate(month),
      updatedAt: monthDate(month),
    }
  }
}

export async function* generateVendors(month: number) {
  const creatorIds = []
  for await (const id of pullIds('user')) {
    creatorIds.push(String(id))
  }
  if (!creatorIds.length) return
  const count = 2
  for (let i = 0; i < count; i++) {
    const id = randomUUID()
    yield {
      id,
      supplierNumber: `SUP-${faker.string.alphanumeric(8)}`,
      name: faker.company.name(),
      createdBy: faker.helpers.arrayElement(creatorIds),
      createdAt: monthDate(month),
      updatedAt: monthDate(month),
    }
  }
}


export async function* generateInvoices(month: number) {
  const customerIds = []
  for await (const id of pullIds('customer')) {
    customerIds.push(String(id))
  }
  if (!customerIds.length) return
  const count = 4
  for (let i = 0; i < count; i++) {
    const id = randomUUID()
    const date = monthDate(month)
    yield {
      id,
      invoiceNumber: `INV-${faker.string.alphanumeric(8)}`,
      customerId: faker.helpers.arrayElement(customerIds),
      dueDate: faker.date.future({ years: 0.1, refDate: date }),
      invoiceDate: date,
      createdBy: customerIds[0],
      createdAt: date,
      updatedAt: date,
    }
  }
}

async function purge(tx: PrismaClient) {
  await tx.auditLog.deleteMany()
  await tx.payment.deleteMany()
  await tx.invoice.deleteMany()
  await tx.salesCase.deleteMany()
  await tx.lead.deleteMany()
  await tx.customer.deleteMany()
  await tx.user.deleteMany()
}

async function validate() {
  const count = await prisma.invoice.count()
  if (count < 0) console.log('') // placeholder
}

export async function main() {
  await fs.promises.rm(idDir, { recursive: true, force: true })

  await prisma.$transaction(async (tx) => {
    await purge(tx)
  })

  for (let m = SEED_MONTHS - 1; m >= 0; m--) {
    await prisma.$transaction(async (tx) => {
      await insertFromGenerator('user', tx, generateUsers(m))
      await insertFromGenerator('customer', tx, generateCustomers(m))
      await insertFromGenerator('lead', tx, generateLeads(m))
      await insertFromGenerator('salesCase', tx, generateSalesCases(m))
      await insertFromGenerator('supplier', tx, generateVendors(m))
      await insertFromGenerator('invoice', tx, generateInvoices(m))
    })
  }

  await validate()
}

main()
  .then(() => {
    log('Seed completed')
    process.exit(0)
  })
  .catch((e) => {
    console.error('Seed error', e)
    process.exit(1)
  })
