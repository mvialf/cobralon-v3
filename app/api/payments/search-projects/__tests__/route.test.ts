/**
 * Tests para app/api/payments/search-projects/route.ts (GET)
 *
 * Valida:
 * - Búsqueda de proyectos con balance > 0
 * - Validación de query mínimo (2 chars)
 * - Límite de resultados
 * - Filtrado en memoria por balance calculado
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
  const url = new URL('http://localhost:3000/api/payments/search-projects')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/payments/search-projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar proyectos con balance > 0', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        id: 'p1',
        projectNumber: '1001',
        projectName: 'Proyecto 1',
        totalAmount: 100000,
        balance: 50000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        customer: { id: 'c1', name: 'Cliente 1' },
      },
    ] as never)

    const response = await GET(createRequest({ q: 'Cliente' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('p1')
    expect(data[0].balance).toBe(50000)
  })

  it('debe filtrar por balance > 0 en la query de DB', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)

    await GET(createRequest({ q: 'test' }))

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          balance: { gt: 0 },
        }),
      })
    )
  })

  it('debe retornar 400 cuando query < 2 caracteres', async () => {
    const response = await GET(createRequest({ q: 'a' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('2 caracteres')
  })

  it('debe respetar el límite de resultados', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)

    await GET(createRequest({ q: 'test', limit: '5' }))

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
  })

  it('debe retornar array vacío sin resultados', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)

    const response = await GET(createRequest({ q: 'inexistente' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('debe retornar 500 cuando findMany falla', async () => {
    vi.mocked(prisma.project.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await GET(createRequest({ q: 'test' }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('buscar proyectos')
  })
})
