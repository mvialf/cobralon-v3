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
import { NextRequest } from 'next/server'

vi.mock('@/lib/logger-middleware')

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

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

// Helper para llamar handlers con context
async function callPUT(body: Record<string, unknown>, id: string = VALID_UUID) {
  const request = new NextRequest('http://localhost:3000/api/project-status/' + id, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  const context = { params: Promise.resolve({ id }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (PUT as any)(request, context)
}

async function callDELETE(id: string = VALID_UUID, searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/project-status/' + id)
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

describe('PUT /api/project-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'En progreso',
      isInitial: false,
      isFinal: false,
    } as never)

    vi.mocked(prisma.projectStatus.update).mockResolvedValue({
      id: VALID_UUID,
      name: 'Actualizado',
      color: {},
      _count: { projects: 0 },
    } as never)

    vi.mocked(prisma.projectStatus.updateMany).mockResolvedValue({ count: 1 } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si estado no existe', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue(null)

      const response = await callPUT({ name: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Estado no encontrado')
    })
  })

  describe('nombre único', () => {
    it('debe rechazar si otro estado tiene el mismo nombre', async () => {
      vi.mocked(prisma.projectStatus.findUnique)
        .mockResolvedValueOnce({ id: VALID_UUID, name: 'En progreso' } as never)
        .mockResolvedValueOnce({ id: 'ps-2', name: 'Pendiente' } as never)

      const response = await callPUT({ name: 'Pendiente' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado')
    })

    it('debe permitir mantener el mismo nombre', async () => {
      const response = await callPUT({ name: 'En progreso' })

      expect(response.status).toBe(200)
    })
  })

  describe('validación colorId', () => {
    it('debe rechazar si colorId no existe', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'En progreso',
        isInitial: false,
        isFinal: false,
      } as never)
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

      const response = await callPUT({
        colorId: '00000000-0000-0000-0000-000000000002',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('color seleccionado no existe')
    })
  })

  describe('auto-desmarca estado inicial/final', () => {
    it('debe desmarcar estado inicial anterior al marcar nuevo', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Normal',
        isInitial: false,
        isFinal: false,
      } as never)

      await callPUT({ isInitial: true })

      expect(prisma.projectStatus.updateMany).toHaveBeenCalledWith({
        where: { isInitial: true, isActive: true },
        data: { isInitial: false },
      })
    })

    it('debe desmarcar estado final anterior al marcar nuevo', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Normal',
        isInitial: false,
        isFinal: false,
      } as never)

      await callPUT({ isFinal: true })

      expect(prisma.projectStatus.updateMany).toHaveBeenCalledWith({
        where: { isFinal: true, isActive: true },
        data: { isFinal: false },
      })
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar estado y retornar datos', async () => {
      vi.mocked(prisma.projectStatus.findUnique)
        .mockResolvedValueOnce({
          id: VALID_UUID,
          name: 'En progreso',
          isInitial: false,
          isFinal: false,
        } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      const response = await callPUT({ name: 'Actualizado' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projectStatus).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando update falla', async () => {
      vi.mocked(prisma.projectStatus.findUnique)
        .mockResolvedValueOnce({
          id: VALID_UUID,
          name: 'En progreso',
          isInitial: false,
          isFinal: false,
        } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      vi.mocked(prisma.projectStatus.update).mockRejectedValue(new Error('DB Error'))

      const response = await callPUT({ name: 'Test' })
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
      id: VALID_UUID,
      name: 'Test',
      isInitial: false,
      isFinal: false,
      isActive: true,
      _count: { projects: 0 },
    } as never)

    vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null)

    vi.mocked(prisma.projectStatus.update).mockResolvedValue({
      id: VALID_UUID,
      isActive: false,
    } as never)

    vi.mocked(prisma.projectStatus.delete).mockResolvedValue({
      id: VALID_UUID,
    } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si estado no existe', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue(null)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Estado no encontrado')
    })
  })

  describe('protección de datos', () => {
    it('debe rechazar si tiene proyectos asignados', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'En uso',
        _count: { projects: 5 },
      } as never)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('5 proyecto(s) asignado(s)')
    })

    it('debe rechazar si es el único estado inicial activo', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Pendiente',
        isInitial: true,
        isActive: true,
        _count: { projects: 0 },
      } as never)

      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('estado inicial')
    })

    it('debe rechazar si es el único estado final activo', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Completado',
        isInitial: false,
        isFinal: true,
        isActive: true,
        _count: { projects: 0 },
      } as never)

      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('estado final')
    })
  })

  describe('soft delete (default)', () => {
    it('debe desactivar estado sin force', async () => {
      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('desactivado')
      expect(prisma.projectStatus.update).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
        data: { isActive: false },
      })
    })
  })

  describe('hard delete (force=true)', () => {
    it('debe eliminar permanentemente con force=true', async () => {
      const response = await callDELETE(VALID_UUID, { force: 'true' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('permanentemente')
      expect(prisma.projectStatus.delete).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
      })
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.projectStatus.update).mockRejectedValue(new Error('DB Error'))

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar el estado de proyecto')
    })
  })
})
