import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { withLogging } from '@/lib/logger-middleware'
import { z } from 'zod'
import {
  queryProjectList,
  countProjects,
  getStatusFacets,
  getStateFacets,
} from '@/lib/queries/project-list'
import { calculateProjectTotal } from '@/lib/business-logic/totals'
import { FINANCIAL } from '@/lib/constants/financial-constants'
import type { ProjectListFilters } from '@/types/project-list'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createProjectApiSchema,
  projectStateValues,
  type CreateProjectApiBody,
} from '@/lib/validations/project-validations'

const projectStateSchema = projectStateValues.default('Activo')

/**
 * GET /api/projects
 *
 * Obtiene lista de proyectos con paginación en base de datos
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - search: buscar por nombre de proyecto, número o cliente (normalizado, sin acentos)
 *   - customerId: filtrar por cliente específico
 *   - statusIds: IDs de status separados por coma (o "null" para sin estado)
 *   - projectState: "Activo" (default), "Finalizado", "all"
 *       - "Activo": Proyectos no finalizados (status.isFinal = false OR balance > 0)
 *       - "Finalizado": Proyectos finalizados (status.isFinal = true AND balance = 0)
 *       - "all": Todos los proyectos
 *
 * Response incluye:
 *   - projects: array de proyectos paginados
 *   - pagination: { page, limit, total, totalPages }
 *   - facets: { projectStatus: [...], projectState: [...] } - Conteos para filtros
 *
 * Optimizaciones:
 *   - Paginación en base de datos (LIMIT/OFFSET)
 *   - Búsqueda normalizada con extensión unaccent de PostgreSQL
 *   - Índices GIN con pg_trgm para búsqueda eficiente
 *   - Queries paralelas para conteo y facets
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const { page, limit } = parsePaginationParams(searchParams)
  const search = searchParams.get('search') || ''
  const customerId = searchParams.get('customerId') || ''

  // Parsear statusIds (puede ser múltiple, separado por comas)
  const statusIdsRaw = searchParams.get('statusIds') || ''
  const statusIds = statusIdsRaw ? statusIdsRaw.split(',').filter(Boolean) : []
  const filterByNullStatus = statusIds.includes('null')
  const actualStatusIds = statusIds.filter((id) => id !== 'null')

  // Validar y parsear projectState con Zod
  const projectStateResult = projectStateSchema.safeParse(searchParams.get('projectState'))
  if (!projectStateResult.success) {
    logger.warn(
      { invalidValue: searchParams.get('projectState') },
      'Invalid projectState parameter'
    )
    return NextResponse.json(
      { error: 'projectState debe ser "Activo", "Finalizado" o "all"' },
      { status: 400 }
    )
  }
  const projectState = projectStateResult.data

  // Sorting params con validación Zod
  const sortBySchema = z.enum(['createdAt', 'date', 'total', 'balance', 'projectNumber']).optional()
  const sortOrderSchema = z.enum(['asc', 'desc']).optional()
  const sortBy = sortBySchema.safeParse(searchParams.get('sortBy') || undefined).data
  const sortOrder = sortOrderSchema.safeParse(searchParams.get('sortOrder') || undefined).data

  logger.debug(
    {
      page,
      limit,
      filters: {
        search: search || undefined,
        customerId: customerId || undefined,
        statusIds: statusIds.length > 0 ? statusIds : undefined,
        projectState,
      },
    },
    'Fetching projects with DB-level pagination'
  )

  try {
    // Construir filtros
    const filters: ProjectListFilters = {
      page,
      limit,
      search,
      customerId,
      statusIds,
      filterByNullStatus,
      actualStatusIds,
      projectState,
      sortBy,
      sortOrder,
    }

    // Ejecutar queries en paralelo para mejor performance
    const [projects, total, statusFacetsRaw, stateFacetsRaw] = await Promise.all([
      queryProjectList(filters),
      countProjects(filters),
      getStatusFacets({
        search,
        customerId,
        projectState,
      }),
      getStateFacets({
        search,
        customerId,
        statusIds,
        filterByNullStatus,
        actualStatusIds,
      }),
    ])

    const pagination = buildPaginationResponse(page, limit, total)

    // Formatear facets para respuesta
    const facets = {
      projectStatus: statusFacetsRaw,
      projectState: stateFacetsRaw,
    }

    logger.info(
      {
        ...pagination,
        projectState,
        returnedCount: projects.length,
        facets: {
          statusCount: facets.projectStatus.length,
          stateCount: facets.projectState.length,
        },
      },
      'Projects fetched with DB-level pagination'
    )

    return NextResponse.json({
      projects,
      pagination,
      facets,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching projects')
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 })
  }
})

/**
 * POST /api/projects
 *
 * Crea un nuevo proyecto
 *
 * Body validado con createProjectApiSchema:
 *   - customerId, projectNumber, phone, street, comuna, region (requeridos)
 *   - projectName, projectStatusId, description (opcionales)
 *   - date: ISO date string (coerced a Date)
 *   - subtotal: number positivo (requerido)
 *   - taxRate: number 0-100 (default: 19)
 *   - totalAmount: ignorado, recalculado en servidor
 */
