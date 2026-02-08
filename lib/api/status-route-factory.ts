/**
 * Factory para generar handlers de API routes de status.
 *
 * Las 3 entidades de status (project, aftersale, visit) comparten
 * la misma lógica de CRUD y reorder. Esta factory genera los handlers
 * parametrizados por configuración.
 *
 * Uso:
 * ```ts
 * const config = STATUS_CONFIGS.project
 * export const GET = createStatusListHandler(config)
 * export const POST = createStatusCreateHandler(config)
 * ```
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createStatusApiSchema,
  updateStatusApiSchema,
  type CreateStatusApiBody,
  type UpdateStatusApiBody,
} from '@/lib/validations/base-status-validations'
import { reorderStatusSchema, type ReorderStatusBody } from '@/lib/validations/reorder-validations'

// ============================================================================
// Configuración
// ============================================================================

export interface StatusRouteConfig {
  /** Modelo Prisma: 'projectStatus' | 'aftersaleStatus' | 'visitStatus' */
  model: 'projectStatus' | 'aftersaleStatus' | 'visitStatus'
  /** Campo de relación para _count: 'projects' | 'aftersales' | 'visits' */
  countField: 'projects' | 'aftersales' | 'visits'
  /** Key plural en respuestas JSON: 'projectStatuses' etc. */
  responseKeyPlural: string
  /** Key singular en respuestas JSON: 'projectStatus' etc. */
  responseKeySingular: string
  /** Label para mensajes de error: 'proyecto', 'postventa', 'visita' */
  entityLabel: string
}

export const STATUS_CONFIGS = {
  project: {
    model: 'projectStatus',
    countField: 'projects',
    responseKeyPlural: 'projectStatuses',
    responseKeySingular: 'projectStatus',
    entityLabel: 'proyecto',
  },
  aftersale: {
    model: 'aftersaleStatus',
    countField: 'aftersales',
    responseKeyPlural: 'aftersaleStatuses',
    responseKeySingular: 'aftersaleStatus',
    entityLabel: 'postventa',
  },
  visit: {
    model: 'visitStatus',
    countField: 'visits',
    responseKeyPlural: 'visitStatuses',
    responseKeySingular: 'visitStatus',
    entityLabel: 'visita',
  },
} as const satisfies Record<string, StatusRouteConfig>

// ============================================================================
// Helper para acceso dinámico a modelos Prisma
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(config: StatusRouteConfig): any {
  return prisma[config.model]
}

// ============================================================================
// GET /api/*-status — Listar estados
// ============================================================================

export function createStatusListHandler(config: StatusRouteConfig) {
  return withApiHandler(
    async (request) => {
      const { searchParams } = new URL(request.url)
      const includeInactive = searchParams.get('includeInactive') === 'true'
      const includeColor = searchParams.get('includeColor') !== 'false'

      const model = getModel(config)
      const statuses = await model.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          order: true,
          colorId: true,
          isInitial: true,
          isFinal: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          ...(includeColor && {
            color: {
              select: {
                id: true,
                name: true,
                key: true,
                bgClass: true,
                textClass: true,
              },
            },
          }),
          _count: {
            select: { [config.countField]: true },
          },
        },
      })

      return NextResponse.json({ [config.responseKeyPlural]: statuses })
    },
    { fallbackError: `Error al obtener los estados de ${config.entityLabel}` }
  )
}

// ============================================================================
// POST /api/*-status — Crear estado
// ============================================================================

