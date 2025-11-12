import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function populateInstallments() {
  try {
    console.log('🚀 POBLANDO TABLA INSTALLMENTS\n')

    // Obtener todos los pagos con cuotas
    const paymentsWithInstallments = await prisma.payment.findMany({
      where: {
        selectedInstallments: {
          not: null,
          gt: 0,
        },
      },
      include: {
        customer: {
          select: { name: true },
        },
      },
    })

    console.log(`Total de pagos con cuotas: ${paymentsWithInstallments.length}\n`)

    const installmentsToCreate: Array<{
      paymentId: string
      installmentNumber: number
      amount: number
      dueDate: Date
      status: string
      paidDate: Date | null
    }> = []

    for (const payment of paymentsWithInstallments) {
      const numberOfInstallments = payment.selectedInstallments || 0
      const amountPerInstallment = parseFloat(payment.amount.toString()) / numberOfInstallments

      console.log(`Procesando pago ${payment.id}:`)
      console.log(`  Cliente: ${payment.customer.name}`)
      console.log(
        `  Monto total: $${parseFloat(payment.amount.toString()).toLocaleString('es-CL')}`
      )
      console.log(`  Cuotas: ${numberOfInstallments}`)
      console.log(`  Monto por cuota: $${amountPerInstallment.toLocaleString('es-CL')}`)

      // Crear cuotas mensuales
      for (let i = 1; i <= numberOfInstallments; i++) {
        const dueDate = new Date(payment.date)
        dueDate.setMonth(dueDate.getMonth() + i) // Vencimiento mensual

        const today = new Date()
        const isPast = dueDate < today

        installmentsToCreate.push({
          paymentId: payment.id,
          installmentNumber: i,
          amount: amountPerInstallment,
          dueDate: dueDate,
          status: isPast ? 'paid' : 'pending', // Cuotas pasadas = paid
          paidDate: isPast ? dueDate : null, // Si ya venció, asumimos que se pagó en fecha
        })

        console.log(
          `    Cuota ${i}/${numberOfInstallments}: vence ${dueDate.toLocaleDateString('es-CL')} - ${isPast ? 'PAGADA' : 'PENDIENTE'}`
        )
      }
      console.log('')
    }

    console.log(`\n📊 RESUMEN:\n`)
    console.log(`Total de cuotas a crear: ${installmentsToCreate.length}`)

    const byStatus = installmentsToCreate.reduce(
      (acc, inst) => {
        acc[inst.status] = (acc[inst.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    console.log(`Cuotas pagadas: ${byStatus.paid || 0}`)
    console.log(`Cuotas pendientes: ${byStatus.pending || 0}`)

    console.log('\n⚠️  ¿Deseas continuar con la creación? (comentar línea 83 para confirmar)\n')
    // return // ← Comentar esta línea para ejecutar

    console.log('🚀 Insertando cuotas en la base de datos...\n')

    // Insertar en batch
    await prisma.installment.createMany({
      data: installmentsToCreate,
    })

    console.log(`✅ ${installmentsToCreate.length} cuotas insertadas exitosamente\n`)

    // Verificación final
    const totalInstallments = await prisma.installment.count()
    console.log(`📈 Total de cuotas en DB: ${totalInstallments}`)

    // Mostrar primeras 3 cuotas como ejemplo
    console.log('\n📝 Primeras 3 cuotas creadas:\n')
    const sampleInstallments = await prisma.installment.findMany({
      take: 3,
      include: {
        payment: {
          include: {
            customer: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    })

    for (const inst of sampleInstallments) {
      console.log(`Cuota ${inst.installmentNumber}:`)
      console.log(`  Cliente: ${inst.payment.customer.name}`)
      console.log(`  Monto: $${parseFloat(inst.amount.toString()).toLocaleString('es-CL')}`)
      console.log(`  Vencimiento: ${inst.dueDate.toLocaleDateString('es-CL')}`)
      console.log(`  Estado: ${inst.status}`)
      console.log('')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

populateInstallments()