export const POST = withApiHandler<CreateProjectApiBody>(
  async (_request, logger, { body }) => {
    const {
      customerId,
      projectNumber,
      projectName,
      phone,
      street,
      apartment,
      comuna,
      region,
      projectStatusId,
      date,
      subtotal,
      taxRate,
      totalAmount: clientTotalAmount,
      currency,
      windowsCount,
      squareMeters,
      description,
      uninstallTagIds,
    } = body

    const projectLogger = logger.child({
      customerId,
      projectNumber,
      subtotal,
      currency: currency || 'CLP',
    })

    projectLogger.info('Project creation requested')

    // Verificar que el customer existe
    const customerExists = await prisma.customer.findUnique({
      where: { id: customerId },
    })
    if (!customerExists) {
      throw new BusinessError('El cliente no existe', 404)
    }

    // SEGURIDAD: Siempre calcular totalAmount en el servidor
    const finalTaxRate = taxRate ?? 19
    const calculatedTotal = calculateProjectTotal(subtotal, finalTaxRate)
    const finalTotalAmount = calculatedTotal

    // Auditoría: Loggear si el cliente envió un totalAmount diferente
    if (
      clientTotalAmount !== undefined &&
      Math.abs(clientTotalAmount - calculatedTotal) > FINANCIAL.TOLERANCE
    ) {
      projectLogger.warn(
        {
          clientTotalAmount,
          serverCalculatedTotal: calculatedTotal,
          difference: clientTotalAmount - calculatedTotal,
        },
        'Client sent different totalAmount than server calculated - using server value'
      )
    }

    projectLogger.info({ calculatedTotal, taxRate: finalTaxRate }, 'Creating project in database')

    // Crear proyecto usando transacción (para crear relaciones M:M de uninstallTags)
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          customerId,
          projectNumber,
          projectName: projectName || null,
          phone,
          street: street || null,
          apartment: apartment || null,
          comuna,
          region,
          projectStatusId: projectStatusId || null,
          date: date ?? new Date(),
          subtotal: new Decimal(subtotal),
          taxRate: new Decimal(finalTaxRate),
          totalAmount: new Decimal(finalTotalAmount),
          balance: new Decimal(finalTotalAmount),
          currency: currency || 'CLP',
          windowsCount: windowsCount || 0,
          squareMeters: new Decimal(squareMeters || 0),
          description: description || null,
        },
      })

      if (uninstallTagIds && uninstallTagIds.length > 0) {
        await tx.projectUninstallTag.createMany({
          data: uninstallTagIds.map((tagId: string) => ({
            projectId: newProject.id,
            uninstallTagId: tagId,
          })),
        })
      }

      return tx.project.findUnique({
        where: { id: newProject.id },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          projectStatus: {
            select: { id: true, name: true, color: { select: { bgClass: true } } },
          },
          uninstallTags: {
            include: { uninstallTag: { include: { color: true } } },
          },
        },
      })
    })

    if (!project) {
      throw new Error('Error inesperado: proyecto no encontrado después de crear')
    }

    projectLogger.info(
      { projectId: project.id, projectNumber: project.projectNumber },
      'Project created successfully'
    )

    return NextResponse.json(project, { status: 201 })
  },
  {
    bodySchema: createProjectApiSchema,
    fallbackError: 'Error al crear proyecto',
  }
)
