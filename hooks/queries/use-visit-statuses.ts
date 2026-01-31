/**
 * Hook compartido para obtener visit statuses con caché optimizado
 *
 * Usado por:
 * - components/forms/visits/visit-form.tsx
 * - components/forms/calendar/visit-event-form.tsx
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'

export interface VisitStatus {
  id: string
  name: string
  isInitial?: boolean
  isFinal?: boolean
  color: {
    bgClass: string
    textClass?: string
  }
}

interface VisitStatusResponse {
  visitStatuses: VisitStatus[]
}

/**
 * Hook para obtener lista de visit statuses
 *
 * Features:
 * - Caché compartido (queryKey: ['visit-statuses'])
 * - Stale time de 5 minutos (statuses cambian raramente)
 * - Type-safe con TypeScript
 * - Auto-retry en errores
 *
 * @returns {Object} - { data: VisitStatus[], isLoading, error, refetch }
 */
export function useVisitStatuses() {
  return useQuery<VisitStatus[]>({
    queryKey: ['visit-statuses'],
    queryFn: async () => {
      const response = await fetch('/api/visit-status')

      if (!response.ok) {
        throw new Error(`Error al cargar estados: ${response.status} ${response.statusText}`)
      }

      const data: VisitStatusResponse = await response.json()
      return data.visitStatuses || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - statuses cambian raramente
    gcTime: 10 * 60 * 1000, // 10 minutos en cache
  })
}

/**
 * Helper: Obtiene el status inicial por defecto
 *
 * @param statuses - Array de VisitStatus
 * @returns VisitStatus con isInitial: true, o undefined
 */
export function getInitialVisitStatus(statuses: VisitStatus[]): VisitStatus | undefined {
  return statuses.find((status) => status.isInitial)
}

/**
 * Helper: Obtiene un status por ID
 *
 * @param statuses - Array de VisitStatus
 * @param id - ID del status
 * @returns VisitStatus encontrado, o undefined
 */
export function getVisitStatusById(statuses: VisitStatus[], id: string): VisitStatus | undefined {
  return statuses.find((status) => status.id === id)
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateVisitStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<VisitStatus> => {
      const response = await fetch('/api/visit-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al crear estado')
      }

      const data = await response.json()
      return data.visitStatus
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-statuses'] })
      toast.success('Estado creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, { 409: 'Ya existe un estado con ese nombre' })
    },
  })
}

export function useUpdateVisitStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Record<string, unknown>): Promise<VisitStatus> => {
      const response = await fetch(`/api/visit-status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar estado')
      }

      const data = await response.json()
      return data.visitStatus
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-statuses'] })
      toast.success('Estado actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, { 409: 'Ya existe un estado con ese nombre' })
    },
  })
}
