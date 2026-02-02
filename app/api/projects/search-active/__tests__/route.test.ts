/**
 * Tests para app/api/projects/search-active/route.ts (GET)
 *
 * Busca proyectos activos (isFinal=false) para calendario
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET } from '../route'

function createRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/projects/search-active')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/projects/search-active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar proyectos activos', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        id: 'p1',
        projectNumber: '1001',
        projectName: 'Proyecto 1',
        customer: { id: 'c1', name: 'Cliente 1' },
        projectStatus: { id: 's1', name: 'En Proceso', color: { bgClass: 'bg-blue-500', textClass: 'text-blue-500' } },
      },
    ] as never)

    const response = await GET(createRequest({ q: 'Cliente' }))
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
