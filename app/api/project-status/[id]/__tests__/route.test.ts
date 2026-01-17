/**
 * Tests para app/api/project-status/[id]/route.ts (PUT/DELETE)
 *
 * Valida:
 * - PUT: 404 si no existe
 * - PUT: Nombre único
 * - PUT: Auto-desmarca estado inicial/final anterior
 * - DELETE: 404 si no existe
 * - DELETE: No eliminar si tiene proyectos
 * - DELETE: No eliminar único estado inicial/final
 * - DELETE: Soft delete por defecto, hard delete con force=true
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    projectStatus: {
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

// Helper para crear params
function createParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// Helper para crear request
function createRequest(
  method: 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
): Request {
  const url = new URL('http://localhost:3000/api/project-status/test-id')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new Request(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

describe('PUT /api/project-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
      id: 'ps-1',
      name: 'En progreso',
      isInitial: false,
      isFinal: false,
    } as never)

    // Por defecto NO mockeamos badgeColor para que no sea validado
    // Solo se mockea cuando el test incluye colorId

    vi.mocked(prisma.projectStatus.update).mockResolvedValue({
      id: 'ps-1',
      name: 'Actualizado',
      color: {},
      _count: { projects: 0 },
    } as never)

    vi.mocked(prisma.projectStatus.updateMany).mockResolvedValue({ count: 1 } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si estado no existe', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', { name: 'Test' })
      const response = await PUT(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Estado no encontrado')
    })
  })

  describe('nombre único', () => {
    it('debe rechazar si otro estado tiene el mismo nombre', async () => {
      vi.mocked(prisma.projectStatus.findUnique)
        .mockResolvedValueOnce({ id: 'ps-1', name: 'En progreso' } as never)
        .mockResolvedValueOnce({ id: 'ps-2', name: 'Pendiente' } as never)

      const request = createRequest('PUT', { name: 'Pendiente' })
      const response = await PUT(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado')
    })

    it('debe permitir mantener el mismo nombre', async () => {
      const request = createRequest('PUT', { name: 'En progreso' })
      const response = await PUT(request, createParams('ps-1'))

      expect(response.status).toBe(200)
    })
  })

  describe('validación colorId', () => {
    it('debe rechazar si colorId no existe', async () => {
      // Primero mock del estado existente, luego color no encontrado
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: 'ps-1',
        name: 'En progreso',
        isInitial: false,
        isFinal: false,
      } as never)
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', {
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await PUT(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('color seleccionado no existe')
    })
  })

  describe('auto-desmarca estado inicial/final', () => {
    it('debe desmarcar estado inicial anterior al marcar nuevo', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: 'ps-1',
        name: 'Normal',
        isInitial: false,
        isFinal: false,
      } as never)

      const request = createRequest('PUT', { isInitial: true })
      await PUT(request, createParams('ps-1'))

      expect(prisma.projectStatus.updateMany).toHaveBeenCalledWith({
        where: { isInitial: true, isActive: true },
        data: { isInitial: false },
      })
    })

    it('debe desmarcar estado final anterior al marcar nuevo', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: 'ps-1',
        name: 'Normal',
        isInitial: false,
        isFinal: false,
      } as never)

      const request = createRequest('PUT', { isFinal: true })
      await PUT(request, createParams('ps-1'))

      expect(prisma.projectStatus.updateMany).toHaveBeenCalledWith({
        where: { isFinal: true, isActive: true },
        data: { isFinal: false },
      })
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar estado y retornar datos', async () => {
      // Mock: primero existencia, luego verificar nombre duplicado (null = no hay)
      vi.mocked(prisma.projectStatus.findUnique)
        .mockResolvedValueOnce({
          id: 'ps-1',
          name: 'En progreso',
          isInitial: false,
          isFinal: false,
        } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      const request = createRequest('PUT', { name: 'Actualizado' })
      const response = await PUT(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projectStatus).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando update falla', async () => {
      // Mock: primero existencia, luego verificar nombre duplicado (null = no hay)
      vi.mocked(prisma.projectStatus.findUnique)
        .mockResolvedValueOnce({
          id: 'ps-1',
          name: 'En progreso',
          isInitial: false,
          isFinal: false,
        } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      vi.mocked(prisma.projectStatus.update).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('PUT', { name: 'Test' })
      const response = await PUT(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar el estado de proyecto')
    })
  })
})

describe('DELETE /api/project-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
      id: 'ps-1',
      name: 'Test',
      isInitial: false,
      isFinal: false,
      isActive: true,
      _count: { projects: 0 },
    } as never)

    vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null)

    vi.mocked(prisma.projectStatus.update).mockResolvedValue({
      id: 'ps-1',
      isActive: false,
    } as never)

    vi.mocked(prisma.projectStatus.delete).mockResolvedValue({
      id: 'ps-1',
    } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si estado no existe', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue(null)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Estado no encontrado')
    })
  })

  describe('⚠️ protección de datos', () => {
    it('debe rechazar si tiene proyectos asignados', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: 'ps-1',
        name: 'En uso',
        _count: { projects: 5 },
      } as never)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('5 proyecto(s) asignado(s)')
    })

    it('debe rechazar si es el único estado inicial activo', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: 'ps-1',
        name: 'Pendiente',
        isInitial: true,
        isActive: true,
        _count: { projects: 0 },
      } as never)

      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('estado inicial')
    })

    it('debe rechazar si es el único estado final activo', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: 'ps-1',
        name: 'Completado',
        isInitial: false,
        isFinal: true,
        isActive: true,
        _count: { projects: 0 },
      } as never)

      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('estado final')
    })
  })

  describe('soft delete (default)', () => {
    it('debe desactivar estado sin force', async () => {
      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('desactivado')
      expect(prisma.projectStatus.update).toHaveBeenCalledWith({
        where: { id: 'ps-1' },
        data: { isActive: false },
      })
    })
  })

  describe('hard delete (force=true)', () => {
    it('debe eliminar permanentemente con force=true', async () => {
      const request = createRequest('DELETE', undefined, { force: 'true' })
      const response = await DELETE(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('permanentemente')
      expect(prisma.projectStatus.delete).toHaveBeenCalledWith({
        where: { id: 'ps-1' },
      })
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.projectStatus.update).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('ps-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar el estado de proyecto')
    })
  })
})
