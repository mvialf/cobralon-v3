import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  try {
    // Contar registros
    const paymentCount = await prisma.payment.count()
    const allocationCount = await prisma.paymentAllocation.count()

    console.log('📊 RESUMEN DE IMPORTACIÓN\n')
    console.log(`✅ Pagos totales: ${paymentCount}`)
    console.log(`✅ Allocations totales: ${allocationCount}`)

    // Obtener ejemplos con relaciones
    console.log('\n📝 PRIMEROS 3 PAGOS CON RELACIONES:\n')
    const payments = await prisma.payment.findMany({
      take: 3,
      include: {
        customer: {
          select: { name: true, phone: true },
        },
        paymentMethod: {
          select: { name: true },
        },
        allocations: {
          include: {
            project: {
              select: { projectNumber: true, projectName: true },
            },
          },
        },
      },
    })

    let index = 1
    for (const payment of payments) {
      console.log(`${index}. Pago ID: ${payment.id}`)
      console.log(
        `   Monto: $${Number(payment.amount).toLocaleString('es-CL')} ${payment.currency}`
      )
      console.log(`   Cliente: ${payment.customer.name} (${payment.customer.phone})`)
      console.log(`   Método: ${payment.paymentMethod.name}`)
      console.log(`   Tipo: ${payment.type}`)
      console.log(`   Fecha: ${payment.date.toLocaleDateString('es-CL')}`)

      if (payment.allocations.length > 0) {
        console.log(`   Asignado a proyectos:`)
        for (const alloc of payment.allocations) {
          console.log(
            `     - ${alloc.project.projectNumber}: ${alloc.project.projectName || 'Sin nombre'} ($${Number(alloc.allocatedAmount).toLocaleString('es-CL')})`
          )
        }
      }
      console.log('')
      index++
    }

    // Estadísticas
    console.log('📈 ESTADÍSTICAS:\n')

    const totalAmount = await prisma.payment.aggregate({
      _sum: { amount: true },
    })

    const paymentsByType = await prisma.payment.groupBy({
      by: ['type'],
      _count: { type: true },
    })

    const paymentsByMethod = await prisma.payment.groupBy({
      by: ['paymentMethodId'],
      _count: { paymentMethodId: true },
    })

    console.log(
      `Monto total: $${totalAmount._sum.amount ? Number(totalAmount._sum.amount).toLocaleString('es-CL') : 0} CLP`
    )
    console.log('\nPagos por tipo:')
    for (const item of paymentsByType) {
      console.log(`  ${item.type}: ${item._count.type}`)
    }

    console.log('\nPagos por método:')
    for (const item of paymentsByMethod) {
      const method = await prisma.paymentMethod.findUnique({
        where: { id: item.paymentMethodId },
        select: { name: true },
      })
      console.log(`  ${method?.name}: ${item._count.paymentMethodId}`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verify()
