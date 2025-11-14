import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { type ParsedProjectRow } from '@/lib/excel/project-parser'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * POST /api/projects/import
 *
 * Importa múltiples proyectos desde Excel
 *
 * Body:
 *   - projects: ParsedProjectRow[] (array de proyectos validados)
 */
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()
  const { projects } = body

  logger.info({ count: projects?.length || 0 }, 'Project import requested')

  try {
    // Validación de entrada
    if (!Array.isArray(projects) || projects.length === 0) {
      logger.warn('Invalid or empty projects array')
      return NextResponse.json(
        { error: 'Debe proporcionar un array de proyectos' },
        { status: 400 }
      )
    }

    logger.debug({ count: projects.length }, 'Processing projects')

    // Obtener todos los ProjectStatus del sistema
    const allStatuses = await prisma.projectStatus.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })

    logger.debug({ statuses: allStatuses.length }, 'Loaded project statuses')

    // Crear mapa de nombres de estado (normalizado) → ID
    const statusMap = new Map<string, string>()
    allStatuses.forEach((status) => {
      const normalized = status.name.toLowerCase().trim()
      statusMap.set(normalized, status.id)
    })

    // Procesar cada proyecto
    const results: Array<{ success: boolean; error?: string; projectNumber: string }> = []
    const createdProjects: string[] = []

    for (const projectData of projects as ParsedProjectRow[]) {
      try {
        logger.debug({ projectNumber: projectData.projectNumber }, 'Processing project')

        // 1. Buscar o crear customer
        let customer = await prisma.customer.findFirst({
          where: {
            name: { equals: projectData.customerName, mode: 'insensitive' },
          },
        })

        if (!customer) {
          logger.info(
            { customerName: projectData.customerName },
            'Customer not found, creating new one'
          )

          // Si no hay phone en projectData, no podemos crear el customer
          if (!projectData.phone) {
            const error = `Cliente "${projectData.customerName}" no existe y no se proporcionó teléfono para crearlo`
            logger.warn(
              { projectNumber: projectData.projectNumber, error },
              'Cannot create customer without phone'
            )

            results.push({
              success: false,
              error,
              projectNumber: projectData.projectNumber,
            })
            continue
          }

          customer = await prisma.customer.create({
            data: {
              name: projectData.customerName,
              phone: projectData.phone,
              email: null,
            },
          })

          logger.info({ customerId: customer.id }, 'Customer created')
        } else {
          logger.debug({ customerId: customer.id }, 'Customer found')
        }

        // 2. Buscar projectStatus por nombre
        const normalizedStatusName = projectData.projectStatusName.toLowerCase().trim()
        const projectStatusId = statusMap.get(normalizedStatusName)

        if (!projectStatusId) {
          const error = `Estado de proyecto "${projectData.projectStatusName}" no encontrado`
          logger.warn({ projectNumber: projectData.projectNumber, error }, 'Status not found')

          results.push({
            success: false,
            error,
            projectNumber: projectData.projectNumber,
          })
          continue
        }

        logger.debug({ projectStatusId }, 'Project status found')

        // 3. Calcular totalAmount = subtotal * (1 + taxRate/100)
        const subtotal = new Decimal(projectData.subtotal)
        const taxRate = new Decimal(projectData.taxRate)
        const taxMultiplier = taxRate.dividedBy(100).plus(1)
        const totalAmount = subtotal.times(taxMultiplier)

        logger.debug(
          {
            subtotal: subtotal.toFixed(2),
            taxRate: taxRate.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
          },
          'Calculated amounts'
        )

        // 4. Determinar teléfono del proyecto (fallback a customer.phone si no se proporcionó)
        const projectPhone = projectData.phone || customer.phone

        logger.debug(
          {
            providedPhone: projectData.phone,
            customerPhone: customer.phone,
            finalPhone: projectPhone,
          },
          'Phone resolution'
        )

        // 5. Crear proyecto
        const project = await prisma.project.create({
          data: {
            projectNumber: projectData.projectNumber,
            projectName: projectData.projectName || null,
            customerId: customer.id,
            phone: projectPhone,
            street: projectData.street,
            apartment: projectData.apartment || null,
            comuna: projectData.comuna,
            region: projectData.region,
            projectStatusId,
            date: projectData.date,
            subtotal,
            taxRate,
            total: totalAmount, // Campo 'total' en schema (legacy)
            totalAmount, // Campo 'totalAmount' (nuevo)
            currency: 'CLP',
            windowsCount: projectData.windowsCount,
            squareMeters: new Decimal(projectData.squareMeters),
            description: projectData.description || null,
            uninstallTagIds: [], // Array vacío por defecto
          },
        })

        logger.info(
          {
            projectId: project.id,
            projectNumber: project.projectNumber,
            customerId: customer.id,
          },
          'Project created successfully'
        )

        results.push({
          success: true,
          projectNumber: projectData.projectNumber,
        })

        createdProjects.push(project.id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        logger.error(
          {
            projectNumber: projectData.projectNumber,
            err: error,
          },
          'Error creating project'
        )

        results.push({
          success: false,
          error: errorMessage,
          projectNumber: projectData.projectNumber,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    logger.info(
      {
        imported: successCount,
        failed: failureCount,
        projectIds: createdProjects,
      },
      'Import process completed'
    )

    if (failureCount > 0) {
      const failures = results.filter((r) => !r.success)

      return NextResponse.json(
        {
          success: false,
          imported: successCount,
          failed: failureCount,
          errors: failures,
          message: `Se importaron ${successCount} proyectos, pero ${failureCount} fallaron.`,
        },
        { status: 207 } // Multi-status
      )
    }

    return NextResponse.json(
      {
        success: true,
        imported: successCount,
        projectIds: createdProjects,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ err: error }, 'Error importing projects')
    return NextResponse.json({ error: 'Error al importar proyectos' }, { status: 500 })
  }
})
