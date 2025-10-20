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

  // Seed badge colors
  const badgeColors = [
    { name: 'Gris', key: 'gray', bgClass: 'bg-gray-500', order: 1 },
    { name: 'Rojo', key: 'red', bgClass: 'bg-red-500', order: 2 },
    { name: 'Naranja', key: 'orange', bgClass: 'bg-orange-500', order: 3 },
    { name: 'Amarillo', key: 'yellow', bgClass: 'bg-yellow-500', order: 4 },
    { name: 'Verde', key: 'green', bgClass: 'bg-green-500', order: 5 },
    { name: 'Azul', key: 'blue', bgClass: 'bg-blue-500', order: 6 },
    { name: 'Índigo', key: 'indigo', bgClass: 'bg-indigo-500', order: 7 },
    { name: 'Púrpura', key: 'purple', bgClass: 'bg-purple-500', order: 8 },
    { name: 'Rosa', key: 'pink', bgClass: 'bg-pink-500', order: 9 },
  ]

  for (const color of badgeColors) {
    await prisma.badgeColor.upsert({
      where: { key: color.key },
      update: {},
      create: color,
    })
  }

  console.log('✅ Badge colors seed completed')
  console.log(`📊 Created/Updated ${badgeColors.length} badge colors`)

  // Obtener colores para usar en ProjectStatus
  const yellowColor = await prisma.badgeColor.findUnique({ where: { key: 'yellow' } })
  const blueColor = await prisma.badgeColor.findUnique({ where: { key: 'blue' } })
  const greenColor = await prisma.badgeColor.findUnique({ where: { key: 'green' } })
  const redColor = await prisma.badgeColor.findUnique({ where: { key: 'red' } })

  if (!yellowColor || !blueColor || !greenColor || !redColor) {
    throw new Error('Badge colors not found')
  }

  // Seed project statuses
  // IMPORTANTE: Order con lógica automática
  // - isInitial: order=0 (siempre primero)
  // - isFinal: order=999 (siempre último)
  // - normales: order=10, 20, 30... (gaps para reordenar)
  const statusPendiente = await prisma.projectStatus.upsert({
    where: { name: 'Pendiente' },
    update: { order: 0 }, // Actualizar order si ya existe
    create: {
      name: 'Pendiente',
      colorId: yellowColor.id,
      order: 0, // Inicial siempre primero
      isInitial: true,
      isActive: true,
    },
  })

  const statusEnProgreso = await prisma.projectStatus.upsert({
    where: { name: 'En Progreso' },
    update: { order: 10 }, // Actualizar order si ya existe
    create: {
      name: 'En Progreso',
      colorId: blueColor.id,
      order: 10, // Estado normal
      isActive: true,
    },
  })

  const statusCancelado = await prisma.projectStatus.upsert({
    where: { name: 'Cancelado' },
    update: { order: 20 }, // Actualizar order si ya existe
    create: {
      name: 'Cancelado',
      colorId: redColor.id,
      order: 20, // Estado normal
      isActive: true,
    },
  })

  const statusCompletado = await prisma.projectStatus.upsert({
    where: { name: 'Completado' },
    update: { order: 999 }, // Actualizar order si ya existe
    create: {
      name: 'Completado',
      colorId: greenColor.id,
      order: 999, // Final siempre último
      isFinal: true,
      isActive: true,
    },
  })

  console.log('✅ Project statuses seed completed')
  console.log('📊 Created/Updated project statuses (ordered):', {
    statusPendiente, // order: 0 (inicial)
    statusEnProgreso, // order: 10
    statusCancelado, // order: 20
    statusCompletado, // order: 999 (final)
  })

  // Seed payment methods
  const paymentMethods = [
    { name: 'Efectivo', icon: 'Banknote', requiresReference: false, order: 1 },
    { name: 'Transferencia Bancaria', icon: 'ArrowRightLeft', requiresReference: true, order: 2 },
    { name: 'Tarjeta de Débito', icon: 'CreditCard', requiresReference: false, order: 3 },
    { name: 'Tarjeta de Crédito', icon: 'CreditCard', requiresReference: false, order: 4 },
    { name: 'WebPay', icon: 'Smartphone', requiresReference: true, order: 5 },
    { name: 'Khipu', icon: 'Smartphone', requiresReference: true, order: 6 },
    { name: 'Mercado Pago', icon: 'Wallet', requiresReference: true, order: 7 },
    { name: 'Cheque', icon: 'FileText', requiresReference: true, order: 8 },
  ]

  for (const method of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { name: method.name },
      update: {},
      create: method,
    })
  }

  console.log('✅ Payment methods seed completed')
  console.log(`📊 Created/Updated ${paymentMethods.length} payment methods`)

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
