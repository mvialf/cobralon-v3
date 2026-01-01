/**
 * Hook compartido para obtener project statuses con caché optimizado
 *
 * Usado por:
 * - components/forms/projects/project-form.tsx
 * - components/forms/calendar/project-event-form.tsx
 * - app/projects/page.tsx (ya usa React Query directamente)
 */

import { useQuery } from '@tanstack/react-query'

export interface ProjectStatus {
  id: string
  name: string
  isInitial?: boolean
  isFinal?: boolean
  color: {
    bgClass: string
    textClass?: string
  }
}

interface ProjectStatusResponse {
  projectStatuses: ProjectStatus[]
}

/**
 * Hook para obtener lista de project statuses
 *
 * Features:
 * - Caché compartido (queryKey: ['project-statuses'])
 * - Stale time de 5 minutos (statuses cambian raramente)
 * - Type-safe con TypeScript
 * - Auto-retry en errores
 *
 * @returns {Object} - { data: ProjectStatus[], isLoading, error, refetch }
 */
export function useProjectStatuses() {
  return useQuery<ProjectStatus[]>({
    queryKey: ['project-statuses'],
    queryFn: async () => {
      const response = await fetch('/api/project-status')

      if (!response.ok) {
        throw new Error(`Error al cargar estados: ${response.status} ${response.statusText}`)
      }

      const data: ProjectStatusResponse = await response.json()
      return data.projectStatuses || []
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
 * @param statuses - Array de ProjectStatus
 * @returns ProjectStatus con isInitial: true, o undefined
 */
export function getInitialStatus(statuses: ProjectStatus[]): ProjectStatus | undefined {
  return statuses.find((status) => status.isInitial)
}

/**
 * Helper: Obtiene un status por ID
 *
 * @param statuses - Array de ProjectStatus
 * @param id - ID del status
 * @returns ProjectStatus encontrado, o undefined
 */
export function getStatusById(statuses: ProjectStatus[], id: string): ProjectStatus | undefined {
  return statuses.find((status) => status.id === id)
}