export function createStatusCreateHandler(config: StatusRouteConfig) {
  return withApiHandler<CreateStatusApiBody>(
    async (_request, logger, { body }) => {
      const model = getModel(config)

      // Validaciones en paralelo
      const [existingByName, colorExists, currentInitial, currentFinal] = await Promise.all([
        model.findUnique({ where: { name: body.name } }),
        prisma.badgeColor.findUnique({ where: { id: body.colorId } }),
        body.isInitial
          ? model.findFirst({ where: { isInitial: true, isActive: true } })
          : Promise.resolve(null),
        body.isFinal
          ? model.findFirst({ where: { isFinal: true, isActive: true } })
          : Promise.resolve(null),
      ])

      if (existingByName) {
        throw new BusinessError(`Ya existe un estado con el nombre "${body.name}"`)
      }

      if (body.isInitial && currentInitial) {
        throw new BusinessError(
          `Ya existe un estado inicial: "${currentInitial.name}". Solo puede haber uno.`
        )
      }

      if (body.isFinal && currentFinal) {
        throw new BusinessError(
          `Ya existe un estado final: "${currentFinal.name}". Solo puede haber uno.`
        )
      }

      if (!colorExists) {
        throw new BusinessError('El color seleccionado no existe')
      }

      // Calcular order automáticamente
      let order: number
      if (body.isInitial) {
        order = 0
      } else if (body.isFinal) {
        order = 999
      } else {
        const maxNormalOrder = await model.findFirst({
          where: { isInitial: false, isFinal: false, order: { lt: 999 } },
          orderBy: { order: 'desc' },
          select: { order: true },
        })
        order = maxNormalOrder ? maxNormalOrder.order + 10 : 10
      }

      const newStatus = await model.create({
        data: {
          name: body.name,
          colorId: body.colorId,
          order,
          isInitial: body.isInitial ?? false,
          isFinal: body.isFinal ?? false,
          isActive: body.isActive ?? true,
        },
        include: { color: true },
      })

      logger.info({ statusId: newStatus.id }, `${config.model} created`)
      return NextResponse.json({ [config.responseKeySingular]: newStatus }, { status: 201 })
    },
    {
      bodySchema: createStatusApiSchema,
      fallbackError: `Error al crear el estado de ${config.entityLabel}`,
    }
  )
}

// ============================================================================
// PUT /api/*-status/[id] — Actualizar estado
// ============================================================================

export function createStatusUpdateHandler(config: StatusRouteConfig) {
  return withApiHandler<UpdateStatusApiBody>(
    async (_request, _logger, { params, body }) => {
      const { id } = params
      const model = getModel(config)

      const existingStatus = await model.findUnique({ where: { id } })
      if (!existingStatus) {
        throw new BusinessError('Estado no encontrado', 404)
      }

      // Validar nombre único
      if (body.name && body.name !== existingStatus.name) {
        const duplicateName = await model.findUnique({ where: { name: body.name } })
        if (duplicateName) {
          throw new BusinessError(`Ya existe un estado con el nombre "${body.name}"`)
        }
      }

      // Validar colorId
      if (body.colorId) {
        const colorExists = await prisma.badgeColor.findUnique({ where: { id: body.colorId } })
        if (!colorExists) {
          throw new BusinessError('El color seleccionado no existe')
        }
      }

      // Desmarcar estados únicos si es necesario
      if (body.isInitial === true && !existingStatus.isInitial) {
        await model.updateMany({
          where: { isInitial: true, isActive: true },
          data: { isInitial: false },
        })
      }

      if (body.isFinal === true && !existingStatus.isFinal) {
        await model.updateMany({
          where: { isFinal: true, isActive: true },
          data: { isFinal: false },
        })
      }

      // Calcular order automáticamente si cambia el tipo
      const updateData = { ...body }
      if (body.isInitial !== undefined || body.isFinal !== undefined) {
        const newIsInitial = body.isInitial ?? existingStatus.isInitial
        const newIsFinal = body.isFinal ?? existingStatus.isFinal

        if (newIsInitial && !existingStatus.isInitial) {
          updateData.order = 0
        } else if (newIsFinal && !existingStatus.isFinal) {
          updateData.order = 999
        } else if (
          !newIsInitial &&
          !newIsFinal &&
          (existingStatus.isInitial || existingStatus.isFinal)
        ) {
          const maxNormalOrder = await model.findFirst({
            where: { isInitial: false, isFinal: false, order: { lt: 999 } },
            orderBy: { order: 'desc' },
            select: { order: true },
          })
          updateData.order = maxNormalOrder ? maxNormalOrder.order + 10 : 10
        }
      }

      const updatedStatus = await model.update({
        where: { id },
        data: updateData,
        include: {
          color: true,
          _count: { select: { [config.countField]: true } },
        },
      })

      return NextResponse.json({ [config.responseKeySingular]: updatedStatus })
    },
    {
      bodySchema: updateStatusApiSchema,
      validateUuidParams: ['id'],
      fallbackError: `Error al actualizar el estado de ${config.entityLabel}`,
    }
  )
}

// ============================================================================
// DELETE /api/*-status/[id] — Eliminar estado (soft/hard)
// ============================================================================

