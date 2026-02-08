/**
 * Tests para app/api/visit-status/[id]/route.ts (PUT/DELETE)
 *
 * Valida:
 * - PUT: 404 si no existe
 * - PUT: Nombre duplicado → 400
 * - PUT: colorId no existe → 400
 * - PUT: Desmarca inicial/final anterior con updateMany
 * - PUT: Recalcula order al cambiar tipo
 * - DELETE: 404 si no existe
 * - DELETE: Bloquea si tiene visitas asignadas
 * - DELETE: Bloquea único estado inicial/final activo
 * - DELETE: Soft delete vs hard delete (force=true)
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

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    visitStatus: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    badgeColor: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { PUT, DELETE } from '../route'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

async function callPUT(body: Record<string, unknown>, id: string = VALID_UUID) {
  const request = new NextRequest('http://localhost:3000/api/visit-status/' + id, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  const context = { params: Promise.resolve({ id }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (PUT as any)(request, context)
}

async function callDELETE(id: string = VALID_UUID, searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/visit-status/' + id)
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  const request = new NextRequest(url, { method: 'DELETE' })
  const context = { params: Promise.resolve({ id }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (DELETE as any)(request, context)
}

describe('PUT /api/visit-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'En Proceso',
      colorId: 'color-1',
      order: 10,
      isInitial: false,
      isFinal: false,
      isActive: true,
    } as never)
    vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({ id: 'color-1' } as never)
    vi.mocked(prisma.visitStatus.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.visitStatus.update).mockResolvedValue({
      id: VALID_UUID,
      name: 'Actualizado',
      color: { id: 'color-1', name: 'Azul' },
      _count: { visits: 0 },
    } as never)
  })

  describe('validación existencia', () => {
    it('debe retornar 404 si estado no existe', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue(null)

      const response = await callPUT({ name: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Estado no encontrado')
    })
  })

  describe('validación nombre duplicado', () => {
    it('debe rechazar si nuevo nombre ya existe', async () => {
      vi.mocked(prisma.visitStatus.findUnique)
        .mockResolvedValueOnce({
          id: VALID_UUID,
          name: 'Original',
          isInitial: false,
          isFinal: false,
        } as never)
        .mockResolvedValueOnce({
          id: 'vs-2',
          name: 'Agendada',
        } as never)

      const response = await callPUT({ name: 'Agendada' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado con el nombre')
    })

    it('debe permitir mantener el mismo nombre', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'En Proceso',
        isInitial: false,
        isFinal: false,
      } as never)

      const response = await callPUT({ name: 'En Proceso' })

      expect(response.status).toBe(200)
    })
  })

  describe('validación colorId', () => {
    it('debe rechazar si colorId no existe', async () => {
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

      const response = await callPUT({
        colorId: '00000000-0000-0000-0000-000000000099',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('El color seleccionado no existe')
    })
  })

  describe('manejo de estado inicial', () => {
    it('debe desmarcar estado inicial anterior al marcar nuevo', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'En Proceso',
        isInitial: false,
        isFinal: false,
        isActive: true,
      } as never)

      await callPUT({ isInitial: true })

      expect(prisma.visitStatus.updateMany).toHaveBeenCalledWith({
        where: { isInitial: true, isActive: true },
        data: { isInitial: false },
      })
    })

    it('NO debe desmarcar si ya era inicial', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Agendada',
        isInitial: true,
        isFinal: false,
        isActive: true,
      } as never)

      await callPUT({ name: 'Agendada Actualizada' })

      expect(prisma.visitStatus.updateMany).not.toHaveBeenCalled()
    })

    it('debe asignar order=0 al convertirse en inicial', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Normal',
        isInitial: false,
        isFinal: false,
        order: 20,
        isActive: true,
      } as never)

      await callPUT({ isInitial: true })

      expect(prisma.visitStatus.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 0,
          }),
        })
      )
    })
  })

  describe('manejo de estado final', () => {
    it('debe desmarcar estado final anterior al marcar nuevo', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'En Proceso',
        isInitial: false,
        isFinal: false,
        isActive: true,
      } as never)

      await callPUT({ isFinal: true })

      expect(prisma.visitStatus.updateMany).toHaveBeenCalledWith({
        where: { isFinal: true, isActive: true },
        data: { isFinal: false },
      })
    })

    it('debe asignar order=999 al convertirse en final', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Normal',
        isInitial: false,
        isFinal: false,
        order: 20,
        isActive: true,
      } as never)

      await callPUT({ isFinal: true })

      expect(prisma.visitStatus.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 999,
          }),
        })
      )
    })
  })

  describe('recálculo de order al cambiar tipo', () => {
    it('debe calcular nuevo order al cambiar de inicial a normal', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Agendada',
        isInitial: true,
        isFinal: false,
        order: 0,
        isActive: true,
      } as never)
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue({ order: 30 } as never)

      await callPUT({ isInitial: false })

      expect(prisma.visitStatus.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 40,
          }),
        })
      )
    })

    it('debe calcular nuevo order al cambiar de final a normal', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Completada',
        isInitial: false,
        isFinal: true,
        order: 999,
        isActive: true,
      } as never)
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)

      await callPUT({ isFinal: false })

      expect(prisma.visitStatus.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 10,
          }),
        })
      )
    })
  })

  describe('validaciones Zod', () => {
    it('debe rechazar nombre muy largo', async () => {
      const response = await callPUT({ name: 'a'.repeat(51) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar colorId no UUID', async () => {
      const response = await callPUT({ colorId: 'not-uuid' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar order negativo', async () => {
      const response = await callPUT({ order: -1 })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar y retornar estado con color y _count', async () => {
      vi.mocked(prisma.visitStatus.findUnique)
        .mockResolvedValueOnce({
          id: VALID_UUID,
          name: 'En Proceso',
          colorId: 'color-1',
          order: 10,
          isInitial: false,
          isFinal: false,
          isActive: true,
        } as never)
        .mockResolvedValueOnce(null)

      const response = await callPUT({ name: 'Actualizado' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.visitStatus).toBeDefined()
      expect(data.visitStatus.color).toBeDefined()
      expect(data.visitStatus._count).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando update falla', async () => {
      vi.mocked(prisma.visitStatus.findUnique)
        .mockResolvedValueOnce({
          id: VALID_UUID,
          name: 'En Proceso',
          colorId: 'color-1',
          order: 10,
          isInitial: false,
          isFinal: false,
          isActive: true,
        } as never)
        .mockResolvedValueOnce(null)
      vi.mocked(prisma.visitStatus.update).mockRejectedValue(new Error('DB Error'))

      const response = await callPUT({ name: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar el estado de visita')
    })
  })
})

describe('DELETE /api/visit-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
      _count: { visits: 0 },
    } as never)
    vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.visitStatus.update).mockResolvedValue({ id: VALID_UUID, isActive: false } as never)
    vi.mocked(prisma.visitStatus.delete).mockResolvedValue({ id: VALID_UUID } as never)
  })

  describe('validación existencia', () => {
    it('debe retornar 404 si estado no existe', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue(null)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Estado no encontrado')
    })
  })

  describe('bloqueo por visitas asignadas', () => {
    it('debe rechazar si tiene visitas asignadas', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'En Proceso',
        isInitial: false,
        isFinal: false,
        isActive: true,
        _count: { visits: 5 },
      } as never)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('tiene 5 visita(s) asignada(s)')
    })
  })

  describe('bloqueo único estado inicial', () => {
    it('debe rechazar eliminar único estado inicial activo', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Agendada',
        isInitial: true,
        isFinal: false,
        isActive: true,
        _count: { visits: 0 },
      } as never)
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No se puede eliminar el estado inicial')
      expect(data.error).toContain('al menos un estado inicial activo')
    })

    it('debe permitir eliminar inicial si existe otro', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Agendada',
        isInitial: true,
        isFinal: false,
        isActive: true,
        _count: { visits: 0 },
      } as never)
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue({
        id: 'vs-other',
        name: 'Otro Inicial',
        isInitial: true,
        isActive: true,
      } as never)

      const response = await callDELETE()

      expect(response.status).toBe(200)
    })
  })

  describe('bloqueo único estado final', () => {
    it('debe rechazar eliminar único estado final activo', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Completada',
        isInitial: false,
        isFinal: true,
        isActive: true,
        _count: { visits: 0 },
      } as never)
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No se puede eliminar el estado final')
      expect(data.error).toContain('al menos un estado final activo')
    })
  })

  describe('soft delete (default)', () => {
    it('debe hacer soft delete por defecto', async () => {
      const response = await callDELETE()
      const data = await response.json()

      expect(prisma.visitStatus.update).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
        data: { isActive: false },
      })
      expect(prisma.visitStatus.delete).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
      expect(data.message).toBe('Estado desactivado')
    })

    it('debe retornar el estado desactivado', async () => {
      const response = await callDELETE()
      const data = await response.json()

      expect(data.visitStatus).toBeDefined()
    })
  })

  describe('hard delete (force=true)', () => {
    it('debe hacer hard delete con force=true', async () => {
      const response = await callDELETE(VALID_UUID, { force: 'true' })
      const data = await response.json()

      expect(prisma.visitStatus.delete).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
      })
      expect(response.status).toBe(200)
      expect(data.message).toBe('Estado eliminado permanentemente')
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.visitStatus.update).mockRejectedValue(new Error('DB Error'))

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar el estado de visita')
    })
  })
})
