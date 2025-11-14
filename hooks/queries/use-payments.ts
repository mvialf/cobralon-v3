import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'
import type { Payment, CreatePaymentPayload } from '@/lib/validations/payment-validations'

/**
 * Hooks de React Query para Payments
 *
 * Convenciones:
 * - Query keys: ['payments'] para list, ['payments', id] para single
 * - Mutations invalidan queries relacionadas automáticamente
 * - Delete usa optimistic updates para UX más rápida
 *
 * IMPORTANTE:
 * - Payment NO tiene campo `status` (no hay ACTIVE/CANCELED)
 * - useCreatePayment valida allocations en frontend Y backend
 * - useUpdatePayment está bloqueado si payment tiene cuotas (backend retorna 400)
 * - useDeletePayment hace hard delete con CASCADE a allocations + installments
 */

// ============================================================================
// TYPES
// ============================================================================

/** Params para GET /api/payments */
export interface PaymentsQueryParams {
  page?: number
  limit?: number
  customerId?: string
  projectId?: string
  startDate?: string
  endDate?: string
}

/** Respuesta de GET /api/payments */
export interface PaymentsResponse {
  payments: Payment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/** Params para GET /api/payments/search-projects */
export interface SearchProjectsParams {
  search?: string
  limit?: number
}

/** Proyecto con balance (usado en search-projects y customer-projects) */
export interface ProjectWithBalance {
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: number
  currency: string
  balance: number
  createdAt: Date
  customer: {
    id: string
    name: string
  }
}

/** Datos para PUT /api/payments/[id] */
export interface UpdatePaymentData {
  id: string
  amount?: number
  date?: string | Date
  paymentMethodId?: string
  reference?: string | null
  notes?: string | null
}

// ============================================================================
// QUERY: GET LIST
// ============================================================================

/**
 * Hook para obtener lista de pagos con paginación y filtros
 *
 * @param params - Filtros opcionales
 * @param params.page - Número de página (default: 1)
 * @param params.limit - Registros por página (default: 10, max: 100)
 * @param params.customerId - Filtrar por cliente específico
 * @param params.projectId - Filtrar por proyecto específico (via allocations)
 * @param params.startDate - Filtrar desde fecha (ISO string)
 * @param params.endDate - Filtrar hasta fecha (ISO string)
 *
 * @returns Query con payments y paginación
 *
 * **OPTIMIZACIONES:**
 * - `placeholderData: keepPreviousData` → Smooth transitions entre páginas (mantiene datos anteriores mientras carga)
 * - Cache de 1 minuto → Balance entre frescura y performance
 * - Query keys por página → Cada página se cachea individualmente
 *
 * @example
 * ```tsx
 * const { data, isLoading, isPlaceholderData } = usePayments({
 *   page: 1,
 *   limit: 10,
 *   customerId: 'abc-123'
 * })
 *
 * // Prefetch página siguiente para mejor UX
 * const queryClient = useQueryClient()
 * queryClient.prefetchQuery({
 *   queryKey: ['payments', { ...params, page: params.page + 1 }],
 *   queryFn: () => fetch('/api/payments?page=2&limit=10').then(r => r.json())
 * })
 * ```
 */
export function usePayments(params: PaymentsQueryParams = {}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async (): Promise<PaymentsResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.customerId) searchParams.set('customerId', params.customerId)
      if (params.projectId) searchParams.set('projectId', params.projectId)
      if (params.startDate) searchParams.set('startDate', params.startDate)
      if (params.endDate) searchParams.set('endDate', params.endDate)

      const response = await fetch(`/api/payments?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar pagos')
      }

      return response.json()
    },
    placeholderData: keepPreviousData, // ← Mantener datos anteriores durante transición
    staleTime: 60 * 1000, // 1 minuto - datos cambian ocasionalmente
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  })
}

// ============================================================================
// QUERY: SEARCH PROJECTS (auxiliar para formularios)
// ============================================================================

/**
 * Hook para buscar proyectos con balance pendiente (balance > 0).
 * Usado en formularios de pago para autocompletar proyectos.
 *
 * @param params - Parámetros de búsqueda
 * @param params.search - Término de búsqueda (min 2 caracteres)
 * @param params.limit - Máximo de resultados (default: 20, max: 50)
 *
 * @returns Query con proyectos que tienen balance > 0
 *
 * **ENABLED:** Solo se ejecuta si `search` tiene al menos 2 caracteres
 *
 * @example
 * ```tsx
 * const { data: projects, isLoading } = useSearchProjects({
 *   search: projectNumber,
 *   limit: 20
 * })
 * ```
 */
export function useSearchProjects(params: SearchProjectsParams = {}) {
  return useQuery({
    queryKey: ['search-projects', params],
    queryFn: async (): Promise<ProjectWithBalance[]> => {
      const searchParams = new URLSearchParams()

      if (params.search) searchParams.set('q', params.search)
      if (params.limit) searchParams.set('limit', String(params.limit))

      const response = await fetch(`/api/payments/search-projects?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al buscar proyectos')
      }

