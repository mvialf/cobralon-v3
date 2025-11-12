import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDuplicates() {
  try {
    console.log('🔍 VERIFICACIÓN DE PAGOS DUPLICADOS\n')

    // Obtener todos los pagos
    const allPayments = await prisma.payment.findMany({
      include: {
        customer: {
          select: { name: true },
        },
        paymentMethod: {
          select: { name: true },
        },
      },
    })

    console.log(`Total de pagos: ${allPayments.length}\n`)

    // Buscar duplicados por monto + fecha + customerId
    const duplicates = new Map<string, typeof allPayments>()

    for (const payment of allPayments) {
      const key = `${payment.amount}-${payment.date.toISOString()}-${payment.customerId}`
      const existing = duplicates.get(key) || []
      existing.push(payment)
      duplicates.set(key, existing)
    }

    // Filtrar solo los que tienen más de 1 pago
    const actualDuplicates = Array.from(duplicates.entries()).filter(
      ([, payments]) => payments.length > 1
    )

    if (actualDuplicates.length === 0) {
      console.log('✅ No se encontraron duplicados')
    } else {
      console.log(`⚠️  Se encontraron ${actualDuplicates.length} grupos de pagos duplicados:\n`)

      for (const [key, payments] of actualDuplicates) {
        console.log(`Grupo duplicado (${payments.length} pagos):`)
        console.log(
          `  Monto: $${Number(payments[0].amount).toLocaleString('es-CL')} ${payments[0].currency}`
        )
        console.log(`  Fecha: ${payments[0].date.toLocaleDateString('es-CL')}`)
        console.log(`  Cliente: ${payments[0].customer.name}`)
        console.log(`  Método: ${payments[0].paymentMethod.name}`)
        console.log(`  Cuotas: ${payments[0].selectedInstallments || 0}`)
        console.log(`  IDs:`)
        for (const payment of payments) {
          console.log(`    - ${payment.id}`)
        }
        console.log('')
      }

      console.log('💡 POSIBLE CAUSA:\n')
      console.log('Es probable que el script de importación se haya ejecutado más de una vez.')
      console.log(
        'Deberías eliminar los pagos duplicados para mantener la integridad de los datos.'
      )
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDuplicates()