export function createStatusDeleteHandler(config: StatusRouteConfig) {
  return withApiHandler(
    async (request, _logger, { params }) => {
      const { id } = params
      const { searchParams } = new URL(request.url)
      const force = searchParams.get('force') === 'true'
      const model = getModel(config)

      const existingStatus = await model.findUnique({
        where: { id },
        include: { _count: { select: { [config.countField]: true } } },
      })

      if (!existingStatus) {
        throw new BusinessError('Estado no encontrado', 404)
      }

      // No eliminar si tiene entidades asignadas
      const count = existingStatus._count[config.countField]
      if (count > 0) {
        throw new BusinessError(
          `No se puede eliminar el estado "${existingStatus.name}" porque tiene ${count} ${config.entityLabel}(s) asignado(s)`
        )
      }

      // No eliminar único estado inicial activo
      if (existingStatus.isInitial && existingStatus.isActive) {
        const otherInitial = await model.findFirst({
          where: { id: { not: id }, isInitial: true, isActive: true },
        })
        if (!otherInitial) {
          throw new BusinessError(
            'No se puede eliminar el estado inicial. Debe haber al menos un estado inicial activo.'
          )
        }
      }

      // No eliminar único estado final activo
      if (existingStatus.isFinal && existingStatus.isActive) {
        const otherFinal = await model.findFirst({
          where: { id: { not: id }, isFinal: true, isActive: true },
        })
        if (!otherFinal) {
          throw new BusinessError(
            'No se puede eliminar el estado final. Debe haber al menos un estado final activo.'
          )
        }
      }

      if (force) {
        await model.delete({ where: { id } })
        return NextResponse.json({ message: 'Estado eliminado permanentemente' })
      } else {
        const deletedStatus = await model.update({
          where: { id },
          data: { isActive: false },
        })
        return NextResponse.json({
          message: 'Estado desactivado',
          [config.responseKeySingular]: deletedStatus,
        })
      }
    },
    {
      validateUuidParams: ['id'],
      fallbackError: `Error al eliminar el estado de ${config.entityLabel}`,
    }
  )
}

// ============================================================================
// POST /api/*-status/reorder — Reordenar estados
// ============================================================================

export function createStatusReorderHandler(config: StatusRouteConfig) {
  return withApiHandler<ReorderStatusBody>(
    async (_request, _logger, { body }) => {
      const { statusIds } = body
      const model = getModel(config)

      const existingStatuses = await model.findMany({
        where: { id: { in: statusIds } },
        select: { id: true, name: true, isInitial: true, isFinal: true, isActive: true },
      })

      if (existingStatuses.length !== statusIds.length) {
        const foundIds = existingStatuses.map((s: { id: string }) => s.id)
        const missingIds = statusIds.filter((id: string) => !foundIds.includes(id))
        throw new BusinessError(`Estados no encontrados: ${missingIds.join(', ')}`, 404)
      }

      const invalidStatuses = existingStatuses.filter(
        (s: { isInitial: boolean; isFinal: boolean }) => s.isInitial || s.isFinal
      )
      if (invalidStatuses.length > 0) {
        const names = invalidStatuses.map((s: { name: string }) => `"${s.name}"`).join(', ')
        throw new BusinessError(`No se pueden reordenar estados inicial o final: ${names}`, 400)
      }

      const inactiveStatuses = existingStatuses.filter((s: { isActive: boolean }) => !s.isActive)
      if (inactiveStatuses.length > 0) {
        const names = inactiveStatuses.map((s: { name: string }) => `"${s.name}"`).join(', ')
        throw new BusinessError(`No se pueden reordenar estados inactivos: ${names}`, 400)
      }

      const updates = statusIds.map((id: string, index: number) => ({
        id,
        order: (index + 1) * 10,
      }))

      await prisma.$transaction(
        updates.map((update: { id: string; order: number }) =>
          model.update({
            where: { id: update.id },
            data: { order: update.order },
          })
        )
      )

      const allStatuses = await model.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: {
          color: {
            select: { id: true, name: true, key: true, bgClass: true, textClass: true },
          },
          _count: { select: { [config.countField]: true } },
        },
      })

      return NextResponse.json({
        message: 'Estados reordenados correctamente',
        [config.responseKeyPlural]: allStatuses,
      })
    },
    {
      bodySchema: reorderStatusSchema,
      fallbackError: `Error al reordenar los estados de ${config.entityLabel}`,
    }
  )
}
