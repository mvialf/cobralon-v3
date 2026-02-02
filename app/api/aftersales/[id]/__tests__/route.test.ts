/**
 * Tests para app/api/aftersales/[id]/route.ts (GET/PUT/DELETE)
 *
 * Valida:
 * - GET: Obtener un aftersale específico
 * - PUT: Actualización con validaciones
 * - DELETE: Eliminación permanente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    aftersale: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    aftersaleStatus: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/regiones-chile', () => ({
  getRegionByCodigo: vi.fn().mockReturnValue({ nombre: 'Región Metropolitana' }),
}))

import { prisma } from '@/lib/db'
import { GET, PUT, DELETE } from '../route'

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function createGetRequest(): Request {
  return new Request('http://localhost:3000/api/aftersales/af-1', { method: 'GET' })
}

function createPutRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/aftersales/af-1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function createDeleteRequest(): Request {
  return new Request('http://localhost:3000/api/aftersales/af-1', { method: 'DELETE' })
}

const mockAftersale = {
  id: 'af-1',
  projectId: 'p-1',
  aftersaleStatusId: 's-1',
  contactPhone: '+56912345678',
  description: 'Problema original',
  reportedAt: new Date(),
  project: {
    id: 'p-1',
    projectNumber: '1001',
    projectName: null,
    street: 'Calle 1',
    apartment: null,
    comuna: 'Santiago',
    region: 'RM',
    customer: { id: 'c-1', name: 'Cliente' },
  },
  aftersaleStatus: {
    id: 's-1',
    name: 'Abierto',
    color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-500' },
  },
}

describe('GET /api/aftersales/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar aftersale con relaciones', async () => {
    vi.mocked(prisma.aftersale.findUnique).mockResolvedValue(mockAftersale as never)

    const response = await GET(createGetRequest(), createParams('af-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('af-1')
    expect(data.project).toBeDefined()
    expect(data.aftersaleStatus).toBeDefined()
  })

  it('debe retornar 404 si no existe', async () => {
    vi.mocked(prisma.aftersale.findUnique).mockResolvedValue(null)

    const response = await GET(createGetRequest(), createParams('not-found'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('no encontrado')
  })

  it('debe retornar 500 en error', async () => {
    vi.mocked(prisma.aftersale.findUnique).mockRejectedValue(new Error('DB'))

    const response = await GET(createGetRequest(), createParams('af-1'))

    expect(response.status).toBe(500)
  })
})

describe('PUT /api/aftersales/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersale.findUnique).mockResolvedValue({
      id: 'af-1',
      projectId: 'p-1',
    } as never)

    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: 'p-1' } as never)
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 's-1',
      isActive: true,
    } as never)

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const mockTx = {
        project: { update: vi.fn() },
        aftersale: { update: vi.fn().mockResolvedValue(mockAftersale) },
      }
      return fn(mockTx as never)
    })
  })

  it('debe actualizar aftersale con cambio de dirección', async () => {
    const response = await PUT(
      createPutRequest({ street: 'Calle Nueva 456', comuna: 'Providencia', region: '13' }),
      createParams('af-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.aftersale).toBeDefined()
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('debe actualizar aftersale sin cambio de dirección', async () => {
    const response = await PUT(
      createPutRequest({ description: 'Descripción actualizada' }),
      createParams('af-1')
    )

    expect(response.status).toBe(200)
  })

  it('debe retornar 404 si proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const response = await PUT(
      createPutRequest({ projectId: '00000000-0000-0000-0000-000000000099' }),
      createParams('af-1')
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('proyecto seleccionado no existe')
  })

  it('debe rechazar status inactivo', async () => {
    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
      id: 's-2',
      isActive: false,
    } as never)

    const response = await PUT(
      createPutRequest({ aftersaleStatusId: '00000000-0000-0000-0000-000000000002' }),
      createParams('af-1')
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('no está activo')
  })

  it('debe retornar 404 si aftersale no existe', async () => {
    vi.mocked(prisma.aftersale.findUnique).mockResolvedValue(null)

    const response = await PUT(
      createPutRequest({ description: 'Test' }),
      createParams('not-found')
    )

    expect(response.status).toBe(404)
  })

  it('debe retornar 400 en error Zod', async () => {
    const response = await PUT(
      createPutRequest({ contactPhone: '12345' }),
      createParams('af-1')
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Datos inválidos')
  })
})

describe('DELETE /api/aftersales/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersale.findUnique).mockResolvedValue({ id: 'af-1' } as never)
    vi.mocked(prisma.aftersale.delete).mockResolvedValue({ id: 'af-1' } as never)
  })

  it('debe eliminar aftersale exitosamente', async () => {
    const response = await DELETE(createDeleteRequest(), createParams('af-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('eliminado')
  })

  it('debe retornar 404 si no existe', async () => {
    vi.mocked(prisma.aftersale.findUnique).mockResolvedValue(null)

    const response = await DELETE(createDeleteRequest(), createParams('not-found'))

    expect(response.status).toBe(404)
  })

  it('debe retornar 500 en error', async () => {
    vi.mocked(prisma.aftersale.delete).mockRejectedValue(new Error('DB'))

    const response = await DELETE(createDeleteRequest(), createParams('af-1'))

    expect(response.status).toBe(500)
  })
})
