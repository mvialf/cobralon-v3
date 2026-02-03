/**
 * Factory para crear datos de test vía API REST.
 *
 * Permite que los tests creen sus propios datos en lugar de depender de
 * datos pre-existentes en la DB. Esto elimina "tests fantasma" (if/return).
 */

import { APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

// Prefijos estándar para identificar datos de test
export const TEST_PREFIXES = {
  customer: 'E2E Test Customer',
  project: 'E2E Test Project',
  paymentMethod: 'E2E Test Method',
  paymentReference: 'REF-E2E-',
} as const

interface CreatedCustomer {
  id: string
  name: string
  phone: string
  email: string | null
}

interface CreatedProject {
  id: string
  projectNumber: string
  projectName: string | null
  total: number
  customerId: string
}

interface CreatedPaymentMethod {
  id: string
  name: string
}

/**
 * Crea un cliente de test vía API.
 */
export async function createTestCustomer(
  request: APIRequestContext,
  overrides: { name?: string; phone?: string; email?: string } = {}
): Promise<CreatedCustomer> {
  const timestamp = Date.now()
  const data = {
    name: overrides.name ?? `${TEST_PREFIXES.customer} ${timestamp}`,
    phone: overrides.phone ?? `+5691${String(timestamp).slice(-7)}`,
    email: overrides.email,
  }

  const response = await request.post(`${BASE_URL}/api/customers`, {
    data,
  })

  if (!response.ok()) {
    const body = await response.text()
    throw new Error(`createTestCustomer failed (${response.status()}): ${body}`)
  }

  const customer = await response.json()
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
  }
}

/**
 * Crea un proyecto de test vía API.
 *
 * El total se calcula en el servidor como: subtotal * (1 + taxRate/100)
 * Con subtotal=4201681 y taxRate=19 → total ≈ 5,000,000
 */
export async function createTestProject(
  request: APIRequestContext,
  customerId: string,
  overrides: {
    projectName?: string
    subtotal?: number
    taxRate?: number
    projectStatusId?: string
    phone?: string
  } = {}
): Promise<CreatedProject> {
  const timestamp = Date.now()
  const data = {
    customerId,
    projectNumber: `E2E-${timestamp}`,
    projectName: overrides.projectName ?? `${TEST_PREFIXES.project} ${timestamp}`,
    phone: overrides.phone ?? '+56912345678',
    street: 'Calle E2E Test 123',
    comuna: 'Santiago',
    region: 'Metropolitana',
    subtotal: overrides.subtotal ?? 1000000,
    taxRate: overrides.taxRate ?? 19,
    projectStatusId: overrides.projectStatusId ?? undefined,
    windowsCount: 1,
    squareMeters: 10,
  }

  const response = await request.post(`${BASE_URL}/api/projects`, {
    data,
  })

  if (!response.ok()) {
    const body = await response.text()
    throw new Error(`createTestProject failed (${response.status()}): ${body}`)
  }

  const project = await response.json()
  return {
    id: project.id,
    projectNumber: project.projectNumber,
    projectName: project.projectName,
    total: Number(project.total),
    customerId: project.customerId,
  }
}

/**
 * Asegura que existe al menos un método de pago activo.
 * Si ya existe uno con el nombre E2E, lo retorna. Si no, lo crea.
 */
export async function ensurePaymentMethod(
  request: APIRequestContext
): Promise<CreatedPaymentMethod> {
  // Intentar obtener métodos existentes
  const listResponse = await request.get(`${BASE_URL}/api/payment-methods`)

  if (listResponse.ok()) {
    const methods = await listResponse.json()
    const list = Array.isArray(methods) ? methods : methods.paymentMethods ?? []

    // Buscar uno activo
    const active = list.find(
      (m: { active: boolean }) => m.active
    )
    if (active) {
      return { id: active.id, name: active.name }
    }
  }

  // No hay método activo, crear uno
  const response = await request.post(`${BASE_URL}/api/payment-methods`, {
    data: {
      name: TEST_PREFIXES.paymentMethod,
    },
  })

  if (!response.ok()) {
    const body = await response.text()
    throw new Error(`ensurePaymentMethod failed (${response.status()}): ${body}`)
  }

  const result = await response.json()
  const method = result.paymentMethod ?? result
  return { id: method.id, name: method.name }
}

/**
 * Obtiene el primer ProjectStatus disponible (necesario para crear proyectos en algunos flujos).
 */
export async function getFirstProjectStatus(
  request: APIRequestContext
): Promise<{ id: string; name: string } | null> {
  const response = await request.get(`${BASE_URL}/api/project-statuses`)

  if (!response.ok()) return null

  const statuses = await response.json()
  const list = Array.isArray(statuses) ? statuses : statuses.statuses ?? []
  return list.length > 0 ? { id: list[0].id, name: list[0].name } : null
}
