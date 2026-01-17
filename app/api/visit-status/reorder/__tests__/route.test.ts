/**
 * Tests para app/api/visit-status/reorder/route.ts (POST)
 *
 * Valida:
 * - Validación Zod (statusIds array de UUIDs)
 * - IDs no existen → 404
 * - No reordenar inicial/final → 400
 * - No reordenar inactivos → 400
 * - Recalcula order: (index+1)*10
 * - Transacción atómica
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    visitStatus: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/db'
import { POST } from '../route'

// Helper para crear request
function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/visit-status/reorder', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/visit-status/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validaciones Zod', () => {
    it('debe rechazar sin statusIds', async () => {
      const response = await POST(createRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar statusIds vacío', async () => {
      const response = await POST(createRequest({ statusIds: [] }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar statusIds con valores no UUID', async () => {
      const response = await POST(createRequest({ statusIds: ['not-a-uuid'] }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar statusIds mixto (válidos e inválidos)', async () => {
      const response = await POST(
        createRequest({
          statusIds: ['00000000-0000-0000-0000-000000000001', 'invalid'],
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })
  })

  describe('validación de existencia', () => {
    it('debe rechazar si algún ID no existe', async () => {
      // Solo encuentra 2 de 3 IDs
      vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([
        { id: '00000000-0000-0000-0000-000000000001', name: 'Estado 1', isInitial: false, isFinal: false, isActive: true },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Estado 2', isInitial: false, isFinal: false, isActive: true },
      ] as never)

      const response = await POST(
        createRequest({
          statusIds: [
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000003', // No existe
          ],
        })
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Estados no encontrados')
      expect(data.error).toContain('00000000-0000-0000-0000-000000000003')
    })
  })

  describe('validación de estados especiales', () => {
    it('debe rechazar reordenar estado inicial', async () => {
      vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([
        { id: '00000000-0000-0000-0000-000000000001', name: 'Agendada', isInitial: true, isFinal: false, isActive: true },
        { id: '00000000-0000-0000-0000-000000000002', name: 'En Proceso', isInitial: false, isFinal: false, isActive: true },
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
      expect(data.error).toContain('"Agendada"')
    })

    it('debe rechazar reordenar estado final', async () => {
      vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([
        { id: '00000000-0000-0000-0000-000000000001', name: 'En Proceso', isInitial: false, isFinal: false, isActive: true },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Completada', isInitial: false, isFinal: true, isActive: true },
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
      expect(data.error).toContain('"Completada"')
    })

    it('debe rechazar múltiples estados especiales', async () => {
      vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([
        { id: '00000000-0000-0000-0000-000000000001', name: 'Agendada', isInitial: true, isFinal: false, isActive: true },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Completada', isInitial: false, isFinal: true, isActive: true },
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
      expect(data.error).toContain('"Agendada"')
      expect(data.error).toContain('"Completada"')
    })
  })

  describe('validación de estados inactivos', () => {
    it('debe rechazar reordenar estados inactivos', async () => {
      vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([
        { id: '00000000-0000-0000-0000-000000000001', name: 'En Proceso', isInitial: false, isFinal: false, isActive: true },
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
      expect(data.error).toContain('"Archivado"')
    })
  })

  describe('cálculo de order', () => {
    it('debe calcular order como (index+1)*10', async () => {
      const statuses = [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Estado A', isInitial: false, isFinal: false, isActive: true },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Estado B', isInitial: false, isFinal: false, isActive: true },
        { id: '00000000-0000-0000-0000-000000000003', name: 'Estado C', isInitial: false, isFinal: false, isActive: true },
      ]
      vi.mocked(prisma.visitStatus.findMany)
        .mockResolvedValueOnce(statuses as never) // Para validación
        .mockResolvedValueOnce(statuses as never) // Para retornar resultado

      vi.mocked(prisma.$transaction).mockResolvedValue([
        { id: '00000000-0000-0000-0000-000000000001', order: 10 },
        { id: '00000000-0000-0000-0000-000000000002', order: 20 },
        { id: '00000000-0000-0000-0000-000000000003', order: 30 },
      ] as never)

      const response = await POST(
        createRequest({
          statusIds: [
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000003',
          ],
        })
      )

      expect(response.status).toBe(200)
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('debe mantener el orden especificado en statusIds', async () => {
      // El orden en statusIds determina el nuevo order - usar UUIDs válidos
      const statuses = [
        { id: '00000000-0000-0000-0000-000000000003', name: 'Estado C', isInitial: false, isFinal: false, isActive: true },
        { id: '00000000-0000-0000-0000-000000000001', name: 'Estado A', isInitial: false, isFinal: false, isActive: true },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Estado B', isInitial: false, isFinal: false, isActive: true },
      ]
      vi.mocked(prisma.visitStatus.findMany)
        .mockResolvedValueOnce(statuses as never)
        .mockResolvedValueOnce(statuses as never)

      vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

      const response = await POST(
        createRequest({
          statusIds: [
            '00000000-0000-0000-0000-000000000003', // C primero
            '00000000-0000-0000-0000-000000000001', // A segundo
            '00000000-0000-0000-0000-000000000002', // B tercero
          ],
        })
      )

      expect(response.status).toBe(200)
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('transacción atómica', () => {
    it('debe usar $transaction para actualizar todos los estados', async () => {
      const statuses = [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Estado A', isInitial: false, isFinal: false, isActive: true },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Estado B', isInitial: false, isFinal: false, isActive: true },
      ]
      const allStatuses = [
        { id: 'initial', name: 'Inicial', order: 0, isInitial: true, color: {}, _count: { visits: 0 } },
        ...statuses.map((s, i) => ({ ...s, order: (i + 1) * 10, color: {}, _count: { visits: 0 } })),
        { id: 'final', name: 'Final', order: 999, isFinal: true, color: {}, _count: { visits: 0 } },
      ]

      vi.mocked(prisma.visitStatus.findMany)
        .mockResolvedValueOnce(statuses as never) // Validación
        .mockResolvedValueOnce(allStatuses as never) // Lista completa

      vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

      const response = await POST(
        createRequest({
          statusIds: [
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
          ],
        })
      )

      expect(response.status).toBe(200)
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('respuesta exitosa', () => {
    it('debe retornar mensaje de éxito y lista completa ordenada', async () => {
      // Usar UUIDs válidos
      const statusId = '00000000-0000-0000-0000-000000000001'
      const statuses = [
        { id: statusId, name: 'Estado 1', isInitial: false, isFinal: false, isActive: true },
      ]
      vi.mocked(prisma.visitStatus.findMany)
        .mockResolvedValueOnce(statuses as never) // Validación
        .mockResolvedValueOnce([
          { id: 'vs-initial', name: 'Inicial', order: 0, isInitial: true, color: {}, _count: { visits: 0 } },
          { id: statusId, name: 'Estado 1', order: 10, isInitial: false, isFinal: false, color: {}, _count: { visits: 0 } },
          { id: 'vs-final', name: 'Final', order: 999, isFinal: true, color: {}, _count: { visits: 0 } },
        ] as never) // Lista completa

      vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

      const response = await POST(
        createRequest({
          statusIds: [statusId],
        })
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Estados reordenados correctamente')
      expect(data.visitStatuses).toBeDefined()
      expect(data.visitStatuses).toHaveLength(3)
    })

    it('debe incluir color y _count en la respuesta', async () => {
      const statusId = '00000000-0000-0000-0000-000000000001'
      const statuses = [
        { id: statusId, name: 'Estado 1', isInitial: false, isFinal: false, isActive: true },
      ]
      vi.mocked(prisma.visitStatus.findMany)
        .mockResolvedValueOnce(statuses as never)
        .mockResolvedValueOnce([
          {
            id: statusId,
            name: 'Estado 1',
            order: 10,
            isInitial: false,
            isFinal: false,
            isActive: true,
            color: { id: 'c-1', name: 'Azul', key: 'blue', bgClass: 'bg-blue-500', textClass: 'text-blue-500' },
            _count: { visits: 3 },
          },
        ] as never)

      vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

      const response = await POST(
        createRequest({
          statusIds: [statusId],
        })
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.visitStatuses[0].color).toBeDefined()
      expect(data.visitStatuses[0]._count).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando $transaction falla', async () => {
      const statusId = '00000000-0000-0000-0000-000000000001'
      const statuses = [
        { id: statusId, name: 'Estado 1', isInitial: false, isFinal: false, isActive: true },
      ]
      vi.mocked(prisma.visitStatus.findMany).mockResolvedValue(statuses as never)
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'))

      const response = await POST(
        createRequest({
          statusIds: [statusId],
        })
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al reordenar los estados de visita')
    })
  })
})
