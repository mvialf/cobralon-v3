/**
 * Type Definitions para Payment Domain
 *
 * Este archivo centraliza TODOS los tipos relacionados con pagos:
 * - DTOs de API (PaymentFromAPI)
 * - Domain types (PaymentAllocation)
 * - Service interfaces (IPaymentsRepository)
 * - Query params
 *
 * Beneficios:
 * - Single source of truth para tipos
 * - Compartido entre todas las capas
 * - Fácil de mantener (cambios en un solo lugar)
 */

// ============================================================================
// API DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Representación de Payment tal como viene de la API
 *
 * Usado en:
 * - PaymentsService.fetchByProject()
 * - Response de /api/payments
 */
export interface PaymentFromAPI {
  id: string
  amount: number
  currency: string
  date: string // ISO string
  type: 'Project' | 'Customer'
  reference: string | null
  notes: string | null
  paymentMethod: PaymentMethodDTO
  customer: CustomerDTO
  allocations: AllocationFromAPI[]
}

/**
 * Allocation tal como viene de la API (nested en Payment)
 */
export interface AllocationFromAPI {
  id: string
  allocatedAmount: number
  project: {
    id: string
  }
}

/**
 * PaymentMethod simplificado (desde API)
 */
export interface PaymentMethodDTO {
  id: string
  name: string
  icon: string | null
}

/**
 * Customer simplificado (desde API)
 */
export interface CustomerDTO {
  id: string
  name: string
}

// ============================================================================
// Domain Types (Uso interno de la app)
// ============================================================================

/**
 * PaymentAllocation procesada para uso interno
 *
 * Diferencias con AllocationFromAPI:
 * - Incluye información completa del payment (denormalizado)
 * - Estructura optimizada para rendering
 * - Usado en componentes y hooks
 *
 * Transformación:
 * PaymentFromAPI → PaymentAllocation[] (via PaymentTransformers)
 */
export interface PaymentAllocation {
  id: string
  allocatedAmount: number
  payment: {
    id: string
    amount: number
    currency: string
    date: string // ISO string
    type: 'Project' | 'Customer'
    notes: string | null
    paymentMethod: {
      id: string
      name: string
      icon: string | null
    }
    customer: {
      id: string
      name: string
    }
  }
}

// ============================================================================
// Service Interfaces (Abstracciones)
// ============================================================================

/**
 * Interfaz del repositorio de pagos
 *
 * Implementaciones posibles:
 * - FetchPaymentsRepository (fetch API)
 * - GraphQLPaymentsRepository (GraphQL)
 * - MockPaymentsRepository (tests)
 * - CachedPaymentsRepository (con cache)
 *
 * Beneficio: Dependency Inversion Principle
 * - Componentes dependen de esta abstracción
 * - No de implementaciones concretas
 */
export interface IPaymentsRepository {
  /**
   * Obtener pagos de un proyecto específico
   * @param projectId ID del proyecto
   * @returns Array de pagos con sus allocations
   */
  fetchByProject(projectId: string): Promise<PaymentFromAPI[]>

  /**
   * Obtener pagos de un cliente específico
   * @param customerId ID del cliente
   * @returns Array de pagos del cliente
   */
  fetchByCustomer(customerId: string): Promise<PaymentFromAPI[]>

  /**
   * Obtener todos los pagos con filtros opcionales
   * @param params Query params para filtrar
   * @returns Array de pagos filtrados
   */
  fetchAll(params?: PaymentQueryParams): Promise<{
    payments: PaymentFromAPI[]
    total: number
    page: number
  }>
}

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Parámetros para queries de pagos
 *
 * Usado en:
 * - PaymentsService.fetchAll()
 * - API endpoint /api/payments
 */
export interface PaymentQueryParams {
  // Filtros
  projectId?: string
  customerId?: string
  paymentMethodId?: string
  type?: 'Project' | 'Customer'

  // Rango de fechas
  startDate?: string // ISO date
  endDate?: string // ISO date

  // Paginación
  page?: number
  limit?: number

