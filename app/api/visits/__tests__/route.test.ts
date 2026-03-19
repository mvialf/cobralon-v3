/**
 * Tests para app/api/visits/route.ts (GET/POST)
 *
 * Valida:
 * - GET: Paginación, filtros, búsqueda (via mocks de lib/queries)
 * - POST: Creación de visita
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock automático de logger-middleware (usa lib/__mocks__/logger-middleware.ts)
vi.mock('@/lib/logger-middleware')

// Mock de Prisma (solo para POST)
vi.mock('@/lib/db', () => ({
  prisma: {
    visit: {
      create: vi.fn(),
    },
  },
}))

// Mock de queries SQL (para GET)
vi.mock('@/lib/queries/visit-list', () => ({
  queryVisitList: vi.fn(),
  countVisits: vi.fn(),
  getVisitStatusFacets: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { queryVisitList, countVisits, getVisitStatusFacets } from '@/lib/queries/visit-list'
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

// Body válido para POST (reutilizable)
const validVisitBody = {
  name: 'Nueva Visita',
  street: 'Calle 123',
  comuna: 'Santiago',
  region: 'Metropolitana',
  visitStatusId: 'status-1',
  date: '2024-01-15T00:00:00.000Z',
}

// Visita mock para tests GET
const mockVisit = {
  id: 'v1',
  name: 'Test 1',
  phone: '+56912345678',
  street: 'Calle 1',
  apartment: null,
  comuna: 'Santiago',
  region: 'Metropolitana',
  visitStatusId: 'status-1',
  date: new Date('2024-01-15'),
  scheduledTime: null,
  observations: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  visitStatus: {
    id: 'status-1',
    name: 'Pendiente',
    isInitial: true,
    isFinal: false,
    color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-900' },
  },
}

describe('GET /api/visits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(queryVisitList).mockResolvedValue([])
    vi.mocked(countVisits).mockResolvedValue(0)
    vi.mocked(getVisitStatusFacets).mockResolvedValue([])
  })

  it('debe retornar lista vacía cuando no hay visitas', async () => {
    const response = await callGET(createGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual([])
    expect(data.pagination.total).toBe(0)
  })

  it('debe retornar visitas con paginación', async () => {
    vi.mocked(queryVisitList).mockResolvedValue([mockVisit, { ...mockVisit, id: 'v2' }])
    vi.mocked(countVisits).mockResolvedValue(2)

    const response = await callGET(createGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(2)
    expect(data.pagination.total).toBe(2)
  })

  it('debe pasar parámetros de paginación a la query', async () => {
    vi.mocked(countVisits).mockResolvedValue(25)

    const response = await callGET(createGetRequest({ page: '2', limit: '10' }))
    const data = await response.json()

    expect(data.pagination.page).toBe(2)
    expect(data.pagination.limit).toBe(10)
    expect(queryVisitList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 })
    )
  })

  it('debe limitar máximo a 100 registros', async () => {
    await callGET(createGetRequest({ limit: '200' }))

    expect(queryVisitList).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    )
  })

  it('debe pasar filtro de visitStatusIds', async () => {
    await callGET(createGetRequest({ visitStatusIds: 'status-1,status-2' }))

    expect(queryVisitList).toHaveBeenCalledWith(
      expect.objectContaining({ visitStatusIds: ['status-1', 'status-2'] })
    )
  })

  it('debe pasar búsqueda a la query', async () => {
    await callGET(createGetRequest({ search: 'Juan' }))

    expect(queryVisitList).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Juan' })
    )
  })

  it('debe pasar sorting a la query', async () => {
    await callGET(createGetRequest({ sortBy: 'date', sortOrder: 'asc' }))

    expect(queryVisitList).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'date', sortOrder: 'asc' })
    )
  })

  it('debe incluir facets cuando includeFacets=true', async () => {
    vi.mocked(getVisitStatusFacets).mockResolvedValue([
      { value: 'status-1', label: 'Pendiente', count: 5 },
    ])

    const response = await callGET(createGetRequest({ includeFacets: 'true' }))
    const data = await response.json()

    expect(getVisitStatusFacets).toHaveBeenCalled()
    expect(data.facets.visitStatus).toHaveLength(1)
    expect(data.facets.visitStatus[0].count).toBe(5)
  })

  it('no debe incluir facets por defecto', async () => {
    const response = await callGET(createGetRequest())
    const data = await response.json()

    expect(getVisitStatusFacets).not.toHaveBeenCalled()
    expect(data.facets).toBeUndefined()
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(queryVisitList).mockRejectedValue(new Error('DB Error'))

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
    const request = createPostRequest(validVisitBody)
    const response = await callPOST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('v-new')
  })

  it('debe convertir date string a Date', async () => {
    const request = createPostRequest(validVisitBody)
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
      ...validVisitBody,
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
      ...validVisitBody,
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

    const request = createPostRequest(validVisitBody)
    const response = await callPOST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al crear la visita')
  })
})
