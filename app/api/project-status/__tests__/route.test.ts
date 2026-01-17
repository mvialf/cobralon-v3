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

// Helper para crear request
function createRequest(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
): Request {
  const url = new URL('http://localhost:3000/api/project-status')
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

describe('GET /api/project-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar lista de estados de proyecto', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockResolvedValue([
      { id: 'ps1', name: 'Pendiente', order: 0, isInitial: true, _count: { projects: 5 } },
      { id: 'ps2', name: 'En progreso', order: 10, isInitial: false, _count: { projects: 3 } },
    ] as never)

    const response = await GET(createRequest('GET'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.projectStatuses).toHaveLength(2)
  })

  it('debe filtrar estados inactivos por defecto', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET'))

    expect(prisma.projectStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    )
  })

  it('debe incluir estados inactivos si includeInactive=true', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET', undefined, { includeInactive: 'true' }))

    expect(prisma.projectStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      })
    )
  })

  it('debe ordenar por order asc', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET'))

    expect(prisma.projectStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { order: 'asc' },
      })
    )
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.projectStatus.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await GET(createRequest('GET'))
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
      const request = createRequest('POST', { colorId: 'color-1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar sin colorId', async () => {
      const request = createRequest('POST', { name: 'Test' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar colorId inválido (no UUID)', async () => {
      const request = createRequest('POST', { name: 'Test', colorId: 'not-a-uuid' })
      const response = await POST(request)
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

      const request = createRequest('POST', {
        name: 'Pendiente',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
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

      const request = createRequest('POST', {
        name: 'Nuevo Inicial',
        colorId: '00000000-0000-0000-0000-000000000001',
        isInitial: true,
      })
      const response = await POST(request)
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

      const request = createRequest('POST', {
        name: 'Nuevo Final',
        colorId: '00000000-0000-0000-0000-000000000001',
        isFinal: true,
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado final')
    })
  })

  describe('validación colorId', () => {
    it('debe rechazar si colorId no existe', async () => {
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

      const request = createRequest('POST', {
        name: 'Test',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('color seleccionado no existe')
    })
  })

  describe('auto-cálculo de order', () => {
    it('debe usar order=0 para estado inicial', async () => {
      // Reset mocks y configurar para permitir crear estado inicial
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue(null) // Nombre no existe
      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null) // No hay estado inicial
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({ id: 'color-1' } as never)
      vi.mocked(prisma.projectStatus.create).mockResolvedValue({
        id: 'ps-new',
        name: 'Inicial',
        order: 0,
      } as never)

      const request = createRequest('POST', {
        name: 'Inicial',
        colorId: '00000000-0000-0000-0000-000000000001',
        isInitial: true,
      })
      await POST(request)

      expect(prisma.projectStatus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 0,
          }),
        })
      )
    })

    it('debe usar order=999 para estado final', async () => {
      // Reset mocks y configurar para permitir crear estado final
      vi.mocked(prisma.projectStatus.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.projectStatus.findFirst).mockResolvedValue(null) // No hay estado final
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({ id: 'color-1' } as never)
      vi.mocked(prisma.projectStatus.create).mockResolvedValue({
        id: 'ps-new',
        name: 'Final',
        order: 999,
      } as never)

      const request = createRequest('POST', {
        name: 'Final',
        colorId: '00000000-0000-0000-0000-000000000001',
        isFinal: true,
      })
      await POST(request)

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

      const request = createRequest('POST', {
        name: 'Normal',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      await POST(request)

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
      const request = createRequest('POST', {
        name: 'Nuevo Estado',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.projectStatus).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando create falla', async () => {
      vi.mocked(prisma.projectStatus.create).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('POST', {
        name: 'Test',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear el estado de proyecto')
    })
  })
})
