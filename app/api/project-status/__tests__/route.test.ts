/**
 * Tests para app/api/project-status/route.ts (GET/POST)
 *
 * Valida:
 * - GET: Lista estados ordenados, filtro includeInactive
 * - POST: Validación Zod
 * - POST: Nombre único
 * - POST: Solo un estado inicial/final
 * - POST: colorId debe existir
 * - POST: Auto-cálculo de order
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
    projectStatus: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    badgeColor: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET, POST } from '../route'

// Helper para llamar al handler con context mock
async function callGET(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (GET as any)(request, context)
}

async function callPOST(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (POST as any)(request, context)
}

// Helper para crear request GET
function createGetRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/project-status')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url)
}

// Helper para crear request POST
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/project-status', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/project-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar lista de estados de proyecto', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockResolvedValue([
      { id: 'ps1', name: 'Pendiente', order: 0, isInitial: true, _count: { projects: 5 } },
      { id: 'ps2', name: 'En progreso', order: 10, isInitial: false, _count: { projects: 3 } },
    ] as never)

    const response = await callGET(createGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.projectStatuses).toHaveLength(2)
  })

  it('debe filtrar estados inactivos por defecto', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockResolvedValue([])

    await callGET(createGetRequest())

    expect(prisma.projectStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    )
  })

  it('debe incluir estados inactivos si includeInactive=true', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockResolvedValue([])

    await callGET(createGetRequest({ includeInactive: 'true' }))

    expect(prisma.projectStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      })
    )
  })

  it('debe ordenar por order asc', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockResolvedValue([])

    await callGET(createGetRequest())

    expect(prisma.projectStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { order: 'asc' },
      })
    )
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await callGET(createGetRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener los estados de proyecto')
  })
})

describe('POST /api/project-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mocks por defecto
    vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({
      id: 'color-1',
      name: 'Azul',
    } as never)
    vi.mocked(prisma.projectStatus.create).mockResolvedValue({
      id: 'ps-new',
      name: 'Nuevo Estado',
      order: 10,
      color: { id: 'color-1', name: 'Azul' },
    } as never)
  })

  describe('validaciones Zod', () => {
    it('debe rechazar sin nombre', async () => {
      const request = createPostRequest({ colorId: 'color-1' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar sin colorId', async () => {
      const request = createPostRequest({ name: 'Test' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar colorId inválido (no UUID)', async () => {
      const request = createPostRequest({ name: 'Test', colorId: 'not-a-uuid' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('nombre único', () => {
    it('debe rechazar nombre duplicado', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue({
        id: 'existing',
        name: 'Pendiente',
      } as never)

      const request = createPostRequest({
        name: 'Pendiente',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado')
    })
  })

  describe('validación estado inicial/final', () => {
    it('debe rechazar si ya existe estado inicial activo', async () => {
      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue({
        id: 'existing-initial',
        name: 'Pendiente',
        isInitial: true,
      } as never)

      const request = createPostRequest({
        name: 'Nuevo Inicial',
        colorId: '00000000-0000-0000-0000-000000000001',
        isInitial: true,
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado inicial')
    })

    it('debe rechazar si ya existe estado final activo', async () => {
      // Cuando isFinal=true pero NO isInitial, solo se llama findFirst una vez
      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue({
        id: 'existing-final',
        name: 'Completado',
        isFinal: true,
      } as never)

      const request = createPostRequest({
        name: 'Nuevo Final',
        colorId: '00000000-0000-0000-0000-000000000001',
        isFinal: true,
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado final')
    })
  })

  describe('validación colorId', () => {
    it('debe rechazar si colorId no existe', async () => {
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

      const request = createPostRequest({
        name: 'Test',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('color seleccionado no existe')
    })
  })

  describe('auto-cálculo de order', () => {
    it('debe usar order=0 para estado inicial', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({ id: 'color-1' } as never)
      vi.mocked(prisma.projectStatus.create).mockResolvedValue({
        id: 'ps-new',
        name: 'Inicial',
        order: 0,
      } as never)

      const request = createPostRequest({
        name: 'Inicial',
        colorId: '00000000-0000-0000-0000-000000000001',
        isInitial: true,
      })
      await callPOST(request)

      expect(prisma.projectStatus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 0,
          }),
        })
      )
    })

    it('debe usar order=999 para estado final', async () => {
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({ id: 'color-1' } as never)
      vi.mocked(prisma.projectStatus.create).mockResolvedValue({
        id: 'ps-new',
        name: 'Final',
        order: 999,
      } as never)

      const request = createPostRequest({
        name: 'Final',
        colorId: '00000000-0000-0000-0000-000000000001',
        isFinal: true,
      })
      await callPOST(request)

      expect(prisma.projectStatus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 999,
          }),
        })
      )
    })

    it('debe calcular order para estado normal', async () => {
      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue({
        order: 20,
      } as never)

      const request = createPostRequest({
        name: 'Normal',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      await callPOST(request)

      expect(prisma.projectStatus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 30, // 20 + 10
          }),
        })
      )
    })
  })

  describe('creación exitosa', () => {
    it('debe crear estado y retornar 201', async () => {
      const request = createPostRequest({
        name: 'Nuevo Estado',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.projectStatus).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando create falla', async () => {
      vi.mocked(prisma.projectStatus.create).mockRejectedValue(new Error('DB Error'))

      const request = createPostRequest({
        name: 'Test',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear el estado de proyecto')
    })
  })
})
