/**
 * Tests para app/api/aftersales/route.ts (GET/POST)
 *
 * Valida:
 * - GET: Lista aftersales con relaciones
 * - POST: Validaciones, proyecto finalizado, status activo, transacción
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock de logger-middleware (requerido por withApiHandler)
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

vi.mock('@/lib/db', () => ({
  prisma: {
    aftersale: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    aftersaleStatus: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/regiones-chile', () => ({
  getRegionByCodigo: vi.fn().mockReturnValue({ nombre: 'Región Metropolitana' }),
}))

import { prisma } from '@/lib/db'
import { GET, POST } from '../route'

const validBody = {
  projectId: '00000000-0000-0000-0000-000000000001',
  aftersaleStatusId: '00000000-0000-0000-0000-000000000002',
  contactPhone: '+56912345678',
  description: 'Problema con ventana',
  reportedAt: '2024-06-15T10:00:00.000Z',
  tasks: [],
  street: 'Av. Principal 123',
  comuna: 'Santiago',
  region: '13',
}

async function callGET() {
  return (GET as any)(new NextRequest('http://localhost:3000/api/aftersales'))
}

async function callPOST(body: Record<string, unknown>) {
  const request = new NextRequest('http://localhost:3000/api/aftersales', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  return (POST as any)(request)
}

describe('GET /api/aftersales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar lista de aftersales', async () => {
    vi.mocked(prisma.aftersale.findMany).mockResolvedValue([
      {
        id: 'af-1',
        description: 'Problema',
        reportedAt: new Date(),
        project: { id: 'p1', projectNumber: '1001', projectName: null, customer: { name: 'Cliente' } },
        aftersaleStatus: { id: 's1', name: 'Abierto', color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-500' } },
      },
    ] as never)

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.aftersales).toHaveLength(1)
  })

  it('debe retornar 500 cuando falla', async () => {
    vi.mocked(prisma.aftersale.findMany).mockRejectedValue(new Error('DB'))

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('obtener los casos de postventa')
  })
})

describe('POST /api/aftersales', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: validBody.projectId,
      projectStatus: { isFinal: true },
    } as never)

    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: validBody.aftersaleStatusId,
      isActive: true,
    } as never)

    const mockResult = {
      id: 'af-new',
      description: validBody.description,
      project: { projectNumber: '1001', projectName: null, customer: { name: 'Cliente' } },
      aftersaleStatus: { name: 'Abierto', color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-500' } },
    }

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const mockTx = {
        project: { update: vi.fn() },
        aftersale: { create: vi.fn().mockResolvedValue(mockResult) },
      }
      return fn(mockTx as never)
    })
  })

  it('debe crear aftersale exitosamente', async () => {
    const response = await callPOST(validBody)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.aftersale).toBeDefined()
  })

  it('debe rechazar proyecto no finalizado', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: validBody.projectId,
      projectStatus: { isFinal: false },
    } as never)

    const response = await callPOST(validBody)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('proyectos finalizados')
  })

  it('debe retornar 404 si proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const response = await callPOST(validBody)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('proyecto seleccionado no existe')
  })

  it('debe retornar 404 si status no existe', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue(null)

    const response = await callPOST(validBody)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('estado seleccionado no existe')
  })

  it('debe rechazar status inactivo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: validBody.aftersaleStatusId,
      isActive: false,
    } as never)

    const response = await callPOST(validBody)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('no está activo')
  })

  it('debe rechazar teléfono inválido (Zod)', async () => {
    const response = await callPOST({
      ...validBody,
      contactPhone: '12345',
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Datos inválidos')
  })

  it('debe rechazar sin campos requeridos (Zod)', async () => {
    const response = await callPOST({
      projectId: validBody.projectId,
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Datos inválidos')
  })

  it('debe retornar 500 cuando $transaction falla', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async () => {
      throw new Error('TX failed')
    })

    const response = await callPOST(validBody)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('crear el caso de postventa')
  })
})
