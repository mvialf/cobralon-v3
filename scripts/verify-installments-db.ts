import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyInstallments() {
  try {
    console.log('🔍 VERIFICACIÓN DE CUOTAS EN BASE DE DATOS\n')

    // Obtener pagos con cuotas
    const paymentsWithInstallments = await prisma.payment.findMany({
      where: {
        selectedInstallments: {
          not: null,
          gt: 0,
        },
      },
      include: {
        paymentMethod: {
          select: { name: true },
        },
        customer: {
          select: { name: true },
        },
      },
      orderBy: {
        selectedInstallments: 'asc',
      },
    })

    console.log(`Total de pagos con cuotas en DB: ${paymentsWithInstallments.length}\n`)

    // Agrupar por número de cuotas
    const byInstallments = new Map<number, number>()
    for (const payment of paymentsWithInstallments) {
      const installments = payment.selectedInstallments || 0
      const count = byInstallments.get(installments) || 0
      byInstallments.set(installments, count + 1)
    }

    console.log('📈 DISTRIBUCIÓN POR NÚMERO DE CUOTAS:\n')
    const sortedInstallments = Array.from(byInstallments.entries()).sort((a, b) => a[0] - b[0])
    for (const [installments, count] of sortedInstallments) {
      console.log(`${installments} cuota(s): ${count} pago(s)`)
    }

    console.log('\n📝 DETALLE DE PAGOS CON CUOTAS:\n')
    for (const payment of paymentsWithInstallments) {
      console.log(`Pago ID: ${payment.id}`)
      console.log(`  Cuotas: ${payment.selectedInstallments}`)
      console.log(`  Monto: $${Number(payment.amount).toLocaleString('es-CL')} ${payment.currency}`)
      console.log(`  Método: ${payment.paymentMethod.name}`)
      console.log(`  Cliente: ${payment.customer.name}`)
      console.log(`  Fecha: ${payment.date.toLocaleDateString('es-CL')}`)
      console.log('')
    }

    // Verificar si todos son tarjeta de crédito
    console.log('🔍 VERIFICACIÓN DE MÉTODO DE PAGO:\n')
    const notCreditCard = paymentsWithInstallments.filter(
      (p) => !p.paymentMethod.name.toLowerCase().includes('tarjeta')
    )

    if (notCreditCard.length === 0) {
      console.log('✅ Todos los pagos con cuotas son tarjeta de crédito')
    } else {
      console.log(`⚠️  Hay ${notCreditCard.length} pago(s) con cuotas que NO son tarjeta de crédito:`)
      for (const payment of notCreditCard) {
        console.log(`  - ${payment.id}: ${payment.paymentMethod.name}`)
      }
    }

    // Comparar con el archivo
    console.log('\n📊 COMPARACIÓN CON ARCHIVO ORIGINAL:\n')
    console.log('Esperado (payment.txt): 10 pagos con cuotas (9 con 6 cuotas, 1 con 3 cuotas)')
    console.log(`Encontrado (DB): ${paymentsWithInstallments.length} pagos con cuotas`)

    if (paymentsWithInstallments.length === 10) {
      console.log('✅ Coincide con el archivo original')
    } else {
      console.log('⚠️  No coincide con el archivo original')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyInstallments()
