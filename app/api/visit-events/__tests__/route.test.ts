/**
 * Tests para app/api/visit-events/route.ts (POST)
 *
 * Valida:
 * - Validación Zod (visitId, scheduledDate requeridos)
 * - Visita no existe → 404
 * - Visita finalizada (isFinal) → 400
 * - Duplicado [visitId, scheduledDate] → 400
 * - Crear con/sin teamTags
 * - Error DB → 500
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    visit: {
      findUnique: vi.fn(),
    },
    visitEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { POST } from '../route'

// Helper para crear request
function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/visit-events', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/visit-events', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mocks por defecto: visita existe, no finalizada, sin duplicados
    vi.mocked(prisma.visit.findUnique).mockResolvedValue({
      id: 'visit-1',
      projectId: 'proj-1',
      visitStatus: {
        id: 'vs-1',
        name: 'Agendada',
        isFinal: false,
      },
    } as never)
    vi.mocked(prisma.visitEvent.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.visitEvent.create).mockResolvedValue({
      id: 've-new',
      visitId: 'visit-1',
      scheduledDate: new Date('2025-01-15'),
      visit: {
        visitStatus: {
          color: { name: 'Azul' },
        },
      },
      teamTags: [],
    } as never)
  })

  describe('validaciones Zod', () => {
    it('debe rechazar sin visitId', async () => {
      const response = await POST(
        createRequest({
          scheduledDate: '2025-01-15',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar visitId inválido (no UUID)', async () => {
      const response = await POST(
        createRequest({
          visitId: 'not-a-uuid',
          scheduledDate: '2025-01-15',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar sin scheduledDate', async () => {
      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar scheduledDate inválido', async () => {
      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: 'not-a-date',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe aceptar teamTagIds como array de UUIDs', async () => {
      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
          teamTagIds: [
            '00000000-0000-0000-0000-000000000010',
            '00000000-0000-0000-0000-000000000011',
          ],
        })
      )

      expect(response.status).toBe(201)
    })

    it('debe aceptar notes opcional', async () => {
      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
          notes: 'Notas de la visita',
        })
      )

      expect(response.status).toBe(201)
    })
  })

  describe('validación de visita', () => {
    it('debe retornar 404 si visita no existe', async () => {
      vi.mocked(prisma.visit.findUnique).mockResolvedValue(null)

      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Visita no encontrada')
    })

    it('debe rechazar si visita está finalizada', async () => {
      vi.mocked(prisma.visit.findUnique).mockResolvedValue({
        id: 'visit-1',
        visitStatus: {
          id: 'vs-final',
          name: 'Completada',
          isFinal: true, // Finalizada
        },
      } as never)

      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No se puede crear evento para una visita finalizada')
    })
  })

  describe('validación de duplicados', () => {
    it('debe rechazar evento duplicado [visitId, scheduledDate]', async () => {
      vi.mocked(prisma.visitEvent.findFirst).mockResolvedValue({
        id: 've-existing',
        visitId: 'visit-1',
        scheduledDate: new Date('2025-01-15'),
      } as never)

      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Ya existe un evento para esta visita en esta fecha')
    })

    it('debe permitir misma visita en fechas diferentes', async () => {
      vi.mocked(prisma.visitEvent.findFirst).mockResolvedValue(null)

      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-16', // Fecha diferente
        })
      )

      expect(response.status).toBe(201)
    })
  })

  describe('creación con teamTags', () => {
    it('debe crear evento sin teamTags', async () => {
      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
        })
      )

      expect(response.status).toBe(201)
      expect(prisma.visitEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            teamTags: expect.anything(),
          }),
        })
      )
    })

    it('debe crear evento con teamTags', async () => {
      const teamTagIds = [
        '00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000011',
      ]

      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
          teamTagIds,
        })
      )

      expect(response.status).toBe(201)
      expect(prisma.visitEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamTags: {
              connect: teamTagIds.map((id) => ({ id })),
            },
          }),
        })
      )
    })

    it('debe ignorar teamTagIds vacío', async () => {
      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
          teamTagIds: [],
        })
      )

      expect(response.status).toBe(201)
      // No debería incluir teamTags si está vacío
      const call = vi.mocked(prisma.visitEvent.create).mock.calls[0][0]
      expect(call.data.teamTags).toBeUndefined()
    })
  })

  describe('respuesta exitosa', () => {
    it('debe retornar 201 con evento creado', async () => {
      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('ve-new')
    })

    it('debe incluir visit con visitStatus y color', async () => {
      vi.mocked(prisma.visitEvent.create).mockResolvedValue({
        id: 've-new',
        visitId: 'visit-1',
        visit: {
          visitStatus: {
            id: 'vs-1',
            name: 'Agendada',
            color: {
              id: 'c-1',
              name: 'Azul',
            },
          },
        },
        teamTags: [],
      } as never)

      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
        })
      )
      const data = await response.json()

      expect(data.visit).toBeDefined()
      expect(data.visit.visitStatus).toBeDefined()
      expect(data.visit.visitStatus.color).toBeDefined()
    })

    it('debe incluir teamTags con color', async () => {
      vi.mocked(prisma.visitEvent.create).mockResolvedValue({
        id: 've-new',
        visitId: 'visit-1',
        visit: { visitStatus: { color: {} } },
        teamTags: [
          { id: 'tt-1', name: 'Juan', color: { name: 'Verde' } },
          { id: 'tt-2', name: 'María', color: { name: 'Rojo' } },
        ],
      } as never)

      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
          teamTagIds: ['00000000-0000-0000-0000-000000000010'],
        })
      )
      const data = await response.json()

      expect(data.teamTags).toHaveLength(2)
      expect(data.teamTags[0].color).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando create falla', async () => {
      vi.mocked(prisma.visitEvent.create).mockRejectedValue(new Error('DB Error'))

      const response = await POST(
        createRequest({
          visitId: '00000000-0000-0000-0000-000000000001',
          scheduledDate: '2025-01-15',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear evento')
    })
  })
})
