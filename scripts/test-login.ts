import axios from 'axios'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()
const API_URL = 'http://localhost:3000/api'

async function testLogin() {
  console.log('🔐 Testing login...\n')

  try {
    // First check what's in the database
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (adminUser) {
      console.log('Admin user found:')
      console.log('  Username:', adminUser.username)
      console.log('  Email:', adminUser.email)
      console.log('  Active:', adminUser.isActive)
      
      // Test password hashes
      console.log('\nTesting password hashes:')
      const testPasswords = ['admin123', 'demo123', 'password']
      
      for (const testPwd of testPasswords) {
        const matches = await bcrypt.compare(testPwd, adminUser.password)
        console.log(`  ${testPwd}: ${matches ? '✅ MATCHES' : '❌ does not match'}`)
      }
      
      // Try login with each password
      console.log('\nTrying API login:')
      for (const testPwd of testPasswords) {
        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: testPwd
          })
          console.log(`  ${testPwd}: ✅ Login successful!`)
          console.log(`    Token: ${response.data.token.substring(0, 20)}...`)
          break
        } catch (error: any) {
          console.log(`  ${testPwd}: ❌ ${error.response?.data?.error || error.message}`)
        }
      }
    } else {
      console.log('❌ Admin user not found')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLogin()
  .catch(console.error)