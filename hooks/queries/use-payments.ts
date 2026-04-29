import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'
import { validatePaymentAllocations } from '@/lib/validations/payment-business-rules'
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
  // Server-side filtering params
  search?: string
  type?: 'Project' | 'Customer'
  paymentMethodId?: string
  projectNumber?: string
  // Filtros existentes
  customerId?: string
  projectId?: string
  startDate?: string
  endDate?: string
  // Performance: solo pedir facets cuando se necesitan
  includeFacets?: boolean
  // Server-side sorting
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** Facet individual (usado en facets de respuesta) */
export interface Facet {
  value: string
  label: string
  count: number
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
  facets?: {
    type: Facet[]
    paymentMethod: Facet[]
    projectNumber: Facet[]
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

      // Paginación
      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))

      // Server-side filtering params
      if (params.search) searchParams.set('search', params.search)
      if (params.type) searchParams.set('type', params.type)
      if (params.paymentMethodId) searchParams.set('paymentMethodId', params.paymentMethodId)
      if (params.projectNumber) searchParams.set('projectNumber', params.projectNumber)

      // Filtros existentes
      if (params.customerId) searchParams.set('customerId', params.customerId)
      if (params.projectId) searchParams.set('projectId', params.projectId)
      if (params.startDate) searchParams.set('startDate', params.startDate)
      if (params.endDate) searchParams.set('endDate', params.endDate)
      if (params.includeFacets) searchParams.set('includeFacets', 'true')
      if (params.sortBy) searchParams.set('sortBy', params.sortBy)
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

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
      // VALIDACIONES DE NEGOCIO (centralizadas en payment-business-rules.ts)
      // ========================================================================
      // Ejecuta todas las validaciones puras que no requieren acceso a DB:
      // 1. Type vs allocations count
      // 2. Sum de allocations === amount
      // 3. No projectIds duplicados
      // 4. Todos los montos positivos
      const validation = validatePaymentAllocations(
        data.type,
        data.amount,
        data.allocations,
        data.currency
      )
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // ========================================================================
      // VALIDACIONES DE BACKEND (requieren acceso a DB)
      // ========================================================================
      // Estas se validan en el backend porque requieren fetch de proyectos:
      // - Los projects pertenecen al mismo customerId
      // - Los projects tienen la misma currency

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
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['search-projects'] })
      queryClient.invalidateQueries({
        queryKey: ['customer-projects', createdPayment.customerId],
      })
      toast.success('Pago creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
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
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['search-projects'] })
      queryClient.invalidateQueries({
        queryKey: ['customer-projects', updatedPayment.customerId],
      })
      toast.success('Pago actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, {
        400: 'No se puede editar un pago con cuotas configuradas',
      })
    },
  })
}

// ============================================================================
// MUTATION: UPDATE DATE (dedicado para EditableDate inline)
// ============================================================================

/**
 * Hook especializado para actualizar solo la fecha de un pago.
 * Usado por EditableDate en DataTable de pagos.
 *
 * **⚠️ RESTRICCIÓN:** El frontend NO debe mostrar EditableDate si el pago
 * tiene cuotas (selectedInstallments > 1). El backend también bloquea la edición.
 */
export function useUpdatePaymentDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      paymentId,
      date,
    }: {
      paymentId: string
      date: Date | string
    }): Promise<Payment> => {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar fecha')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'payments',
      })

      toast.success('Fecha actualizada exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

// ============================================================================
// MUTATION: BULK DELETE (eliminar múltiples pagos)
// ============================================================================

/**
 * Hook para eliminar múltiples pagos en paralelo
 *
 * @example
 * const bulkDeleteMutation = useBulkDeletePayments()
 * bulkDeleteMutation.mutate(['id1', 'id2', 'id3'])
 */
export function useBulkDeletePayments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<{ deleted: number; failed: number }> => {
      // Ejecutar deletes en paralelo
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const response = await fetch(`/api/payments/${id}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error(`Error al eliminar pago ${id}`)
          }

          return id
        })
      )

      const deleted = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length

      return { deleted, failed }
    },
    onSuccess: ({ deleted, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['search-projects'] })
      queryClient.invalidateQueries({ queryKey: ['customer-projects'] })

      if (failed === 0) {
        toast.success(
          `${deleted} pago${deleted !== 1 ? 's' : ''} eliminado${deleted !== 1 ? 's' : ''} exitosamente`
        )
      } else {
        toast.warning(`${deleted} eliminado${deleted !== 1 ? 's' : ''}, ${failed} con error`)
      }
    },
    onError: (error) => {
      handleMutationError(error)
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
    onError: (error, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['payments'], context.previousData)
      }
      handleMutationError(error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['search-projects'] })
      queryClient.invalidateQueries({ queryKey: ['customer-projects'] })
      toast.success('Pago eliminado exitosamente')
    },
  })
}
