import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateAftersaleApiSchema,
  type UpdateAftersaleApiBody,
} from '@/lib/validations/aftersale-validations'
import { getRegionByCodigo } from '@/lib/regiones-chile'

/**
 * GET /api/aftersales/[id]
 *
 * Obtiene un caso de postventa específico
 */
export const GET = withApiHandler(
  async (_request, _logger, { params }) => {
    const aftersale = await prisma.aftersale.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            street: true,
            apartment: true,
            comuna: true,
            region: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        aftersaleStatus: {
          select: {
            id: true,
            name: true,
            color: {
              select: {
                bgClass: true,
                textClass: true,
              },
            },
          },
        },
      },
    })

    if (!aftersale) {
      throw new BusinessError('Caso de postventa no encontrado', 404)
    }

    return NextResponse.json(aftersale)
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al obtener el caso de postventa' }
)

/**
 * PUT /api/aftersales/[id]
 *
 * Actualiza un caso de postventa existente
 */
export const PUT = withApiHandler<UpdateAftersaleApiBody>(
  async (_request, _logger, { params, body }) => {
    const { id } = params

    // Verificar que el caso de postventa existe
    const existingAftersale = await prisma.aftersale.findUnique({
      where: { id },
    })

    if (!existingAftersale) {
      throw new BusinessError('Caso de postventa no encontrado', 404)
    }

    // Validación: si se cambia el proyecto, debe existir
    if (body.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: body.projectId },
      })

      if (!project) {
        throw new BusinessError('El proyecto seleccionado no existe', 404)
      }
    }

    // Validación: si se cambia el estado, debe existir y estar activo
    if (body.aftersaleStatusId) {
      const status = await prisma.aftersaleStatus.findUnique({
        where: { id: body.aftersaleStatusId },
      })

      if (!status) {
        throw new BusinessError('El estado seleccionado no existe', 404)
      }

      if (!status.isActive) {
        throw new BusinessError('El estado seleccionado no está activo')
      }
    }

    // Determinar projectId a usar (el nuevo o el existente)
    const targetProjectId = body.projectId || existingAftersale.projectId

    // Convertir código de región a nombre si se proporcionó
    const regionNombre = body.region
      ? getRegionByCodigo(body.region)?.nombre || body.region
      : undefined

    // Usar transacción para actualizar aftersale y proyecto
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el proyecto con la nueva dirección (si se proporcionó)
      const hasAddressUpdate =
        body.street || body.apartment !== undefined || body.comuna || body.region

      if (hasAddressUpdate) {
        await tx.project.update({
          where: { id: targetProjectId },
          data: {
            ...(body.street && { street: body.street }),
            ...(body.apartment !== undefined && { apartment: body.apartment }),
            ...(body.comuna && { comuna: body.comuna }),
            ...(regionNombre && { region: regionNombre }),
          },
        })
      }

      // 2. Actualizar el caso de postventa
      const updatedAftersale = await tx.aftersale.update({
        where: { id },
        data: {
          ...(body.projectId && { projectId: body.projectId }),
          ...(body.aftersaleStatusId && {
            aftersaleStatusId: body.aftersaleStatusId,
          }),
          ...(body.contactPhone && { contactPhone: body.contactPhone }),
          ...(body.description !== undefined && {
            description: body.description,
          }),
          ...(body.reportedAt && { reportedAt: new Date(body.reportedAt) }),
          ...(body.tasks !== undefined && { tasks: body.tasks }),
        },
        include: {
          project: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              street: true,
              apartment: true,
              comuna: true,
              region: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          aftersaleStatus: {
            select: {
              id: true,
              name: true,
              color: {
                select: {
                  bgClass: true,
                  textClass: true,
                },
              },
            },
          },
        },
      })

      return updatedAftersale
    })

    return NextResponse.json({ aftersale: result })
  },
  {
    bodySchema: updateAftersaleApiSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar el caso de postventa',
  }
)

/**
 * DELETE /api/aftersales/[id]
 *
 * Elimina permanentemente un caso de postventa
 */
export const DELETE = withApiHandler(
  async (_request, _logger, { params }) => {
    const { id } = params

    // Verificar que el caso de postventa existe
    const existingAftersale = await prisma.aftersale.findUnique({
      where: { id },
    })

    if (!existingAftersale) {
      throw new BusinessError('Caso de postventa no encontrado', 404)
    }

    // Eliminar el caso de postventa (hard delete)
    await prisma.aftersale.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Caso de postventa eliminado' })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al eliminar el caso de postventa' }
)
