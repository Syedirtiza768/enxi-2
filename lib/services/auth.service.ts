import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/prisma'
import { CreateUserInput, UserResponse } from '@/lib/validators/auth.validator'

export class AuthService {
  private jwtSecret: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret'
  }

  async validateUser(username: string, password: string): Promise<UserResponse | null> {
    // Try to find user by username first, then by email
    let user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      // If not found by username, try email
      user = await prisma.user.findUnique({
        where: { email: username },
      })
    }

    if (!user || !user.isActive) {
      return null
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }
  }

  generateToken(user: UserResponse): string {
    return jwt.sign(user, this.jwtSecret, { expiresIn: '7d' })
  }

  verifyToken(token: string): UserResponse | null {
    try {
      return jwt.verify(token, this.jwtSecret) as UserResponse
    } catch {
      return null
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  async createUser(data: CreateUserInput): Promise<UserResponse> {
    try {
      const hashedPassword = await this.hashPassword(data.password)
      const user = await prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
        },
      })

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    } catch (error: any) {
      if (error.message?.includes('Unique constraint failed')) {
        throw new Error('Username already exists')
      }
      throw error
    }
  }

  async getUserById(id: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }
  }
}