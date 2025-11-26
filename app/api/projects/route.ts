import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { ProjectWhereInput } from '@/types/api'
import { matchesProjectState } from '@/lib/business-logic/project-state'
import { withLogging } from '@/lib/logger-middleware'
import { z } from 'zod'

/**
 * Zod schema for projectState validation
 */
const projectStateSchema = z.enum(['Activo', 'Finalizado', 'all']).default('Activo')

/**
 * GET /api/projects
 *
 * Obtiene lista de proyectos con paginación correcta
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - search: buscar por nombre de proyecto, número o cliente
 *   - customerId: filtrar por cliente específico
 *   - projectState: "Activo" (default), "Finalizado", "all"
 *       - "Activo": Proyectos no finalizados (status.isFinal = false OR balance > 0)
 *       - "Finalizado": Proyectos finalizados (status.isFinal = true AND balance = 0)
 *       - "all": Todos los proyectos
 *
 * NOTA: La paginación se aplica DESPUÉS del filtro fino de projectState para
 * garantizar que cada página contenga exactamente 'limit' proyectos.
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const search = searchParams.get('search') || ''
  const customerId = searchParams.get('customerId') || ''

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
        projectState,
      },
    },
    'Fetching projects with filters'
  )

  try {
    // Construir filtro de búsqueda base
    const where: ProjectWhereInput = {}

    if (customerId) {
      where.customerId = customerId
    }

    if (search) {
      where.OR = [
        { projectNumber: { contains: search, mode: 'insensitive' as const } },
        { projectName: { contains: search, mode: 'insensitive' as const } },
        { projectStatus: { name: { contains: search, mode: 'insensitive' as const } } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
      ]
    }

    // Pre-filtro server-side por projectStatus.isFinal (solo para "Finalizado")
    // NOTA: Para "Activo" NO aplicamos pre-filtro porque necesitamos verificar
    // el balance (proyectos con isFinal=true pero balance>0 son "Activos")
    if (projectState === 'Finalizado') {
      // Finalizados: Solo traer proyectos en estado final (optimización)
      // El filtro fino verificará que también tengan balance === 0
      where.projectStatus = { isFinal: true }
    }
    // 'Activo' y 'all' no agregan pre-filtro de status

    // PASO 1: Obtener TODOS los proyectos que cumplen el pre-filtro (sin paginación)
    // Esto es necesario para calcular el COUNT total correcto después del filtro fino
    const allProjects = await prisma.project.findMany({
      relationLoadStrategy: 'join', // Fix N+1: Force database-level JOINs
      where,
      orderBy: { createdAt: 'desc' },
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
                bgClass: true,
              },
            },
          },
        },
      },
    })

    // PASO 2: Calcular totalPaid y percentPaid usando balance de DB
    const projectsWithCalculations = allProjects.map((project) => {
      const balance = Number(project.balance) // ✅ Leer desde columna DB
      const totalAmount = Number(project.total)
      const totalPaid = totalAmount - balance

      const percentPaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0

      return {
        ...project,
        totalPaid,
        balance,
        percentPaid,
      }
    })

    // PASO 3: Filtro fino - Aplicar filtro de projectState usando helper compartido
    const filteredProjects = projectsWithCalculations.filter((project) => {
      return matchesProjectState(
        project.balance,
        project.projectStatus?.isFinal,
        projectState as 'Activo' | 'Finalizado' | 'all'
      )
    })

    // PASO 4: Calcular paginación DESPUÉS del filtro fino
    const totalFiltered = filteredProjects.length
    const totalPages = Math.ceil(totalFiltered / limit)
    const skip = (page - 1) * limit

    // PASO 5: Aplicar paginación manualmente
    const paginatedProjects = filteredProjects.slice(skip, skip + limit)

    logger.info(
      {
        totalFetched: allProjects.length,
        totalFiltered,
        page,
        limit,
        totalPages,
        projectState,
        paginatedCount: paginatedProjects.length,
      },
      'Projects fetched, filtered, and paginated successfully'
    )

    return NextResponse.json({
      projects: paginatedProjects,
      pagination: {
        page,
        limit,
        total: totalFiltered, // ✅ Total correcto de proyectos después del filtro
        totalPages, // ✅ Páginas correctas basadas en total filtrado
      },
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
    totalAmount, // Para sistema de pagos
    currency, // Para sistema de pagos
    windowsCount,
    squareMeters,
    description,
    uninstallTagIds, // Materiales de desinstalación
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
    // Validaciones b�sicas
    projectLogger.debug('Starting basic validations')

    if (!customerId || typeof customerId !== 'string') {
      projectLogger.warn('Missing or invalid customerId')
      return NextResponse.json({ error: 'El cliente es requerido' }, { status: 400 })
    }

    if (!projectNumber || typeof projectNumber !== 'string' || projectNumber.trim().length === 0) {
      projectLogger.warn('Missing or invalid projectNumber')
      return NextResponse.json({ error: 'El n�mero de proyecto es requerido' }, { status: 400 })
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      projectLogger.warn('Missing or invalid phone')
      return NextResponse.json({ error: 'El tel�fono es requerido' }, { status: 400 })
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
