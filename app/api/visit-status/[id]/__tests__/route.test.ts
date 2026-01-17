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

// Helper para crear request PUT
function createPutRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/visit-status/vs-1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Helper para crear request DELETE
function createDeleteRequest(searchParams?: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/visit-status/vs-1')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new Request(url, { method: 'DELETE' })
}

// Helper para params de Next.js 15
function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/visit-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock por defecto: estado existe y no hay conflictos
    vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
      id: 'vs-1',
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
      id: 'vs-1',
      name: 'Actualizado',
      color: { id: 'color-1', name: 'Azul' },
      _count: { visits: 0 },
    } as never)
  })

  describe('validación existencia', () => {
    it('debe retornar 404 si estado no existe', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue(null)

      const response = await PUT(createPutRequest({ name: 'Test' }), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Estado no encontrado')
    })
  })

  describe('validación nombre duplicado', () => {
    it('debe rechazar si nuevo nombre ya existe', async () => {
      // Primera llamada: estado actual existe
      // Segunda llamada: verificar duplicado - nombre existe en otro
      vi.mocked(prisma.visitStatus.findUnique)
        .mockResolvedValueOnce({
          id: 'vs-1',
          name: 'Original',
          isInitial: false,
          isFinal: false,
        } as never)
        .mockResolvedValueOnce({
          id: 'vs-2',
          name: 'Agendada',
        } as never)

      const response = await PUT(createPutRequest({ name: 'Agendada' }), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado con el nombre')
    })

    it('debe permitir mantener el mismo nombre', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'En Proceso',
        isInitial: false,
        isFinal: false,
      } as never)

      const response = await PUT(createPutRequest({ name: 'En Proceso' }), createParams('vs-1'))

      // No debería buscar duplicado si el nombre es igual
      expect(response.status).toBe(200)
    })
  })

  describe('validación colorId', () => {
    it('debe rechazar si colorId no existe', async () => {
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

      const response = await PUT(
        createPutRequest({ colorId: '00000000-0000-0000-0000-000000000099' }),
        createParams('vs-1')
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('El color seleccionado no existe')
    })
  })

  describe('manejo de estado inicial', () => {
    it('debe desmarcar estado inicial anterior al marcar nuevo', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'En Proceso',
        isInitial: false, // No era inicial
        isFinal: false,
        isActive: true,
      } as never)

      await PUT(createPutRequest({ isInitial: true }), createParams('vs-1'))

      expect(prisma.visitStatus.updateMany).toHaveBeenCalledWith({
        where: { isInitial: true, isActive: true },
        data: { isInitial: false },
      })
    })

    it('NO debe desmarcar si ya era inicial', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'Agendada',
        isInitial: true, // Ya era inicial
        isFinal: false,
        isActive: true,
      } as never)

      await PUT(createPutRequest({ name: 'Agendada Actualizada' }), createParams('vs-1'))

      expect(prisma.visitStatus.updateMany).not.toHaveBeenCalled()
    })

    it('debe asignar order=0 al convertirse en inicial', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'Normal',
        isInitial: false,
        isFinal: false,
        order: 20,
        isActive: true,
      } as never)

      await PUT(createPutRequest({ isInitial: true }), createParams('vs-1'))

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
        id: 'vs-1',
        name: 'En Proceso',
        isInitial: false,
        isFinal: false, // No era final
        isActive: true,
      } as never)

      await PUT(createPutRequest({ isFinal: true }), createParams('vs-1'))

      expect(prisma.visitStatus.updateMany).toHaveBeenCalledWith({
        where: { isFinal: true, isActive: true },
        data: { isFinal: false },
      })
    })

    it('debe asignar order=999 al convertirse en final', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'Normal',
        isInitial: false,
        isFinal: false,
        order: 20,
        isActive: true,
      } as never)

      await PUT(createPutRequest({ isFinal: true }), createParams('vs-1'))

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
        id: 'vs-1',
        name: 'Agendada',
        isInitial: true, // Era inicial
        isFinal: false,
        order: 0,
        isActive: true,
      } as never)
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue({ order: 30 } as never)

      await PUT(createPutRequest({ isInitial: false }), createParams('vs-1'))

      expect(prisma.visitStatus.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 40, // 30 + 10
          }),
        })
      )
    })

    it('debe calcular nuevo order al cambiar de final a normal', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'Completada',
        isInitial: false,
        isFinal: true, // Era final
        order: 999,
        isActive: true,
      } as never)
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)

      await PUT(createPutRequest({ isFinal: false }), createParams('vs-1'))

      expect(prisma.visitStatus.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 10, // Primer estado normal
          }),
        })
      )
    })
  })

  describe('validaciones Zod', () => {
    it('debe rechazar nombre muy largo', async () => {
      const response = await PUT(createPutRequest({ name: 'a'.repeat(51) }), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar colorId no UUID', async () => {
      const response = await PUT(createPutRequest({ colorId: 'not-uuid' }), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar order negativo', async () => {
      const response = await PUT(createPutRequest({ order: -1 }), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar y retornar estado con color y _count', async () => {
      // Configurar mocks específicos para este test
      vi.mocked(prisma.visitStatus.findUnique)
        .mockResolvedValueOnce({
          id: 'vs-1',
          name: 'En Proceso',
          colorId: 'color-1',
          order: 10,
          isInitial: false,
          isFinal: false,
          isActive: true,
        } as never)
        .mockResolvedValueOnce(null) // No hay duplicado de nombre

      const response = await PUT(createPutRequest({ name: 'Actualizado' }), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.visitStatus).toBeDefined()
      expect(data.visitStatus.color).toBeDefined()
      expect(data.visitStatus._count).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando update falla', async () => {
      // Configurar mocks para llegar hasta el update
      vi.mocked(prisma.visitStatus.findUnique)
        .mockResolvedValueOnce({
          id: 'vs-1',
          name: 'En Proceso',
          colorId: 'color-1',
          order: 10,
          isInitial: false,
          isFinal: false,
          isActive: true,
        } as never)
        .mockResolvedValueOnce(null) // No hay duplicado
      vi.mocked(prisma.visitStatus.update).mockRejectedValue(new Error('DB Error'))

      const response = await PUT(createPutRequest({ name: 'Test' }), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar el estado de visita')
    })
  })
})

describe('DELETE /api/visit-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock por defecto: estado existe sin visitas
    vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
      id: 'vs-1',
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
      _count: { visits: 0 },
    } as never)
    vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.visitStatus.update).mockResolvedValue({ id: 'vs-1', isActive: false } as never)
    vi.mocked(prisma.visitStatus.delete).mockResolvedValue({ id: 'vs-1' } as never)
  })

  describe('validación existencia', () => {
    it('debe retornar 404 si estado no existe', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue(null)

      const response = await DELETE(createDeleteRequest(), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Estado no encontrado')
    })
  })

  describe('bloqueo por visitas asignadas', () => {
    it('debe rechazar si tiene visitas asignadas', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'En Proceso',
        isInitial: false,
        isFinal: false,
        isActive: true,
        _count: { visits: 5 },
      } as never)

      const response = await DELETE(createDeleteRequest(), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('tiene 5 visita(s) asignada(s)')
    })
  })

  describe('bloqueo único estado inicial', () => {
    it('debe rechazar eliminar único estado inicial activo', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'Agendada',
        isInitial: true,
        isFinal: false,
        isActive: true,
        _count: { visits: 0 },
      } as never)
      // No hay otro estado inicial activo
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)

      const response = await DELETE(createDeleteRequest(), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No se puede eliminar el estado inicial')
      expect(data.error).toContain('al menos un estado inicial activo')
    })

    it('debe permitir eliminar inicial si existe otro', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'Agendada',
        isInitial: true,
        isFinal: false,
        isActive: true,
        _count: { visits: 0 },
      } as never)
      // Existe otro estado inicial activo
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue({
        id: 'vs-other',
        name: 'Otro Inicial',
        isInitial: true,
        isActive: true,
      } as never)

      const response = await DELETE(createDeleteRequest(), createParams('vs-1'))

      expect(response.status).toBe(200)
    })
  })

  describe('bloqueo único estado final', () => {
    it('debe rechazar eliminar único estado final activo', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'vs-1',
        name: 'Completada',
        isInitial: false,
        isFinal: true,
        isActive: true,
        _count: { visits: 0 },
      } as never)
      // No hay otro estado final activo
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)

      const response = await DELETE(createDeleteRequest(), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No se puede eliminar el estado final')
      expect(data.error).toContain('al menos un estado final activo')
    })
  })

  describe('soft delete (default)', () => {
    it('debe hacer soft delete por defecto', async () => {
      const response = await DELETE(createDeleteRequest(), createParams('vs-1'))
      const data = await response.json()

      expect(prisma.visitStatus.update).toHaveBeenCalledWith({
        where: { id: 'vs-1' },
        data: { isActive: false },
      })
      expect(prisma.visitStatus.delete).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
      expect(data.message).toBe('Estado desactivado')
    })

    it('debe retornar el estado desactivado', async () => {
      const response = await DELETE(createDeleteRequest(), createParams('vs-1'))
      const data = await response.json()

      expect(data.visitStatus).toBeDefined()
    })
  })

  describe('hard delete (force=true)', () => {
    it('debe hacer hard delete con force=true', async () => {
      const response = await DELETE(createDeleteRequest({ force: 'true' }), createParams('vs-1'))
      const data = await response.json()

      expect(prisma.visitStatus.delete).toHaveBeenCalledWith({
        where: { id: 'vs-1' },
      })
      expect(response.status).toBe(200)
      expect(data.message).toBe('Estado eliminado permanentemente')
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.visitStatus.update).mockRejectedValue(new Error('DB Error'))

      const response = await DELETE(createDeleteRequest(), createParams('vs-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar el estado de visita')
    })
  })
})
