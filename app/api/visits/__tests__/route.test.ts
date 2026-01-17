/**
 * Tests para app/api/visits/route.ts (GET/POST)
 *
 * Valida:
 * - GET: Paginación, filtros, búsqueda
 * - POST: Creación de visita
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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
    visit: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET, POST } from '../route'

// Helper para crear request
function createGetRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/visits')
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/visits', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Helper para llamar handlers
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

describe('GET /api/visits', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.visit.findMany).mockResolvedValue([])
  })

  it('debe retornar lista vacía cuando no hay visitas', async () => {
    const response = await callGET(createGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual([])
    expect(data.pagination.total).toBe(0)
  })

  it('debe retornar visitas con paginación', async () => {
    vi.mocked(prisma.visit.findMany).mockResolvedValue([
      { id: 'v1', name: 'Test 1', visitStatus: {} },
      { id: 'v2', name: 'Test 2', visitStatus: {} },
    ] as never)

    const response = await callGET(createGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(2)
    expect(data.pagination.total).toBe(2)
  })

  it('debe respetar parámetros de paginación', async () => {
    const mockVisits = Array(25)
      .fill(null)
      .map((_, i) => ({ id: `v${i}`, name: `Test ${i}`, visitStatus: {} }))
    vi.mocked(prisma.visit.findMany).mockResolvedValue(mockVisits as never)

    const response = await callGET(createGetRequest({ page: '2', limit: '10' }))
    const data = await response.json()

    expect(data.pagination.page).toBe(2)
    expect(data.pagination.limit).toBe(10)
    expect(data.data).toHaveLength(10)
  })

  it('debe limitar máximo a 100 registros', async () => {
    const mockVisits = Array(150)
      .fill(null)
      .map((_, i) => ({ id: `v${i}`, name: `Test ${i}`, visitStatus: {} }))
    vi.mocked(prisma.visit.findMany).mockResolvedValue(mockVisits as never)

    const response = await callGET(createGetRequest({ limit: '200' }))
    const data = await response.json()

    expect(data.data).toHaveLength(100)
  })

  it('debe filtrar por visitStatusId', async () => {
    vi.mocked(prisma.visit.findMany).mockResolvedValue([])

    await callGET(createGetRequest({ visitStatusId: 'status-1' }))

    expect(prisma.visit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visitStatusId: 'status-1' },
      })
    )
  })

  it('debe ordenar por fecha descendente', async () => {
    vi.mocked(prisma.visit.findMany).mockResolvedValue([])

    await callGET(createGetRequest())

    expect(prisma.visit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { date: 'desc' },
      })
    )
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.visit.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await callGET(createGetRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener las visitas')
  })
})

describe('POST /api/visits', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.visit.create).mockResolvedValue({
      id: 'v-new',
      name: 'Nueva Visita',
      visitStatus: {},
    } as never)
  })

  it('debe crear visita y retornar 201', async () => {
    const request = createPostRequest({
      name: 'Nueva Visita',
      street: 'Calle 123',
      comuna: 'Santiago',
      region: 'Metropolitana',
      visitStatusId: 'status-1',
      date: '2024-01-15',
    })
    const response = await callPOST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('v-new')
  })

  it('debe convertir date string a Date', async () => {
    const request = createPostRequest({
      name: 'Test',
      street: 'Calle',
      comuna: 'Comuna',
      region: 'Region',
      visitStatusId: 'status-1',
      date: '2024-01-15',
    })
    await callPOST(request)

    expect(prisma.visit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          date: expect.any(Date),
        }),
      })
    )
  })

  it('debe manejar campos opcionales', async () => {
    const request = createPostRequest({
      name: 'Test',
      street: 'Calle',
      comuna: 'Comuna',
      region: 'Region',
      visitStatusId: 'status-1',
      date: '2024-01-15',
      phone: '+56912345678',
      apartment: 'Depto 5',
      scheduledTime: '10:00',
      observations: 'Notas',
    })
    await callPOST(request)

    expect(prisma.visit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: '+56912345678',
          apartment: 'Depto 5',
          scheduledTime: '10:00',
          observations: 'Notas',
        }),
      })
    )
  })

  it('debe convertir campos vacíos a null', async () => {
    const request = createPostRequest({
      name: 'Test',
      street: 'Calle',
      comuna: 'Comuna',
      region: 'Region',
      visitStatusId: 'status-1',
      date: '2024-01-15',
      phone: '',
      apartment: '',
    })
    await callPOST(request)

    expect(prisma.visit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: null,
          apartment: null,
        }),
      })
    )
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.visit.create).mockRejectedValue(new Error('DB Error'))

    const request = createPostRequest({
      name: 'Test',
      street: 'Calle',
      comuna: 'Comuna',
      region: 'Region',
      visitStatusId: 'status-1',
      date: '2024-01-15',
    })
    const response = await callPOST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al crear la visita')
  })
})
