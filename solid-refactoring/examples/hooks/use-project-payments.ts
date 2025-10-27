/**
 * useProjectPayments Hook
 *
 * Custom hook para manejar estado de pagos de un proyecto.
 *
 * Responsabilidades:
 * - ✅ Manejo de estado (loading, error, data)
 * - ✅ Orquestar fetching vía service
 * - ✅ Aplicar transformaciones vía transformers
 * - ✅ Memoización para evitar re-renders innecesarios
 * - ❌ NO lógica de transformación (delega a transformers)
 * - ❌ NO implementación de fetching (delega a service)
 *
 * Principios SOLID:
 * - SRP: Solo orquesta, no implementa lógica
 * - DIP: Depende de IPaymentsRepository (abstracción)
 * - OCP: Extensible via options
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  IPaymentsRepository,
  PaymentAllocation,
  PaymentsFetchError,
} from '@/lib/types/payment.types'
import { PaymentTransformers } from '@/lib/transformers/payment-transformers'
import { paymentsService } from '@/lib/services/payments.service'

// ============================================================================
// Types
// ============================================================================

/**
 * Opciones de configuración del hook
 */
export interface UseProjectPaymentsOptions {
  /**
   * Orden de clasificación
   * @default 'asc'
   */
  sortOrder?: 'asc' | 'desc'

  /**
   * Campo por el cual ordenar
   * @default 'date'
   */
  sortBy?: 'date' | 'amount' | 'customer'

  /**
   * Filtrar por tipo de pago
   */
  filterByType?: 'Project' | 'Customer'

  /**
   * Service a usar (para tests o config custom)
   * @default paymentsService
   */
  repository?: IPaymentsRepository

  /**
   * Auto-fetch al montar el componente
   * @default true
   */
  autoFetch?: boolean

  /**
   * Callback cuando hay error
   */
  onError?: (error: Error) => void

  /**
   * Callback cuando se completa el fetch
   */
  onSuccess?: (data: PaymentAllocation[]) => void
}

/**
 * Resultado del hook
 */
export interface UseProjectPaymentsResult {
  /**
   * Datos procesados (allocations del proyecto)
   */
  data: PaymentAllocation[]

  /**
   * Estado de carga
   */
  loading: boolean

  /**
   * Error si ocurrió
   */
  error: Error | null

  /**
   * Función para re-fetchear manualmente
   */
  refetch: () => Promise<void>

  /**
   * Función para limpiar datos y error
   */
  reset: () => void

