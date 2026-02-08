/**
 * Tests para app/api/payment-methods/route.ts (GET/POST)
 *
 * Valida:
 * - GET: Lista métodos de pago ordenados
 * - POST: Validación Zod
 * - POST: Nombre duplicado → 409
 * - POST: Auto-incremento de order
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock automático de logger-middleware (usa lib/__mocks__/logger-middleware.ts)
vi.mock('@/lib/logger-middleware')

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    paymentMethod: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET, POST } from '../route'

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/payment-methods', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

async function callGET() {
  return (GET as any)(new NextRequest('http://localhost:3000/api/payment-methods'))
}

async function callPOST(body: Record<string, unknown>) {
  return (POST as any)(createPostRequest(body))
}

describe('GET /api/payment-methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar lista de métodos de pago', async () => {
    vi.mocked(prisma.paymentMethod.findMany).mockResolvedValue([
      { id: 'pm1', name: 'Efectivo', icon: 'cash', order: 1, active: true, _count: { payments: 5 } },
      { id: 'pm2', name: 'Transferencia', icon: 'bank', order: 2, active: true, _count: { payments: 10 } },
    ] as never)

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.paymentMethods).toHaveLength(2)
    expect(data.paymentMethods[0].name).toBe('Efectivo')
  })

  it('debe ordenar por active desc, order asc, name asc', async () => {
    vi.mocked(prisma.paymentMethod.findMany).mockResolvedValue([])

    await callGET()

    expect(prisma.paymentMethod.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ active: 'desc' }, { order: 'asc' }, { name: 'asc' }],
      })
    )
  })

  it('debe incluir conteo de pagos', async () => {
    vi.mocked(prisma.paymentMethod.findMany).mockResolvedValue([
      { id: 'pm1', name: 'Efectivo', _count: { payments: 5 } },
    ] as never)

    const response = await callGET()
    const data = await response.json()

    expect(data.paymentMethods[0]._count.payments).toBe(5)
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.paymentMethod.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener los métodos de pago')
  })
})

describe('POST /api/payment-methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.paymentMethod.aggregate).mockResolvedValue({
      _max: { order: 2 },
    } as never)
    vi.mocked(prisma.paymentMethod.create).mockResolvedValue({
      id: 'pm-new',
      name: 'Nuevo Método',
      icon: 'star',
      order: 3,
      active: true,
      _count: { payments: 0 },
    } as never)
  })

  describe('validaciones Zod', () => {
    it('debe rechazar sin nombre', async () => {
      const response = await callPOST({ icon: 'star' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar nombre vacío', async () => {
      const response = await callPOST({ name: '' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })
  })

  describe('nombre duplicado', () => {
    it('debe rechazar nombre duplicado con 409', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
        id: 'existing',
        name: 'Efectivo',
      } as never)

      const response = await callPOST({ name: 'Efectivo' })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('ya existe')
    })
  })

  describe('auto-incremento de order', () => {
    it('debe calcular order como max + 1', async () => {
      vi.mocked(prisma.paymentMethod.aggregate).mockResolvedValue({
        _max: { order: 5 },
      } as never)

      await callPOST({ name: 'Nuevo Método' })

      expect(prisma.paymentMethod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 6,
          }),
        })
      )
    })

    it('debe usar order 1 si no hay métodos existentes', async () => {
      vi.mocked(prisma.paymentMethod.aggregate).mockResolvedValue({
        _max: { order: null },
      } as never)

      await callPOST({ name: 'Primer Método' })

      expect(prisma.paymentMethod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 1,
          }),
        })
      )
    })
  })

  describe('creación exitosa', () => {
    it('debe crear método de pago y retornar 201', async () => {
      const response = await callPOST({ name: 'Nuevo Método', icon: 'star' })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.paymentMethod.name).toBe('Nuevo Método')
    })

    it('debe aceptar icon opcional (null)', async () => {
      await callPOST({ name: 'Sin Icono' })

      expect(prisma.paymentMethod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            icon: null,
          }),
        })
      )
    })

    it('debe crear con active: true por defecto', async () => {
      await callPOST({ name: 'Activo' })

      expect(prisma.paymentMethod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            active: true,
          }),
        })
      )
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando create falla', async () => {
      vi.mocked(prisma.paymentMethod.create).mockRejectedValue(new Error('DB Error'))

      const response = await callPOST({ name: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear el método de pago')
    })
  })
})
