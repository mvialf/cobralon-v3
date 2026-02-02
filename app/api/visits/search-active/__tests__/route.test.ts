/**
 * Tests para app/api/visits/search-active/route.ts (GET)
 *
 * Busca visitas no finalizadas (isFinal=false) para calendario
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    visit: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET } from '../route'

function createRequest(searchParams?: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/visits/search-active')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new Request(url, { method: 'GET' })
}

describe('GET /api/visits/search-active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar visitas activas', async () => {
    vi.mocked(prisma.visit.findMany).mockResolvedValue([
      {
        id: 'v-1',
        name: 'Juan Pérez',
        phone: '+56912345678',
        street: 'Av. Principal',
        apartment: null,
        comuna: 'Santiago',
        region: 'RM',
        date: new Date(),
        visitStatus: { id: 's1', name: 'Pendiente', color: { bgClass: 'bg-blue-500', textClass: 'text-blue-500' } },
      },
    ] as never)

    const response = await GET(createRequest({ q: 'Juan' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
  })

  it('debe retornar todos los activos sin query', async () => {
    vi.mocked(prisma.visit.findMany).mockResolvedValue([] as never)

    await GET(createRequest())

    expect(prisma.visit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visitStatus: { isFinal: false },
        }),
      })
    )
  })

  it('no debe filtrar por texto si query < 2 caracteres', async () => {
    vi.mocked(prisma.visit.findMany).mockResolvedValue([] as never)

    await GET(createRequest({ q: 'a' }))

    const call = vi.mocked(prisma.visit.findMany).mock.calls[0][0]
    expect(call?.where?.OR).toBeUndefined()
  })

  it('debe retornar 500 en error', async () => {
    vi.mocked(prisma.visit.findMany).mockRejectedValue(new Error('DB'))

    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('buscar visitas')
  })
})