  /**
   * Estadísticas calculadas de los datos
   */
  stats: {
    count: number
    totalAmount: number
    averageAmount: number
    projectPayments: number
    customerPayments: number
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook para obtener y procesar pagos de un proyecto
 *
 * @param projectId ID del proyecto
 * @param options Opciones de configuración
 * @returns Objeto con data, loading, error, refetch, etc.
 *
 * @example
 * // Uso básico
 * function MyComponent({ projectId }: { projectId: string }) {
 *   const { data, loading, error } = useProjectPayments(projectId)
 *
 *   if (loading) return <Skeleton />
 *   if (error) return <ErrorMessage error={error} />
 *
 *   return <Table data={data} />
 * }
 *
 * @example
 * // Con opciones
 * const { data, stats, refetch } = useProjectPayments(projectId, {
 *   sortOrder: 'desc',
 *   filterByType: 'Customer',
 *   onError: (error) => toast.error(error.message)
 * })
 */
export function useProjectPayments(
  projectId: string,
  options: UseProjectPaymentsOptions = {}
): UseProjectPaymentsResult {
  const {
    sortOrder = 'asc',
    sortBy = 'date',
    filterByType,
    repository = paymentsService,
    autoFetch = true,
    onError,
    onSuccess,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const [data, setData] = useState<PaymentAllocation[]>([])
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<Error | null>(null)

  // ============================================================================
  // Fetch Function
  // ============================================================================

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch desde service (abstracción)
      const payments = await repository.fetchByProject(projectId)

      // 2. Extraer allocations del proyecto (transformer)
      let allocations = PaymentTransformers.extractProjectAllocations(
        payments,
        projectId
      )

      // 3. Aplicar filtro de tipo si está especificado
      if (filterByType) {
        allocations = PaymentTransformers.filterByPaymentType(allocations, filterByType)
      }

      // 4. Ordenar según configuración (transformer)
      switch (sortBy) {
        case 'date':
          allocations = PaymentTransformers.sortAllocationsByDate(allocations, sortOrder)
          break
        case 'amount':
          allocations = PaymentTransformers.sortAllocationsByAmount(allocations, sortOrder)
          break
        case 'customer':
          allocations = PaymentTransformers.sortAllocationsByCustomerName(
            allocations,
            sortOrder
          )
          break
      }

      // 5. Actualizar estado
      setData(allocations)

      // 6. Callback de éxito
      onSuccess?.(allocations)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)

      // Callback de error
      onError?.(error)

      // Log para debugging (remover en producción si no se desea)
      console.error('useProjectPayments error:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, sortOrder, sortBy, filterByType, repository, onError, onSuccess])

  // ============================================================================
  // Effects
  // ============================================================================

  // Auto-fetch al montar o cuando cambian dependencias
  useEffect(() => {
    if (autoFetch) {
      fetchData()
    }
  }, [fetchData, autoFetch])

  // ============================================================================
  // Computed Values (Memoized)
  // ============================================================================

  /**
   * Estadísticas calculadas de los datos
   * Memoizado para evitar recalcular en cada render
   */
  const stats = useMemo(() => {
    return PaymentTransformers.getAllocationStatistics(data)
  }, [data])

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Función para refetch manual
   */
  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  /**
   * Función para resetear estado
   */
  const reset = useCallback(() => {
    setData([])
    setError(null)
    setLoading(false)
  }, [])

  // ============================================================================
  // Return
  // ============================================================================

  return {
    data,
    loading,
    error,
    refetch,
    reset,
    stats,
  }
}

// ============================================================================
// Variaciones del Hook
// ============================================================================

/**
 * Hook simplificado que solo retorna data y loading
 *
 * @example
 * const { data, loading } = useProjectPaymentsSimple('proj-123')
 */
export function useProjectPaymentsSimple(projectId: string): {
  data: PaymentAllocation[]
  loading: boolean
} {
  const { data, loading } = useProjectPayments(projectId)
  return { data, loading }
}

/**
 * Hook con polling automático
 *
 * @param projectId ID del proyecto
 * @param intervalMs Intervalo de polling en milisegundos
 * @returns Resultado del hook con polling activo
 *
 * @example
 * // Refetch cada 30 segundos
 * const { data, loading } = useProjectPaymentsWithPolling('proj-123', 30000)
 */
export function useProjectPaymentsWithPolling(
  projectId: string,
  intervalMs: number
): UseProjectPaymentsResult {
  const result = useProjectPayments(projectId)

  useEffect(() => {
    const intervalId = setInterval(() => {
      result.refetch()
    }, intervalMs)

    return () => clearInterval(intervalId)
  }, [result, intervalMs])

  return result
}

/**
 * Hook que agrupa pagos por mes
 *
 * @example
 * const { data, monthGroups } = useProjectPaymentsGroupedByMonth('proj-123')
 * // monthGroups = Map { '2025-01' => [...], '2025-02' => [...] }
 */
export function useProjectPaymentsGroupedByMonth(projectId: string): {
  data: PaymentAllocation[]
  loading: boolean
  error: Error | null
  monthGroups: Map<string, PaymentAllocation[]>
} {
  const { data, loading, error } = useProjectPayments(projectId)

  const monthGroups = useMemo(() => {
    return PaymentTransformers.groupAllocationsByMonth(data)
  }, [data])

  return { data, loading, error, monthGroups }
}

// ============================================================================
// Testing Helpers
// ============================================================================

/**
 * Mock del hook para tests
 *
 * @example
 * // En test:
 * jest.mock('@/hooks/use-project-payments', () => ({
 *   useProjectPayments: () => mockUseProjectPayments({
 *     data: [...mockAllocations],
 *     loading: false,
 *     error: null
 *   })
 * }))
 */
export function mockUseProjectPayments(
  override: Partial<UseProjectPaymentsResult> = {}
): UseProjectPaymentsResult {
  return {
    data: [],
    loading: false,
    error: null,
    refetch: async () => {},
    reset: () => {},
    stats: {
      count: 0,
      totalAmount: 0,
      averageAmount: 0,
      projectPayments: 0,
      customerPayments: 0,
    },
    ...override,
  }
}

// ============================================================================
// Type Exports
// ============================================================================

export type { UseProjectPaymentsOptions, UseProjectPaymentsResult }
