import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleMutationError } from '@/lib/errors'
import type {
  ProjectEventWithRelations,
  CreateProjectEventInput,
  UpdateProjectEventInput,
} from '@/lib/types/calendar'

/**
 * Hooks de React Query para ProjectEvents
 *
 * Convenciones:
 * - Mutations invalidan ['calendar-events'] automáticamente
 * - Toast feedback para todas las operaciones
 */

// ============================================================================
// MUTATIONS: CREATE
// ============================================================================

async function createProjectEvent(
  data: CreateProjectEventInput
): Promise<ProjectEventWithRelations> {
  const response = await fetch('/api/project-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al crear evento')
  }

  return response.json()
}

export function useCreateProjectEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProjectEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

// ============================================================================
// MUTATIONS: CREATE WITH PROJECT UPDATE
// ============================================================================

interface CreateProjectEventWithUpdateInput {
  projectId: string
  scheduledDate: Date | string
  notes?: string | null
  phone: string
  street: string
  apartment: string | null
  comuna: string
  region: string
  windowsCount: number
  squareMeters: number
  description: string | null
}

interface CreateProjectEventWithUpdateResponse {
  event: ProjectEventWithRelations
  projectUpdated: boolean
}

async function createProjectEventWithUpdate(
  data: CreateProjectEventWithUpdateInput
): Promise<CreateProjectEventWithUpdateResponse> {
  const response = await fetch('/api/project-events-with-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    // Log detalles de validación para debugging
    if (error.details) {
      console.error('❌ Validation errors:', error.details)
      console.error('📤 Data sent:', data)
    }
    throw new Error(error.error || 'Error al crear evento')
  }

  return response.json()
}

export function useCreateProjectEventWithUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProjectEventWithUpdate,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })

      // Toast diferenciado según si se actualizó el proyecto
      if (result.projectUpdated) {
        toast.success('Evento creado y datos del proyecto actualizados')
      } else {
        toast.success('Evento creado exitosamente')
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

interface UpdateProjectEventParams {
  id: string
  data: UpdateProjectEventInput
}

async function updateProjectEvent({
  id,
  data,
}: UpdateProjectEventParams): Promise<ProjectEventWithRelations> {
  const response = await fetch(`/api/project-events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar evento')
  }

  return response.json()
}

export function useUpdateProjectEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProjectEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

// ============================================================================
// MUTATIONS: UPDATE DATE (Drag & Drop con Optimistic Updates)
// ============================================================================

interface UpdateProjectEventDateParams {
  id: string
  scheduledDate: Date
}

async function updateProjectEventDate({
  id,
  scheduledDate,
}: UpdateProjectEventDateParams): Promise<ProjectEventWithRelations> {
  const response = await fetch(`/api/project-events/${id}`, {
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

export function useUpdateProjectEventDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProjectEventDate,
    // Optimistic update: actualiza UI inmediatamente
    onMutate: async ({ id, scheduledDate }) => {
      // Cancelar queries en curso para evitar que sobrescriban el optimistic update
      await queryClient.cancelQueries({ queryKey: ['calendar-events'] })

      // Snapshot del estado anterior (para rollback)
      const previousEvents = queryClient.getQueryData(['calendar-events'])

      // Actualizar optimísticamente
      queryClient.setQueryData(['calendar-events'], (old: any) => {
        if (!old?.events) return old

        return {
          ...old,
          events: old.events.map((event: any) => {
            if (event.type === 'project' && event.data.id === id) {
              return {
                ...event,
                data: {
                  ...event.data,
                  scheduledDate: scheduledDate.toISOString(), // ✅ Mantener consistencia de tipos
                },
              }
            }
            return event
          }),
        }
      })

      // Retornar snapshot para rollback
      return { previousEvents }
    },
    // Si falla, rollback al estado anterior
    onError: (error, variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(['calendar-events'], context.previousEvents)
      }
      handleMutationError(error)
    },
    // Invalidar queries después de la mutación para refrescar UI
    // Usa onSettled (no onSuccess) para ejecutar siempre, incluso si falla
    onSettled: () => {
      // Invalidar sin await para evitar bloqueo
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}

// ============================================================================
// MUTATIONS: DELETE
// ============================================================================

async function deleteProjectEvent(id: string): Promise<void> {
  const response = await fetch(`/api/project-events/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al eliminar evento')
  }
}

export function useDeleteProjectEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProjectEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento eliminado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}
