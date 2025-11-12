import { useQuery } from '@tanstack/react-query'

/**
 * Hooks de React Query para Installments (Cuotas)
 *
 * Convenciones:
 * - Query keys: ['installments', params] para lista
 * - Sistema de cuotas de pagos en cuotas
 * - Solo lectura por ahora (sin mutations CREATE/UPDATE/DELETE)
 *
 * IMPORTANTE:
 * - Installment pertenece a un Payment específico
 * - status: 'pending' (pendiente) | 'paid' (pagada)
 * - dueDate: Fecha de vencimiento de la cuota
 * - installmentNumber: Número de cuota (1, 2, 3, etc.)
 */

// ============================================================================
// TYPES
// ============================================================================

/** Status de una cuota */
export type InstallmentStatus = 'pending' | 'paid'

/** Installment completo (from API) */
export interface Installment {
  id: string
  paymentId: string
  installmentNumber: number
  amount: number
  dueDate: Date | string
  status: InstallmentStatus
  paidDate: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  payment: {
    id: string
    amount: number
    currency: string
    date: Date | string
    reference: string | null
    selectedInstallments: number
    customer: {
      id: string
      name: string
      phone: string
    }
    paymentMethod: {
      id: string
      name: string
      icon: string | null
    }
    allocations: Array<{
      id: string
      allocatedAmount: number
      project: {
        id: string
        projectNumber: string
        projectName: string | null
        currency: string
      }
    }>
  }
}

/** Params para GET /api/installments */
export interface InstallmentsQueryParams {
  page?: number
  limit?: number
  status?: InstallmentStatus
  paymentId?: string
  customerId?: string
  startDate?: string // ISO string
  endDate?: string // ISO string
}

/** Respuesta de GET /api/installments */
export interface InstallmentsResponse {
  installments: Installment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// QUERY: GET LIST
// ============================================================================

/**
 * Hook para obtener lista de cuotas (installments) con filtros
 *
 * @param params - Filtros opcionales
 * @param params.page - Número de página (default: 1)
 * @param params.limit - Registros por página (default: 10, max: 100)
 * @param params.status - Filtrar por estado ('pending' | 'paid')
 * @param params.paymentId - Filtrar por pago específico
 * @param params.customerId - Filtrar por cliente específico (via payment)
 * @param params.startDate - Filtrar cuotas con vencimiento desde esta fecha (ISO string)
 * @param params.endDate - Filtrar cuotas con vencimiento hasta esta fecha (ISO string)
 *
 * @returns Query con installments y paginación
 *
 * **ORDENAMIENTO:**
 * - Por dueDate ascendente (vencimientos más próximos primero)
 * - Luego por installmentNumber ascendente
 *
 * @example
 * ```tsx
 * // Obtener todas las cuotas pendientes
 * const { data, isLoading } = useInstallments({ status: 'pending', limit: 20 })
 *
 * // Obtener cuotas de un pago específico
 * const { data, isLoading } = useInstallments({ paymentId: 'abc-123' })
 *
 * // Obtener cuotas de un cliente
 * const { data, isLoading } = useInstallments({ customerId: 'xyz-456' })
 *
 * // Obtener cuotas con vencimiento en rango de fechas
 * const { data, isLoading } = useInstallments({
 *   startDate: '2024-01-01T00:00:00Z',
 *   endDate: '2024-01-31T23:59:59Z'
 * })
 * ```
 */
export function useInstallments(params: InstallmentsQueryParams = {}) {
  return useQuery({
    queryKey: ['installments', params],
    queryFn: async (): Promise<InstallmentsResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.status) searchParams.set('status', params.status)
      if (params.paymentId) searchParams.set('paymentId', params.paymentId)
      if (params.customerId) searchParams.set('customerId', params.customerId)
      if (params.startDate) searchParams.set('startDate', params.startDate)
      if (params.endDate) searchParams.set('endDate', params.endDate)

      const response = await fetch(`/api/installments?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar cuotas')
      }

      return response.json()
    },
    staleTime: 30 * 1000, // 30 segundos - datos cambian frecuentemente (cuotas pagadas)
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  })
}

// ============================================================================
// FUTURE: MUTATIONS
// ============================================================================

/**
 * TODO: Implementar mutation para marcar cuota como pagada
 *
 * Pendiente de implementación cuando exista el endpoint:
 * PUT /api/installments/[id]/mark-paid
 *
 * export function useMarkInstallmentAsPaid() {
 *   const queryClient = useQueryClient()
 *
 *   return useMutation({
 *     mutationFn: async (id: string) => { ... },
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({
 *         predicate: (query) => {
 *           const key = query.queryKey[0]
 *           if (key === 'installments') return true
 *           if (key === 'payments') return true  // Payments también afectados
 *           return false
 *         }
 *       })
 *     }
 *   })
 * }
 */
