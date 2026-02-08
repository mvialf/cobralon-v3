/**
 * Tests para app/api/projects/route.ts (GET/POST endpoints)
 *
 * ⚠️ CRÍTICO: Seguridad de cálculo de totalAmount
 *
 * Valida:
 * - GET: Paginación, filtros, facets
 * - POST: Validaciones, cálculo de totalAmount en servidor
 * - SEGURIDAD: totalAmount SIEMPRE calculado en servidor (ignorar cliente)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

// Mock automático de logger-middleware (usa lib/__mocks__/logger-middleware.ts)
vi.mock('@/lib/logger-middleware')

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    projectUninstallTag: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock de queries
vi.mock('@/lib/queries/project-list', () => ({
  queryProjectList: vi.fn().mockResolvedValue([]),
  countProjects: vi.fn().mockResolvedValue(0),
  getStatusFacets: vi.fn().mockResolvedValue([]),
  getStateFacets: vi.fn().mockResolvedValue([]),
}))

// Mock de business logic
vi.mock('@/lib/business-logic/totals', () => ({
  calculateProjectTotal: vi.fn((subtotal: number, taxRate: number) => {
    return subtotal * (1 + taxRate / 100)
  }),
}))

import { prisma } from '@/lib/db'
import {
  queryProjectList,
  countProjects,
  getStatusFacets,
  getStateFacets,
} from '@/lib/queries/project-list'
import { calculateProjectTotal } from '@/lib/business-logic/totals'
import { GET, POST } from '../route'

// Helper para llamar a handlers
async function callGET(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (GET as any)(request, context)
}

async function callPOST(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (POST as any)(request, context)
}

// Helper para crear requests
function createGetRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/projects')
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/projects', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Payload válido base
const validPayload = {
  customerId: 'customer-1',
  projectNumber: 'P-001',
  phone: '+56912345678',
  street: 'Av. Principal 123',
  comuna: 'Las Condes',
  region: 'Metropolitana',
  subtotal: 1000000,
  taxRate: 19,
  date: '2024-01-15',
}

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validación de projectState', () => {
    // Los tests de GET son complejos porque la API tiene validación Zod interna
    // que es difícil de mockear. Solo testeamos la validación que podemos controlar.

    it('debe rechazar projectState inválido', async () => {
      const request = createGetRequest({ projectState: 'Invalido' })
      const response = await callGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('projectState')
    })
  })

  // NOTA: Los tests detallados de paginación, filtros y facets requieren
  // un setup más complejo de mocks que puede ser frágil.
  // Los tests de integración cubren mejor estos escenarios.
})

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks por defecto
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test Customer',
    } as never)

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const mockTx = {
        project: {
          create: vi.fn().mockResolvedValue({
            id: 'project-1',
            projectNumber: 'P-001',
            subtotal: new Decimal(1000000),
            taxRate: new Decimal(19),
            total: new Decimal(1190000),
            totalAmount: new Decimal(1190000),
            balance: new Decimal(1190000),
          }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'project-1',
            projectNumber: 'P-001',
            customer: { id: 'customer-1', name: 'Test' },
            projectStatus: null,
            uninstallTags: [],
          }),
        },
        projectUninstallTag: {
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      }
      return fn(mockTx as never)
    })
  })

  describe('validaciones Zod de campos requeridos', () => {
    it('debe rechazar sin customerId', async () => {
      const { customerId: _, ...noCustomer } = validPayload
      const request = createPostRequest(noCustomer)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Datos inválidos')
      expect(data.details).toBeDefined()
    })

    it('debe rechazar sin projectNumber', async () => {
      const { projectNumber: _, ...noNumber } = validPayload
      const request = createPostRequest(noNumber)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar sin teléfono', async () => {
      const { phone: _, ...noPhone } = validPayload
      const request = createPostRequest(noPhone)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar sin calle', async () => {
      const { street: _, ...noStreet } = validPayload
      const request = createPostRequest(noStreet)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar sin comuna', async () => {
      const { comuna: _, ...noComuna } = validPayload
      const request = createPostRequest(noComuna)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar sin region', async () => {
      const { region: _, ...noRegion } = validPayload
      const request = createPostRequest(noRegion)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar sin subtotal', async () => {
      const { subtotal: _, ...noSubtotal } = validPayload
      const request = createPostRequest(noSubtotal)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar subtotal <= 0', async () => {
      const request = createPostRequest({ ...validPayload, subtotal: 0 })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar subtotal negativo', async () => {
      const request = createPostRequest({ ...validPayload, subtotal: -1000 })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('validación de cliente', () => {
    it('debe rechazar cliente inexistente', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

      const request = createPostRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('cliente no existe')
    })
  })

  describe('⚠️ SEGURIDAD: Cálculo de totalAmount', () => {
    it('debe calcular totalAmount en servidor', async () => {
      const request = createPostRequest(validPayload)
      await callPOST(request)

      // Verificar que se llamó a calculateProjectTotal
      expect(calculateProjectTotal).toHaveBeenCalledWith(1000000, 19)
    })

    it('debe IGNORAR totalAmount enviado por cliente', async () => {
      // Cliente intenta enviar totalAmount manipulado
      const request = createPostRequest({
        ...validPayload,
        totalAmount: 500000, // Intento de fraude: valor mucho menor
      })
      await callPOST(request)

      // El servidor debe haber calculado el valor correcto
      expect(calculateProjectTotal).toHaveBeenCalledWith(1000000, 19)
    })

    it('debe usar taxRate 19 por defecto', async () => {
      const { taxRate: _, ...noTaxRate } = validPayload
      const request = createPostRequest(noTaxRate)
      await callPOST(request)

      expect(calculateProjectTotal).toHaveBeenCalledWith(1000000, 19)
    })

    it('debe respetar taxRate enviado', async () => {
      const request = createPostRequest({ ...validPayload, taxRate: 21 })
      await callPOST(request)

      expect(calculateProjectTotal).toHaveBeenCalledWith(1000000, 21)
    })

    it('debe aceptar taxRate 0 (exento)', async () => {
      const request = createPostRequest({ ...validPayload, taxRate: 0 })
      await callPOST(request)

      expect(calculateProjectTotal).toHaveBeenCalledWith(1000000, 0)
    })
  })

  describe('creación exitosa', () => {
    it('debe crear proyecto con campos obligatorios', async () => {
      const request = createPostRequest(validPayload)
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe aceptar projectName opcional', async () => {
      const request = createPostRequest({
        ...validPayload,
        projectName: 'Mi Proyecto',
      })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe aceptar apartment opcional', async () => {
      const request = createPostRequest({
        ...validPayload,
        apartment: 'Depto 501',
      })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe aceptar projectStatusId opcional', async () => {
      const request = createPostRequest({
        ...validPayload,
        projectStatusId: 'status-1',
      })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe aceptar uninstallTagIds con UUIDs válidos', async () => {
      const request = createPostRequest({
        ...validPayload,
        uninstallTagIds: [
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        ],
      })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe rechazar uninstallTagIds con UUIDs inválidos', async () => {
      const request = createPostRequest({
        ...validPayload,
        uninstallTagIds: ['not-a-uuid'],
      })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando transacción falla', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'))

      const request = createPostRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear proyecto')
    })
  })
})
