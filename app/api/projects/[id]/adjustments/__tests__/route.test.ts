/**
 * Tests para app/api/projects/[id]/adjustments/route.ts (GET/POST)
 *
 * Valida:
 * - GET: Lista de ajustes de un proyecto
 * - POST: Validación Zod, regla de balance >= 0, transacción atómica
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    projectAdjustment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock de validaciones
vi.mock('@/lib/validations/project-adjustment-validations', () => ({
  createProjectAdjustmentSchema: {
    safeParse: vi.fn(),
  },
}))

// Mock de business logic
vi.mock('@/lib/business-logic/update-project-balance', () => ({
  updateProjectBalanceWithAdjustments: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { createProjectAdjustmentSchema } from '@/lib/validations/project-adjustment-validations'
import { GET, POST } from '../route'

// Helper para crear params
function createParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// Helper para crear request
function createRequest(method: string, body?: Record<string, unknown>): Request {
  const init: RequestInit = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new Request('http://localhost:3000/api/projects/test-id/adjustments', init)
}

describe('GET /api/projects/[id]/adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 404 cuando proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const request = createRequest('GET')
    const response = await GET(request, createParams('nonexistent'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Proyecto no encontrado')
  })

  it('debe retornar lista vacía cuando no hay ajustes', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: 'project-1' } as never)
    vi.mocked(prisma.projectAdjustment.findMany).mockResolvedValue([])

    const request = createRequest('GET')
    const response = await GET(request, createParams('project-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('debe retornar ajustes con amount convertido a number', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: 'project-1' } as never)
    vi.mocked(prisma.projectAdjustment.findMany).mockResolvedValue([
      {
        id: 'adj-1',
        projectId: 'project-1',
        amount: new Decimal(50000),
        reason: 'DISCOUNT',
        description: 'Descuento por promoción',
        appliedAt: new Date('2024-01-15'),
      },
    ] as never)

    const request = createRequest('GET')
    const response = await GET(request, createParams('project-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(typeof data[0].amount).toBe('number')
    expect(data[0].amount).toBe(50000)
  })

  it('debe ordenar por fecha descendente', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: 'project-1' } as never)
    vi.mocked(prisma.projectAdjustment.findMany).mockResolvedValue([])

    const request = createRequest('GET')
    await GET(request, createParams('project-1'))

    expect(prisma.projectAdjustment.findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-1' },
      orderBy: { appliedAt: 'desc' },
    })
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error('DB Error'))

    const request = createRequest('GET')
    const response = await GET(request, createParams('project-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener los ajustes')
  })
})

describe('POST /api/projects/[id]/adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: validación pasa
    vi.mocked(createProjectAdjustmentSchema.safeParse).mockReturnValue({
      success: true,
      data: {
        amount: 50000,
        reason: 'DISCOUNT',
        description: 'Descuento',
        appliedAt: new Date('2024-01-15'),
      },
    } as never)

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: 'project-1',
      balance: new Decimal(100000),
      totalAmount: new Decimal(1190000),
    } as never)

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const mockTx = {
        projectAdjustment: {
          create: vi.fn().mockResolvedValue({
            id: 'adj-1',
            amount: new Decimal(50000),
            reason: 'DISCOUNT',
          }),
        },
      }
      return fn(mockTx as never)
    })
  })

  describe('validaciones', () => {
    it('debe rechazar datos inválidos según schema', async () => {
      vi.mocked(createProjectAdjustmentSchema.safeParse).mockReturnValue({
        success: false,
        error: {
          flatten: () => ({
            fieldErrors: { amount: ['El monto es requerido'] },
          }),
        },
      } as never)

      const request = createRequest('POST', { reason: 'DISCOUNT' })
      const response = await POST(request, createParams('project-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
      expect(data.details).toBeDefined()
    })

    it('debe retornar 404 cuando proyecto no existe', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

      const request = createRequest('POST', { amount: 50000, reason: 'DISCOUNT' })
      const response = await POST(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Proyecto no encontrado')
    })
  })

  describe('validación de balance', () => {
    it('debe rechazar ajuste que haría balance negativo', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'project-1',
        balance: new Decimal(50000),
        totalAmount: new Decimal(1190000),
      } as never)

      vi.mocked(createProjectAdjustmentSchema.safeParse).mockReturnValue({
        success: true,
        data: { amount: 100000, reason: 'DISCOUNT' },
      } as never)

      const request = createRequest('POST', { amount: 100000, reason: 'DISCOUNT' })
      const response = await POST(request, createParams('project-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('excede el balance')
      expect(data.error).toContain('50000')
    })

    it('debe permitir ajuste que deja balance en 0', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'project-1',
        balance: new Decimal(50000),
        totalAmount: new Decimal(1190000),
      } as never)

      vi.mocked(createProjectAdjustmentSchema.safeParse).mockReturnValue({
        success: true,
        data: { amount: 50000, reason: 'DISCOUNT' },
      } as never)

      const request = createRequest('POST', { amount: 50000, reason: 'DISCOUNT' })
      const response = await POST(request, createParams('project-1'))

      expect(response.status).toBe(201)
    })

    it('debe permitir ajuste cuando balance ya es negativo (sobrepago)', async () => {
      // Balance negativo indica sobrepago del cliente
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'project-1',
        balance: new Decimal(-10000),
        totalAmount: new Decimal(1190000),
      } as never)

      vi.mocked(createProjectAdjustmentSchema.safeParse).mockReturnValue({
        success: true,
        data: { amount: 50000, reason: 'DISCOUNT' },
      } as never)

      const request = createRequest('POST', { amount: 50000, reason: 'DISCOUNT' })
      const response = await POST(request, createParams('project-1'))

      // Debe permitir porque balance ya era negativo
      expect(response.status).toBe(201)
    })
  })

  describe('creación exitosa', () => {
    it('debe crear ajuste y retornar con amount convertido', async () => {
      const request = createRequest('POST', {
        amount: 50000,
        reason: 'DISCOUNT',
        description: 'Descuento especial',
      })
      const response = await POST(request, createParams('project-1'))
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(typeof data.amount).toBe('number')
    })

    it('debe aceptar description opcional', async () => {
      vi.mocked(createProjectAdjustmentSchema.safeParse).mockReturnValue({
        success: true,
        data: { amount: 50000, reason: 'DISCOUNT' },
      } as never)

      const request = createRequest('POST', { amount: 50000, reason: 'DISCOUNT' })
      const response = await POST(request, createParams('project-1'))

      expect(response.status).toBe(201)
    })

    it('debe aceptar appliedAt opcional', async () => {
      vi.mocked(createProjectAdjustmentSchema.safeParse).mockReturnValue({
        success: true,
        data: { amount: 50000, reason: 'DISCOUNT', appliedAt: new Date('2024-01-15') },
      } as never)

      const request = createRequest('POST', {
        amount: 50000,
        reason: 'DISCOUNT',
        appliedAt: '2024-01-15',
      })
      const response = await POST(request, createParams('project-1'))

      expect(response.status).toBe(201)
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando transacción falla', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'))

      const request = createRequest('POST', { amount: 50000, reason: 'DISCOUNT' })
      const response = await POST(request, createParams('project-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear el ajuste')
    })
  })
})
