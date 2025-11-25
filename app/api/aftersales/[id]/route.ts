import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { todoListOptionalSchema } from '@/lib/validations/todo-validations'
import { getRegionByCodigo } from '@/lib/regiones-chile'

/**
 * Schema de validación para actualizar Aftersale
 * Incluye campos de dirección del proyecto (editables desde aftersale)
 */
const updateAftersaleSchema = z.object({
  projectId: z.string().uuid().optional(),
  aftersaleStatusId: z.string().uuid().optional(),
  contactPhone: z
    .string()
    .regex(/^\+56[2-9]\d{8}$/, 'Formato inválido. Debe ser un teléfono chileno válido')
    .optional(),
  description: z.string().max(1000).optional(),
  reportedAt: z.string().datetime().optional(),
  tasks: todoListOptionalSchema.optional(), // Lista de tareas para resolver el caso
  // Campos de dirección del proyecto
  street: z.string().min(1).optional(),
  apartment: z.string().nullable().optional(),
  comuna: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
})

/**
 * GET /api/aftersales/[id]
 *
 * Obtiene un caso de postventa específico
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const aftersale = await prisma.aftersale.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            // Campos de dirección del proyecto
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
      return NextResponse.json({ error: 'Caso de postventa no encontrado' }, { status: 404 })
    }

    return NextResponse.json(aftersale)
  } catch (error) {
    console.error('Error fetching aftersale:', error)
    return NextResponse.json({ error: 'Error al obtener el caso de postventa' }, { status: 500 })
  }
}

/**
 * PUT /api/aftersales/[id]
 *
 * Actualiza un caso de postventa existente
 *
 * Body: Campos opcionales a actualizar
 * ```json
 * {
 *   "aftersaleStatusId": "uuid",
 *   "description": "Descripción actualizada",
 *   "reportedAt": "2024-01-16T10:00:00Z"
 * }
 * ```
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updateAftersaleSchema.parse(body)

    // Verificar que el caso de postventa existe
    const existingAftersale = await prisma.aftersale.findUnique({
      where: { id },
    })

    if (!existingAftersale) {
      return NextResponse.json({ error: 'Caso de postventa no encontrado' }, { status: 404 })
    }

    // Validación: si se cambia el proyecto, debe existir
    if (validatedData.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
      })

      if (!project) {
        return NextResponse.json({ error: 'El proyecto seleccionado no existe' }, { status: 404 })
      }
    }

    // Validación: si se cambia el estado, debe existir y estar activo
    if (validatedData.aftersaleStatusId) {
      const status = await prisma.aftersaleStatus.findUnique({
        where: { id: validatedData.aftersaleStatusId },
      })

      if (!status) {
        return NextResponse.json({ error: 'El estado seleccionado no existe' }, { status: 404 })
      }

      if (!status.isActive) {
        return NextResponse.json(
          { error: 'El estado seleccionado no está activo' },
          { status: 400 }
        )
      }
    }

    // Determinar projectId a usar (el nuevo o el existente)
    const targetProjectId = validatedData.projectId || existingAftersale.projectId

    // Convertir código de región a nombre si se proporcionó
    const regionNombre = validatedData.region
      ? getRegionByCodigo(validatedData.region)?.nombre || validatedData.region
      : undefined

    // Usar transacción para actualizar aftersale y proyecto
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el proyecto con la nueva dirección (si se proporcionó)
      const hasAddressUpdate =
        validatedData.street ||
        validatedData.apartment !== undefined ||
        validatedData.comuna ||
        validatedData.region

      if (hasAddressUpdate) {
        await tx.project.update({
          where: { id: targetProjectId },
          data: {
            ...(validatedData.street && { street: validatedData.street }),
            ...(validatedData.apartment !== undefined && { apartment: validatedData.apartment }),
            ...(validatedData.comuna && { comuna: validatedData.comuna }),
            ...(regionNombre && { region: regionNombre }),
          },
        })
      }

      // 2. Actualizar el caso de postventa
      const updatedAftersale = await tx.aftersale.update({
        where: { id },
        data: {
          ...(validatedData.projectId && { projectId: validatedData.projectId }),
          ...(validatedData.aftersaleStatusId && {
            aftersaleStatusId: validatedData.aftersaleStatusId,
          }),
          ...(validatedData.contactPhone && { contactPhone: validatedData.contactPhone }),
          ...(validatedData.description !== undefined && {
            description: validatedData.description,
          }),
          ...(validatedData.reportedAt && { reportedAt: new Date(validatedData.reportedAt) }),
          ...(validatedData.tasks !== undefined && { tasks: validatedData.tasks }),
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error updating aftersale:', error)
    return NextResponse.json({ error: 'Error al actualizar el caso de postventa' }, { status: 500 })
  }
}

/**
 * DELETE /api/aftersales/[id]
 *
 * Elimina permanentemente un caso de postventa
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar que el caso de postventa existe
    const existingAftersale = await prisma.aftersale.findUnique({
      where: { id },
    })

    if (!existingAftersale) {
      return NextResponse.json({ error: 'Caso de postventa no encontrado' }, { status: 404 })
    }

    // Eliminar el caso de postventa (hard delete)
    await prisma.aftersale.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Caso de postventa eliminado' })
  } catch (error) {
    console.error('Error deleting aftersale:', error)
    return NextResponse.json({ error: 'Error al eliminar el caso de postventa' }, { status: 500 })
  }
}
