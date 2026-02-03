/**
 * E2E Test Cleanup Utilities
 *
 * Funciones para limpiar datos de test después de ejecutar tests E2E.
 * Esto evita que la BD se llene de datos de prueba.
 *
 * @example
 * ```typescript
 * import { cleanupE2ECustomers } from './helpers/cleanup'
 *
 * test.afterAll(async ({ request }) => {
 *   await cleanupE2ECustomers(request)
 * })
 * ```
 */

import { APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

/**
 * Patrones de nombres usados en tests E2E.
 * Estos patrones identifican datos creados por tests.
 */
export const E2E_PATTERNS = {
  customer: ['E2E Test Customer', 'E2E Test No Email', 'E2E Duplicate Test', 'Test MCP'],
  project: ['Test E2E Crítico', 'E2E Test Project'],
  aftersale: ['E2E Test Aftersale', 'E2E Test Delete'],
  payment: ['REF-TEST-', 'REF-CRITICAL-', 'REF-CLIENTE-', 'REF-E2E-'],
  paymentMethod: ['E2E Test Method'],
} as const

/** Helper interno para ejecutar cleanup contra el endpoint */
async function executeCleanup(
  request: APIRequestContext,
  table: string,
  patterns: readonly string[],
  field?: string
): Promise<number> {
  try {
    const response = await request.delete(`${BASE_URL}/api/test/cleanup`, {
      data: {
        table,
        patterns: [...patterns],
        ...(field && { field }),
      },
    })

    if (!response.ok()) {
      console.warn(`⚠️  Cleanup ${table} failed: ${response.status()} ${response.statusText()}`)
      return 0
    }

    const result = await response.json()
    console.log(`🧹 Cleanup: ${result.deleted} ${table.toLowerCase()}s eliminados`)
    return result.deleted || 0
  } catch (error) {
    console.warn(`⚠️  Cleanup ${table} error (endpoint may not exist):`, error)
    return 0
  }
}

/**
 * Limpia customers creados por tests E2E.
 */
export async function cleanupE2ECustomers(request: APIRequestContext): Promise<number> {
  return executeCleanup(request, 'Customer', E2E_PATTERNS.customer)
}

/**
 * Limpia projects creados por tests E2E.
 */
export async function cleanupE2EProjects(request: APIRequestContext): Promise<number> {
  return executeCleanup(request, 'Project', E2E_PATTERNS.project, 'projectName')
}

/**
 * Limpia aftersales creados por tests E2E.
 */
export async function cleanupE2EAftersales(request: APIRequestContext): Promise<number> {
  return executeCleanup(request, 'Aftersale', E2E_PATTERNS.aftersale, 'description')
}

/**
 * Limpia payments creados por tests E2E.
 */
export async function cleanupE2EPayments(request: APIRequestContext): Promise<number> {
  return executeCleanup(request, 'Payment', E2E_PATTERNS.payment, 'reference')
}

/**
 * Limpia payment methods creados por tests E2E.
 */
export async function cleanupE2EPaymentMethods(request: APIRequestContext): Promise<number> {
  return executeCleanup(request, 'PaymentMethod', E2E_PATTERNS.paymentMethod)
}

/**
 * Limpia TODOS los datos de test E2E.
 *
 * Ejecuta cleanup de todas las tablas afectadas por tests.
 * Útil para limpiar todo antes de una sesión de tests.
 *
 * El orden importa por las relaciones FK:
 * 1. Payments (dependen de Projects y PaymentMethods)
 * 2. Aftersales (dependen de Projects)
 * 3. Projects (dependen de Customers)
 * 4. Customers
 * 5. PaymentMethods (independiente)
 */
export async function cleanupAllE2EData(request: APIRequestContext): Promise<void> {
  console.log('🧹 Iniciando limpieza completa de datos E2E...')

  await cleanupE2EPayments(request)
  await cleanupE2EAftersales(request)
  await cleanupE2EProjects(request)
  await cleanupE2ECustomers(request)
  await cleanupE2EPaymentMethods(request)

  console.log('✅ Limpieza completa')
}
