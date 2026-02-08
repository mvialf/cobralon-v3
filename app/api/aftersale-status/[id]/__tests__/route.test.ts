/**
 * Tests para app/api/aftersale-status/[id]/route.ts (PUT/DELETE)
 *
 * Espejo de visit-status/[id]/__tests__/route.test.ts
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

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

async function callPUT(body: Record<string, unknown>, id: string = VALID_UUID) {
  const request = new NextRequest('http://localhost:3000/api/aftersale-status/' + id, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  const context = { params: Promise.resolve({ id }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (PUT as any)(request, context)
}

async function callDELETE(id: string = VALID_UUID, searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/aftersale-status/' + id)
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

describe('PUT /api/aftersale-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
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
      id: VALID_UUID,
      name: 'Actualizado',
      color: { id: 'color-1', name: 'Azul' },
      _count: { aftersales: 0 },
    } as never)
  })

  it('debe retornar 404 si estado no existe', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue(null)

    const response = await callPUT({ name: 'Test' })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Estado no encontrado')
  })

  it('debe rechazar si nuevo nombre ya existe', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique)
      .mockResolvedValueOnce({
        id: VALID_UUID,
        name: 'Original',
        isInitial: false,
        isFinal: false,
      } as never)
      .mockResolvedValueOnce({
        id: 'as-2',
        name: 'Abierto',
      } as never)

    const response = await callPUT({ name: 'Abierto' })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Ya existe un estado con el nombre')
  })

  it('debe permitir mantener el mismo nombre', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
    } as never)

    const response = await callPUT({ name: 'En Proceso' })

    expect(response.status).toBe(200)
  })

  it('debe rechazar si colorId no existe', async () => {
    vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

    const response = await callPUT({
      colorId: '00000000-0000-0000-0000-000000000099',
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('El color seleccionado no existe')
  })

  it('debe desmarcar estado inicial anterior al marcar nuevo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
    } as never)

    await callPUT({ isInitial: true })

    expect(prisma.aftersaleStatus.updateMany).toHaveBeenCalledWith({
      where: { isInitial: true, isActive: true },
      data: { isInitial: false },
    })
  })

  it('NO debe desmarcar si ya era inicial', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Abierto',
      isInitial: true,
      isFinal: false,
      isActive: true,
    } as never)

    await callPUT({ name: 'Abierto Actualizado' })

    expect(prisma.aftersaleStatus.updateMany).not.toHaveBeenCalled()
  })

  it('debe desmarcar estado final anterior al marcar nuevo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
    } as never)

    await callPUT({ isFinal: true })

    expect(prisma.aftersaleStatus.updateMany).toHaveBeenCalledWith({
      where: { isFinal: true, isActive: true },
      data: { isFinal: false },
    })
  })

  it('debe asignar order=0 al convertirse en inicial', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Normal',
      isInitial: false,
      isFinal: false,
      order: 20,
      isActive: true,
    } as never)

    await callPUT({ isInitial: true })

    expect(prisma.aftersaleStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 0 }),
      })
    )
  })

  it('debe asignar order=999 al convertirse en final', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Normal',
      isInitial: false,
      isFinal: false,
      order: 20,
      isActive: true,
    } as never)

    await callPUT({ isFinal: true })

    expect(prisma.aftersaleStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 999 }),
      })
    )
  })

  it('debe calcular nuevo order al cambiar de inicial a normal', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Abierto',
      isInitial: true,
      isFinal: false,
      order: 0,
      isActive: true,
    } as never)
    vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue({ order: 30 } as never)

    await callPUT({ isInitial: false })

    expect(prisma.aftersaleStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 40 }),
      })
    )
  })

  it('debe rechazar validación Zod (nombre >50)', async () => {
    const response = await callPUT({ name: 'a'.repeat(51) })

    expect(response.status).toBe(400)
  })

  it('debe actualizar y retornar estado con color y _count', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique)
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
    expect(data.aftersaleStatus).toBeDefined()
  })

  it('debe retornar 500 cuando update falla', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique)
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
    vi.mocked(prisma.aftersaleStatus.update).mockRejectedValue(new Error('DB Error'))

    const response = await callPUT({ name: 'Test' })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al actualizar el estado de postventa')
  })
})

describe('DELETE /api/aftersale-status/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
      _count: { aftersales: 0 },
    } as never)
    vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.aftersaleStatus.update).mockResolvedValue({ id: VALID_UUID, isActive: false } as never)
    vi.mocked(prisma.aftersaleStatus.delete).mockResolvedValue({ id: VALID_UUID } as never)
  })

  it('debe retornar 404 si estado no existe', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue(null)

    const response = await callDELETE()

    expect(response.status).toBe(404)
  })

  it('debe rechazar si tiene aftersales asignados', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'En Proceso',
      isInitial: false,
      isFinal: false,
      isActive: true,
      _count: { aftersales: 5 },
    } as never)

    const response = await callDELETE()
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('tiene 5 postventa(s) asignado(s)')
  })

  it('debe rechazar eliminar único estado inicial activo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Abierto',
      isInitial: true,
      isFinal: false,
      isActive: true,
      _count: { aftersales: 0 },
    } as never)
    vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue(null)

    const response = await callDELETE()
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No se puede eliminar el estado inicial')
  })

  it('debe rechazar eliminar único estado final activo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Cerrado',
      isInitial: false,
      isFinal: true,
      isActive: true,
      _count: { aftersales: 0 },
    } as never)
    vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue(null)

    const response = await callDELETE()
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No se puede eliminar el estado final')
  })

  it('debe hacer soft delete por defecto', async () => {
    const response = await callDELETE()
    const data = await response.json()

    expect(prisma.aftersaleStatus.update).toHaveBeenCalledWith({
      where: { id: VALID_UUID },
      data: { isActive: false },
    })
    expect(prisma.aftersaleStatus.delete).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    expect(data.message).toBe('Estado desactivado')
  })

  it('debe hacer hard delete con force=true', async () => {
    const response = await callDELETE(VALID_UUID, { force: 'true' })
    const data = await response.json()

    expect(prisma.aftersaleStatus.delete).toHaveBeenCalledWith({
      where: { id: VALID_UUID },
    })
    expect(response.status).toBe(200)
    expect(data.message).toBe('Estado eliminado permanentemente')
  })
})
