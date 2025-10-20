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

  console.log('✅ Users seed completed')
  console.log('📊 Created/Updated users:', { user1, user2 })

  // Seed customers
  const customer1 = await prisma.customer.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      name: 'Juan Perez',
      phone: '+56912345678',
      email: 'juan.perez@ejemplo.com',
    },
  })

  const customer2 = await prisma.customer.upsert({
    where: { id: '2' },
    update: {},
    create: {
      id: '2',
      name: 'Maria Gonzalez',
      phone: '+56987654321',
      email: 'maria.gonzalez@ejemplo.com',
    },
  })

  const customer3 = await prisma.customer.upsert({
    where: { id: '3' },
    update: {},
    create: {
      id: '3',
      name: 'Pedro Sanchez',
      phone: '+56955555555',
      email: 'pedro.sanchez@ejemplo.com',
    },
  })

  console.log('✅ Customers seed completed')
  console.log('📊 Created/Updated customers:', { customer1, customer2, customer3 })

  console.log('\n🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
