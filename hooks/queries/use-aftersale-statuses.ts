/**
 * Hook compartido para obtener aftersale statuses con caché optimizado
 *
 * Usado por:
 * - components/forms/aftersales/aftersale-form.tsx
 * - components/forms/calendar/aftersale-event-form.tsx
 */

import { useQuery } from '@tanstack/react-query'

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
    staleTime: 5 * 60 * 1000, // 5 minutos - statuses cambian raramente
    gcTime: 10 * 60 * 1000, // 10 minutos en cache
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
