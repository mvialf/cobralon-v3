/**
 * Tests para app/api/aftersale-status/[id]/route.ts (PUT/DELETE)
 *
 * Espejo de visit-status/[id]/__tests__/route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    aftersaleStatus: {
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

function createPutRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/aftersale-status/as-1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function createDeleteRequest(searchParams?: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/aftersale-status/as-1')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new Request(url, { method: 'DELETE' })
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/aftersale-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'En Proceso',
      colorId: 'color-1',
      order: 10,
      isInitial: false,
      isFinal: false,
      isActive: true,
    } as never)
    vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({ id: 'color-1' } as never)
    vi.mocked(prisma.aftersaleStatus.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.aftersaleStatus.update).mockResolvedValue({
      id: 'as-1',
      name: 'Actualizado',
      color: { id: 'color-1', name: 'Azul' },
      _count: { aftersales: 0 },
    } as never)
  })

  it('debe retornar 404 si estado no existe', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue(null)

    const response = await PUT(createPutRequest({ name: 'Test' }), createParams('as-1'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Estado no encontrado')
  })

  it('debe rechazar si nuevo nombre ya existe', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique)
      .mockResolvedValueOnce({
        id: 'as-1',
        name: 'Original',
        isInitial: false,
        isFinal: false,
      } as never)
      .mockResolvedValueOnce({
        id: 'as-2',
        name: 'Abierto',
      } as never)

    const response = await PUT(createPutRequest({ name: 'Abierto' }), createParams('as-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Ya existe un estado con el nombre')
  })

  it('debe permitir mantener el mismo nombre', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
    } as never)

    const response = await PUT(createPutRequest({ name: 'En Proceso' }), createParams('as-1'))

    expect(response.status).toBe(200)
  })

  it('debe rechazar si colorId no existe', async () => {
    vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

    const response = await PUT(
      createPutRequest({ colorId: '00000000-0000-0000-0000-000000000099' }),
      createParams('as-1')
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('El color seleccionado no existe')
  })

  it('debe desmarcar estado inicial anterior al marcar nuevo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
    } as never)

    await PUT(createPutRequest({ isInitial: true }), createParams('as-1'))

    expect(prisma.aftersaleStatus.updateMany).toHaveBeenCalledWith({
      where: { isInitial: true, isActive: true },
      data: { isInitial: false },
    })
  })

  it('NO debe desmarcar si ya era inicial', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'Abierto',
      isInitial: true,
      isFinal: false,
      isActive: true,
    } as never)

    await PUT(createPutRequest({ name: 'Abierto Actualizado' }), createParams('as-1'))

    expect(prisma.aftersaleStatus.updateMany).not.toHaveBeenCalled()
  })

  it('debe desmarcar estado final anterior al marcar nuevo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
    } as never)

    await PUT(createPutRequest({ isFinal: true }), createParams('as-1'))

    expect(prisma.aftersaleStatus.updateMany).toHaveBeenCalledWith({
      where: { isFinal: true, isActive: true },
      data: { isFinal: false },
    })
  })

  it('debe asignar order=0 al convertirse en inicial', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'Normal',
      isInitial: false,
      isFinal: false,
      order: 20,
      isActive: true,
    } as never)

    await PUT(createPutRequest({ isInitial: true }), createParams('as-1'))

    expect(prisma.aftersaleStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 0 }),
      })
    )
  })

  it('debe asignar order=999 al convertirse en final', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'Normal',
      isInitial: false,
      isFinal: false,
      order: 20,
      isActive: true,
    } as never)

    await PUT(createPutRequest({ isFinal: true }), createParams('as-1'))

    expect(prisma.aftersaleStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 999 }),
      })
    )
  })

  it('debe calcular nuevo order al cambiar de inicial a normal', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'Abierto',
      isInitial: true,
      isFinal: false,
      order: 0,
      isActive: true,
    } as never)
    vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue({ order: 30 } as never)

    await PUT(createPutRequest({ isInitial: false }), createParams('as-1'))

    expect(prisma.aftersaleStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 40 }),
      })
    )
  })

  it('debe rechazar validación Zod (nombre >50)', async () => {
    const response = await PUT(createPutRequest({ name: 'a'.repeat(51) }), createParams('as-1'))

    expect(response.status).toBe(400)
  })

  it('debe actualizar y retornar estado con color y _count', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique)
      .mockResolvedValueOnce({
        id: 'as-1',
        name: 'En Proceso',
        colorId: 'color-1',
        order: 10,
        isInitial: false,
        isFinal: false,
        isActive: true,
      } as never)
      .mockResolvedValueOnce(null)

    const response = await PUT(createPutRequest({ name: 'Actualizado' }), createParams('as-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.aftersaleStatus).toBeDefined()
  })

  it('debe retornar 500 cuando update falla', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique)
      .mockResolvedValueOnce({
        id: 'as-1',
        name: 'En Proceso',
        colorId: 'color-1',
        order: 10,
        isInitial: false,
        isFinal: false,
        isActive: true,
      } as never)
      .mockResolvedValueOnce(null) // No hay duplicado de nombre
    vi.mocked(prisma.aftersaleStatus.update).mockRejectedValue(new Error('DB Error'))

    const response = await PUT(createPutRequest({ name: 'Test' }), createParams('as-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al actualizar el estado de postventa')
  })
})

describe('DELETE /api/aftersale-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
      _count: { aftersales: 0 },
    } as never)
    vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.aftersaleStatus.update).mockResolvedValue({ id: 'as-1', isActive: false } as never)
    vi.mocked(prisma.aftersaleStatus.delete).mockResolvedValue({ id: 'as-1' } as never)
  })

  it('debe retornar 404 si estado no existe', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue(null)

    const response = await DELETE(createDeleteRequest(), createParams('as-1'))

    expect(response.status).toBe(404)
  })

  it('debe rechazar si tiene aftersales asignados', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
      _count: { aftersales: 5 },
    } as never)

    const response = await DELETE(createDeleteRequest(), createParams('as-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('5 caso(s) de postventa')
  })

  it('debe rechazar eliminar único estado inicial activo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'Abierto',
      isInitial: true,
      isFinal: false,
      isActive: true,
      _count: { aftersales: 0 },
    } as never)
    vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue(null)

    const response = await DELETE(createDeleteRequest(), createParams('as-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No se puede eliminar el estado inicial')
  })

  it('debe rechazar eliminar único estado final activo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 'as-1',
      name: 'Cerrado',
      isInitial: false,
      isFinal: true,
      isActive: true,
      _count: { aftersales: 0 },
    } as never)
    vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue(null)

    const response = await DELETE(createDeleteRequest(), createParams('as-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No se puede eliminar el estado final')
  })

  it('debe hacer soft delete por defecto', async () => {
    const response = await DELETE(createDeleteRequest(), createParams('as-1'))
    const data = await response.json()

    expect(prisma.aftersaleStatus.update).toHaveBeenCalledWith({
      where: { id: 'as-1' },
      data: { isActive: false },
    })
    expect(prisma.aftersaleStatus.delete).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    expect(data.message).toBe('Estado desactivado')
  })

  it('debe hacer hard delete con force=true', async () => {
    const response = await DELETE(createDeleteRequest({ force: 'true' }), createParams('as-1'))
    const data = await response.json()

    expect(prisma.aftersaleStatus.delete).toHaveBeenCalledWith({
      where: { id: 'as-1' },
    })
    expect(response.status).toBe(200)
    expect(data.message).toBe('Estado eliminado permanentemente')
  })
})
