import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { ProjectUpdateInput } from '@/types/api'

/**
 * GET /api/projects/[id]
 *
 * Obtiene un proyecto específico por ID con sus relaciones
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
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

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Error al obtener el proyecto' }, { status: 500 })
  }
}

/**
 * PUT /api/projects/[id]
 *
 * Actualiza un proyecto existente
 *
 * Body: Los mismos campos que POST (todos opcionales excepto los que se quieran actualizar)
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verificar que el proyecto existe
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Si se actualiza el customerId, verificar que existe
    if (body.customerId) {
      const customerExists = await prisma.customer.findUnique({
        where: { id: body.customerId },
      })

      if (!customerExists) {
        return NextResponse.json({ error: 'El cliente no existe' }, { status: 404 })
      }
    }

    // Calcular total si se actualizaron subtotal o taxRate
    let updatedTotal: Decimal | undefined
    let updatedTotalAmount: Decimal | undefined
    if (body.subtotal !== undefined || body.taxRate !== undefined) {
      const subtotal = body.subtotal ?? existingProject.subtotal.toNumber()
      const taxRate = body.taxRate ?? existingProject.taxRate.toNumber()
      updatedTotal = new Decimal(subtotal + subtotal * (taxRate / 100))
      // También actualizar totalAmount si no viene en el body
      if (body.totalAmount === undefined) {
        updatedTotalAmount = updatedTotal
      }
    }

    // Preparar datos para actualizar
    const updateData: ProjectUpdateInput = {}

    if (body.customerId) updateData.customer = { connect: { id: body.customerId } }
    if (body.projectNumber !== undefined) updateData.projectNumber = body.projectNumber.trim()
    if (body.projectName !== undefined) updateData.projectName = body.projectName?.trim() || null
    if (body.phone !== undefined) updateData.phone = body.phone.trim()
    if (body.street !== undefined) updateData.street = body.street.trim()
    if (body.apartment !== undefined) updateData.apartment = body.apartment?.trim() || null
    if (body.comuna !== undefined) updateData.comuna = body.comuna.trim()
    if (body.region !== undefined) updateData.region = body.region.trim()
    if (body.projectStatusId !== undefined) {
      updateData.projectStatus = body.projectStatusId
        ? { connect: { id: body.projectStatusId } }
        : { disconnect: true }
    }
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.subtotal !== undefined) updateData.subtotal = new Decimal(body.subtotal)
    if (body.taxRate !== undefined) updateData.taxRate = new Decimal(body.taxRate)
    if (updatedTotal !== undefined) updateData.total = updatedTotal
    if (body.totalAmount !== undefined)
      updateData.totalAmount = body.totalAmount ? new Decimal(body.totalAmount) : null
    else if (updatedTotalAmount !== undefined) updateData.totalAmount = updatedTotalAmount
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.windowsCount !== undefined) updateData.windowsCount = body.windowsCount
    if (body.squareMeters !== undefined) updateData.squareMeters = new Decimal(body.squareMeters)
    if (body.description !== undefined) updateData.description = body.description?.trim() || null

    // Actualizar proyecto
    const project = await prisma.project.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Error al actualizar proyecto' }, { status: 500 })
  }
}

/**
 * DELETE /api/projects/[id]
 *
 * Elimina un proyecto
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar que el proyecto existe
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Eliminar proyecto
    await prisma.project.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Proyecto eliminado exitosamente' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Error al eliminar proyecto' }, { status: 500 })
  }
}
