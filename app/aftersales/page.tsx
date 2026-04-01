export const dynamic = 'force-dynamic'

import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { prisma } from '@/lib/db'
import { serialize } from '@/lib/utils/serialize'
import { AftersalesPageClient } from './page-client'

/**
 * Obtiene aftersales para pre-hidratar en SSR.
 * IMPORTANTE: La estructura debe coincidir exactamente con useAftersales().
 */
async function getInitialAftersales() {
  const aftersales = await prisma.aftersale.findMany({
    relationLoadStrategy: 'join',
    orderBy: { reportedAt: 'desc' },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          customer: { select: { name: true } },
        },
      },
      aftersaleStatus: {
        select: {
          id: true,
          name: true,
          color: { select: { bgClass: true, textClass: true } },
        },
      },
    },
  })
  return serialize({ aftersales })
}

/**
 * Obtiene statuses para pre-hidratar en SSR.
 * IMPORTANTE: La estructura debe coincidir con la query inline del client.
 */
async function getAftersaleStatuses() {
  const statuses = await prisma.aftersaleStatus.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    include: {
      color: { select: { bgClass: true, textClass: true } },
    },
  })
  return serialize({ aftersaleStatuses: statuses })
}

/**
 * Server Component para Aftersales.
 *
 * Pre-carga datos en SSR usando React Query Hydration para eliminar
 * el estado de "Cargando..." inicial y mejorar performance/SEO.
 *
 * Query keys prefetcheadas:
 * - ['aftersales'] → Lista de casos de postventa
 * - ['aftersale-statuses'] → Estados disponibles para filtros
 */
export default async function AftersalesPage() {
  const queryClient = new QueryClient()

  // Prefetch en paralelo para máxima eficiencia
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['aftersales'],
      queryFn: getInitialAftersales,
    }),
    queryClient.prefetchQuery({
      queryKey: ['aftersale-statuses'],
      queryFn: getAftersaleStatuses,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AftersalesPageClient />
    </HydrationBoundary>
  )
}
