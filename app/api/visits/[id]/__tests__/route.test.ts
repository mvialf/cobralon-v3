/**
 * Tests para app/api/visits/[id]/route.ts (GET/PUT/DELETE)
 *
 * Valida:
 * - GET: 404 si no existe
 * - PUT: 404 si no existe (error P2025)
 * - DELETE: 404 si no existe (error P2025)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

// UUIDs de prueba
const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000'
const NONEXISTENT_UUID = '00000000-0000-0000-0000-000000000000'

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
      return handler(request, mockLogger, context)
    }
  },
}))

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    visit: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
  body?: Record<string, unknown>
): NextRequest {
  return new NextRequest(`http://localhost:3000/api/visits/${TEST_UUID}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

describe('GET /api/visits/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar visita por ID', async () => {
    vi.mocked(prisma.visit.findUnique).mockResolvedValue({
      id: TEST_UUID,
      name: 'Test Visit',
      visitStatus: { id: 's1', name: 'Pendiente' },
    } as never)

    const response = await GET(createRequest('GET'), createParams(TEST_UUID))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe(TEST_UUID)
    expect(data.name).toBe('Test Visit')
  })

  it('debe retornar 404 si no existe', async () => {
    vi.mocked(prisma.visit.findUnique).mockResolvedValue(null)

    const response = await GET(createRequest('GET'), createParams(NONEXISTENT_UUID))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Visita no encontrada')
  })

  it('debe incluir visitStatus', async () => {
    vi.mocked(prisma.visit.findUnique).mockResolvedValue({
      id: TEST_UUID,
      name: 'Test',
      visitStatus: {
        id: 's1',
        name: 'Pendiente',
        color: { bgClass: 'bg-yellow-500' },
      },
    } as never)

    const response = await GET(createRequest('GET'), createParams(TEST_UUID))
    const data = await response.json()

    expect(data.visitStatus.name).toBe('Pendiente')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.visit.findUnique).mockRejectedValue(new Error('DB Error'))

    const response = await GET(createRequest('GET'), createParams(TEST_UUID))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener la visita')
  })
})

describe('PUT /api/visits/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.visit.update).mockResolvedValue({
      id: TEST_UUID,
      name: 'Actualizada',
      visitStatus: {},
    } as never)
  })

  it('debe actualizar visita', async () => {
    const request = createRequest('PUT', { name: 'Actualizada' })
    const response = await PUT(request, createParams(TEST_UUID))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Actualizada')
  })

  it('debe retornar 404 si no existe (P2025)', async () => {
    const prismaError = new PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    })
    vi.mocked(prisma.visit.update).mockRejectedValue(prismaError)

    const request = createRequest('PUT', { name: 'Test' })
    const response = await PUT(request, createParams(NONEXISTENT_UUID))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Registro no encontrado')
  })

  it('debe actualizar solo campos provistos', async () => {
    const request = createRequest('PUT', { name: 'Nuevo Nombre' })
    await PUT(request, createParams(TEST_UUID))

    expect(prisma.visit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Nuevo Nombre' },
      })
    )
  })

  it('debe convertir date string a Date', async () => {
    const request = createRequest('PUT', { date: '2024-06-15T00:00:00.000Z' })
    await PUT(request, createParams(TEST_UUID))

    expect(prisma.visit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          date: expect.any(Date),
        }),
      })
    )
  })

  it('debe actualizar visitStatusId usando connect', async () => {
    const request = createRequest('PUT', { visitStatusId: 'new-status' })
    await PUT(request, createParams(TEST_UUID))

    expect(prisma.visit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visitStatus: { connect: { id: 'new-status' } },
        }),
      })
    )
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.visit.update).mockRejectedValue(new Error('DB Error'))

    const request = createRequest('PUT', { name: 'Test' })
    const response = await PUT(request, createParams(TEST_UUID))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al actualizar la visita')
  })
})

describe('DELETE /api/visits/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.visit.delete).mockResolvedValue({
      id: TEST_UUID,
    } as never)
  })

  it('debe eliminar visita', async () => {
    const response = await DELETE(createRequest('DELETE'), createParams(TEST_UUID))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('eliminada')
  })

  it('debe retornar 404 si no existe (P2025)', async () => {
    const prismaError = new PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    })
    vi.mocked(prisma.visit.delete).mockRejectedValue(prismaError)

    const response = await DELETE(createRequest('DELETE'), createParams(NONEXISTENT_UUID))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Registro no encontrado')
  })

  it('debe llamar a prisma.visit.delete', async () => {
    await DELETE(createRequest('DELETE'), createParams(TEST_UUID))

    expect(prisma.visit.delete).toHaveBeenCalledWith({
      where: { id: TEST_UUID },
    })
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.visit.delete).mockRejectedValue(new Error('DB Error'))

    const response = await DELETE(createRequest('DELETE'), createParams(TEST_UUID))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al eliminar la visita')
  })
})
