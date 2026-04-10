/**
 * Tests para app/api/projects/[id]/adjustments/route.ts (GET/POST)
 *
 * Valida:
 * - GET: Lista de ajustes de un proyecto, UUID validation, 404
 * - POST: Validación Zod vía bodySchema, regla de balance >= 0, transacción atómica
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

// Mock del logger middleware
vi.mock('@/lib/logger-middleware', () => ({
  withLogging: (handler: Function) => {
    return async (
      request: NextRequest,
      context?: { params: Promise<Record<string, string>> }
    ) => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
      }
      const mockContext = context || { params: Promise.resolve({}) }
      return handler(request, mockLogger, mockContext)
    }
  },
}))

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

// Mock de business logic
vi.mock('@/lib/business-logic/update-project-balance', () => ({
  updateProjectBalanceWithAdjustments: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { GET as _GET, POST as _POST } from '../route'

const validProjectId = '00000000-0000-0000-0000-000000000001'

// Wrappers para pasar context con params
function callGET(request: NextRequest, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (_GET as any)(request, { params: Promise.resolve({ id }) })
}

function callPOST(request: NextRequest, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (_POST as any)(request, { params: Promise.resolve({ id }) })
}

function createGetRequest(): NextRequest {
  return new NextRequest(
    new URL(`http://localhost:3000/api/projects/${validProjectId}/adjustments`),
    { method: 'GET' }
  )
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    new URL(`http://localhost:3000/api/projects/${validProjectId}/adjustments`),
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

describe('GET /api/projects/[id]/adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 400 con UUID inválido', async () => {
    const request = createGetRequest()
    const response = await callGET(request, 'not-a-uuid')
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
  })

  it('debe retornar 404 cuando proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const request = createGetRequest()
    const response = await callGET(request, validProjectId)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Proyecto no encontrado')
  })

  it('debe retornar lista vacía cuando no hay ajustes', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: validProjectId } as never)
    vi.mocked(prisma.projectAdjustment.findMany).mockResolvedValue([])

    const request = createGetRequest()
    const response = await callGET(request, validProjectId)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('debe retornar ajustes con amount convertido a number', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: validProjectId } as never)
    vi.mocked(prisma.projectAdjustment.findMany).mockResolvedValue([
      {
        id: 'adj-1',
        projectId: validProjectId,
        amount: new Decimal(50000),
        reason: 'DISCOUNT',
        description: 'Descuento por promoción',
        appliedAt: new Date('2024-01-15'),
      },
    ] as never)

    const request = createGetRequest()
    const response = await callGET(request, validProjectId)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(typeof data[0].amount).toBe('number')
    expect(data[0].amount).toBe(50000)
  })

  it('debe ordenar por fecha descendente', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: validProjectId } as never)
    vi.mocked(prisma.projectAdjustment.findMany).mockResolvedValue([])

    const request = createGetRequest()
    await callGET(request, validProjectId)

    expect(prisma.projectAdjustment.findMany).toHaveBeenCalledWith({
      where: { projectId: validProjectId },
      orderBy: { appliedAt: 'desc' },
      include: {
        adjustmentReason: {
          select: { name: true, warningLevel: true },
        },
      },
    })
  })

  it('debe retornar 500 cuando ocurre un error de DB', async () => {
    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error('DB Error'))

    const request = createGetRequest()
    const response = await callGET(request, validProjectId)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener los ajustes')
  })
})

describe('POST /api/projects/[id]/adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: validProjectId,
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

  it('debe retornar 400 con UUID inválido', async () => {
    const request = createPostRequest({ amount: 50000, reason: 'DISCOUNT' })
    const response = await callPOST(request, 'not-a-uuid')
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
  })

  it('debe rechazar datos inválidos según schema (sin amount)', async () => {
    const request = createPostRequest({ reason: 'DISCOUNT' })
    const response = await callPOST(request, validProjectId)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Datos inválidos')
  })

  it('debe retornar 404 cuando proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const request = createPostRequest({ amount: 50000, reason: 'DISCOUNT' })
    const response = await callPOST(request, validProjectId)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Proyecto no encontrado')
  })

  it('debe rechazar ajuste que haría balance negativo', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: validProjectId,
      balance: new Decimal(50000),
      totalAmount: new Decimal(1190000),
    } as never)

    const request = createPostRequest({ amount: 100000, reason: 'DISCOUNT' })
    const response = await callPOST(request, validProjectId)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('excede el balance')
    expect(data.error).toContain('50000')
  })

  it('debe permitir ajuste que deja balance en 0', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: validProjectId,
      balance: new Decimal(50000),
      totalAmount: new Decimal(1190000),
    } as never)

    const request = createPostRequest({ amount: 50000, reason: 'DISCOUNT' })
    const response = await callPOST(request, validProjectId)

    expect(response.status).toBe(201)
  })

  it('debe permitir ajuste cuando balance ya es negativo (sobrepago)', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: validProjectId,
      balance: new Decimal(-10000),
      totalAmount: new Decimal(1190000),
    } as never)

    const request = createPostRequest({ amount: 50000, reason: 'DISCOUNT' })
    const response = await callPOST(request, validProjectId)

    expect(response.status).toBe(201)
  })

  it('debe crear ajuste y retornar con amount convertido', async () => {
    const request = createPostRequest({
      amount: 50000,
      reason: 'DISCOUNT',
      description: 'Descuento especial',
    })
    const response = await callPOST(request, validProjectId)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(typeof data.amount).toBe('number')
  })

  it('debe retornar 500 cuando transacción falla', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'))

    const request = createPostRequest({ amount: 50000, reason: 'DISCOUNT' })
    const response = await callPOST(request, validProjectId)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al crear el ajuste')
  })
})
