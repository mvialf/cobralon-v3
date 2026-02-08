import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { prisma } from '@/lib/db'
import { serialize } from '@/lib/utils/serialize'
import { getActiveProjectsWhere } from '@/lib/business-logic/project-state'
import { derivePaymentProgress } from '@/lib/business-logic/project-balance'
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

  // Filtrar proyectos activos usando función centralizada (lib/business-logic/project-state.ts)
  // Definición canónica: isFinal=false OR projectStatus=null OR balance>0
  const activeWhere = getActiveProjectsWhere()

  const [rawProjects, total] = await Promise.all([
    prisma.project.findMany({
      take: limit,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      where: activeWhere,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        projectStatus: {
          select: {
            id: true,
            name: true,
            isFinal: true,
            color: {
              select: {
                id: true,
                bgClass: true,
              },
            },
          },
        },
      },
    }),
    prisma.project.count({
      where: activeWhere,
    }),
  ])

  // Agregar campos calculados (igual que transformRawToProjectListItem)
  const projects = rawProjects.map((p) => {
    const { totalPaid, percentPaid } = derivePaymentProgress(Number(p.total), Number(p.balance))
    return {
      ...p,
      totalPaid,
      percentPaid,
    }
  })

  return serialize({
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
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
