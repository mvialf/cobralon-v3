/**
 * Tests para app/api/projects/search-finished/route.ts (GET)
 *
 * Busca proyectos finalizados (isFinal=true) para postventa
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

vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET as _GET } from '../route'

// Wrapper para pasar context vacío requerido por withLogging
const GET = (request: NextRequest) => _GET(request, { params: Promise.resolve({}) })

function createRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/projects/search-finished')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/projects/search-finished', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar proyectos finalizados', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        id: 'p1',
        projectNumber: '1001',
        projectName: 'Proyecto Terminado',
        customer: { id: 'c1', name: 'Cliente 1' },
        projectStatus: { id: 's1', name: 'Completado' },
      },
    ] as never)

    const response = await GET(createRequest({ q: 'Proyecto' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].projectNumber).toBe('1001')
  })

  it('debe retornar 400 con query < 2 caracteres', async () => {
    const response = await GET(createRequest({ q: 'a' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('2 caracteres')
  })

  it('debe retornar array vacío sin resultados', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)

    const response = await GET(createRequest({ q: 'inexistente' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('debe retornar 500 en error', async () => {
    vi.mocked(prisma.project.findMany).mockRejectedValue(new Error('DB'))

    const response = await GET(createRequest({ q: 'test' }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('buscar proyectos')
  })
})