      return response.json()
    },
    enabled: Boolean(params.search && params.search.length >= 2), // Min 2 caracteres
    staleTime: 30 * 1000, // 30 segundos (data cambia frecuentemente)
  })
}

// ============================================================================
// QUERY: CUSTOMER PROJECTS (auxiliar para formularios)
// ============================================================================

/**
 * Hook para obtener proyectos de un cliente específico con balance > 0.
 * Usado en formularios de pago a cliente (flujo 1:N).
 *
 * @param customerId - UUID del cliente
 *
 * @returns Query con proyectos del cliente que tienen balance > 0
 *
 * **ENABLED:** Solo se ejecuta si `customerId` está definido
 *
 * @example
 * ```tsx
 * const { data: projects, isLoading } = useCustomerProjects(customerId)
 * ```
 */
export function useCustomerProjects(customerId?: string) {
  return useQuery({
    queryKey: ['customer-projects', customerId],
    queryFn: async (): Promise<ProjectWithBalance[]> => {
      if (!customerId) throw new Error('customerId requerido')

      const response = await fetch(`/api/payments/customer-projects?customerId=${customerId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar proyectos del cliente')
      }

      return response.json()
    },
    enabled: Boolean(customerId), // Solo ejecutar si hay customerId
    staleTime: 60 * 1000, // 1 minuto
  })
}

// ============================================================================
// MUTATION: CREATE (con validaciones críticas)
// ============================================================================

/**
 * Hook para crear un nuevo pago con asignaciones a proyectos.
 *
 * **VALIDACIONES CRÍTICAS (ejecutadas en el hook pre-fetch):**
 * 1. `type === "Project"` → `allocations.length === 1`
 * 2. `type === "Customer"` → `allocations.length >= 1`
 * 3. `SUM(allocations.allocatedAmount) === amount` (tolerancia 0.01)
 * 4. No `projectIds` duplicados en allocations
 *
 * **VALIDACIONES BACKEND (ejecutadas en API):**
 * 5. Todos los projects pertenecen al mismo `customerId`
 * 6. Todos los projects tienen la misma `currency`
 *
 * **INVALIDACIONES AUTOMÁTICAS:**
 * - `['payments']` → Refetch lista de pagos
 * - `['projects']` → Refetch lista de proyectos (balance cambia)
 * - `['search-projects']` → Refetch búsqueda (balance cambia)
 * - `['customer-projects', customerId]` → Refetch proyectos del cliente
 *
 * @returns Mutation object
 * @property {Function} mutate - Ejecutar mutation (fire-and-forget)
 * @property {Function} mutateAsync - Ejecutar mutation (con await)
 * @property {boolean} isPending - Estado de carga
 * @property {CreatePaymentPayload} variables - Data del payment siendo creado
 *
 * @example
 * ```tsx
 * const createPayment = useCreatePayment()
 *
 * const handleSubmit = async (data: CreatePaymentPayload) => {
 *   try {
 *     await createPayment.mutateAsync(data)
 *     toast.success('Pago creado')
 *   } catch (error) {
 *     // Error ya manejado por el hook (toast automático)
 *   }
 * }
 * ```
 */
export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePaymentPayload): Promise<Payment> => {
      // ========================================================================
      // VALIDACIÓN 1: Type vs allocations count
      // ========================================================================
      if (data.type === 'Project' && data.allocations.length !== 1) {
        throw new Error('Pago tipo Project debe tener exactamente 1 asignación')
      }

      if (data.type === 'Customer' && data.allocations.length < 1) {
        throw new Error('Pago tipo Customer debe tener al menos 1 asignación')
      }

      // ========================================================================
      // VALIDACIÓN 2: Sum de allocations === amount (tolerancia 0.01)
      // ========================================================================
      const totalAllocated = data.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
      const difference = Math.abs(totalAllocated - data.amount)

      if (difference > 0.01) {
        throw new Error(
          `Las asignaciones ($${totalAllocated.toFixed(2)}) no suman el monto total ($${data.amount.toFixed(2)})`
        )
      }

      // ========================================================================
      // VALIDACIÓN 3: No projectIds duplicados
      // ========================================================================
      const projectIds = data.allocations.map((a) => a.projectId)
      const uniqueIds = new Set(projectIds)

      if (projectIds.length !== uniqueIds.size) {
        throw new Error('No puede asignar el mismo proyecto múltiples veces')
      }

      // ========================================================================
      // VALIDACIONES 4-5: customerId y currency coherentes
      // ========================================================================
      // Estas se validan en el backend porque requieren fetch de proyectos
      // El backend retornará 400 si:
      // - Los projects no pertenecen al mismo customerId
      // - Los projects no tienen la misma currency

      // ========================================================================
      // FETCH: POST /api/payments
      // ========================================================================
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al crear pago')
      }

      return response.json()
    },
    onSuccess: (createdPayment) => {
      // Invalidar queries con predicate (batch invalidation eficiente)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]

          // Invalidar todas las queries de payments
          if (key === 'payments') return true

          // Invalidar todas las queries de projects (balance cambió)
          if (key === 'projects') return true

          // Invalidar search-projects (balance de proyectos cambió)
          if (key === 'search-projects') return true

          // Invalidar customer-projects del cliente del pago
          if (key === 'customer-projects' && query.queryKey[1] === createdPayment.customerId) {
            return true
          }

          return false
        },
      })

      toast.success('Pago creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
      console.error('Error creating payment:', error)
    },
  })
}

// ============================================================================
// MUTATION: UPDATE (limitado)
// ============================================================================

/**
 * Hook para actualizar campos de un pago existente.
 *
 * **⚠️ RESTRICCIÓN CRÍTICA:**
 * Si el payment tiene cuotas configuradas (`selectedInstallments > 1`),
 * el backend retornará 400 error y bloqueará la edición.
 *
 * **Campos editables:**
 * - amount
 * - date
 * - paymentMethodId
 * - reference
 * - notes
 *
 * **Campos NO editables:**
 * - customerId
 * - currency
 * - type
 * - allocations
 * - selectedInstallments
 *
 * **INVALIDACIONES:**
 * - `['payments']` → Refetch lista
 * - `['payments', id]` → Refetch individual
 *
 * @example
 * ```tsx
 * const updatePayment = useUpdatePayment()
 *
 * updatePayment.mutate({
 *   id: 'abc-123',
 *   reference: 'Nueva referencia',
 *   notes: 'Notas actualizadas'
 * })
 * ```
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePaymentData): Promise<Payment> => {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar pago')
      }

      return response.json()
    },
    onSuccess: (updatedPayment) => {
      // Invalidar queries con predicate (batch invalidation eficiente)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]

          // Invalidar todas las queries de payments
          if (key === 'payments') return true

          // Invalidar el payment específico
          if (key === 'payments' && query.queryKey[1] === updatedPayment.id) return true

          // Invalidar projects (balance puede haber cambiado si se editó amount)
          if (key === 'projects') return true

          // Invalidar search-projects
          if (key === 'search-projects') return true

          // Invalidar customer-projects del cliente del pago
          if (key === 'customer-projects' && query.queryKey[1] === updatedPayment.customerId) {
            return true
          }

          return false
        },
      })

      toast.success('Pago actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, {
        400: 'No se puede editar un pago con cuotas configuradas',
      })
      console.error('Error updating payment:', error)
    },
  })
}

// ============================================================================
// MUTATION: DELETE (con Optimistic Update)
// ============================================================================

/**
 * Hook para eliminar un pago.
 *
 * **COMPORTAMIENTO:**
 * - Hard delete (elimina registro completamente de DB)
 * - CASCADE automático: Elimina `Installments` y `PaymentAllocations` (configurado en schema Prisma)
 * - Optimistic update: Remueve de UI inmediatamente (rollback automático si falla)
 *
 * **INVALIDACIONES:**
 * - `['payments']` → Refetch lista de pagos
 * - `['projects']` → Refetch lista de proyectos (balance se libera)
 * - `['customer-projects', customerId]` → Refetch proyectos del cliente
 *
 * @returns Mutation object
 * @property {Function} mutate - Ejecutar mutation (fire-and-forget)
 * @property {Function} mutateAsync - Ejecutar mutation (con await)
 * @property {boolean} isPending - Estado de carga
 * @property {string} variables - ID del payment siendo eliminado
 *
 * @example
 * ```tsx
 * const deletePayment = useDeletePayment()
 *
 * <Button
 *   onClick={() => deletePayment.mutate(payment.id)}
 *   disabled={deletePayment.isPending && deletePayment.variables === payment.id}
 * >
 *   {deletePayment.isPending && deletePayment.variables === payment.id
 *     ? <Loader2 className="animate-spin" />
 *     : 'Eliminar'}
 * </Button>
 * ```
 */
export function useDeletePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al eliminar pago')
      }
    },
    // ✅ Optimistic update: remover del UI inmediatamente
    onMutate: async (id) => {
      // Cancel in-flight queries para evitar override
      await queryClient.cancelQueries({ queryKey: ['payments'] })

      // Snapshot del estado anterior (para rollback si falla)
      const previousData = queryClient.getQueryData(['payments'])

      // Optimistic update: remover payment de todas las queries
      queryClient.setQueriesData<PaymentsResponse>({ queryKey: ['payments'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          payments: old.payments.filter((p) => p.id !== id),
          pagination: {
            ...old.pagination,
            total: old.pagination.total - 1,
          },
        }
      })

      return { previousData }
    },
    // ✅ Rollback en caso de error
    onError: (error, id, context) => {
      // Restaurar estado anterior
      if (context?.previousData) {
        queryClient.setQueryData(['payments'], context.previousData)
      }
      handleMutationError(error)
      console.error('Error deleting payment:', error)
    },
    // ✅ Refetch para asegurar consistencia
    onSuccess: () => {
      // Invalidar queries con predicate (batch invalidation)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]

          // Invalidar payments
          if (key === 'payments') return true

          // Invalidar projects (balance se liberó)
          if (key === 'projects') return true

          // Invalidar search-projects
          if (key === 'search-projects') return true

          // Invalidar customer-projects
          if (key === 'customer-projects') return true

          return false
        },
      })

      toast.success('Pago eliminado exitosamente')
    },
  })
}
