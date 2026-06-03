import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { Installment } from '@/app/payments/installments/columns'

/**
 * Hooks de React Query para Installments
 *
 * Convenciones:
 * - Query keys: ['installments'] para list
 * - Las cuotas se crean/eliminan como parte de Payment (no hay mutations propias)
 */

// ============================================================================
// TYPES
// ============================================================================

/** Params para GET /api/installments */
export interface InstallmentsQueryParams {
  page?: number
  limit?: number
  status?: 'upcoming' | 'due'
  paymentId?: string
  customerId?: string
  startDate?: string
  endDate?: string
  monthlyTotals?: number
}

export interface InstallmentMonthlyTotal {
  monthKey: string
  startDate: string
  endDate: string
  amount: number
  currency: string
}

/** Respuesta de GET /api/installments */
export interface InstallmentsResponse {
  installments: Installment[]
  monthlyTotals?: InstallmentMonthlyTotal[]
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
 * Hook para obtener lista de cuotas con paginación server-side
 *
 * @param params - Filtros opcionales
 * @param params.page - Número de página (default: 1)
 * @param params.limit - Registros por página (default: 50, max: 100)
 * @param params.status - Filtro por estado derivado: 'upcoming' | 'due'
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
      if (params.monthlyTotals) searchParams.set('monthlyTotals', String(params.monthlyTotals))

      const response = await fetch(`/api/installments?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar cuotas')
      }

      return response.json()
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
