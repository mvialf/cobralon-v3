import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { ProjectUpdateInput } from '@/types/api'
import { calculateProjectBalance } from '@/lib/business-logic/project-balance'
import { calculateProjectTotal } from '@/lib/business-logic/totals'
import { FINANCIAL } from '@/lib/constants/financial-constants'

/**
 * GET /api/projects/[id]
 *
 * Obtiene un proyecto específico por ID con sus relaciones
 * SIEMPRE incluye totalPaid y balance calculados
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const project = await prisma.project.findUnique({
      relationLoadStrategy: 'join', // Fix N+1: Force database-level JOINs
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
            isFinal: true,
            color: {
              select: {
                bgClass: true,
                textClass: true,
              },
            },
          },
        },
        paymentAllocations: {
          select: {
            allocatedAmount: true,
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

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // SIEMPRE calcular totalPaid y balance
    const { totalPaid, balance, percentPaid } = calculateProjectBalance({
      totalAmount: Number(project.totalAmount),
      allocations: project.paymentAllocations.map((alloc: { allocatedAmount: Decimal }) => ({
        allocatedAmount: Number(alloc.allocatedAmount),
      })),
    })

    // Retornar proyecto con balance calculado
    return NextResponse.json({
      ...project,
      totalAmount: Number(project.totalAmount),
      total: Number(project.total),
      totalPaid,
      balance,
      percentPaid,
    })
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

    // SEGURIDAD: Siempre recalcular total en el servidor cuando cambian subtotal/taxRate
    // Ignoramos totalAmount del cliente para prevenir manipulación
    let updatedTotal: Decimal | undefined
    let updatedTotalAmount: Decimal | undefined
    let updatedBalance: Decimal | undefined

    if (body.subtotal !== undefined || body.taxRate !== undefined) {
      const subtotal = body.subtotal ?? existingProject.subtotal.toNumber()
      const taxRate = body.taxRate ?? existingProject.taxRate.toNumber()

      // Usar función centralizada para cálculo (lib/business-logic/totals.ts)
      const calculatedTotal = calculateProjectTotal(subtotal, taxRate)
      updatedTotal = new Decimal(calculatedTotal)

      // SEGURIDAD: totalAmount siempre es el calculado por el servidor
      // Ignoramos body.totalAmount cuando cambian subtotal/taxRate
      updatedTotalAmount = updatedTotal

      // Auditoría: Loggear si el cliente envió un totalAmount diferente
      if (
        body.totalAmount !== undefined &&
        Math.abs(body.totalAmount - calculatedTotal) > FINANCIAL.TOLERANCE
      ) {
        console.warn(
          `[AUDIT] Client sent different totalAmount (${body.totalAmount}) than server calculated (${calculatedTotal}) for project ${id}`
        )
      }
    }

    // Si cambia el total/totalAmount, recalcular el balance
    // Balance = totalAmount - sum(paymentAllocations)
    // SEGURIDAD: No usar body.totalAmount directamente, siempre recalcular o usar existente
    const finalTotalAmount = updatedTotalAmount ?? existingProject.totalAmount

    if (updatedTotal !== undefined || updatedTotalAmount !== undefined) {
      // Obtener suma de allocations existentes
      const allocationsSum = await prisma.paymentAllocation.aggregate({
        where: { projectId: id },
        _sum: { allocatedAmount: true },
      })
      const totalPaid = allocationsSum._sum.allocatedAmount?.toNumber() || 0
      const newTotalAmount = finalTotalAmount?.toNumber() || 0

      // Recalcular balance: totalAmount - totalPaid
      updatedBalance = new Decimal(newTotalAmount - totalPaid)
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
    // SEGURIDAD: Solo actualizar totalAmount si fue recalculado por el servidor
    // Nunca permitir que el cliente envíe totalAmount directamente
    if (updatedTotalAmount !== undefined) updateData.totalAmount = updatedTotalAmount
    // Actualizar balance si fue recalculado
    if (updatedBalance !== undefined) updateData.balance = updatedBalance
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.windowsCount !== undefined) updateData.windowsCount = body.windowsCount
    if (body.squareMeters !== undefined) updateData.squareMeters = new Decimal(body.squareMeters)
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    // Usar transacción para actualizar proyecto y relaciones M:M de tags
    const project = await prisma.$transaction(async (tx) => {
      // 1. Actualizar proyecto
      await tx.project.update({
        where: { id },
        data: updateData,
      })

      // 2. Si se enviaron uninstallTagIds, actualizar relaciones M:M
      if (body.uninstallTagIds !== undefined) {
        // Eliminar relaciones existentes
        await tx.projectUninstallTag.deleteMany({
          where: { projectId: id },
        })

        // Crear nuevas relaciones si hay tags
        if (body.uninstallTagIds.length > 0) {
          await tx.projectUninstallTag.createMany({
            data: body.uninstallTagIds.map((tagId: string) => ({
              projectId: id,
              uninstallTagId: tagId,
            })),
          })
        }
      }

      // 3. Retornar proyecto con todas las relaciones
      return tx.project.findUnique({
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
