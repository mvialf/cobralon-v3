/**
 * Hook compartido para obtener aftersale statuses con caché optimizado
 *
 * Usado por:
 * - components/forms/aftersales/aftersale-form.tsx
 * - components/forms/calendar/aftersale-event-form.tsx
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'

export interface AftersaleStatus {
  id: string
  name: string
  isInitial?: boolean
  isFinal?: boolean
  color: {
    bgClass: string
    textClass?: string
  }
}

interface AftersaleStatusResponse {
  aftersaleStatuses: AftersaleStatus[]
}

/**
 * Hook para obtener lista de aftersale statuses
 *
 * Features:
 * - Caché compartido (queryKey: ['aftersale-statuses'])
 * - Stale time de 5 minutos (statuses cambian raramente)
 * - Type-safe con TypeScript
 * - Auto-retry en errores
 *
 * @returns {Object} - { data: AftersaleStatus[], isLoading, error, refetch }
 */
export function useAftersaleStatuses() {
  return useQuery<AftersaleStatus[]>({
    queryKey: ['aftersale-statuses'],
    queryFn: async () => {
      const response = await fetch('/api/aftersale-status')

      if (!response.ok) {
        throw new Error(`Error al cargar estados: ${response.status} ${response.statusText}`)
      }

      const data: AftersaleStatusResponse = await response.json()
      return data.aftersaleStatuses || []
    },
    // Configuración robusta para formularios:
    // - staleTime corto: garantiza datos frescos al abrir formularios
    // - refetchOnMount: siempre intenta refetch si datos están stale
    // - retry: reintenta en caso de errores transitorios de red
    staleTime: 30 * 1000, // 30 segundos - refetch frecuente en formularios
    gcTime: 10 * 60 * 1000, // 10 minutos en cache (mantener entre navegaciones)
    refetchOnMount: true, // Refetch si datos están stale al montar
    retry: 3, // Reintentar 3 veces en caso de error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Backoff exponencial
  })
}

/**
 * Helper: Obtiene el status inicial por defecto
 *
 * @param statuses - Array de AftersaleStatus
 * @returns AftersaleStatus con isInitial: true, o undefined
 */
export function getInitialAftersaleStatus(
  statuses: AftersaleStatus[]
): AftersaleStatus | undefined {
  return statuses.find((status) => status.isInitial)
}

/**
 * Helper: Obtiene un status por ID
 *
 * @param statuses - Array de AftersaleStatus
 * @param id - ID del status
 * @returns AftersaleStatus encontrado, o undefined
 */
export function getAftersaleStatusById(
  statuses: AftersaleStatus[],
  id: string
): AftersaleStatus | undefined {
  return statuses.find((status) => status.id === id)
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateAftersaleStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<AftersaleStatus> => {
      const response = await fetch('/api/aftersale-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al crear estado')
      }

      const data = await response.json()
      return data.aftersaleStatus
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftersale-statuses'] })
      toast.success('Estado creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, { 409: 'Ya existe un estado con ese nombre' })
    },
  })
}

export function useUpdateAftersaleStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Record<string, unknown>): Promise<AftersaleStatus> => {
      const response = await fetch(`/api/aftersale-status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar estado')
      }

      const data = await response.json()
      return data.aftersaleStatus
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftersale-statuses'] })
      toast.success('Estado actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, { 409: 'Ya existe un estado con ese nombre' })
    },
  })
}
