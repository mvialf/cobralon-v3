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
import type { ProjectListFilters } from '@/types/project-list'

/**
 * Zod schema for projectState validation
 */
const projectStateSchema = z.enum(['Activo', 'Finalizado', 'all']).default('Activo')

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
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
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

    const totalPages = Math.ceil(total / limit)

    // Formatear facets para respuesta
    const facets = {
      projectStatus: statusFacetsRaw,
      projectState: stateFacetsRaw,
    }

    logger.info(
      {
        total,
        page,
        limit,
        totalPages,
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
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
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
 * Body:
 *   - customerId: string (requerido)
 *   - projectNumber: string (requerido)
 *   - projectName: string (opcional)
 *   - phone: string (requerido)
 *   - projectStatusId: string (opcional - FK a ProjectStatus)
 *   - date: ISO date string
 *   - subtotal: number (requerido)
 *   - taxRate: number (default: 19)
 *   - total: number (calculado)
 *   - windowsCount: number (default: 0)
 *   - squareMeters: number (default: 0)
 *   - description: string (opcional)
 */
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()
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
    total,
    totalAmount,
    currency,
    windowsCount,
    squareMeters,
    description,
    uninstallTagIds,
  } = body

  // Child logger con contexto de negocio
  const projectLogger = logger.child({
    customerId,
    projectNumber,
    subtotal,
    currency: currency || 'CLP',
  })

  projectLogger.info('Project creation requested')

  try {
    // Validaciones básicas
    projectLogger.debug('Starting basic validations')

    if (!customerId || typeof customerId !== 'string') {
      projectLogger.warn('Missing or invalid customerId')
      return NextResponse.json({ error: 'El cliente es requerido' }, { status: 400 })
    }

    if (!projectNumber || typeof projectNumber !== 'string' || projectNumber.trim().length === 0) {
      projectLogger.warn('Missing or invalid projectNumber')
      return NextResponse.json({ error: 'El número de proyecto es requerido' }, { status: 400 })
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      projectLogger.warn('Missing or invalid phone')
      return NextResponse.json({ error: 'El teléfono es requerido' }, { status: 400 })
    }

    if (!street || typeof street !== 'string' || street.trim().length === 0) {
      projectLogger.warn('Missing or invalid street')
      return NextResponse.json({ error: 'La calle es obligatoria' }, { status: 400 })
    }

    if (!comuna || typeof comuna !== 'string' || comuna.trim().length === 0) {
      projectLogger.warn('Missing or invalid comuna')
      return NextResponse.json({ error: 'La comuna es obligatoria' }, { status: 400 })
    }

    if (!region || typeof region !== 'string' || region.trim().length === 0) {
      projectLogger.warn('Missing or invalid region')
      return NextResponse.json({ error: 'La región es obligatoria' }, { status: 400 })
    }

    if (subtotal === undefined || subtotal === null || typeof subtotal !== 'number') {
      projectLogger.warn({ subtotal }, 'Missing or invalid subtotal')
      return NextResponse.json({ error: 'El subtotal es requerido' }, { status: 400 })
    }

    if (subtotal <= 0) {
      projectLogger.warn({ subtotal }, 'Subtotal must be positive')
      return NextResponse.json({ error: 'El subtotal debe ser mayor a 0' }, { status: 400 })
    }

    projectLogger.debug('Basic validations passed')

    // Verificar que el customer existe
    projectLogger.debug({ customerId }, 'Validating customer exists')
    const customerExists = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customerExists) {
      projectLogger.warn('Customer not found')
      return NextResponse.json({ error: 'El cliente no existe' }, { status: 404 })
    }

    // Calcular total si no viene en el body
    const finalTaxRate = taxRate ?? 19
    const calculatedTotal = total ?? subtotal + subtotal * (finalTaxRate / 100)

    // totalAmount es el mismo que calculatedTotal si no viene en el body
    const finalTotalAmount = totalAmount ?? calculatedTotal

    projectLogger.info(
      {
        calculatedTotal,
        taxRate: finalTaxRate,
      },
      'Creating project in database'
    )

    // Crear proyecto usando transacción (para crear relaciones M:M de uninstallTags)
    const project = await prisma.$transaction(async (tx) => {
      // 1. Crear el proyecto
      const newProject = await tx.project.create({
        data: {
          customerId,
          projectNumber: projectNumber.trim(),
          projectName: projectName?.trim() || null,
          phone: phone.trim(),
          street: street.trim(),
          apartment: apartment?.trim() || null,
          comuna: comuna.trim(),
          region: region.trim(),
          projectStatusId: projectStatusId || null,
          date: date ? new Date(date) : new Date(),
          subtotal: new Decimal(subtotal),
          taxRate: new Decimal(finalTaxRate),
          total: new Decimal(calculatedTotal),
          totalAmount: finalTotalAmount ? new Decimal(finalTotalAmount) : null,
          // Balance inicial = totalAmount (no hay pagos aún)
          balance: new Decimal(finalTotalAmount || calculatedTotal),
          currency: currency || 'CLP',
          windowsCount: windowsCount || 0,
          squareMeters: new Decimal(squareMeters || 0),
          description: description?.trim() || null,
        },
      })

      // 2. Crear relaciones M:M con UninstallTags si hay tags
      if (uninstallTagIds && uninstallTagIds.length > 0) {
        await tx.projectUninstallTag.createMany({
          data: uninstallTagIds.map((tagId: string) => ({
            projectId: newProject.id,
            uninstallTagId: tagId,
          })),
        })
      }

      // 3. Retornar proyecto con todas las relaciones
      return tx.project.findUnique({
        where: { id: newProject.id },
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
                  bgClass: true,
                },
              },
            },
          },
          uninstallTags: {
            include: {
              uninstallTag: {
                include: {
                  color: true,
                },
              },
            },
          },
        },
      })
    })

    // Project no puede ser null porque acabamos de crearlo
    if (!project) {
      throw new Error('Error inesperado: proyecto no encontrado después de crear')
    }

    projectLogger.info(
      {
        projectId: project.id,
        projectNumber: project.projectNumber,
      },
      'Project created successfully'
    )

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    projectLogger.error({ err: error }, 'Error creating project')
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
  }
})
