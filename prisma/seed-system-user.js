const { PrismaClient } = require('../lib/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating system user...');

  try {
    // Check if system user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: 'system' }
    });

    if (existingUser) {
      console.log('System user already exists with ID:', existingUser.id);
      return existingUser;
    }

    // Create system user
    const hashedPassword = await bcrypt.hash('system-password-change-me', 10);
    
    const systemUser = await prisma.user.create({
      data: {
        id: 'system',
        username: 'system',
        email: 'system@enxi.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    console.log('System user created successfully:', systemUser);
    return systemUser;

  } catch (error) {
    console.error('Error creating system user:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });