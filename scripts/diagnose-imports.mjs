import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n=== ESTADOS DE PROYECTO ===')
  const statuses = await prisma.projectStatus.findMany({
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      isFinal: true,
      isActive: true,
    },
  })

  console.table(statuses)

  console.log('\n=== ÚLTIMOS 10 PROYECTOS CREADOS (CON BALANCE) ===')
  const recentProjects = await prisma.project.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      projectNumber: true,
      total: true,
      customer: { select: { name: true } },
      projectStatus: {
        select: {
          name: true,
          isFinal: true,
        },
      },
      paymentAllocations: {
        select: {
          allocatedAmount: true,
        },
      },
      createdAt: true,
    },
  })

  console.table(
    recentProjects.map((p) => {
      const totalPaid = p.paymentAllocations.reduce(
        (sum, alloc) => sum + Number(alloc.allocatedAmount),
        0
      )
      const balance = Number(p.total) - totalPaid

      return {
        projectNumber: p.projectNumber,
        customer: p.customer.name,
        status: p.projectStatus?.name || 'SIN ESTADO',
        isFinal: p.projectStatus?.isFinal ?? null,
        total: Number(p.total),
        totalPaid,
        balance,
        createdAt: p.createdAt.toISOString().split('T')[0],
      }
    })
  )

  console.log('\n=== CONTEO POR ESTADO ===')
  const counts = await prisma.project.groupBy({
    by: ['projectStatusId'],
    _count: true,
  })

  for (const count of counts) {
    const status = statuses.find((s) => s.id === count.projectStatusId)
    console.log(
      `${status?.name || 'SIN ESTADO'} (isFinal: ${status?.isFinal ?? 'N/A'}): ${count._count} proyectos`
    )
  }

  await prisma.$disconnect()
}

main().catch(console.error)
