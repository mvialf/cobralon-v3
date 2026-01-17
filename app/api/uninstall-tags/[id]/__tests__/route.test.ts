/**
 * Tests para app/api/uninstall-tags/[id]/route.ts (GET/PUT/DELETE)
 *
 * Valida:
 * - GET: 404 si no existe
 * - PUT: 404 si no existe
 * - PUT: Nombre único
 * - PUT: colorId debe existir
 * - DELETE: 404 si no existe
 * - DELETE: Soft delete por defecto, hard delete con force=true
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    uninstallTag: {
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

// Helper para crear params
function createParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// Helper para crear request
function createRequest(
  method: 'GET' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
): Request {
  const url = new URL('http://localhost:3000/api/uninstall-tags/test-id')
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

describe('GET /api/uninstall-tags/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar tag por ID', async () => {
    vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue({
      id: 'ut-1',
      name: 'Aluminio',
      abbreviation: 'AL',
      color: { id: 'c1', name: 'Azul' },
    } as never)

    const response = await GET(createRequest('GET'), createParams('ut-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.uninstallTag.name).toBe('Aluminio')
  })

  it('debe retornar 404 si no existe', async () => {
    vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue(null)

    const response = await GET(createRequest('GET'), createParams('nonexistent'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Uninstall tag no encontrada')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.uninstallTag.findUnique).mockRejectedValue(new Error('DB Error'))

    const response = await GET(createRequest('GET'), createParams('ut-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener la uninstall tag')
  })
})

describe('PUT /api/uninstall-tags/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue({
      id: 'ut-1',
      name: 'Aluminio',
      abbreviation: 'AL',
    } as never)

    // Por defecto NO mockeamos badgeColor - solo cuando el test lo necesita

    vi.mocked(prisma.uninstallTag.update).mockResolvedValue({
      id: 'ut-1',
      name: 'Actualizado',
      abbreviation: 'AC',
      color: {},
    } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si tag no existe', async () => {
      vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', { name: 'Test' })
      const response = await PUT(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Uninstall tag no encontrada')
    })
  })

  describe('nombre único', () => {
    it('debe rechazar si otra tag tiene el mismo nombre', async () => {
      vi.mocked(prisma.uninstallTag.findUnique)
        .mockResolvedValueOnce({ id: 'ut-1', name: 'Aluminio' } as never)
        .mockResolvedValueOnce({ id: 'ut-2', name: 'PVC' } as never)

      const request = createRequest('PUT', { name: 'PVC' })
      const response = await PUT(request, createParams('ut-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe una tag')
    })

    it('debe permitir mantener el mismo nombre', async () => {
      const request = createRequest('PUT', { name: 'Aluminio' })
      const response = await PUT(request, createParams('ut-1'))

      expect(response.status).toBe(200)
    })
  })

  describe('validación colorId', () => {
    it('debe rechazar si colorId no existe', async () => {
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', {
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await PUT(request, createParams('ut-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('color seleccionado no existe')
    })
  })

  describe('auto-generación de abbreviation', () => {
    it('debe auto-generar abbreviation si se cambia nombre sin abbreviation', async () => {
      // Primera llamada: verificar existencia por ID
      // Segunda llamada: verificar nombre duplicado (debe retornar null)
      vi.mocked(prisma.uninstallTag.findUnique)
        .mockResolvedValueOnce({ id: 'ut-1', name: 'Aluminio', abbreviation: 'AL' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      const request = createRequest('PUT', { name: 'Nuevo Nombre' })
      await PUT(request, createParams('ut-1'))

      // La función debe ser llamada con abbreviation auto-generada
      expect(prisma.uninstallTag.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            abbreviation: 'NU', // Primeras 2 letras de "Nuevo"
          }),
        })
      )
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar tag y retornar datos', async () => {
      // Mock para verificación de existencia y duplicado
      vi.mocked(prisma.uninstallTag.findUnique)
        .mockResolvedValueOnce({ id: 'ut-1', name: 'Aluminio', abbreviation: 'AL' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      const request = createRequest('PUT', { name: 'Actualizado' })
      const response = await PUT(request, createParams('ut-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.uninstallTag).toBeDefined()
    })

    it('debe actualizar order si se provee', async () => {
      // Mock existencia (sin cambio de nombre, no hay segunda llamada)
      vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue({
        id: 'ut-1',
        name: 'Aluminio',
        abbreviation: 'AL',
      } as never)

      const request = createRequest('PUT', { order: 5 })
      await PUT(request, createParams('ut-1'))

      expect(prisma.uninstallTag.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 5,
          }),
        })
      )
    })

    it('debe actualizar isActive', async () => {
      // Mock existencia (sin cambio de nombre)
      vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue({
        id: 'ut-1',
        name: 'Aluminio',
        abbreviation: 'AL',
      } as never)

      const request = createRequest('PUT', { isActive: false })
      await PUT(request, createParams('ut-1'))

      expect(prisma.uninstallTag.update).toHaveBeenCalledWith(
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
      // Mock para verificación de existencia y duplicado
      vi.mocked(prisma.uninstallTag.findUnique)
        .mockResolvedValueOnce({ id: 'ut-1', name: 'Aluminio', abbreviation: 'AL' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      vi.mocked(prisma.uninstallTag.update).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('PUT', { name: 'Test' })
      const response = await PUT(request, createParams('ut-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar la uninstall tag')
    })
  })
})

describe('DELETE /api/uninstall-tags/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue({
      id: 'ut-1',
      name: 'Test',
      isActive: true,
    } as never)

    vi.mocked(prisma.uninstallTag.update).mockResolvedValue({
      id: 'ut-1',
      isActive: false,
    } as never)

    vi.mocked(prisma.uninstallTag.delete).mockResolvedValue({
      id: 'ut-1',
    } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si tag no existe', async () => {
      vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue(null)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Uninstall tag no encontrada')
    })
  })

  describe('soft delete (default)', () => {
    it('debe desactivar tag sin force', async () => {
      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('ut-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('desactivada')
      expect(prisma.uninstallTag.update).toHaveBeenCalledWith({
        where: { id: 'ut-1' },
        data: { isActive: false },
      })
    })
  })

  describe('hard delete (force=true)', () => {
    it('debe eliminar permanentemente con force=true', async () => {
      const request = createRequest('DELETE', undefined, { force: 'true' })
      const response = await DELETE(request, createParams('ut-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('permanentemente')
      expect(prisma.uninstallTag.delete).toHaveBeenCalledWith({
        where: { id: 'ut-1' },
      })
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.uninstallTag.update).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('ut-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar la uninstall tag')
    })
  })
})
