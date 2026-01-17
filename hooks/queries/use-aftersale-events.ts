import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleMutationError } from '@/lib/errors'
import type {
  AftersaleEventWithRelations,
  CreateAftersaleEventInput,
  UpdateAftersaleEventInput,
  CalendarEventsQueryData,
} from '@/lib/types/calendar'

/**
 * Hooks de React Query para AftersaleEvents
 *
 * Convenciones:
 * - Mutations invalidan ['calendar-events'] automáticamente
 * - Toast feedback para todas las operaciones
 */

// ============================================================================
// MUTATIONS: CREATE
// ============================================================================

async function createAftersaleEvent(
  data: CreateAftersaleEventInput
): Promise<AftersaleEventWithRelations> {
  const response = await fetch('/api/aftersale-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al crear evento de postventa')
  }

  return response.json()
}

export function useCreateAftersaleEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAftersaleEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento de postventa creado exitosamente')
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
 * Input para crear evento con actualización de aftersale + project
 */
interface CreateAftersaleEventWithUpdateInput {
  aftersaleId: string
  scheduledDate: string
  aftersaleStatusId: string
  contactPhone: string
  description?: string
  tasks?: unknown[]
  street: string
  apartment: string | null
  comuna: string
  region: string
  teamTagIds?: string[] | null
}

/**
 * Response del endpoint transaccional
 */
interface CreateAftersaleEventWithUpdateResponse {
  event: AftersaleEventWithRelations
  aftersaleUpdated: boolean
  projectUpdated: boolean
}

async function createAftersaleEventWithUpdate(
  data: CreateAftersaleEventWithUpdateInput
): Promise<CreateAftersaleEventWithUpdateResponse> {
  const response = await fetch('/api/aftersale-events-with-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al crear evento de postventa')
  }

  return response.json()
}

/**
 * Hook para crear evento de aftersale Y actualizar datos del aftersale + project
 *
 * Usa transacción atómica en el backend:
 * 1. Actualiza Aftersale (status, phone, description, tasks)
 * 2. Actualiza Project (dirección)
 * 3. Crea AftersaleEvent
 *
 * Toast diferenciado según qué se actualizó.
 */
export function useCreateAftersaleEventWithUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAftersaleEventWithUpdate,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['aftersales'] })

      // Toast diferenciado según qué se actualizó
      if (result.aftersaleUpdated && result.projectUpdated) {
        toast.success('Evento creado y datos de postventa y proyecto actualizados')
      } else if (result.aftersaleUpdated) {
        toast.success('Evento creado y datos de postventa actualizados')
      } else if (result.projectUpdated) {
        toast.success('Evento creado y dirección del proyecto actualizada')
      } else {
        toast.success('Evento de postventa creado exitosamente')
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

interface UpdateAftersaleEventParams {
  id: string
  data: UpdateAftersaleEventInput
}

async function updateAftersaleEvent({
  id,
  data,
}: UpdateAftersaleEventParams): Promise<AftersaleEventWithRelations> {
  const response = await fetch(`/api/aftersale-events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar evento de postventa')
  }

  return response.json()
}

export function useUpdateAftersaleEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateAftersaleEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento de postventa actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

// ============================================================================
// MUTATIONS: UPDATE DATE (Drag & Drop con Optimistic Updates)
// ============================================================================

interface UpdateAftersaleEventDateParams {
  id: string
  scheduledDate: Date
}

async function updateAftersaleEventDate({
  id,
  scheduledDate,
}: UpdateAftersaleEventDateParams): Promise<AftersaleEventWithRelations> {
  const response = await fetch(`/api/aftersale-events/${id}`, {
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

export function useUpdateAftersaleEventDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateAftersaleEventDate,
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
              if (event.type === 'aftersale' && event.data.id === id) {
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

async function deleteAftersaleEvent(id: string): Promise<void> {
  const response = await fetch(`/api/aftersale-events/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al eliminar evento de postventa')
  }
}

export function useDeleteAftersaleEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAftersaleEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento de postventa eliminado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}
