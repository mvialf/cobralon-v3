import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { prisma } from '@/lib/db'
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

  // Filtrar proyectos activos (mismo criterio que el cliente)
  // Un proyecto está "Activo" si:
  // - projectStatus.isFinal = false, O
  // - balance > 0 (tiene deuda pendiente)
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      take: limit,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      where: {
        OR: [
          { projectStatus: { isFinal: false } },
          { projectStatus: null },
          { balance: { gt: 0 } },
        ],
      },
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
      where: {
        OR: [
          { projectStatus: { isFinal: false } },
          { projectStatus: null },
          { balance: { gt: 0 } },
        ],
      },
    }),
  ])

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
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
  return statuses
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
