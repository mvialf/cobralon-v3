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
    where: { id: '23fe7dbd-8ddf-4fa5-b565-4e6bbf1c2d3b' },
    update: {},
    create: {
      id: '23fe7dbd-8ddf-4fa5-b565-4e6bbf1c2d3b',
      name: 'Juan Perez',
      phone: '+56912345678',
      email: 'juan.perez@ejemplo.com',
    },
  })

  const customer2 = await prisma.customer.upsert({
    where: { id: '8f01b08d-a4c5-418c-b624-3d2f5359b29c' },
    update: {},
    create: {
      id: '8f01b08d-a4c5-418c-b624-3d2f5359b29c',
      name: 'Maria Gonzalez',
      phone: '+56987654321',
      email: 'maria.gonzalez@ejemplo.com',
    },
  })

  const customer3 = await prisma.customer.upsert({
    where: { id: '5aed8825-106f-4054-b564-5bd42028085e' },
    update: {},
    create: {
      id: '5aed8825-106f-4054-b564-5bd42028085e',
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
    { name: 'Efectivo', icon: 'Banknote', order: 1 },
    { name: 'Transferencia Bancaria', icon: 'ArrowRightLeft', order: 2 },
    { name: 'Tarjeta de Débito', icon: 'CreditCard', order: 3 },
    { name: 'Tarjeta de Crédito', icon: 'CreditCard', order: 4 },
    { name: 'WebPay', icon: 'Smartphone', order: 5 },
    { name: 'Khipu', icon: 'Smartphone', order: 6 },
    { name: 'Mercado Pago', icon: 'Wallet', order: 7 },
    { name: 'Cheque', icon: 'FileText', order: 8 },
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

  // Obtener payment methods para usar en pagos
  const efectivo = await prisma.paymentMethod.findUnique({ where: { name: 'Efectivo' } })
  const transferencia = await prisma.paymentMethod.findUnique({
    where: { name: 'Transferencia Bancaria' },
  })
  const webpay = await prisma.paymentMethod.findUnique({ where: { name: 'WebPay' } })

  if (!efectivo || !transferencia || !webpay) {
    throw new Error('Payment methods not found')
  }

  // ========================================
  // SEED AFTERSALE STATUSES
  // ========================================

  console.log('\n🔧 Seeding aftersale statuses...')

  const statusIngresado = await prisma.aftersaleStatus.upsert({
    where: { name: 'Ingresado' },
    update: { order: 0 }, // Actualizar order si ya existe
    create: {
      name: 'Ingresado',
      colorId: blueColor.id,
      order: 0, // Inicial siempre primero
      isInitial: true,
      isActive: true,
    },
  })

  const statusCompletadoAftersale = await prisma.aftersaleStatus.upsert({
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

  console.log('✅ Aftersale statuses seed completed')
  console.log('📊 Created/Updated aftersale statuses (ordered):', {
    statusIngresado, // order: 0 (inicial)
    statusCompletadoAftersale, // order: 999 (final)
  })

  // ========================================
  // SEED PROJECTS WITH PAYMENT DATA
  // ========================================

  console.log('\n🏗️  Seeding projects with payment data...')

  // Cliente 1 (Juan Perez) - 3 proyectos antiguos con balance pendiente
  const project1 = await prisma.project.upsert({
    where: { id: 'b048e142-9cd1-4fd5-834b-51c865d41048' },
    update: {},
    create: {
      id: 'b048e142-9cd1-4fd5-834b-51c865d41048',
      projectNumber: '2024-001',
      projectName: 'Ventanas Oficina Central',
      customerId: customer1.id,
      phone: customer1.phone,
      street: 'Av. Providencia 1234',
      apartment: 'Piso 5',
      comuna: 'Providencia',
      region: 'Metropolitana de Santiago',
      projectStatusId: statusEnProgreso.id,
      date: new Date('2024-06-15'), // Junio 2024 (antiguo)
      subtotal: 420168.07, // Subtotal para llegar a $500k con IVA
      taxRate: 19,
      totalAmount: 500000, // Monto total acordado
      currency: 'CLP',
      windowsCount: 8,
      squareMeters: 25.5,
      description: 'Instalación de ventanas termopanel para oficinas',
    },
  })

  const project2 = await prisma.project.upsert({
    where: { id: 'a95e768c-fc22-4a4a-91b6-f0f55d318efa' },
    update: {},
    create: {
      id: 'a95e768c-fc22-4a4a-91b6-f0f55d318efa',
      projectNumber: '2024-002',
      projectName: 'Puertas Bodega Norte',
      customerId: customer1.id,
      phone: customer1.phone,
      street: 'Calle Los Aromos 567',
      apartment: null,
      comuna: 'Quilicura',
      region: 'Metropolitana de Santiago',
      projectStatusId: statusEnProgreso.id,
      date: new Date('2024-08-20'), // Agosto 2024
      subtotal: 336134.45,
      taxRate: 19,
      totalAmount: 400000,
      currency: 'CLP',
      windowsCount: 4,
      squareMeters: 18.0,
      description: 'Puertas de seguridad para bodega industrial',
    },
  })

  const _project3 = await prisma.project.upsert({
    where: { id: '9304ab76-5508-4c1f-a612-59bbf030b5cb' },
    update: {},
    create: {
      id: '9304ab76-5508-4c1f-a612-59bbf030b5cb',
      projectNumber: '2024-003',
      projectName: 'Ventanas Casa Particular',
      customerId: customer1.id,
      phone: customer1.phone,
      street: 'Pasaje El Roble 89',
      apartment: null,
      comuna: 'Las Condes',
      region: 'Metropolitana de Santiago',
      projectStatusId: statusPendiente.id,
      date: new Date('2024-10-10'), // Octubre 2024
      subtotal: 252100.84,
      taxRate: 19,
      totalAmount: 300000,
      currency: 'CLP',
      windowsCount: 6,
      squareMeters: 15.0,
    },
  })

  // Cliente 2 (Maria Gonzalez) - 1 proyecto totalmente pagado
  const project4 = await prisma.project.upsert({
    where: { id: '4de213f6-ccf5-4d66-ac32-37cdb0487e16' },
    update: {},
    create: {
      id: '4de213f6-ccf5-4d66-ac32-37cdb0487e16',
      projectNumber: '2024-004',
      projectName: 'Fachada Completa Edificio',
      customerId: customer2.id,
      phone: customer2.phone,
      street: "Av. Libertador Bernardo O'Higgins 999",
      apartment: null,
      comuna: 'Santiago',
      region: 'Metropolitana de Santiago',
      projectStatusId: statusCompletado.id,
      date: new Date('2024-09-01'), // Septiembre 2024
      subtotal: 672268.91,
      taxRate: 19,
      totalAmount: 800000,
      currency: 'CLP',
      windowsCount: 20,
      squareMeters: 80.0,
      description: 'Reemplazo completo de fachada de vidrio',
    },
  })

  // Cliente 3 (Pedro Sanchez) - 2 proyectos sin pagos
  const _project5 = await prisma.project.upsert({
    where: { id: '2f2d9ccf-9fb4-468c-893d-7933c1f9d914' },
    update: {},
    create: {
      id: '2f2d9ccf-9fb4-468c-893d-7933c1f9d914',
      projectNumber: '2024-005',
      projectName: 'Ventanas Departamento',
      customerId: customer3.id,
      phone: customer3.phone,
      street: 'Calle Nueva 456',
      apartment: 'Depto 301',
      comuna: 'Ñuñoa',
      region: 'Metropolitana de Santiago',
      projectStatusId: statusPendiente.id,
      date: new Date('2024-10-25'), // Octubre 2024
      subtotal: 504201.68,
      taxRate: 19,
      totalAmount: 600000,
      currency: 'CLP',
      windowsCount: 10,
      squareMeters: 30.0,
    },
  })

  const _project6 = await prisma.project.upsert({
    where: { id: '4931d40a-8e54-4671-a9c8-456ca9334340' },
    update: {},
    create: {
      id: '4931d40a-8e54-4671-a9c8-456ca9334340',
      projectNumber: '2024-006',
      projectName: 'Puertas Local Comercial',
      customerId: customer3.id,
      phone: customer3.phone,
      street: 'Av. Vicuña Mackenna 2000',
      apartment: 'Local 5',
      comuna: 'La Florida',
      region: 'Metropolitana de Santiago',
      projectStatusId: statusPendiente.id,
      date: new Date('2024-11-05'), // Noviembre 2024
      subtotal: 378151.26,
      taxRate: 19,
      totalAmount: 450000,
      currency: 'CLP',
      windowsCount: 3,
      squareMeters: 12.0,
    },
  })

  console.log('✅ Projects seed completed')
  console.log('📊 Created/Updated 6 projects with payment data')

  // ========================================
  // SEED PAYMENTS WITH ALLOCATIONS
  // ========================================

  console.log('\n💰 Seeding payments with allocations...')

  // Pago 1 (Cliente 1): $200,000 → Abono parcial a Proyecto #2024-001
  const _payment1 = await prisma.payment.upsert({
    where: { id: '7b8a6d79-2e10-4ae3-b45a-fa06d5fa38b8' },
    update: {},
    create: {
      id: '7b8a6d79-2e10-4ae3-b45a-fa06d5fa38b8',
      amount: 200000,
      currency: 'CLP',
      date: new Date('2024-07-15'),
      reference: null,
      notes: 'Primer abono proyecto oficinas',
      customerId: customer1.id,
      paymentMethodId: efectivo.id,
      allocations: {
        create: [
          {
            projectId: project1.id,
            allocatedAmount: 200000, // Abono parcial
          },
        ],
      },
    },
  })

  // Pago 2 (Cliente 1): $500,000 → FIFO: Cierra #2024-001 ($300k) + Abono a #2024-002 ($200k)
  const _payment2 = await prisma.payment.upsert({
    where: { id: 'e2a0d0dc-d5ad-4cbb-af6f-025b13121a6c' },
    update: {},
    create: {
      id: 'e2a0d0dc-d5ad-4cbb-af6f-025b13121a6c',
      amount: 500000,
      currency: 'CLP',
      date: new Date('2024-09-10'),
      reference: 'TRX-98765432',
      notes: 'Pago que cierra proyecto 001 y abona a 002',
      customerId: customer1.id,
      paymentMethodId: transferencia.id,
      allocations: {
        create: [
          {
            projectId: project1.id,
            allocatedAmount: 300000, // Cierra el balance de 001
          },
          {
            projectId: project2.id,
            allocatedAmount: 200000, // Abono a 002
          },
        ],
      },
    },
  })

  // Pago 3 (Cliente 2): $800,000 → Cierra completamente #2024-004
  const _payment3 = await prisma.payment.upsert({
    where: { id: '2b2d5846-de72-42d2-bc61-3041302498cc' },
    update: {},
    create: {
      id: '2b2d5846-de72-42d2-bc61-3041302498cc',
      amount: 800000,
      currency: 'CLP',
      date: new Date('2024-09-15'),
      reference: 'TRX-11111111',
      notes: 'Pago completo fachada edificio',
      customerId: customer2.id,
      paymentMethodId: transferencia.id,
      allocations: {
        create: [
          {
            projectId: project4.id,
            allocatedAmount: 800000, // Pago completo
          },
        ],
      },
    },
  })

  // Pago 4 (Cliente 1): $100,000 → Abono adicional a #2024-002 (ya tiene $200k, total $300k)
  const _payment4 = await prisma.payment.upsert({
    where: { id: 'b168368d-40d1-4503-8f2a-7133beab3eed' },
    update: {},
    create: {
      id: 'b168368d-40d1-4503-8f2a-7133beab3eed',
      amount: 100000,
      currency: 'CLP',
      date: new Date('2024-10-20'),
      reference: 'WP-555666777',
      notes: 'Abono adicional bodega norte',
      customerId: customer1.id,
      paymentMethodId: webpay.id,
      allocations: {
        create: [
          {
            projectId: project2.id,
            allocatedAmount: 100000, // Segundo abono a 002
          },
        ],
      },
    },
  })

  console.log('✅ Payments seed completed')
  console.log('📊 Created/Updated 4 payments')

  // ========================================
  // SEED VISIT STATUSES
  // ========================================

  console.log('\n📅 Seeding visit statuses...')

  const statusContactada = await prisma.visitStatus.upsert({
    where: { name: 'Contactada' },
    update: { order: 0 }, // Actualizar order si ya existe
    create: {
      name: 'Contactada',
      colorId: blueColor.id,
      order: 0, // Inicial siempre primero
      isInitial: true,
      isActive: true,
    },
  })

  const statusAgendada = await prisma.visitStatus.upsert({
    where: { name: 'Agendada' },
    update: { order: 10 }, // Actualizar order si ya existe
    create: {
      name: 'Agendada',
      colorId: yellowColor.id,
      order: 10, // Estado intermedio
      isActive: true,
    },
  })

  const statusCompletadaVisit = await prisma.visitStatus.upsert({
    where: { name: 'Completada' },
    update: { order: 999 }, // Actualizar order si ya existe
    create: {
      name: 'Completada',
      colorId: greenColor.id,
      order: 999, // Final
      isFinal: true,
      isActive: true,
    },
  })

  const statusCanceladaVisit = await prisma.visitStatus.upsert({
    where: { name: 'Cancelada' },
    update: { order: 20 }, // Actualizar order si ya existe
    create: {
      name: 'Cancelada',
      colorId: redColor.id,
      order: 20, // Estado normal (después de Agendada)
      isActive: true,
    },
  })

  console.log('✅ Visit statuses seed completed')
  console.log('📊 Created/Updated visit statuses (ordered):', {
    statusContactada, // order: 0 (inicial)
    statusAgendada, // order: 10
    statusCanceladaVisit, // order: 20
    statusCompletadaVisit, // order: 999 (final)
  })

  console.log('\n📈 Balance summary:')
  console.log(`  Cliente 1 (${customer1.name}):`)
  console.log(`    - Proyecto 001: $500k - $500k = $0 (PAGADO)`)
  console.log(`    - Proyecto 002: $400k - $300k = $100k pendiente`)
  console.log(`    - Proyecto 003: $300k - $0 = $300k pendiente`)
  console.log(`    Total pendiente: $400k`)
  console.log(`  Cliente 2 (${customer2.name}):`)
  console.log(`    - Proyecto 004: $800k - $800k = $0 (PAGADO)`)
  console.log(`  Cliente 3 (${customer3.name}):`)
  console.log(`    - Proyecto 005: $600k - $0 = $600k pendiente`)
  console.log(`    - Proyecto 006: $450k - $0 = $450k pendiente`)
  console.log(`    Total pendiente: $1,050k`)

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
