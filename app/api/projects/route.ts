import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { ProjectWhereInput } from '@/types/api'
import { calculateProjectBalance } from '@/lib/business-logic/project-balance'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/projects
 *
 * Obtiene lista de proyectos con paginaci�n opcional
 *
 * Query params:
 *   - page: n�mero de p�gina (default: 1)
 *   - limit: registros por p�gina (default: 10, max: 100)
 *   - search: buscar por nombre de proyecto, n�mero o cliente
 *   - customerId: filtrar por cliente espec�fico
 *   - projectState: "Activo" (default), "Finalizado", "all"
 *       - "Activo": Proyectos no finalizados (status.isFinal = false OR balance > 0)
 *       - "Finalizado": Proyectos finalizados (status.isFinal = true AND balance = 0)
 *       - "all": Todos los proyectos
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const search = searchParams.get('search') || ''
  const customerId = searchParams.get('customerId') || ''
  const projectState = searchParams.get('projectState') || 'Activo' // Default: solo activos

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

  const skip = (page - 1) * limit

  try {
    // Construir filtro de búsqueda
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

    // Pre-filtro server-side por projectStatus.isFinal
    // Esto optimiza la query reduciendo la carga inicial
    if (projectState === 'Activo') {
      // Activos: Solo traer proyectos que NO están en estado final
      where.projectStatus = { isFinal: false }
    } else if (projectState === 'Finalizado') {
      // Finalizados: Solo traer proyectos en estado final
      where.projectStatus = { isFinal: true }
    }
    // 'all' no agrega filtro de status

    // Obtener proyectos (COUNT eliminado - se calcula con filteredProjects.length)
    const projects = await prisma.project.findMany({
      relationLoadStrategy: 'join', // ← Fix N+1: Force database-level JOINs
      where,
      skip,
      take: limit,
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
            isFinal: true, // ← Agregar campo isFinal para filtrado en frontend
            color: {
              select: {
                bgClass: true,
              },
            },
          },
        },
        paymentAllocations: {
          select: {
            allocatedAmount: true,
          },
        },
      },
    })

    // Calcular totalPaid, balance y percentPaid para cada proyecto usando helper compartido
    const projectsWithCalculations = projects.map((project) => {
      const { totalPaid, balance } = calculateProjectBalance({
        totalAmount: Number(project.total),
        allocations: project.paymentAllocations.map((alloc) => ({
          allocatedAmount: Number(alloc.allocatedAmount),
        })),
      })

      // Calcular porcentaje pagado (sin redondear - frontend decide precisión)
      const percentPaid = Number(project.total) > 0 ? (totalPaid / Number(project.total)) * 100 : 0

      return {
        ...project,
        totalPaid,
        balance,
        percentPaid,
      }
    })

    // Filtro fino client-side: Considerar también el balance
    // Esto captura casos edge como "Completado pero con deuda" o "En Progreso pero pagado"
    const filteredProjects = projectsWithCalculations.filter((project) => {
      const isFullyPaid = project.balance === 0
      const hasFinaleStatus = project.projectStatus?.isFinal ?? false

      if (projectState === 'Activo') {
        // Activo: No está finalizado O tiene deuda pendiente
        return !hasFinaleStatus || !isFullyPaid
      } else if (projectState === 'Finalizado') {
        // Finalizado: Status final Y completamente pagado
        return hasFinaleStatus && isFullyPaid
      }
      // 'all': No filtrar
      return true
    })

    logger.info(
      {
        found: filteredProjects.length,
        total: filteredProjects.length,
        page,
      },
      'Projects fetched successfully'
    )

    return NextResponse.json({
      projects: filteredProjects,
      pagination: {
        page,
        limit,
        total: filteredProjects.length, // Actualizar total con proyectos filtrados
        totalPages: Math.ceil(filteredProjects.length / limit),
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

    // Crear proyecto
    const project = await prisma.project.create({
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
      },
    })

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
