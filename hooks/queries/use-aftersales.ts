import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'
import type {
  Aftersale,
  CreateAftersalePayload,
  UpdateAftersalePayload,
} from '@/lib/validations/aftersale-validations'

/**
 * Hooks de React Query para Aftersales (Casos de Postventa)
 *
 * Convenciones:
 * - Query keys: ['aftersales'] para lista, ['aftersales', id] para single
 * - Mutations invalidan queries relacionadas automáticamente
 * - Delete usa optimistic updates para UX más rápida
 *
 * IMPORTANTE:
 * - Aftersale pertenece a un Project específico (debe estar finalizado)
 * - Tiene un aftersaleStatus que controla el estado del caso
 * - Incluye tasks (lista de tareas para resolver el caso)
 * - contactPhone es obligatorio (teléfono chileno válido)
 */

// ============================================================================
// TYPES
// ============================================================================

/** Respuesta de GET /api/aftersales */
export interface AftersalesResponse {
  aftersales: Aftersale[]
}

/** Datos para PUT /api/aftersales/[id] */
export interface UpdateAftersaleData {
  id: string
  projectId?: string
  aftersaleStatusId?: string
  contactPhone?: string
  description?: string
  reportedAt?: string | Date
  tasks?: UpdateAftersalePayload['tasks']
}

// ============================================================================
// QUERY: GET LIST
// ============================================================================

/**
 * Hook para obtener lista de casos de postventa
 *
 * @returns Query con aftersales completos
 *
 * **ORDENAMIENTO:** Por reportedAt descendente (más recientes primero)
 *
 * **NOTA:** La API actual NO soporta paginación ni filtros. Retorna todos los casos.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useAftersales()
 * const aftersales = data?.aftersales || []
 * ```
 */
export function useAftersales() {
  return useQuery({
    queryKey: ['aftersales'],
    queryFn: async (): Promise<AftersalesResponse> => {
      const response = await fetch('/api/aftersales')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar casos de postventa')
      }

      return response.json()
    },
    staleTime: 60 * 1000, // 1 minuto - casos no cambian tan frecuentemente
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  })
}

// ============================================================================
// QUERY: GET SINGLE
// ============================================================================

/**
 * Hook para obtener un caso de postventa específico por ID
 *
 * @param id - UUID del caso de postventa
 *
 * @returns Query con aftersale individual
 *
 * **ENABLED:** Solo se ejecuta si `id` está definido
 *
 * @example
 * ```tsx
 * const { data: aftersale, isLoading } = useAftersale(aftersaleId)
 * ```
 */
