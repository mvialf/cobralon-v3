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

// Helper para crear request
function createRequest(body?: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/payment-methods', {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
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

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.paymentMethods).toHaveLength(2)
    expect(data.paymentMethods[0].name).toBe('Efectivo')
  })

  it('debe ordenar por active desc, order asc, name asc', async () => {
    vi.mocked(prisma.paymentMethod.findMany).mockResolvedValue([])

    await GET()

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

    const response = await GET()
    const data = await response.json()

    expect(data.paymentMethods[0]._count.payments).toBe(5)
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.paymentMethod.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await GET()
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
      const request = createRequest({ icon: 'star' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar nombre vacío', async () => {
      const request = createRequest({ name: '' })
      const response = await POST(request)
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

      const request = createRequest({ name: 'Efectivo' })
      const response = await POST(request)
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

      const request = createRequest({ name: 'Nuevo Método' })
      await POST(request)

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

      const request = createRequest({ name: 'Primer Método' })
      await POST(request)

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
      const request = createRequest({ name: 'Nuevo Método', icon: 'star' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.paymentMethod.name).toBe('Nuevo Método')
    })

    it('debe aceptar icon opcional (null)', async () => {
      const request = createRequest({ name: 'Sin Icono' })
      await POST(request)

      expect(prisma.paymentMethod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            icon: null,
          }),
        })
      )
    })

    it('debe crear con active: true por defecto', async () => {
      const request = createRequest({ name: 'Activo' })
      await POST(request)

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

      const request = createRequest({ name: 'Test' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear el método de pago')
    })
  })
})
