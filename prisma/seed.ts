import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Example: Create demo users
  const user1 = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
    },
  })

  console.log('✅ Seed completed successfully')
  console.log('📊 Created/Updated users:', { user1, user2 })

  // Add more seed data here as needed for your project
  // Example:
  // const posts = await prisma.post.createMany({
  //   data: [
  //     { title: 'First Post', authorId: user1.id },
  //     { title: 'Second Post', authorId: user2.id },
  //   ]
  // })
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
