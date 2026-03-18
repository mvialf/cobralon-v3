/**
 * OBSOLETO: creditBalance ya no es campo almacenado en Customer.
 * Se calcula en tiempo real desde CreditTransaction (ver getCustomerCreditBalance).
 * Este script no puede ejecutarse — el campo creditBalance fue eliminado del schema.
 *
 * Script de corrección one-time para proyectos con balance negativo (sobrepago)
 *
 * Este script detecta proyectos que tienen balance < 0 (sobrepagos históricos)
 * y genera el crédito correspondiente para los clientes.
 *
 * IMPORTANTE: Solo ejecutar UNA VEZ después de implementar la feature de crédito automático
 *
 * Uso:
 *   npx tsx scripts/fix-overpayment-credit.ts
 *   npx tsx scripts/fix-overpayment-credit.ts --dry-run  (para preview sin cambios)
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

interface ProjectWithOverpayment {
  id: string
  projectNumber: string
  balance: number
  customerId: string
  customerName: string
  paymentAllocations: Array<{
    payment: {
      id: string
      date: Date
      amount: number
    }
  }>
}

async function findProjectsWithOverpayment(): Promise<ProjectWithOverpayment[]> {
  const projects = await prisma.project.findMany({
    where: {
      balance: {
        lt: 0, // Balance negativo = sobrepago
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      paymentAllocations: {
        include: {
          payment: {
            select: {
              id: true,
              date: true,
              amount: true,
            },
          },
        },
        orderBy: {
          payment: {
            date: 'desc',
          },
        },
        take: 1, // Solo el último pago (el que causó el sobrepago)
      },
    },
  })

  return projects.map((p) => ({
    id: p.id,
    projectNumber: p.projectNumber,
    balance: Number(p.balance),
    customerId: p.customer.id,
    customerName: p.customer.name,
    paymentAllocations: p.paymentAllocations.map((alloc) => ({
      payment: {
        id: alloc.payment.id,
        date: alloc.payment.date,
        amount: Number(alloc.payment.amount),
      },
    })),
  }))
}

async function fixOverpayment(project: ProjectWithOverpayment, dryRun: boolean): Promise<void> {
  const overpaymentAmount = Math.abs(project.balance)

  console.log(`\n📌 P-${project.projectNumber} - ${project.customerName}`)
  console.log(`   Balance actual: $${project.balance.toLocaleString('es-CL')}`)
  console.log(`   Sobrepago: $${overpaymentAmount.toLocaleString('es-CL')}`)

  if (dryRun) {
    console.log(
      `   [DRY RUN] Se generaría crédito de $${overpaymentAmount.toLocaleString('es-CL')}`
    )
    return
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Ajustar balance del proyecto a 0
      await tx.project.update({
        where: { id: project.id },
        data: { balance: new Prisma.Decimal(0) },
      })

      // 2. Incrementar crédito del cliente
      // OBSOLETO: creditBalance eliminado del schema
      // await tx.customer.update({
      //   where: { id: project.customerId },
      //   data: { creditBalance: { increment: overpaymentAmount } },
      // })

      // 3. Crear registro de transacción de crédito (retroactivo)
      const lastPayment = project.paymentAllocations[0]?.payment

      await tx.creditTransaction.create({
        data: {
          customerId: project.customerId,
          amount: new Prisma.Decimal(overpaymentAmount),
          type: 'OVERPAYMENT',
          description: `Sobrepago histórico corregido - Proyecto P-${project.projectNumber}`,
          paymentId: lastPayment?.id || null,
          projectId: project.id,
          metadata: {
            originalBalance: project.balance,
            overpaymentAmount,
            correctionDate: new Date().toISOString(),
            note: 'Corrección retroactiva - Script fix-overpayment-credit.ts',
          },
        },
      })

      console.log(`   ✅ Crédito generado: $${overpaymentAmount.toLocaleString('es-CL')}`)
      console.log(`   ✅ Balance ajustado: $0`)
    })
  } catch (error) {
    console.error(`   ❌ ERROR al procesar proyecto:`, error)
    throw error
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('═══════════════════════════════════════════════════════════')
  console.log('🔧 Script de Corrección: Sobrepagos → Crédito de Cliente')
  console.log('═══════════════════════════════════════════════════════════')

  if (dryRun) {
    console.log('\n⚠️  MODO DRY RUN - No se realizarán cambios en la BD\n')
  } else {
    console.log('\n🚨 MODO EJECUCIÓN - Los cambios se aplicarán a la BD\n')
  }

  // 1. Buscar proyectos con sobrepago
  console.log('🔍 Buscando proyectos con balance negativo...\n')
  const projects = await findProjectsWithOverpayment()

  if (projects.length === 0) {
    console.log('✅ No se encontraron proyectos con sobrepago.')
    console.log('   Todos los balances son >= 0')
    return
  }

  console.log(`📊 Encontrados: ${projects.length} proyectos con sobrepago\n`)

  // Calcular total de crédito a generar
  const totalCredit = projects.reduce((sum, p) => sum + Math.abs(p.balance), 0)
  console.log(`💰 Crédito total a generar: $${totalCredit.toLocaleString('es-CL')}\n`)

  // 2. Procesar cada proyecto
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i]
    console.log(`\n[${i + 1}/${projects.length}]`)
    await fixOverpayment(project, dryRun)
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  if (dryRun) {
    console.log('✅ Preview completado')
    console.log('   Ejecuta sin --dry-run para aplicar cambios')
  } else {
    console.log('✅ Corrección completada')
    console.log(`   ${projects.length} proyectos corregidos`)
    console.log(`   $${totalCredit.toLocaleString('es-CL')} en crédito generado`)
  }
  console.log('═══════════════════════════════════════════════════════════\n')
}

main()
  .catch((error) => {
    console.error('\n❌ ERROR CRÍTICO:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
