import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteDuplicates() {
  try {
    console.log('🗑️  ELIMINACIÓN DE PAGOS DUPLICADOS\n')

    // IDs de los duplicados a eliminar (el segundo de cada grupo)
    const duplicateIds = [
      'fa56d1a3-6224-49e5-9d22-73f90a914d78', // Sr. Patricio Vial - $690,200
      'b9cdd313-d64d-4254-8047-5b680aeffc56', // Sr. Alejandro Sepúlveda - $1,332,800
    ]

    console.log('📋 Pagos duplicados a eliminar:\n')
    for (const id of duplicateIds) {
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          customer: { select: { name: true } },
          paymentMethod: { select: { name: true } },
        },
      })

      if (payment) {
        console.log(`- ID: ${id}`)
        console.log(`  Cliente: ${payment.customer.name}`)
        console.log(`  Monto: $${Number(payment.amount).toLocaleString('es-CL')} ${payment.currency}`)
        console.log(`  Cuotas: ${payment.selectedInstallments}`)
        console.log('')
      }
    }

    console.log('⚠️  ¿Deseas continuar con la eliminación? (comentar línea 41 para confirmar)\n')
    // return // ← Comentar esta línea para ejecutar la eliminación

    console.log('🚀 FASE 1: Eliminando allocations...\n')

    // Primero eliminar PaymentAllocations asociados
    for (const paymentId of duplicateIds) {
      const result = await prisma.paymentAllocation.deleteMany({
        where: { paymentId },
      })
      console.log(`✅ Allocations eliminados para pago ${paymentId}: ${result.count}`)
    }

    console.log('\n🚀 FASE 2: Eliminando pagos...\n')

    // Luego eliminar los pagos
    for (const id of duplicateIds) {
      await prisma.payment.delete({
        where: { id },
      })
      console.log(`✅ Pago eliminado: ${id}`)
    }

    console.log('\n✅ ELIMINACIÓN COMPLETADA\n')

    // Verificar resultado
    const totalPayments = await prisma.payment.count()
    const totalAllocations = await prisma.paymentAllocation.count()

    console.log('📊 RESULTADO FINAL:\n')
    console.log(`Pagos totales: ${totalPayments} (esperado: 100)`)
    console.log(`Allocations totales: ${totalAllocations} (esperado: 100)`)

    if (totalPayments === 100 && totalAllocations === 100) {
      console.log('\n✅ Duplicados eliminados exitosamente. Base de datos consistente.')
    } else {
      console.log('\n⚠️  Revisa los totales - pueden no coincidir con lo esperado.')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteDuplicates()
