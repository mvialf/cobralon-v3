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
} as const

/**
 * Limpia customers creados por tests E2E.
 *
 * Llama al endpoint de cleanup que borra customers cuyo nombre
 * coincida con patrones de test E2E.
 *
 * @param request - APIRequestContext de Playwright
 * @returns Número de registros eliminados
 */
export async function cleanupE2ECustomers(request: APIRequestContext): Promise<number> {
  try {
    const response = await request.delete(`${BASE_URL}/api/test/cleanup`, {
      data: {
        table: 'Customer',
        patterns: E2E_PATTERNS.customer,
      },
    })

    if (!response.ok()) {
      console.warn(`⚠️  Cleanup failed: ${response.status()} ${response.statusText()}`)
      return 0
    }

    const result = await response.json()
    console.log(`🧹 Cleanup: ${result.deleted} customers eliminados`)
    return result.deleted || 0
  } catch (error) {
    console.warn('⚠️  Cleanup error (endpoint may not exist):', error)
    return 0
  }
}

/**
 * Limpia projects creados por tests E2E.
 *
 * @param request - APIRequestContext de Playwright
 * @returns Número de registros eliminados
 */
export async function cleanupE2EProjects(request: APIRequestContext): Promise<number> {
  try {
    const response = await request.delete(`${BASE_URL}/api/test/cleanup`, {
      data: {
        table: 'Project',
        patterns: E2E_PATTERNS.project,
        field: 'projectName',
      },
    })

    if (!response.ok()) {
      console.warn(`⚠️  Cleanup failed: ${response.status()} ${response.statusText()}`)
      return 0
    }

    const result = await response.json()
    console.log(`🧹 Cleanup: ${result.deleted} projects eliminados`)
    return result.deleted || 0
  } catch (error) {
    console.warn('⚠️  Cleanup error (endpoint may not exist):', error)
    return 0
  }
}

/**
 * Limpia aftersales creados por tests E2E.
 *
 * @param request - APIRequestContext de Playwright
 * @returns Número de registros eliminados
 */
export async function cleanupE2EAftersales(request: APIRequestContext): Promise<number> {
  try {
    const response = await request.delete(`${BASE_URL}/api/test/cleanup`, {
      data: {
        table: 'Aftersale',
        patterns: E2E_PATTERNS.aftersale,
        field: 'description',
      },
    })

    if (!response.ok()) {
      console.warn(`⚠️  Cleanup failed: ${response.status()} ${response.statusText()}`)
      return 0
    }

    const result = await response.json()
    console.log(`🧹 Cleanup: ${result.deleted} aftersales eliminados`)
    return result.deleted || 0
  } catch (error) {
    console.warn('⚠️  Cleanup error (endpoint may not exist):', error)
    return 0
  }
}

/**
 * Limpia TODOS los datos de test E2E.
 *
 * Ejecuta cleanup de todas las tablas afectadas por tests.
 * Útil para limpiar todo antes de una sesión de tests.
 *
 * @param request - APIRequestContext de Playwright
 */
export async function cleanupAllE2EData(request: APIRequestContext): Promise<void> {
  console.log('🧹 Iniciando limpieza completa de datos E2E...')

  // El orden importa por las relaciones FK:
  // 1. Aftersales (dependen de Projects)
  // 2. Projects (dependen de Customers)
  // 3. Customers
  await cleanupE2EAftersales(request)
  await cleanupE2EProjects(request)
  await cleanupE2ECustomers(request)

  console.log('✅ Limpieza completa')
}
