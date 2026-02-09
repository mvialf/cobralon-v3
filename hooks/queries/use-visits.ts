import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleMutationError } from '@/lib/errors'
import {
  type Visit,
  type CreateVisitInput,
  type UpdateVisitInput,
  formValuesToPayload,
} from '@/lib/validations/visit-validations'

/**
 * Hooks de React Query para Visits
 *
 * Convenciones:
 * - Query keys: ['visits'] para list, ['visits', id] para single
 * - Mutations invalidan queries relacionadas automáticamente
 */

// ============================================================================
// TYPES
// ============================================================================

/** Params para GET /api/visits */
export interface VisitsQueryParams {
  page?: number
  limit?: number
  search?: string
  visitStatusIds?: string[]
  includeFacets?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface VisitFacet {
  value: string
  label: string
  count: number
}

/** Respuesta de GET /api/visits */
export interface VisitsResponse {
  data: Visit[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  facets?: {
    visitStatus: VisitFacet[]
  }
}

/** Datos para PUT /api/visits/[id] */
export interface UpdateVisitData extends Partial<UpdateVisitInput> {
  id: string
}

// ============================================================================
// QUERY: GET LIST
// ============================================================================

/**
 * Hook para obtener lista de visitas con paginación y filtros
 *
 * @param params - Filtros opcionales
 * @param params.page - Número de página (default: 1)
 * @param params.limit - Registros por página (default: 50, max: 100)
 * @param params.search - Búsqueda por nombre, teléfono, dirección o comuna
 * @param params.visitStatusIds - Filtrar por estados (array de IDs)
 *
 * @returns Query con visits y paginación
 *
 * **OPTIMIZACIONES:**
 * - `placeholderData: keepPreviousData` → Smooth transitions entre páginas (mantiene datos anteriores mientras carga)
 * - Cache de 1 minuto → Balance entre frescura y performance
 * - Query keys por página → Cada página se cachea individualmente
 *
 * @example
 * ```tsx
 * const { data, isLoading, isPlaceholderData } = useVisits({
 *   page: 1,
 *   limit: 50,
 *   search: 'Juan',
 *   visitStatusIds: ['status-id-1', 'status-id-2']
 * })
 *
 * // Prefetch página siguiente para mejor UX
 * const queryClient = useQueryClient()
 * queryClient.prefetchQuery({
 *   queryKey: ['visits', { ...params, page: params.page + 1 }],
 *   queryFn: () => fetch('/api/visits?page=2&limit=50').then(r => r.json())
 * })
 * ```
 */
export function useVisits(params: VisitsQueryParams = {}) {
  return useQuery({
    queryKey: ['visits', params],
    queryFn: async (): Promise<VisitsResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.search) searchParams.set('search', params.search)
      if (params.visitStatusIds?.length)
        searchParams.set('visitStatusIds', params.visitStatusIds.join(','))
      if (params.includeFacets) searchParams.set('includeFacets', 'true')
      if (params.sortBy) searchParams.set('sortBy', params.sortBy)
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

      const response = await fetch(`/api/visits?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar visitas')
      }

      return response.json()
    },
    placeholderData: keepPreviousData, // ← Mantener datos anteriores durante transición
    staleTime: 60 * 1000, // 1 minuto - datos cambian ocasionalmente
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  })
}

// ============================================================================
// QUERY: GET SINGLE
// ============================================================================

/**
 * Hook para obtener una visita específica por ID
 *
 * @example
 * const { data: visit, isLoading } = useVisit(visitId)
 */
export function useVisit(id: string | undefined) {
  return useQuery({
    queryKey: ['visits', id],
    queryFn: async (): Promise<Visit> => {
      if (!id) throw new Error('Visit ID is required')

      const response = await fetch(`/api/visits/${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar visita')
      }

      return response.json()
    },
    enabled: !!id, // Solo ejecutar si hay ID
  })
}

// ============================================================================
// MUTATION: CREATE
// ============================================================================

/**
 * Hook para crear una nueva visita
 *
 * @example
 * const createMutation = useCreateVisit()
 *
 * await createMutation.mutateAsync({
 *   name: 'Juan Perez',
 *   phone: '+56912345678',
 *   ...
 * })
 */
export function useCreateVisit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateVisitInput): Promise<Visit> => {
      // Transformar form values a API payload (Date → ISO string)
      const payload = formValuesToPayload(data)

      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear visita')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidar lista de visitas para refrescar
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      toast.success('Visita creada exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

// ============================================================================
// MUTATION: UPDATE
// ============================================================================

/**
 * Hook para actualizar una visita existente
 *
 * @example
 * const updateMutation = useUpdateVisit()
 *
 * await updateMutation.mutateAsync({
 *   id: 'visit-id',
 *   name: 'Nuevo nombre',
 *   ...
 * })
 */
export function useUpdateVisit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateVisitData): Promise<Visit> => {
      const response = await fetch(`/api/visits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar visita')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidar lista de visitas y visita específica
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      queryClient.invalidateQueries({ queryKey: ['visits', variables.id] })
      toast.success('Visita actualizada exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

// ============================================================================
// MUTATION: DELETE
// ============================================================================

/**
 * Hook para eliminar una visita
 *
 * @example
 * const deleteMutation = useDeleteVisit()
 *
 * await deleteMutation.mutateAsync('visit-id')
 */
export function useDeleteVisit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/visits/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar visita')
      }
    },
    onSuccess: () => {
      // Invalidar lista de visitas
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      toast.success('Visita eliminada exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}
