import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createAftersaleApiSchema,
  type CreateAftersaleApiBody,
} from '@/lib/validations/aftersale-validations'
import { getRegionByCodigo } from '@/lib/regiones-chile'

/**
 * GET /api/aftersales
 *
 * Obtiene todos los casos de postventa con información de proyecto y estado
 */
export const GET = withApiHandler(
  async () => {
    const aftersales = await prisma.aftersale.findMany({
      relationLoadStrategy: 'join',
      orderBy: {
        reportedAt: 'desc',
      },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            customer: {
              select: {
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

    return NextResponse.json({ aftersales })
  },
  { fallbackError: 'Error al obtener los casos de postventa' }
)

/**
 * POST /api/aftersales
 *
 * Crea un nuevo caso de postventa
 *
 * Validaciones:
 * - El proyecto debe existir y estar finalizado
 * - El estado debe existir y estar activo
 */
export const POST = withApiHandler<CreateAftersaleApiBody>(
  async (_request, _logger, { body }) => {
    // Validaciones en paralelo: proyecto existe, estado existe
    const [project, status] = await Promise.all([
      prisma.project.findUnique({
        where: { id: body.projectId },
        include: {
          projectStatus: {
            select: {
              isFinal: true,
            },
          },
        },
      }),
      prisma.aftersaleStatus.findUnique({
        where: { id: body.aftersaleStatusId },
      }),
    ])

    if (!project) {
      throw new BusinessError('El proyecto seleccionado no existe', 404)
    }

    // Validación: verificar que el proyecto esté finalizado
    if (!project.projectStatus?.isFinal) {
      throw new BusinessError(
        'Solo se pueden crear casos de postventa para proyectos finalizados'
      )
    }

    if (!status) {
      throw new BusinessError('El estado seleccionado no existe', 404)
    }

    if (!status.isActive) {
      throw new BusinessError('El estado seleccionado no está activo')
    }

    // Convertir código de región a nombre para guardar en proyecto
    const regionData = getRegionByCodigo(body.region)
    const regionNombre = regionData?.nombre || body.region

    // Usar transacción para crear aftersale y actualizar proyecto
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el proyecto con la nueva dirección
      await tx.project.update({
        where: { id: body.projectId },
        data: {
          street: body.street || null,
          apartment: body.apartment,
          comuna: body.comuna,
          region: regionNombre,
        },
      })

      // 2. Crear el caso de postventa
      const aftersale = await tx.aftersale.create({
        data: {
          projectId: body.projectId,
          aftersaleStatusId: body.aftersaleStatusId,
          contactPhone: body.contactPhone,
          description: body.description,
          reportedAt: new Date(body.reportedAt),
          tasks: body.tasks || [],
        },
        include: {
          project: {
            select: {
              projectNumber: true,
              projectName: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
          aftersaleStatus: {
            select: {
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

      return aftersale
    })

    return NextResponse.json({ aftersale: result }, { status: 201 })
  },
  { bodySchema: createAftersaleApiSchema, fallbackError: 'Error al crear el caso de postventa' }
)
