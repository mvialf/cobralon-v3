/**
 * Tests para app/api/aftersale-events/route.ts (POST)
 *
 * Valida:
 * - Validación Zod (aftersaleId, scheduledDate requeridos)
 * - Postventa no existe → 404
 * - Postventa finalizada (isFinal) → 400
 * - Duplicado [aftersaleId, scheduledDate] → 400
 * - Crear con/sin teamTags
 * - Error DB → 500
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock automático de logger-middleware (usa lib/__mocks__/logger-middleware.ts)
vi.mock('@/lib/logger-middleware')

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    aftersale: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    project: {
      update: vi.fn(),
    },
    aftersaleEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { POST } from '../route'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/aftersale-events', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

async function callPOST(body: Record<string, unknown>) {
  return (POST as any)(createRequest(body))
}

describe('POST /api/aftersale-events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(prisma as never))

    vi.mocked(prisma.aftersale.findUnique).mockResolvedValue({
      id: 'aftersale-1',
      projectId: 'proj-1',
      aftersaleStatus: {
        id: 'as-1',
        name: 'Pendiente',
        isFinal: false,
      },
    } as never)
    vi.mocked(prisma.aftersaleEvent.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.aftersale.update).mockResolvedValue({ id: 'aftersale-1' } as never)
    vi.mocked(prisma.project.update).mockResolvedValue({ id: 'proj-1' } as never)
    vi.mocked(prisma.aftersaleEvent.create).mockResolvedValue({
      id: 'ae-new',
      aftersaleId: 'aftersale-1',
      scheduledDate: new Date('2025-01-15'),
      aftersale: {
        project: { customer: { name: 'Cliente' } },
        aftersaleStatus: { color: { name: 'Azul' } },
      },
      teamTags: [],
    } as never)
  })

  describe('validaciones Zod', () => {
    it('debe rechazar sin aftersaleId', async () => {
      const response = await callPOST({ scheduledDate: '2025-01-15' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar aftersaleId inválido (no UUID)', async () => {
      const response = await callPOST({
        aftersaleId: 'not-a-uuid',
        scheduledDate: '2025-01-15',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar sin scheduledDate', async () => {
      const response = await callPOST({ aftersaleId: VALID_UUID })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar scheduledDate inválido', async () => {
      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: 'not-a-date',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe aceptar teamTagIds como array de UUIDs', async () => {
      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
        teamTagIds: ['00000000-0000-0000-0000-000000000010'],
      })

      expect(response.status).toBe(201)
    })

    it('debe aceptar notes opcional', async () => {
      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
        notes: 'Notas de la postventa',
      })

      expect(response.status).toBe(201)
    })
  })

  describe('validación de postventa', () => {
    it('debe retornar 404 si postventa no existe', async () => {
      vi.mocked(prisma.aftersale.findUnique).mockResolvedValue(null)

      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Postventa no encontrada')
    })

    it('debe rechazar si postventa está finalizada', async () => {
      vi.mocked(prisma.aftersale.findUnique).mockResolvedValue({
        id: 'aftersale-1',
        aftersaleStatus: {
          id: 'as-final',
          name: 'Resuelta',
          isFinal: true,
        },
      } as never)

      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No se puede crear evento para una postventa finalizada')
    })
  })

  describe('validación de duplicados', () => {
    it('debe rechazar evento duplicado [aftersaleId, scheduledDate]', async () => {
      vi.mocked(prisma.aftersaleEvent.findFirst).mockResolvedValue({
        id: 'ae-existing',
        aftersaleId: 'aftersale-1',
        scheduledDate: new Date('2025-01-15'),
      } as never)

      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Ya existe un evento para esta postventa en esta fecha')
    })

    it('debe permitir misma postventa en fechas diferentes', async () => {
      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-16',
      })

      expect(response.status).toBe(201)
    })
  })

  describe('creación con teamTags', () => {
    it('debe crear evento sin teamTags', async () => {
      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
      })

      expect(response.status).toBe(201)
      expect(prisma.aftersaleEvent.create).toHaveBeenCalledWith(
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

      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
        teamTagIds,
      })

      expect(response.status).toBe(201)
      expect(prisma.aftersaleEvent.create).toHaveBeenCalledWith(
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
      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
        teamTagIds: [],
      })

      expect(response.status).toBe(201)
      const call = vi.mocked(prisma.aftersaleEvent.create).mock.calls[0][0]
      expect(call.data.teamTags).toBeUndefined()
    })
  })

  describe('creación transaccional con actualización de postventa', () => {
    it('debe actualizar postventa, proyecto y crear evento con payload extendido', async () => {
      vi.mocked(prisma.aftersale.findUnique).mockResolvedValue({
        id: 'aftersale-1',
        projectId: 'proj-1',
        aftersaleStatusId: '00000000-0000-0000-0000-000000000020',
        contactPhone: '+56911111111',
        description: 'Anterior',
        tasks: [],
        aftersaleStatus: { isFinal: false },
        project: {
          id: 'proj-1',
          street: 'Calle antigua',
          apartment: null,
          comuna: 'Santiago',
          region: 'Región Metropolitana de Santiago',
        },
      } as never)

      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
        aftersaleStatusId: '00000000-0000-0000-0000-000000000021',
        contactPhone: '+56912345678',
        description: 'Nueva descripción',
        tasks: [
          {
            id: '00000000-0000-0000-0000-000000000030',
            text: 'Tarea',
            completed: false,
          },
        ],
        street: 'Calle nueva',
        apartment: null,
        comuna: 'Providencia',
        region: '13',
        teamTagIds: ['00000000-0000-0000-0000-000000000010'],
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.aftersaleUpdated).toBe(true)
      expect(data.projectUpdated).toBe(true)
      expect(data.event.id).toBe('ae-new')
      expect(prisma.$transaction).toHaveBeenCalled()
      expect(prisma.aftersale.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: VALID_UUID },
          data: expect.objectContaining({
            contactPhone: '+56912345678',
            description: 'Nueva descripción',
          }),
        })
      )
      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'proj-1' },
          data: expect.objectContaining({
            street: 'Calle nueva',
            region: 'Región Metropolitana de Santiago',
          }),
        })
      )
      expect(prisma.aftersaleEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aftersaleId: VALID_UUID,
            teamTags: {
              connect: [{ id: '00000000-0000-0000-0000-000000000010' }],
            },
          }),
        })
      )
    })

    it('debe crear evento sin actualizar entidades cuando no hay cambios', async () => {
      vi.mocked(prisma.aftersale.findUnique).mockResolvedValue({
        id: 'aftersale-1',
        projectId: 'proj-1',
        aftersaleStatusId: '00000000-0000-0000-0000-000000000021',
        contactPhone: '+56912345678',
        description: 'Actual',
        tasks: [],
        aftersaleStatus: { isFinal: false },
        project: {
          id: 'proj-1',
          street: 'Calle actual',
          apartment: null,
          comuna: 'Providencia',
          region: 'Región Metropolitana de Santiago',
        },
      } as never)

      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
        aftersaleStatusId: '00000000-0000-0000-0000-000000000021',
        contactPhone: '+56912345678',
        description: 'Actual',
        tasks: [],
        street: 'Calle actual',
        apartment: null,
        comuna: 'Providencia',
        region: '13',
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.aftersaleUpdated).toBe(false)
      expect(data.projectUpdated).toBe(false)
      expect(prisma.aftersale.update).not.toHaveBeenCalled()
      expect(prisma.project.update).not.toHaveBeenCalled()
    })
  })

  describe('respuesta exitosa', () => {
    it('debe retornar 201 con evento creado', async () => {
      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('ae-new')
    })

    it('debe incluir aftersale con relaciones', async () => {
      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
      })
      const data = await response.json()

      expect(data.aftersale).toBeDefined()
      expect(data.aftersale.project).toBeDefined()
      expect(data.aftersale.aftersaleStatus).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando create falla', async () => {
      vi.mocked(prisma.aftersaleEvent.create).mockRejectedValue(new Error('DB Error'))

      const response = await callPOST({
        aftersaleId: VALID_UUID,
        scheduledDate: '2025-01-15',
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear evento')
    })
  })
})
