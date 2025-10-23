import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Actualizar pagos existentes basándose en número de allocations
    const result = await prisma.$executeRaw`
      UPDATE "Payment" p
      SET type = CASE
        WHEN (
          SELECT COUNT(*)
          FROM "PaymentAllocation" pa
          WHERE pa."paymentId" = p.id
        ) = 1 THEN 'Project'
        ELSE 'Customer'
      END
    `

    console.log(`✅ Actualizados ${result} pagos correctamente`)

    // Verificar resultado
    const payments = await prisma.payment.findMany({
      select: {
        id: true,
        type: true,
        _count: {
          select: { allocations: true }
        }
      },
      take: 10
    })

    console.log('\n📋 Muestra de pagos actualizados:')
    payments.forEach(p => {
      console.log(`  - ID: ${p.id.slice(0, 8)}... | type: ${p.type} | allocations: ${p._count.allocations}`)
    })
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
