/**
 * Tests para app/api/team-tags/[id]/route.ts (GET/PUT/DELETE)
 *
 * Valida:
 * - GET: Retorna tag por ID, 404 si no existe
 * - PUT: 404 si no existe, nombre único, colorId válido, auto-generación abbreviation
 * - DELETE: Soft delete por defecto, hard delete con force=true
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
    teamTag: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    badgeColor: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET, PUT, DELETE } from '../route'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

// Helpers
async function callGET(id: string = VALID_UUID) {
  const request = new NextRequest('http://localhost:3000/api/team-tags/' + id)
  const context = { params: Promise.resolve({ id }) }
  return (GET as any)(request, context)
}

async function callPUT(body: Record<string, unknown>, id: string = VALID_UUID) {
  const request = new NextRequest('http://localhost:3000/api/team-tags/' + id, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  const context = { params: Promise.resolve({ id }) }
  return (PUT as any)(request, context)
}

async function callDELETE(id: string = VALID_UUID, searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/team-tags/' + id)
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const request = new NextRequest(url, { method: 'DELETE' })
  const context = { params: Promise.resolve({ id }) }
  return (DELETE as any)(request, context)
}

describe('GET /api/team-tags/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar tag por ID', async () => {
    vi.mocked(prisma.teamTag.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Carlos',
      abbreviation: 'CA',
      color: { id: 'c1', name: 'Azul' },
    } as never)

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.teamTag.name).toBe('Carlos')
  })

  it('debe retornar 404 si no existe', async () => {
    vi.mocked(prisma.teamTag.findUnique).mockResolvedValue(null)

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Team tag no encontrado')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.teamTag.findUnique).mockRejectedValue(new Error('DB Error'))

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener el team tag')
  })
})

describe('PUT /api/team-tags/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.teamTag.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Carlos',
      abbreviation: 'CA',
    } as never)

    vi.mocked(prisma.teamTag.update).mockResolvedValue({
      id: VALID_UUID,
      name: 'Actualizado',
      abbreviation: 'AC',
      color: {},
    } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si tag no existe', async () => {
      vi.mocked(prisma.teamTag.findUnique).mockResolvedValue(null)

      const response = await callPUT({ name: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Team tag no encontrado')
    })
  })

  describe('nombre único', () => {
    it('debe rechazar si otro integrante tiene el mismo nombre', async () => {
      vi.mocked(prisma.teamTag.findUnique)
        .mockResolvedValueOnce({ id: VALID_UUID, name: 'Carlos' } as never)
        .mockResolvedValueOnce({ id: 'other-id', name: 'María' } as never)

      const response = await callPUT({ name: 'María' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un integrante')
    })

    it('debe permitir mantener el mismo nombre', async () => {
      const response = await callPUT({ name: 'Carlos' })

      expect(response.status).toBe(200)
    })
  })

  describe('validación colorId', () => {
    it('debe rechazar si colorId no existe', async () => {
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

      const response = await callPUT({
        colorId: '00000000-0000-0000-0000-000000000002',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('color seleccionado no existe')
    })
  })

  describe('auto-generación de abbreviation', () => {
    it('debe auto-generar abbreviation si se cambia nombre sin abbreviation', async () => {
      vi.mocked(prisma.teamTag.findUnique)
        .mockResolvedValueOnce({ id: VALID_UUID, name: 'Carlos', abbreviation: 'CA' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      await callPUT({ name: 'Nuevo Nombre' })

      expect(prisma.teamTag.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            abbreviation: 'NU', // Primeras 2 letras de "Nuevo"
          }),
        })
      )
    })

    it('debe usar abbreviation explícita si se provee', async () => {
      vi.mocked(prisma.teamTag.findUnique)
        .mockResolvedValueOnce({ id: VALID_UUID, name: 'Carlos', abbreviation: 'CA' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      await callPUT({ name: 'Nuevo Nombre', abbreviation: 'XX' })

      expect(prisma.teamTag.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            abbreviation: 'XX',
          }),
        })
      )
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar tag y retornar datos', async () => {
      vi.mocked(prisma.teamTag.findUnique)
        .mockResolvedValueOnce({ id: VALID_UUID, name: 'Carlos', abbreviation: 'CA' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      const response = await callPUT({ name: 'Actualizado' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.teamTag).toBeDefined()
    })

    it('debe actualizar order si se provee', async () => {
      await callPUT({ order: 5 })

      expect(prisma.teamTag.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 5,
          }),
        })
      )
    })

    it('debe actualizar isActive', async () => {
      await callPUT({ isActive: false })

      expect(prisma.teamTag.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        })
      )
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando update falla', async () => {
      vi.mocked(prisma.teamTag.findUnique)
        .mockResolvedValueOnce({ id: VALID_UUID, name: 'Carlos', abbreviation: 'CA' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      vi.mocked(prisma.teamTag.update).mockRejectedValue(new Error('DB Error'))

      const response = await callPUT({ name: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar el team tag')
    })
  })
})

describe('DELETE /api/team-tags/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.teamTag.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Test',
      isActive: true,
    } as never)

    vi.mocked(prisma.teamTag.update).mockResolvedValue({
      id: VALID_UUID,
      isActive: false,
    } as never)

    vi.mocked(prisma.teamTag.delete).mockResolvedValue({
      id: VALID_UUID,
    } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si tag no existe', async () => {
      vi.mocked(prisma.teamTag.findUnique).mockResolvedValue(null)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Team tag no encontrado')
    })
  })

  describe('soft delete (default)', () => {
    it('debe desactivar tag sin force', async () => {
      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('desactivado')
      expect(prisma.teamTag.update).toHaveBeenCalledWith({
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
      expect(prisma.teamTag.delete).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
      })
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.teamTag.update).mockRejectedValue(new Error('DB Error'))

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar el team tag')
    })
  })
})
