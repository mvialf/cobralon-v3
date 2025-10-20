import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Schema de validación para actualizar ProjectStatus
 */
const updateProjectStatusSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  colorId: z.string().uuid().optional(),
  order: z.number().int().min(0).optional(),
  isInitial: z.boolean().optional(),
  isFinal: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

/**
 * PUT /api/project-status/[id]
 *
 * Actualiza un estado de proyecto existente
 *
 * Body: Campos opcionales a actualizar
 * ```json
 * {
 *   "name": "Nuevo nombre",
 *   "colorId": "uuid",
 *   "isInitial": true,
 *   "isFinal": false
 * }
 * ```
 *
 * Validaciones:
 * - Si se marca isInitial=true, se desmarca el estado inicial anterior
 * - Si se marca isFinal=true, se desmarca el estado final anterior
 * - El nombre debe ser único (si se cambia)
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updateProjectStatusSchema.parse(body)

    // Verificar que el estado existe
    const existingStatus = await prisma.projectStatus.findUnique({
      where: { id },
    })

    if (!existingStatus) {
      return NextResponse.json({ error: 'Estado no encontrado' }, { status: 404 })
    }

    // Validación: nombre único (si se está cambiando)
    if (validatedData.name && validatedData.name !== existingStatus.name) {
      const duplicateName = await prisma.projectStatus.findUnique({
        where: { name: validatedData.name },
      })

      if (duplicateName) {
        return NextResponse.json(
          { error: `Ya existe un estado con el nombre "${validatedData.name}"` },
          { status: 400 }
        )
      }
    }

    // Validación: colorId existe (si se está cambiando)
    if (validatedData.colorId) {
      const colorExists = await prisma.badgeColor.findUnique({
        where: { id: validatedData.colorId },
      })

      if (!colorExists) {
        return NextResponse.json({ error: 'El color seleccionado no existe' }, { status: 400 })
      }
    }

    // Si se marca como inicial, desmarcar el anterior
    if (validatedData.isInitial === true && !existingStatus.isInitial) {
      await prisma.projectStatus.updateMany({
        where: { isInitial: true, isActive: true },
        data: { isInitial: false },
      })
    }

    // Si se marca como final, desmarcar el anterior
    if (validatedData.isFinal === true && !existingStatus.isFinal) {
      await prisma.projectStatus.updateMany({
        where: { isFinal: true, isActive: true },
        data: { isFinal: false },
      })
    }

    // Calcular order automáticamente si cambia el tipo de estado
    if (validatedData.isInitial !== undefined || validatedData.isFinal !== undefined) {
      const newIsInitial = validatedData.isInitial ?? existingStatus.isInitial
      const newIsFinal = validatedData.isFinal ?? existingStatus.isFinal

      if (newIsInitial && !existingStatus.isInitial) {
        // Cambió a inicial: order = 0
        validatedData.order = 0
      } else if (newIsFinal && !existingStatus.isFinal) {
        // Cambió a final: order = 999
        validatedData.order = 999
      } else if (
        !newIsInitial &&
        !newIsFinal &&
        (existingStatus.isInitial || existingStatus.isFinal)
      ) {
        // Cambió de inicial/final a normal: calcular nuevo order
        const maxNormalOrder = await prisma.projectStatus.findFirst({
          where: {
            isInitial: false,
            isFinal: false,
            order: { lt: 999 },
          },
          orderBy: { order: 'desc' },
          select: { order: true },
        })
        validatedData.order = maxNormalOrder ? maxNormalOrder.order + 10 : 10
      }
    }

    // Actualizar el estado
    const updatedStatus = await prisma.projectStatus.update({
      where: { id },
      data: validatedData,
      include: {
        color: true,
        _count: {
          select: { projects: true },
        },
      },
    })

    return NextResponse.json({ projectStatus: updatedStatus })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error updating project status:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el estado de proyecto' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/project-status/[id]
 *
 * Elimina (soft delete) un estado de proyecto
 *
 * Validaciones:
 * - No se puede eliminar un estado que tiene proyectos asignados
 * - No se puede eliminar el estado inicial (debe haber siempre uno activo)
 * - No se puede eliminar el estado final (debe haber siempre uno activo)
 *
 * Query params:
 * - force: "true" para hacer hard delete (usar con precaución)
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Verificar que el estado existe
    const existingStatus = await prisma.projectStatus.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    })

    if (!existingStatus) {
      return NextResponse.json({ error: 'Estado no encontrado' }, { status: 404 })
    }

    // Validación: no eliminar si tiene proyectos
    if (existingStatus._count.projects > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el estado "${existingStatus.name}" porque tiene ${existingStatus._count.projects} proyecto(s) asignado(s)`,
        },
        { status: 400 }
      )
    }

    // Validación: no eliminar el único estado inicial activo
    if (existingStatus.isInitial && existingStatus.isActive) {
      const otherInitialActive = await prisma.projectStatus.findFirst({
        where: {
          id: { not: id },
          isInitial: true,
          isActive: true,
        },
      })

      if (!otherInitialActive) {
        return NextResponse.json(
          {
            error:
              'No se puede eliminar el estado inicial. Debe haber al menos un estado inicial activo.',
          },
          { status: 400 }
        )
      }
    }

    // Validación: no eliminar el único estado final activo
    if (existingStatus.isFinal && existingStatus.isActive) {
      const otherFinalActive = await prisma.projectStatus.findFirst({
        where: {
          id: { not: id },
          isFinal: true,
          isActive: true,
        },
      })

      if (!otherFinalActive) {
        return NextResponse.json(
          {
            error:
              'No se puede eliminar el estado final. Debe haber al menos un estado final activo.',
          },
          { status: 400 }
        )
      }
    }

    if (force) {
      // Hard delete
      await prisma.projectStatus.delete({
        where: { id },
      })

      return NextResponse.json({ message: 'Estado eliminado permanentemente' })
    } else {
      // Soft delete
      const deletedStatus = await prisma.projectStatus.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        message: 'Estado desactivado',
        projectStatus: deletedStatus,
      })
    }
  } catch (error) {
    console.error('Error deleting project status:', error)
    return NextResponse.json({ error: 'Error al eliminar el estado de proyecto' }, { status: 500 })
  }
}
