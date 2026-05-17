export const dynamic = 'force-dynamic'

import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { prisma } from '@/lib/db'
import { serialize } from '@/lib/utils/serialize'
import { buildPaginationResponse } from '@/lib/utils/pagination'
import { countProjects, queryProjectList } from '@/lib/queries/project-list'
import type { ProjectListFilters } from '@/types/project-list'
import { ProjectsPageClient } from './page-client'

/**
 * Obtiene datos iniciales de proyectos para SSR
 * El queryKey DEBE coincidir exactamente con useProjects hook
 *
 * NOTA: Filtramos por projectState='Activo' (default del cliente)
 * para que la hidratación funcione correctamente.
 */
async function getInitialProjects() {
  const limit = 50
  const page = 1

  const filters: ProjectListFilters = {
    page,
    limit,
    search: '',
    customerId: '',
    statusIds: [],
    filterByNullStatus: false,
    actualStatusIds: [],
    projectState: 'Activo',
  }

  const [projects, total] = await Promise.all([queryProjectList(filters), countProjects(filters)])

  return serialize({
    projects,
    pagination: buildPaginationResponse(page, limit, total),
  })
}

/**
 * Obtiene estados de proyecto para el filtro
 * El queryKey DEBE coincidir exactamente con useProjectStatuses hook
 */
async function getProjectStatuses() {
  const statuses = await prisma.projectStatus.findMany({
    orderBy: { order: 'asc' },
    include: {
      color: {
        select: {
          id: true,
          bgClass: true,
          textClass: true,
        },
      },
    },
  })
  return serialize(statuses)
}

/**
 * Server Component para /projects
 *
 * Pre-carga en paralelo:
 * - Primera página de proyectos activos (filtro por defecto)
 * - Estados de proyecto (para filtros)
 *
 * Elimina el "Cargando..." en la primera visita.
 */
export default async function ProjectsPage() {
  const queryClient = new QueryClient()

  // Prefetch ambas queries en paralelo
  await Promise.all([
    queryClient.prefetchQuery({
      // QueryKey debe coincidir con los defaults del cliente
      queryKey: ['projects', { page: 1, limit: 50, projectState: 'Activo' }],
      queryFn: getInitialProjects,
    }),
    queryClient.prefetchQuery({
      queryKey: ['project-statuses'],
      queryFn: getProjectStatuses,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsPageClient />
    </HydrationBoundary>
  )
}
