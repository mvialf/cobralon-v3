import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ProjectUpdateInput } from '@/types/api'
import { calculateProjectTotalMoney } from '@/lib/business-logic/totals'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { getProjectFinancials } from '@/lib/business-logic/project-financials'
import {
  updateProjectApiSchema,
  type UpdateProjectApiBody,
} from '@/lib/validations/project-validations'
import {
  absMoney,
  greaterThanMoneyWithTolerance,
  money,
  moneyToNumber,
  subtractMoney,
} from '@/lib/business-logic/money'

/**
 * GET /api/projects/[id]
 *
 * Obtiene un proyecto específico por ID con sus relaciones
 * SIEMPRE incluye totalPaid y balance calculados
 */
export const GET = withApiHandler(
  async (_request, logger, { params }) => {
    const { id } = params

    const project = await prisma.project.findUnique({
      relationLoadStrategy: 'join',
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        projectStatus: {
          select: {
            id: true,
            name: true,
            isFinal: true,
            color: { select: { bgClass: true, textClass: true } },
          },
        },
        uninstallTags: {
          include: { uninstallTag: { include: { color: true } } },
        },
      },
    })

    if (!project) {
      throw new BusinessError('Proyecto no encontrado', 404)
    }

    const financials = await getProjectFinancials(id)
    if (!financials) {
      throw new BusinessError('Datos financieros del proyecto no encontrados', 404)
    }

    logger.info({ projectId: id }, 'Project fetched successfully')

    return NextResponse.json({
      ...project,
      totalAmount: moneyToNumber(project.totalAmount),
      ...financials,
    })
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al obtener el proyecto',
  }
)

/**
 * PUT /api/projects/[id]
 *
 * Actualiza un proyecto existente
 * Body validado con updateProjectApiSchema (todos los campos opcionales)
 */
export const PUT = withApiHandler<UpdateProjectApiBody>(
  async (_request, logger, { params, body }) => {
    const { id } = params

    // Verificar proyecto y customer en paralelo
    const [existingProject, customerExists] = await Promise.all([
      prisma.project.findUnique({ where: { id } }),
      body.customerId
        ? prisma.customer.findUnique({ where: { id: body.customerId } })
        : Promise.resolve(null),
    ])

    if (!existingProject) {
      throw new BusinessError('Proyecto no encontrado', 404)
    }

    if (body.customerId && !customerExists) {
      throw new BusinessError('El cliente no existe', 404)
    }

    // SEGURIDAD: Siempre recalcular total en el servidor cuando cambian subtotal/taxRate
    let updatedTotalAmount: ReturnType<typeof money> | undefined
    if (body.subtotal !== undefined || body.taxRate !== undefined) {
      const subtotal = body.subtotal ?? existingProject.subtotal
      const taxRate = body.taxRate ?? existingProject.taxRate

      const projectCurrency = body.currency ?? existingProject.currency
      updatedTotalAmount = calculateProjectTotalMoney(subtotal, taxRate, projectCurrency)
      const calculatedTotal = moneyToNumber(updatedTotalAmount)

      if (
        body.totalAmount !== undefined &&
        greaterThanMoneyWithTolerance(
          absMoney(subtractMoney(body.totalAmount, updatedTotalAmount)),
          0
        )
      ) {
        logger.warn(
          {
            clientTotalAmount: body.totalAmount,
            serverCalculatedTotal: calculatedTotal,
            projectId: id,
          },
          'Client sent different totalAmount than server calculated - using server value'
        )
      }
    }

    // Preparar datos para actualizar
    const updateData: ProjectUpdateInput = {}

    if (body.customerId) updateData.customer = { connect: { id: body.customerId } }
    if (body.projectNumber !== undefined) updateData.projectNumber = body.projectNumber
    if (body.projectName !== undefined) updateData.projectName = body.projectName || null
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.street !== undefined) updateData.street = body.street || null
    if (body.apartment !== undefined) updateData.apartment = body.apartment || null
    if (body.comuna !== undefined) updateData.comuna = body.comuna
    if (body.region !== undefined) updateData.region = body.region
    if (body.projectStatusId !== undefined) {
      updateData.projectStatus = body.projectStatusId
        ? { connect: { id: body.projectStatusId } }
        : { disconnect: true }
    }
    if (body.date !== undefined) updateData.date = body.date
    if (body.subtotal !== undefined) updateData.subtotal = money(body.subtotal)
    if (body.taxRate !== undefined) updateData.taxRate = money(body.taxRate)
    if (updatedTotalAmount !== undefined) updateData.totalAmount = updatedTotalAmount
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.windowsCount !== undefined) updateData.windowsCount = body.windowsCount
    if (body.squareMeters !== undefined) updateData.squareMeters = money(body.squareMeters)
    if (body.description !== undefined) updateData.description = body.description || null

    const project = await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id }, data: updateData })

      if (body.uninstallTagIds !== undefined) {
        await tx.projectUninstallTag.deleteMany({ where: { projectId: id } })
        if (body.uninstallTagIds.length > 0) {
          await tx.projectUninstallTag.createMany({
            data: body.uninstallTagIds.map((tagId: string) => ({
              projectId: id,
              uninstallTagId: tagId,
            })),
          })
        }
      }

      return tx.project.findUnique({
        where: { id },
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

    logger.info({ projectId: id }, 'Project updated successfully')

    const financials = await getProjectFinancials(id)

    return NextResponse.json({
      ...project,
      ...(project && { totalAmount: moneyToNumber(project.totalAmount) }),
      ...(financials ?? {}),
    })
  },
  {
    bodySchema: updateProjectApiSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar proyecto',
  }
)

/**
 * DELETE /api/projects/[id]
 *
 * Elimina un proyecto
 */
export const DELETE = withApiHandler(
  async (_request, logger, { params }) => {
    const { id } = params

    const existingProject = await prisma.project.findUnique({ where: { id } })
    if (!existingProject) {
      throw new BusinessError('Proyecto no encontrado', 404)
    }

    await prisma.project.delete({ where: { id } })

    logger.info({ projectId: id }, 'Project deleted successfully')

    return NextResponse.json({ message: 'Proyecto eliminado exitosamente' })
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al eliminar proyecto',
  }
)
