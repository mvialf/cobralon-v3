/**
 * Payments Service
 *
 * Service layer para operaciones de pagos.
 *
 * Responsabilidades:
 * - ✅ Fetching de datos desde API
 * - ✅ Manejo de errores HTTP
 * - ✅ Serialización/deserialización
 * - ❌ NO transformaciones de negocio (usar transformers)
 * - ❌ NO manejo de estado UI (usar hooks)
 *
 * Principios SOLID:
 * - SRP: Solo se encarga de data access
 * - OCP: Extensible via interface IPaymentsRepository
 * - DIP: Abstracción, no implementación concreta
 */

import type {
  IPaymentsRepository,
  PaymentFromAPI,
  PaymentQueryParams,
  PaymentsFetchError,
} from '@/lib/types/payment.types'

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  baseUrl: '/api/payments',
  timeout: 10000, // 10 segundos
  retries: 0, // Sin retry por defecto (puede agregarse después)
} as const

type ServiceConfig = typeof DEFAULT_CONFIG

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Implementación del repositorio de pagos usando fetch API
 *
 * Características:
 * - Implementa IPaymentsRepository (abstracción)
 * - Maneja errores HTTP de forma consistente
 * - Configurable (baseUrl, timeout, etc.)
 * - Testeable (mockear fetch)
 *
 * @example
 * const service = new PaymentsService()
 * const payments = await service.fetchByProject('project-123')
 *
 * // Con configuración custom:
 * const service = new PaymentsService({ baseUrl: 'https://api.example.com/payments' })
 */
export class PaymentsService implements IPaymentsRepository {
  private config: ServiceConfig

  constructor(config?: Partial<ServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Fetch pagos de un proyecto específico
   *
   * @param projectId ID del proyecto
   * @returns Array de pagos con allocations incluidas
   * @throws PaymentsFetchError si la request falla
   *
   * @example
   * try {
   *   const payments = await service.fetchByProject('proj-123')
   *   console.log(`Found ${payments.length} payments`)
   * } catch (error) {
   *   if (error instanceof PaymentsFetchError) {
   *     console.error('API error:', error.statusCode, error.message)
   *   }
   * }
   */
  async fetchByProject(projectId: string): Promise<PaymentFromAPI[]> {
    const url = `${this.config.baseUrl}?projectId=${encodeURIComponent(projectId)}`

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: this.getDefaultHeaders(),
    })

    const data = await this.handleResponse<{ payments: PaymentFromAPI[] }>(response)

    // Validación básica de estructura
    if (!Array.isArray(data.payments)) {
      throw this.createError('Invalid response structure: payments is not an array', 500)
    }

    return data.payments
  }

  /**
   * Fetch pagos de un cliente específico
   *
   * @param customerId ID del cliente
   * @returns Array de pagos del cliente
   */
  async fetchByCustomer(customerId: string): Promise<PaymentFromAPI[]> {
    const url = `${this.config.baseUrl}?customerId=${encodeURIComponent(customerId)}`

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: this.getDefaultHeaders(),
    })

    const data = await this.handleResponse<{ payments: PaymentFromAPI[] }>(response)

    if (!Array.isArray(data.payments)) {
      throw this.createError('Invalid response structure', 500)
    }

    return data.payments
  }

  /**
   * Fetch todos los pagos con filtros opcionales
   *
   * @param params Query parameters para filtrar y paginar
   * @returns Objeto con payments, total y página actual
   *
   * @example
   * const result = await service.fetchAll({
   *   startDate: '2025-01-01',
   *   endDate: '2025-01-31',
   *   page: 1,
   *   limit: 10,
   *   sortBy: 'date',
   *   sortOrder: 'desc'
   * })
   * console.log(`Page ${result.page}: ${result.payments.length} of ${result.total}`)
   */
  async fetchAll(params: PaymentQueryParams = {}): Promise<{
    payments: PaymentFromAPI[]
    total: number
    page: number
  }> {
    const queryString = this.buildQueryString(params)
    const url = `${this.config.baseUrl}${queryString ? `?${queryString}` : ''}`

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: this.getDefaultHeaders(),
    })

    const data = await this.handleResponse<{
      payments: PaymentFromAPI[]
      total: number
      page: number
    }>(response)

    // Validaciones
    if (!Array.isArray(data.payments)) {
      throw this.createError('Invalid response structure', 500)
    }

    return {
      payments: data.payments,
      total: data.total ?? data.payments.length,
      page: data.page ?? params.page ?? 1,
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Fetch con timeout automático
   *
   * @private
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError(
          `Request timeout after ${this.config.timeout}ms`,
          408 // Request Timeout
        )
      }

      // Network error u otro error
      throw this.createError(
        error instanceof Error ? error.message : 'Network error',
        0 // Sin status code (network error)
      )
    }
  }

  /**
   * Maneja la respuesta HTTP y convierte errores
   *
   * @private
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Response OK (200-299)
    if (response.ok) {
      try {
        return await response.json()
      } catch (error) {
        throw this.createError('Invalid JSON response', response.status)
      }
    }

    // Response con error (400+)
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let errorDetails: unknown = null

    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorData.error || errorMessage
      errorDetails = errorData
    } catch {
      // Si no hay JSON body, usar mensaje por defecto
    }

    throw this.createError(errorMessage, response.status, errorDetails)
  }

  /**
   * Construye query string desde objeto de params
   *
   * @private
   * @example
   * buildQueryString({ page: 1, limit: 10, projectId: 'abc' })
   * // Returns: "page=1&limit=10&projectId=abc"
   */
  private buildQueryString(params: PaymentQueryParams): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })

    return searchParams.toString()
  }

  /**
   * Headers por defecto para todas las requests
   *
   * @private
   */
  private getDefaultHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  /**
   * Crea error personalizado con contexto
   *
   * @private
   */
  private createError(message: string, statusCode?: number, details?: unknown): PaymentsFetchError {
    const error = new Error(message) as PaymentsFetchError
    error.name = 'PaymentsFetchError'
    error.statusCode = statusCode
    error.details = details
    return error
  }
}

