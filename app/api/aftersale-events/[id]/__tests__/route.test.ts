/**
 * Tests para app/api/aftersale-events/[id]/route.ts (GET/PUT/PATCH/DELETE)
 *
 * Valida:
 * - UUID validation (withApiHandler)
 * - GET: Retorna evento con relaciones
 * - GET: 404 si no existe
 * - PUT: Actualiza scheduledDate, notes, teamTagIds
 * - PUT: teamTags usa `set` (reemplaza)
 * - PUT: Validación duplicado al cambiar fecha
 * - PUT: 404 si no existe
 * - PATCH: Validación Zod scheduledDate (patchEventDateSchema)
 * - PATCH: Validación duplicado
 * - PATCH: 404 si no existe
 * - DELETE: Retorna { success: true }
 * - DELETE: 404 si no existe
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock de logger-middleware (requerido por withApiHandler)
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

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    aftersaleEvent: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET, PUT, PATCH, DELETE } from '../route'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

function createRequest(
  method: 'GET' | 'PUT' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): NextRequest {
  return new NextRequest('http://localhost:3000/api/aftersale-events/' + VALID_UUID, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

function createContext(id: string = VALID_UUID) {
  return { params: Promise.resolve({ id }) }
}

async function callGET(id: string = VALID_UUID) {
  return (GET as any)(createRequest('GET'), createContext(id))
}

async function callPUT(body: Record<string, unknown>, id: string = VALID_UUID) {
  return (PUT as any)(createRequest('PUT', body), createContext(id))
}

async function callPATCH(body: Record<string, unknown>, id: string = VALID_UUID) {
  return (PATCH as any)(createRequest('PATCH', body), createContext(id))
}

async function callDELETE(id: string = VALID_UUID) {
  return (DELETE as any)(createRequest('DELETE'), createContext(id))
}

const mockEvent = {
  id: 'ae-1',
  aftersaleId: 'aftersale-1',
  scheduledDate: new Date('2025-01-15'),
  notes: 'Notas originales',
  aftersale: {
    id: 'aftersale-1',
    project: { customer: { name: 'Cliente' } },
    aftersaleStatus: {
      id: 'as-1',
      name: 'Pendiente',
      isFinal: false,
      color: { id: 'c-1', name: 'Azul' },
    },
  },
  teamTags: [],
}

describe('UUID validation', () => {
  it('debe rechazar UUID inválido', async () => {
    const response = await callGET('not-a-uuid')
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
  })
})

describe('GET /api/aftersale-events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar evento con relaciones', async () => {
    vi.mocked(prisma.aftersaleEvent.findUnique).mockResolvedValue(mockEvent as never)

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('ae-1')
    expect(data.aftersale).toBeDefined()
    expect(data.aftersale.project).toBeDefined()
    expect(data.aftersale.aftersaleStatus).toBeDefined()
  })

  it('debe retornar 404 si evento no existe', async () => {
    vi.mocked(prisma.aftersaleEvent.findUnique).mockResolvedValue(null)

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Evento no encontrado')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.aftersaleEvent.findUnique).mockRejectedValue(new Error('DB Error'))

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener evento')
  })
})

describe('PUT /api/aftersale-events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersaleEvent.findUnique).mockResolvedValue({
      ...mockEvent,
      aftersale: {
        ...mockEvent.aftersale,
        aftersaleStatus: { isFinal: false },
      },
    } as never)
    vi.mocked(prisma.aftersaleEvent.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.aftersaleEvent.update).mockResolvedValue({
      ...mockEvent,
      notes: 'Notas actualizadas',
    } as never)
  })

  describe('validación existencia', () => {
    it('debe retornar 404 si evento no existe', async () => {
      vi.mocked(prisma.aftersaleEvent.findUnique).mockResolvedValue(null)

      const response = await callPUT({ notes: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Evento no encontrado')
    })
  })

  describe('actualización de campos', () => {
    it('debe actualizar scheduledDate', async () => {
      const response = await callPUT({ scheduledDate: '2025-01-20' })

      expect(response.status).toBe(200)
      expect(prisma.aftersaleEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledDate: expect.any(Date),
          }),
        })
      )
    })

    it('debe actualizar notes', async () => {
      const response = await callPUT({ notes: 'Nuevas notas' })

      expect(response.status).toBe(200)
      expect(prisma.aftersaleEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Nuevas notas',
          }),
        })
      )
    })

    it('debe permitir notes null', async () => {
      const response = await callPUT({ notes: null })

      expect(response.status).toBe(200)
    })
  })

  describe('manejo de teamTags', () => {
    it('debe usar set para reemplazar teamTags', async () => {
      const teamTagIds = [
        '00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000011',
      ]

      const response = await callPUT({ teamTagIds })

      expect(response.status).toBe(200)
      expect(prisma.aftersaleEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamTags: {
              set: teamTagIds.map((id) => ({ id })),
            },
          }),
        })
      )
    })

    it('debe limpiar teamTags con array vacío', async () => {
      const response = await callPUT({ teamTagIds: [] })

      expect(response.status).toBe(200)
      expect(prisma.aftersaleEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamTags: {
              set: [],
            },
          }),
        })
      )
    })
  })

  describe('validación de duplicados', () => {
    it('debe rechazar si nueva fecha ya existe para la postventa', async () => {
      vi.mocked(prisma.aftersaleEvent.findFirst).mockResolvedValue({
        id: 'ae-other',
        aftersaleId: 'aftersale-1',
        scheduledDate: new Date('2025-01-20'),
      } as never)

      const response = await callPUT({ scheduledDate: '2025-01-20' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Ya existe un evento para esta postventa en esta fecha')
    })

    it('debe permitir mantener la misma fecha', async () => {
      vi.mocked(prisma.aftersaleEvent.findUnique).mockResolvedValue({
        ...mockEvent,
        scheduledDate: new Date('2025-01-15'),
        aftersale: { aftersaleStatus: { isFinal: false } },
      } as never)

      const response = await callPUT({ scheduledDate: '2025-01-15' })

      expect(response.status).toBe(200)
    })
  })

  describe('validaciones Zod', () => {
    it('debe rechazar scheduledDate inválido', async () => {
      const response = await callPUT({ scheduledDate: 'invalid-date' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })
  })

  describe('respuesta exitosa', () => {
    it('debe retornar evento actualizado con relaciones', async () => {
      vi.mocked(prisma.aftersaleEvent.update).mockResolvedValue({
        ...mockEvent,
        teamTags: [{ id: 'tt-1', name: 'Juan', color: { name: 'Verde' } }],
      } as never)

      const response = await callPUT({ notes: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.aftersale).toBeDefined()
      expect(data.teamTags).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando update falla', async () => {
      vi.mocked(prisma.aftersaleEvent.update).mockRejectedValue(new Error('DB Error'))

      const response = await callPUT({ notes: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar evento')
    })
  })
})

describe('PATCH /api/aftersale-events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersaleEvent.findUnique).mockResolvedValue(mockEvent as never)
    vi.mocked(prisma.aftersaleEvent.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.aftersaleEvent.update).mockResolvedValue({
      ...mockEvent,
      scheduledDate: new Date('2025-01-20'),
    } as never)
  })

  describe('validación Zod de scheduledDate', () => {
    it('debe rechazar sin scheduledDate', async () => {
      const response = await callPATCH({})
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar scheduledDate inválido', async () => {
      const response = await callPATCH({ scheduledDate: 'not-a-date' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe aceptar scheduledDate válido', async () => {
      const response = await callPATCH({ scheduledDate: '2025-01-20' })

      expect(response.status).toBe(200)
    })

    it('debe aceptar scheduledDate como ISO string', async () => {
      const response = await callPATCH({ scheduledDate: '2025-01-20T10:00:00.000Z' })

      expect(response.status).toBe(200)
    })
  })

  describe('validación existencia', () => {
    it('debe retornar 404 si evento no existe', async () => {
      vi.mocked(prisma.aftersaleEvent.findUnique).mockResolvedValue(null)

      const response = await callPATCH({ scheduledDate: '2025-01-20' })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Evento no encontrado')
    })
  })

  describe('validación de duplicados', () => {
    it('debe rechazar si nueva fecha ya existe para la postventa', async () => {
      vi.mocked(prisma.aftersaleEvent.findFirst).mockResolvedValue({
        id: 'ae-other',
        aftersaleId: 'aftersale-1',
        scheduledDate: new Date('2025-01-20'),
      } as never)

      const response = await callPATCH({ scheduledDate: '2025-01-20' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Ya existe un evento para esta postventa en esta fecha')
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar solo la fecha', async () => {
      const response = await callPATCH({ scheduledDate: '2025-01-20' })

      expect(response.status).toBe(200)
      expect(prisma.aftersaleEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { scheduledDate: expect.any(Date) },
        })
      )
    })

    it('debe retornar evento con relaciones', async () => {
      const response = await callPATCH({ scheduledDate: '2025-01-20' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.aftersale).toBeDefined()
      expect(data.aftersale.aftersaleStatus).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando update falla', async () => {
      vi.mocked(prisma.aftersaleEvent.update).mockRejectedValue(new Error('DB Error'))

      const response = await callPATCH({ scheduledDate: '2025-01-20' })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar fecha del evento')
    })
  })
})

describe('DELETE /api/aftersale-events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersaleEvent.findUnique).mockResolvedValue(mockEvent as never)
    vi.mocked(prisma.aftersaleEvent.delete).mockResolvedValue(mockEvent as never)
  })

  describe('validación existencia', () => {
    it('debe retornar 404 si evento no existe', async () => {
      vi.mocked(prisma.aftersaleEvent.findUnique).mockResolvedValue(null)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Evento no encontrado')
    })
  })

  describe('eliminación exitosa', () => {
    it('debe eliminar evento y retornar success', async () => {
      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('debe llamar delete con el id correcto', async () => {
      await callDELETE()

      expect(prisma.aftersaleEvent.delete).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
      })
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.aftersaleEvent.delete).mockRejectedValue(new Error('DB Error'))

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar evento')
    })
  })
})
