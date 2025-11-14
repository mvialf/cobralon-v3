import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Borrando datos transaccionales...\n')

  // Orden: De relaciones dependientes → hacia arriba

  console.log('Borrando VisitEvent...')
  const visitEvents = await prisma.visitEvent.deleteMany()
  console.log(`✅ ${visitEvents.count} VisitEvent borrados`)

  console.log('Borrando AftersaleEvent...')
  const aftersaleEvents = await prisma.aftersaleEvent.deleteMany()
  console.log(`✅ ${aftersaleEvents.count} AftersaleEvent borrados`)

  console.log('Borrando ProjectEvent...')
  const projectEvents = await prisma.projectEvent.deleteMany()
  console.log(`✅ ${projectEvents.count} ProjectEvent borrados`)

  console.log('Borrando Installment...')
  const installments = await prisma.installment.deleteMany()
  console.log(`✅ ${installments.count} Installment borrados`)

  console.log('Borrando PaymentAllocation...')
  const allocations = await prisma.paymentAllocation.deleteMany()
  console.log(`✅ ${allocations.count} PaymentAllocation borrados`)

  console.log('Borrando Payment...')
  const payments = await prisma.payment.deleteMany()
  console.log(`✅ ${payments.count} Payment borrados`)

  console.log('Borrando Aftersale...')
  const aftersales = await prisma.aftersale.deleteMany()
  console.log(`✅ ${aftersales.count} Aftersale borrados`)

  console.log('Borrando Visit...')
  const visits = await prisma.visit.deleteMany()
  console.log(`✅ ${visits.count} Visit borrados`)

  console.log('Borrando Project...')
  const projects = await prisma.project.deleteMany()
  console.log(`✅ ${projects.count} Project borrados`)

  console.log('Borrando Customer...')
  const customers = await prisma.customer.deleteMany()
  console.log(`✅ ${customers.count} Customer borrados`)

  console.log('Borrando User...')
  const users = await prisma.user.deleteMany()
  console.log(`✅ ${users.count} User borrados`)

  console.log('\n🎉 Datos transaccionales borrados exitosamente!')
  console.log('\n✅ CONSERVADOS (catálogos del sistema):')
  console.log('  - BadgeColor')
  console.log('  - ProjectStatus')
  console.log('  - PaymentMethod')
  console.log('  - AftersaleStatus')
  console.log('  - VisitStatus')
  console.log('  - UninstallTag')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
