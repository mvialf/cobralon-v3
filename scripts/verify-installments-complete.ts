import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyComplete() {
  try {
    console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE CUOTAS\n')

    // Contar pagos y cuotas
    const totalPayments = await prisma.payment.count()
    const paymentsWithInstallments = await prisma.payment.count({
      where: {
        selectedInstallments: {
          not: null,
          gt: 0,
        },
      },
    })
    const totalInstallments = await prisma.installment.count()

    console.log('📊 RESUMEN GENERAL:\n')
    console.log(`Total de pagos: ${totalPayments}`)
    console.log(`Pagos con cuotas: ${paymentsWithInstallments}`)
    console.log(`Total de cuotas individuales: ${totalInstallments}`)
    console.log('')

    // Estadísticas de cuotas
    const installmentsByStatus = await prisma.installment.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    console.log('📈 CUOTAS POR ESTADO:\n')
    for (const group of installmentsByStatus) {
      console.log(`${group.status}: ${group._count.status} cuotas`)
    }

    // Verificar que cada pago tenga las cuotas correctas
    console.log('\n🔍 VERIFICACIÓN DE INTEGRIDAD:\n')

    const paymentsWithInstallmentsData = await prisma.payment.findMany({
      where: {
        selectedInstallments: {
          not: null,
          gt: 0,
        },
      },
      include: {
        installments: true,
        customer: {
          select: { name: true },
        },
      },
    })

    let allCorrect = true
    for (const payment of paymentsWithInstallmentsData) {
      const expected = payment.selectedInstallments || 0
      const actual = payment.installments.length

      if (expected !== actual) {
        console.log(
          `⚠️  ${payment.customer.name}: esperado ${expected} cuotas, encontrado ${actual}`
        )
        allCorrect = false
      }
    }

    if (allCorrect) {
      console.log('✅ Todos los pagos tienen el número correcto de cuotas')
    }

    // Verificar montos
    console.log('\n💰 VERIFICACIÓN DE MONTOS:\n')

    let amountCorrect = true
    for (const payment of paymentsWithInstallmentsData) {
      const paymentAmount = parseFloat(payment.amount.toString())
      const installmentsSum = payment.installments.reduce(
        (sum, inst) => sum + parseFloat(inst.amount.toString()),
        0
      )

      const difference = Math.abs(paymentAmount - installmentsSum)

      if (difference > 0.01) {
        // Tolerancia de 1 centavo por redondeo
        console.log(
          `⚠️  ${payment.customer.name}: Pago $${paymentAmount.toLocaleString('es-CL')}, Cuotas suman $${installmentsSum.toLocaleString('es-CL')} (diff: $${difference.toFixed(2)})`
        )
        amountCorrect = false
      }
    }

    if (amountCorrect) {
      console.log('✅ La suma de cuotas coincide con el monto del pago (tolerancia de redondeo)')
    }

    // Mostrar ejemplo de un pago completo
    console.log('\n📝 EJEMPLO: Pago con cuotas completo\n')

    const examplePayment = await prisma.payment.findFirst({
      where: {
        selectedInstallments: {
          gt: 0,
        },
      },
      include: {
        customer: {
          select: { name: true },
        },
        paymentMethod: {
          select: { name: true },
        },
        installments: {
          orderBy: {
            installmentNumber: 'asc',
          },
        },
      },
    })

    if (examplePayment) {
      console.log(`Cliente: ${examplePayment.customer.name}`)
      console.log(
        `Monto total: $${parseFloat(examplePayment.amount.toString()).toLocaleString('es-CL')} ${examplePayment.currency}`
      )
      console.log(`Método: ${examplePayment.paymentMethod.name}`)
      console.log(`Número de cuotas: ${examplePayment.selectedInstallments}`)
      console.log(`\nDetalle de cuotas:`)

      for (const inst of examplePayment.installments) {
        console.log(
          `  Cuota ${inst.installmentNumber}/${examplePayment.selectedInstallments}: $${parseFloat(inst.amount.toString()).toLocaleString('es-CL')} - Vence: ${inst.dueDate.toLocaleDateString('es-CL')} - ${inst.status.toUpperCase()}`
        )
      }
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyComplete()
