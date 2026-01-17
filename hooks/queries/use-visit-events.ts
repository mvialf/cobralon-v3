import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleMutationError } from '@/lib/errors'
import type {
  VisitEventWithRelations,
  CreateVisitEventInput,
  UpdateVisitEventInput,
  CalendarEventsQueryData,
} from '@/lib/types/calendar'

/**
 * Hooks de React Query para VisitEvents
 *
 * Convenciones:
 * - Mutations invalidan ['calendar-events'] automáticamente
 * - Toast feedback para todas las operaciones
 */

// ============================================================================
// MUTATIONS: CREATE
// ============================================================================

async function createVisitEvent(data: CreateVisitEventInput): Promise<VisitEventWithRelations> {
  const response = await fetch('/api/visit-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al crear evento de visita')
  }

  return response.json()
}

export function useCreateVisitEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createVisitEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento de visita creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

// ============================================================================
// MUTATIONS: CREATE WITH UPDATE (Transaccional)
// ============================================================================

/**
 * Input para crear evento con actualización de visit
 */
interface CreateVisitEventWithUpdateInput {
  visitId: string
  scheduledDate: string
  visitStatusId: string
  name: string
  phone?: string
  observations?: string | null
  street: string
  apartment?: string | null
  comuna: string
  region: string
  teamTagIds?: string[] | null
}

/**
 * Response del endpoint transaccional
 */
interface CreateVisitEventWithUpdateResponse {
  event: VisitEventWithRelations
  visitUpdated: boolean
}

async function createVisitEventWithUpdate(
  data: CreateVisitEventWithUpdateInput
): Promise<CreateVisitEventWithUpdateResponse> {
  const response = await fetch('/api/visit-events-with-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al crear evento de visita')
  }

  return response.json()
}

/**
 * Hook para crear evento de visita Y actualizar datos de la visita
 *
 * Usa transacción atómica en el backend:
 * 1. Actualiza Visit (status, name, phone, observations, dirección)
 * 2. Crea VisitEvent
 *
 * Toast diferenciado según qué se actualizó.
 */
export function useCreateVisitEventWithUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createVisitEventWithUpdate,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['visits'] })

      // Toast diferenciado según qué se actualizó
      if (result.visitUpdated) {
        toast.success('Evento creado y datos de visita actualizados')
      } else {
        toast.success('Evento de visita creado exitosamente')
      }
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

// ============================================================================
// MUTATIONS: UPDATE
// ============================================================================

interface UpdateVisitEventParams {
  id: string
  data: UpdateVisitEventInput
}

async function updateVisitEvent({
  id,
  data,
}: UpdateVisitEventParams): Promise<VisitEventWithRelations> {
  const response = await fetch(`/api/visit-events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar evento de visita')
  }

  return response.json()
}

export function useUpdateVisitEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateVisitEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento de visita actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

// ============================================================================
// MUTATIONS: UPDATE DATE (Drag & Drop con Optimistic Updates)
// ============================================================================

interface UpdateVisitEventDateParams {
  id: string
  scheduledDate: Date
}

async function updateVisitEventDate({
  id,
  scheduledDate,
}: UpdateVisitEventDateParams): Promise<VisitEventWithRelations> {
  const response = await fetch(`/api/visit-events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduledDate: scheduledDate.toISOString() }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar fecha del evento')
  }

  return response.json()
}

export function useUpdateVisitEventDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateVisitEventDate,
    // Optimistic update: actualiza UI inmediatamente
    onMutate: async ({ id, scheduledDate }) => {
      // Cancelar queries en curso para evitar que sobrescriban el optimistic update
      await queryClient.cancelQueries({ queryKey: ['calendar-events'] })

      // Snapshot del estado anterior (para rollback)
      // IMPORTANTE: Usar getQueriesData con partial match porque el queryKey incluye fechas
      const previousQueries = queryClient.getQueriesData<CalendarEventsQueryData>({
        queryKey: ['calendar-events'],
      })

      // Actualizar optimísticamente TODAS las queries que coincidan
      // IMPORTANTE: setQueriesData hace partial match, setQueryData requiere key exacto
      // Nota: usamos unknown porque el optimistic update convierte Date a string temporalmente
      queryClient.setQueriesData<CalendarEventsQueryData>(
        { queryKey: ['calendar-events'] },
        (old) => {
          if (!old?.events) return old

          return {
            ...old,
            events: old.events.map((event) => {
              if (event.type === 'visit' && event.data.id === id) {
                return {
                  ...event,
                  data: {
                    ...event.data,
                    scheduledDate: scheduledDate.toISOString(),
                  },
                } as unknown as typeof event
              }
              return event
            }),
          }
        }
      )

      // Retornar snapshot para rollback
      return { previousQueries }
    },
    // Si falla, rollback al estado anterior
    onError: (error, _variables, context) => {
      // Restaurar todas las queries al estado anterior
      if (context?.previousQueries) {
        context.previousQueries.forEach(
          ([queryKey, data]: [QueryKey, CalendarEventsQueryData | undefined]) => {
            queryClient.setQueryData(queryKey, data)
          }
        )
      }
      handleMutationError(error)
    },
    // Invalidar queries después de la mutación para refrescar UI
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}

// ============================================================================
// MUTATIONS: DELETE
// ============================================================================

async function deleteVisitEvent(id: string): Promise<void> {
  const response = await fetch(`/api/visit-events/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al eliminar evento de visita')
  }
}

export function useDeleteVisitEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteVisitEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento de visita eliminado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}
