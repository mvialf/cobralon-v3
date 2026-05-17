/**
 * Tests para app/api/aftersales/search-active/route.ts (GET)
 *
 * Valida búsqueda de aftersales no finalizados
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
    $queryRaw: vi.fn(),
    aftersale: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET as _GET } from '../route'

// Wrapper para pasar context vacío requerido por withLogging
const GET = (request: NextRequest) => _GET(request, { params: Promise.resolve({}) })

function createRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/aftersales/search-active')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/aftersales/search-active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar aftersales activos', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'af-1' }])
    vi.mocked(prisma.aftersale.findMany).mockResolvedValue([
      {
        id: 'af-1',
        description: 'Problema',
        contactPhone: '+56912345678',
        reportedAt: new Date(),
        project: { id: 'p1', projectNumber: '1001', customer: { id: 'c1', name: 'Cliente' } },
        aftersaleStatus: { id: 's1', name: 'Abierto', color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-500' } },
      },
    ] as never)

    const response = await GET(createRequest({ q: 'Cliente' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
  })

  it('debe retornar todos los activos sin query', async () => {
    vi.mocked(prisma.aftersale.findMany).mockResolvedValue([] as never)

    await GET(createRequest())

    expect(prisma.aftersale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          aftersaleStatus: { isFinal: false },
        }),
      })
    )
  })

  it('no debe filtrar por texto si query < 2 caracteres', async () => {
    vi.mocked(prisma.aftersale.findMany).mockResolvedValue([] as never)

    await GET(createRequest({ q: 'a' }))

    const call = vi.mocked(prisma.aftersale.findMany).mock.calls[0][0]
    expect(call?.where?.OR).toBeUndefined()
  })

  it('debe respetar el límite', async () => {
    vi.mocked(prisma.aftersale.findMany).mockResolvedValue([] as never)

    await GET(createRequest({ limit: '5' }))

    expect(prisma.aftersale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
  })

  it('debe retornar 500 en error', async () => {
    vi.mocked(prisma.aftersale.findMany).mockRejectedValue(new Error('DB'))

    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('buscar postventas')
  })
})