// ============================================================================
// Singleton Instance (Opción 1: Simple)
// ============================================================================

/**
 * Instancia singleton del service
 *
 * Uso recomendado para la mayoría de casos:
 * @example
 * import { paymentsService } from '@/lib/services/payments.service'
 * const payments = await paymentsService.fetchByProject('proj-123')
 */
export const paymentsService = new PaymentsService()

// ============================================================================
// Factory Function (Opción 2: Flexible)
// ============================================================================

/**
 * Crea una nueva instancia del service con configuración custom
 *
 * Útil para:
 * - Tests (baseUrl mockeado)
 * - Multiple environments
 * - Configuración específica
 *
 * @example
 * // En tests:
 * const testService = createPaymentsService({
 *   baseUrl: 'http://localhost:3001/api/payments'
 * })
 *
 * // En producción con timeout custom:
 * const service = createPaymentsService({
 *   timeout: 5000
 * })
 */
export function createPaymentsService(config?: Partial<ServiceConfig>): PaymentsService {
  return new PaymentsService(config)
}

// ============================================================================
// Mock Service (Para Tests)
// ============================================================================

/**
 * Mock implementation del service para tests
 *
 * @example
 * // En test:
 * const mockService = new MockPaymentsService()
 * mockService.mockFetchByProject([...mockPayments])
 *
 * const { result } = renderHook(() => useProjectPayments('proj-1', mockService))
 * await waitFor(() => expect(result.current.data).toHaveLength(2))
 */
export class MockPaymentsService implements IPaymentsRepository {
  private projectPayments = new Map<string, PaymentFromAPI[]>()
  private customerPayments = new Map<string, PaymentFromAPI[]>()
  private allPayments: PaymentFromAPI[] = []

  mockFetchByProject(projectId: string, payments: PaymentFromAPI[]): void {
    this.projectPayments.set(projectId, payments)
  }

  mockFetchByCustomer(customerId: string, payments: PaymentFromAPI[]): void {
    this.customerPayments.set(customerId, payments)
  }

  mockFetchAll(payments: PaymentFromAPI[]): void {
    this.allPayments = payments
  }

  async fetchByProject(projectId: string): Promise<PaymentFromAPI[]> {
    const payments = this.projectPayments.get(projectId)
    if (!payments) {
      throw new Error(`No mock data for project: ${projectId}`)
    }
    return Promise.resolve(payments)
  }

  async fetchByCustomer(customerId: string): Promise<PaymentFromAPI[]> {
    const payments = this.customerPayments.get(customerId)
    if (!payments) {
      throw new Error(`No mock data for customer: ${customerId}`)
    }
    return Promise.resolve(payments)
  }

  async fetchAll(): Promise<{
    payments: PaymentFromAPI[]
    total: number
    page: number
  }> {
    return Promise.resolve({
      payments: this.allPayments,
      total: this.allPayments.length,
      page: 1,
    })
  }

  reset(): void {
    this.projectPayments.clear()
    this.customerPayments.clear()
    this.allPayments = []
  }
}

// ============================================================================
// Extensiones Futuras (Ejemplos)
// ============================================================================

/**
 * Service con retry logic (ejemplo de extensión)
 *
 * @example
 * const service = new PaymentsServiceWithRetry({ retries: 3, retryDelay: 1000 })
 * const payments = await service.fetchByProject('proj-123')
 * // Si falla, reintenta hasta 3 veces con 1 segundo de delay
 */
export class PaymentsServiceWithRetry extends PaymentsService {
  private retries: number
  private retryDelay: number

  constructor(config?: Partial<ServiceConfig> & { retries?: number; retryDelay?: number }) {
    super(config)
    this.retries = config?.retries ?? 3
    this.retryDelay = config?.retryDelay ?? 1000
  }

  async fetchByProject(projectId: string): Promise<PaymentFromAPI[]> {
    return this.withRetry(() => super.fetchByProject(projectId))
  }

  async fetchByCustomer(customerId: string): Promise<PaymentFromAPI[]> {
    return this.withRetry(() => super.fetchByCustomer(customerId))
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        // No reintentar en el último intento
        if (attempt === this.retries) {
          break
        }

        // Delay antes del retry
        await this.delay(this.retryDelay * (attempt + 1))
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Service con cache (ejemplo de extensión con Map cache simple)
 *
 * @example
 * const service = new CachedPaymentsService({ cacheTTL: 60000 }) // 60 segundos
 * const payments1 = await service.fetchByProject('proj-123') // Fetch desde API
 * const payments2 = await service.fetchByProject('proj-123') // Retorna desde cache
 */
export class CachedPaymentsService extends PaymentsService {
  private cache = new Map<string, { data: unknown; timestamp: number }>()
  private cacheTTL: number

  constructor(config?: Partial<ServiceConfig> & { cacheTTL?: number }) {
    super(config)
    this.cacheTTL = config?.cacheTTL ?? 60000 // 60 segundos por defecto
  }

  async fetchByProject(projectId: string): Promise<PaymentFromAPI[]> {
    const cacheKey = `project:${projectId}`
    const cached = this.getFromCache<PaymentFromAPI[]>(cacheKey)

    if (cached) {
      return cached
    }

    const data = await super.fetchByProject(projectId)
    this.setInCache(cacheKey, data)
    return data
  }

  clearCache(): void {
    this.cache.clear()
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const isExpired = Date.now() - entry.timestamp > this.cacheTTL
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  private setInCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }
}
