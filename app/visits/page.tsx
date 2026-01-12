import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { prisma } from '@/lib/db'
import { VisitsPageClient } from './page-client'

/**
 * Obtiene datos iniciales de visitas para SSR
 * El queryKey DEBE coincidir exactamente con useVisits hook
 */
async function getInitialVisits() {
  const limit = 50
  const page = 1

  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      take: limit,
      skip: 0,
      orderBy: { date: 'desc' },
      include: {
        visitStatus: true,
      },
    }),
    prisma.visit.count(),
  ])

  return {
    data: visits,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Obtiene estados de visita para el filtro
 * El queryKey DEBE coincidir exactamente con la query en el cliente
 */
async function getVisitStatuses() {
  const statuses = await prisma.visitStatus.findMany({
    orderBy: { name: 'asc' },
  })
  return statuses
}

/**
 * Server Component para /visits
 *
 * Pre-carga en paralelo:
 * - Primera página de visitas
 * - Estados de visita (para filtros)
 *
 * Elimina el "Cargando..." en la primera visita.
 */
export default async function VisitsPage() {
  const queryClient = new QueryClient()

  // Prefetch ambas queries en paralelo
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['visits', { page: 1, limit: 50 }],
      queryFn: getInitialVisits,
    }),
    queryClient.prefetchQuery({
      queryKey: ['visit-statuses'],
      queryFn: getVisitStatuses,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <VisitsPageClient />
    </HydrationBoundary>
  )
}
