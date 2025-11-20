import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const paymentsCount = await prisma.payment.count()
    const installmentsCount = await prisma.installment.count()
    const allocationsCount = await prisma.paymentAllocation.count()

    console.log('\n📊 Registros actuales en tablas de pagos:')
    console.log(`  - Payments: ${paymentsCount}`)
    console.log(`  - Installments: ${installmentsCount}`)
    console.log(`  - PaymentAllocations: ${allocationsCount}`)
    console.log(`  - TOTAL registros: ${paymentsCount + installmentsCount + allocationsCount}\n`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
