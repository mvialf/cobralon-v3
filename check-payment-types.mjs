import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Obtener TODOS los pagos con su tipo y número de allocations
    const payments = await prisma.payment.findMany({
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        customer: {
          select: { name: true },
        },
        _count: {
          select: { allocations: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    console.log(`\n📊 Total de pagos: ${payments.length}\n`)

    // Agrupar por tipo
    const byType = payments.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1
      return acc
    }, {})

    console.log('📈 Distribución por tipo:')
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} pagos`)
    })

    console.log('\n📋 Detalle de pagos:\n')
    payments.forEach((p) => {
      const allocCount = p._count.allocations
      const expectedType = allocCount === 1 ? 'Project' : 'Customer'
      const isCorrect = p.type === expectedType ? '✅' : '❌'

      console.log(
        `${isCorrect} ${p.customer.name.padEnd(20)} | type: ${p.type.padEnd(8)} | allocations: ${allocCount} | expected: ${expectedType}`
      )
    })
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
