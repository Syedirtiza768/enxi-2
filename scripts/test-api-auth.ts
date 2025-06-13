import { PrismaClient } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

async function testApiAuth() {
  try {
    console.log('🧪 Testing API authentication...')
    
    // Get admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    
    if (!admin) {
      console.error('❌ No admin user found')
      return
    }
    
    console.log(`✅ Found admin user: ${admin.username}`)
    
    // Verify password (from seed script we know it's DieselUAE2024!)
    const password = 'DieselUAE2024!'
    const isValidPassword = await bcrypt.compare(password, admin.password)
    console.log(`✅ Password verification: ${isValidPassword}`)
    
    // Generate a JWT token
    const jwtSecret = process.env.JWT_SECRET || 'development-secret-key-change-in-production'
    const token = jwt.sign(
      { id: admin.id, username: admin.username, email: admin.email, role: admin.role },
      jwtSecret,
      { expiresIn: '24h' }
    )
    
    console.log('\n📋 Generated JWT token for testing:')
    console.log(token)
    
    // Test the API with curl command
    console.log('\n🔧 Test the API with this curl command:')
    console.log(`curl -X POST http://localhost:3000/api/customers \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
    "name": "Test API Customer",
    "email": "test.api@customer.com",
    "phone": "+971 50 111 2222",
    "currency": "AED",
    "creditLimit": 10000,
    "paymentTerms": 30
  }'`)
    
    console.log('\n🍪 Or set this cookie in your browser:')
    console.log(`auth-token=${token}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiAuth()