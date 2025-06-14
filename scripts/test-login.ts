import axios from 'axios'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()
const API_URL = 'http://localhost:3000/api'

async function testLogin(): Promise<{ user: any, session?: any }> {
  console.warn('🔐 Testing login...\n')

  try {
    // First check what's in the database
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (adminUser) {
      console.warn('Admin user found:')
      console.warn('  Username:', adminUser.username)
      console.warn('  Email:', adminUser.email)
      console.warn('  Active:', adminUser.isActive)
      
      // Test password hashes
      console.warn('\nTesting password hashes:')
      const testPasswords = ['admin123', 'demo123', 'password']
      
      for (const testPwd of testPasswords) {
        const matches = await bcrypt.compare(testPwd, adminUser.password)
        console.warn(`  ${testPwd}: ${matches ? '✅ MATCHES' : '❌ does not match'}`)
      }
      
      // Try login with each password
      console.warn('\nTrying API login:')
      for (const testPwd of testPasswords) {
        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: testPwd
          })
          console.warn(`  ${testPwd}: ✅ Login successful!`)
          console.warn(`    Token: ${response.data.token.substring(0, 20)}...`)
          break
        } catch (error: any) {
          console.warn(`  ${testPwd}: ❌ ${error.response?.data?.error || error.message}`)
        }
      }
    } else {
      console.warn('❌ Admin user not found')
    }

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

testLogin()
  .catch(console.error)