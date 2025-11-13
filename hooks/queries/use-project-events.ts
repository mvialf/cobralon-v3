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
