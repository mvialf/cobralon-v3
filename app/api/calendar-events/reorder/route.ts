import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { reorderEventsSchema } from '@/lib/validations/calendar-validations'
import { withLogging } from '@/lib/logger-middleware'

/**
 * PATCH /api/calendar-events/reorder
 *
 * Actualiza el orden de múltiples eventos de calendario.
 * Usado para drag & drop dentro del mismo día.
 *
 * Body:
 *   - events: Array de { id, type, order }
 */
export const PATCH = withLogging(async (request, logger) => {
  try {
    const body = await request.json()

    // Validar body
    const validationResult = reorderEventsSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn({ errors: validationResult.error.errors }, 'Invalid reorder request')
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { events } = validationResult.data

    logger.debug({ eventsCount: events.length }, 'Reordering calendar events')

    // Agrupar eventos por tipo para hacer batch updates
    const projectEvents = events.filter((e) => e.type === 'project')
    const aftersaleEvents = events.filter((e) => e.type === 'aftersale')
    const visitEvents = events.filter((e) => e.type === 'visit')

    // Ejecutar updates en paralelo por tipo
    // Usamos transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // Update ProjectEvents
      await Promise.all(
        projectEvents.map((event) =>
          tx.projectEvent.update({
            where: { id: event.id },
            data: { order: event.order },
          })
        )
      )

      // Update AftersaleEvents
      await Promise.all(
        aftersaleEvents.map((event) =>
          tx.aftersaleEvent.update({
            where: { id: event.id },
            data: { order: event.order },
          })
        )
      )

      // Update VisitEvents
      await Promise.all(
        visitEvents.map((event) =>
          tx.visitEvent.update({
            where: { id: event.id },
            data: { order: event.order },
          })
        )
      )
    })

    logger.info(
      {
        projectEvents: projectEvents.length,
        aftersaleEvents: aftersaleEvents.length,
        visitEvents: visitEvents.length,
      },
      'Events reordered successfully'
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Failed to reorder calendar events')
    return NextResponse.json({ error: 'Error al reordenar eventos' }, { status: 500 })
  }
})
