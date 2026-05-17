/**
 * Tests para app/api/projects/search/route.ts (GET)
 *
 * Busca proyectos por status: active (isFinal=false) o finished (isFinal=true)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/logger-middleware')

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    project: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET as _GET } from '../route'

const GET = (request: NextRequest) => _GET(request, { params: Promise.resolve({}) })

function createRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/projects/search')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/projects/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 400 sin parámetro status', async () => {
    const response = await GET(createRequest({ q: 'test' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('status')
  })

  it('debe retornar 400 con status inválido', async () => {
    const response = await GET(createRequest({ q: 'test', status: 'invalid' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('status')
  })

  it('debe retornar 400 con query < 2 caracteres', async () => {
    const response = await GET(createRequest({ q: 'a', status: 'active' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('2 caracteres')
  })

  describe('status=active', () => {
    it('debe retornar proyectos activos', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'p1' }])
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        {
          id: 'p1',
          projectNumber: '1001',
          projectName: 'Proyecto 1',
          customer: { id: 'c1', name: 'Cliente 1' },
          projectStatus: {
            id: 's1',
            name: 'En Proceso',
            color: { bgClass: 'bg-blue-500', textClass: 'text-blue-500' },
          },
        },
      ] as never)

      const response = await GET(createRequest({ q: 'Cliente', status: 'active' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].projectNumber).toBe('1001')

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('debe retornar array vacío sin resultados', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([])
      vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)

      const response = await GET(createRequest({ q: 'inexistente', status: 'active' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('status=finished', () => {
    it('debe retornar proyectos finalizados', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'p1' }])
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        {
          id: 'p1',
          projectNumber: '1001',
          projectName: 'Proyecto Terminado',
          customer: { id: 'c1', name: 'Cliente 1' },
          projectStatus: {
            id: 's1',
            name: 'Completado',
            color: { bgClass: 'bg-green-500', textClass: 'text-green-500' },
          },
        },
      ] as never)

      const response = await GET(createRequest({ q: 'Proyecto', status: 'finished' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].projectNumber).toBe('1001')

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })
  })

  it('debe retornar 500 en error de DB', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB'))

    const response = await GET(createRequest({ q: 'test', status: 'active' }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('buscar proyectos')
  })
})
