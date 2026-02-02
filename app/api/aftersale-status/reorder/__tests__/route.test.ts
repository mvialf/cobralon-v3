/**
 * Tests para app/api/aftersale-status/reorder/route.ts (POST)
 *
 * Espejo de visit-status/reorder/__tests__/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    aftersaleStatus: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/db'
import { POST } from '../route'

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/aftersale-status/reorder', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/aftersale-status/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe rechazar statusIds vacío', async () => {
    const response = await POST(createRequest({ statusIds: [] }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Datos inválidos')
  })

  it('debe rechazar si algún ID no existe', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue([
      { id: '00000000-0000-0000-0000-000000000001', name: 'Estado 1', isInitial: false, isFinal: false, isActive: true },
    ] as never)

    const response = await POST(
      createRequest({
        statusIds: [
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
        ],
      })
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Estados no encontrados')
  })

  it('debe rechazar reordenar estado inicial/final', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue([
      { id: '00000000-0000-0000-0000-000000000001', name: 'Abierto', isInitial: true, isFinal: false, isActive: true },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Normal', isInitial: false, isFinal: false, isActive: true },
    ] as never)

    const response = await POST(
      createRequest({
        statusIds: [
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
        ],
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No se pueden reordenar estados inicial o final')
  })

  it('debe rechazar reordenar estados inactivos', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue([
      { id: '00000000-0000-0000-0000-000000000001', name: 'Normal', isInitial: false, isFinal: false, isActive: true },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Archivado', isInitial: false, isFinal: false, isActive: false },
    ] as never)

    const response = await POST(
      createRequest({
        statusIds: [
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
        ],
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No se pueden reordenar estados inactivos')
  })

  it('debe reordenar exitosamente', async () => {
    const statuses = [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Estado A', isInitial: false, isFinal: false, isActive: true },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Estado B', isInitial: false, isFinal: false, isActive: true },
    ]
    vi.mocked(prisma.aftersaleStatus.findMany)
      .mockResolvedValueOnce(statuses as never)
      .mockResolvedValueOnce(statuses as never)

    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

    const response = await POST(
      createRequest({
        statusIds: [
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
        ],
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Estados reordenados correctamente')
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('debe retornar 500 cuando $transaction falla', async () => {
    const statuses = [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Estado 1', isInitial: false, isFinal: false, isActive: true },
    ]
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue(statuses as never)
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('TX failed'))

    const response = await POST(
      createRequest({
        statusIds: ['00000000-0000-0000-0000-000000000001'],
      })
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al reordenar los estados de postventa')
  })
})
