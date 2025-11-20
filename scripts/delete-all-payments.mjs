import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('\n🔍 Verificando registros antes del borrado...')
    const beforePayments = await prisma.payment.count()
    const beforeInstallments = await prisma.installment.count()
    const beforeAllocations = await prisma.paymentAllocation.count()

    console.log(`  - Payments: ${beforePayments}`)
    console.log(`  - Installments: ${beforeInstallments}`)
    console.log(`  - PaymentAllocations: ${beforeAllocations}`)

    if (beforePayments === 0) {
      console.log('\n✅ No hay pagos para borrar.')
      return
    }

    console.log('\n🗑️  Borrando todos los pagos...')

    // Debido a onDelete: Cascade, esto también borrará Installments y PaymentAllocations
    const result = await prisma.payment.deleteMany({})

    console.log(`✅ Se borraron ${result.count} pagos`)

    // Verificar que todo se borró
    console.log('\n🔍 Verificando registros después del borrado...')
    const afterPayments = await prisma.payment.count()
    const afterInstallments = await prisma.installment.count()
    const afterAllocations = await prisma.paymentAllocation.count()

    console.log(`  - Payments: ${afterPayments}`)
    console.log(`  - Installments: ${afterInstallments}`)
    console.log(`  - PaymentAllocations: ${afterAllocations}`)

    if (afterPayments === 0 && afterInstallments === 0 && afterAllocations === 0) {
      console.log('\n✅ Todos los registros de pagos fueron borrados exitosamente.')
    } else {
      console.log('\n⚠️  Advertencia: Algunos registros podrían no haberse borrado.')
    }

  } catch (error) {
    console.error('\n❌ Error al borrar pagos:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
