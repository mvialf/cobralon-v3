import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  visitStatusId?: string
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
 * @example
 * const { data, isLoading, error } = useVisits({
 *   page: 1,
 *   limit: 50,
 *   search: 'Juan',
 *   visitStatusId: 'status-id'
 * })
 */
export function useVisits(params: VisitsQueryParams = {}) {
  return useQuery({
    queryKey: ['visits', params],
    queryFn: async (): Promise<VisitsResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.search) searchParams.set('search', params.search)
      if (params.visitStatusId) searchParams.set('visitStatusId', params.visitStatusId)

      const response = await fetch(`/api/visits?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar visitas')
      }

      return response.json()
    },
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