  // Ordenamiento
  sortBy?: 'date' | 'amount'
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error personalizado para operaciones de pagos
 *
 * Usado en:
 * - PaymentsService (throw PaymentsFetchError)
 * - Error handling en hooks
 */
export class PaymentsFetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'PaymentsFetchError'
  }
}

// ============================================================================
// Type Guards (Validación en runtime)
// ============================================================================

/**
 * Valida si un objeto es un PaymentFromAPI válido
 *
 * Útil para:
 * - Validar responses de API
 * - Type narrowing en TypeScript
 */
export function isPaymentFromAPI(obj: unknown): obj is PaymentFromAPI {
  if (typeof obj !== 'object' || obj === null) return false

  const payment = obj as PaymentFromAPI

  return (
    typeof payment.id === 'string' &&
    typeof payment.amount === 'number' &&
    typeof payment.currency === 'string' &&
    typeof payment.date === 'string' &&
    (payment.type === 'Project' || payment.type === 'Customer') &&
    typeof payment.paymentMethod === 'object' &&
    typeof payment.customer === 'object' &&
    Array.isArray(payment.allocations)
  )
}

/**
 * Valida si un objeto es un PaymentAllocation válido
 */
export function isPaymentAllocation(obj: unknown): obj is PaymentAllocation {
  if (typeof obj !== 'object' || obj === null) return false

  const allocation = obj as PaymentAllocation

  return (
    typeof allocation.id === 'string' &&
    typeof allocation.allocatedAmount === 'number' &&
    typeof allocation.payment === 'object' &&
    typeof allocation.payment.id === 'string'
  )
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Payment sin allocations (para casos donde no se necesitan)
 */
export type PaymentWithoutAllocations = Omit<PaymentFromAPI, 'allocations'>

/**
 * Campos requeridos para crear un payment
 */
export type CreatePaymentDTO = Pick<PaymentFromAPI, 'amount' | 'currency' | 'date' | 'type'> & {
  paymentMethodId: string
  customerId: string
  reference?: string
  notes?: string
  allocations: Array<{
    projectId: string
    allocatedAmount: number
  }>
}

/**
 * Campos actualizables de un payment
 */
export type UpdatePaymentDTO = Partial<
  Pick<PaymentFromAPI, 'amount' | 'date' | 'reference' | 'notes'>
>

// ============================================================================
// Constants
// ============================================================================

/**
 * Tipos de pago disponibles
 */
export const PAYMENT_TYPES = ['Project', 'Customer'] as const
export type PaymentType = (typeof PAYMENT_TYPES)[number]

/**
 * Monedas soportadas
 */
export const SUPPORTED_CURRENCIES = ['CLP', 'USD', 'EUR', 'ARS', 'MXN'] as const
export type Currency = (typeof SUPPORTED_CURRENCIES)[number]

// ============================================================================
// Ejemplos de uso
// ============================================================================

/*
// En Service:
class PaymentsService implements IPaymentsRepository {
  async fetchByProject(projectId: string): Promise<PaymentFromAPI[]> {
    const response = await fetch(`/api/payments?projectId=${projectId}`)
    const data = await response.json()

    if (!Array.isArray(data.payments)) {
      throw new PaymentsFetchError('Invalid response format')
    }

    return data.payments
  }
}

// En Transformer:
import { PaymentFromAPI, PaymentAllocation } from '@/lib/types/payment.types'

export function extractProjectAllocations(
  payments: PaymentFromAPI[],
  projectId: string
): PaymentAllocation[] {
  return payments.flatMap(payment =>
    payment.allocations
      .filter(alloc => alloc.project.id === projectId)
      .map(alloc => mapToPaymentAllocation(payment, alloc))
  )
}

// En Hook:
import { IPaymentsRepository, PaymentAllocation } from '@/lib/types/payment.types'

export function useProjectPayments(
  projectId: string,
  repository: IPaymentsRepository
) {
  const [data, setData] = useState<PaymentAllocation[]>([])
  // ...
}

// En Component:
import { PaymentAllocation } from '@/lib/types/payment.types'

interface ProjectPaymentsTableProps {
  data: PaymentAllocation[]
  loading: boolean
}
*/