export function useAftersale(id: string | undefined) {
  return useQuery({
    queryKey: ['aftersales', id],
    queryFn: async (): Promise<Aftersale> => {
      if (!id) throw new Error('ID de caso de postventa requerido')

      const response = await fetch(`/api/aftersales/${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar caso de postventa')
      }

      return response.json()
    },
    enabled: !!id, // Solo ejecutar si hay ID
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

// ============================================================================
// MUTATION: CREATE
// ============================================================================

/**
 * Hook para crear un nuevo caso de postventa
 *
 * **VALIDACIONES BACKEND:**
 * - `projectId` obligatorio y debe existir
 * - `aftersaleStatusId` obligatorio, debe existir y estar activo
 * - `contactPhone` obligatorio (formato chileno +56...)
 * - `description` opcional (max 1000 caracteres)
 * - `reportedAt` obligatorio
 * - `tasks` opcional (lista de tareas para resolver el caso)
 * - El proyecto debe estar finalizado (projectStatus.isFinal === true)
 *
 * **INVALIDACIONES AUTOMÁTICAS:**
 * - `['aftersales']` → Refetch lista de casos
 *
 * @returns Mutation object
 *
 * @example
 * ```tsx
 * const createAftersale = useCreateAftersale()
 *
 * const handleSubmit = async (data: CreateAftersalePayload) => {
 *   try {
 *     await createAftersale.mutateAsync(data)
 *     // Success toast automático
 *   } catch (error) {
 *     // Error toast automático
 *   }
 * }
 * ```
 */
export function useCreateAftersale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAftersalePayload): Promise<Aftersale> => {
      const response = await fetch('/api/aftersales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al crear caso de postventa')
      }

      const result = await response.json()
      return result.aftersale
    },
    onSuccess: () => {
      // Invalidar queries con predicate (batch invalidation eficiente)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]

          // Invalidar todas las queries de aftersales
          if (key === 'aftersales') return true

          return false
        },
      })

      toast.success('Caso de postventa creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
      console.error('Error creating aftersale:', error)
    },
  })
}

// ============================================================================
// MUTATION: UPDATE
// ============================================================================

/**
 * Hook para actualizar un caso de postventa existente
 *
 * **VALIDACIONES BACKEND:**
 * - Si se cambia `projectId`, debe existir
 * - Si se cambia `aftersaleStatusId`, debe existir y estar activo
 * - Si se cambia `contactPhone`, debe ser formato válido
 * - `tasks` puede actualizarse completa (lista de tareas)
 *
 * **INVALIDACIONES:**
 * - `['aftersales']` → Refetch lista
 * - `['aftersales', id]` → Refetch aftersale específico
 *
 * @returns Mutation object
 *
 * @example
 * ```tsx
 * const updateAftersale = useUpdateAftersale()
 *
 * updateAftersale.mutate({
 *   id: 'abc-123',
 *   aftersaleStatusId: 'status-uuid',
 *   description: 'Descripción actualizada',
 *   tasks: [...]  // Actualizar lista de tareas
 * })
 * ```
 */
export function useUpdateAftersale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAftersaleData): Promise<Aftersale> => {
      const response = await fetch(`/api/aftersales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar caso de postventa')
      }

      const result = await response.json()
      return result.aftersale
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'aftersales',
      })

      toast.success('Caso de postventa actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
      console.error('Error updating aftersale:', error)
    },
  })
}

// ============================================================================
// MUTATION: DELETE (con Optimistic Update)
// ============================================================================

/**
 * Hook para eliminar un caso de postventa
 *
 * **COMPORTAMIENTO:**
 * - Hard delete (elimina registro completamente de DB)
 * - Optimistic update: Remueve de UI inmediatamente (rollback automático si falla)
 *
 * **INVALIDACIONES:**
 * - `['aftersales']` → Refetch lista de casos
 *
 * @returns Mutation object
 *
 * @example
 * ```tsx
 * const deleteAftersale = useDeleteAftersale()
 *
 * <Button
 *   onClick={() => deleteAftersale.mutate(aftersale.id)}
 *   disabled={deleteAftersale.isPending && deleteAftersale.variables === aftersale.id}
 * >
 *   {deleteAftersale.isPending && deleteAftersale.variables === aftersale.id
 *     ? <Loader2 className="animate-spin" />
 *     : 'Eliminar'}
 * </Button>
 * ```
 */
export function useDeleteAftersale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/aftersales/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al eliminar caso de postventa')
      }
    },
    // ✅ Optimistic update: remover del UI inmediatamente
    onMutate: async (id) => {
      // Cancel in-flight queries para evitar override
      await queryClient.cancelQueries({ queryKey: ['aftersales'] })

      // Snapshot del estado anterior (para rollback si falla)
      const previousData = queryClient.getQueryData(['aftersales'])

      // Optimistic update: remover aftersale de la lista
      queryClient.setQueryData<AftersalesResponse>(['aftersales'], (old) => {
        if (!old) return old
        return {
          ...old,
          aftersales: old.aftersales.filter((a) => a.id !== id),
        }
      })

      return { previousData }
    },
    // ✅ Rollback en caso de error
    onError: (error, id, context) => {
      // Restaurar estado anterior
      if (context?.previousData) {
        queryClient.setQueryData(['aftersales'], context.previousData)
      }
      handleMutationError(error)
      console.error('Error deleting aftersale:', error)
    },
    // ✅ Refetch para asegurar consistencia
    onSuccess: () => {
      // Invalidar queries con predicate (batch invalidation eficiente)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]

          // Invalidar aftersales
          if (key === 'aftersales') return true

          return false
        },
      })

      toast.success('Caso de postventa eliminado exitosamente')
    },
  })
}
