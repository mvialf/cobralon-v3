/**
 * Tests para app/api/visit-status/route.ts (GET/POST)
 *
 * Valida:
 * - GET: Lista estados ordenados, filtro includeInactive, incluye color y _count
 * - POST: Validación Zod
 * - POST: Nombre único
 * - POST: Solo un estado inicial/final activo
 * - POST: colorId debe existir
 * - POST: Auto-cálculo de order
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    visitStatus: {
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
  const url = new URL('http://localhost:3000/api/visit-status')
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

describe('GET /api/visit-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar lista de estados de visita', async () => {
    vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([
      {
        id: 'vs-1',
        name: 'Agendada',
        order: 0,
        isInitial: true,
        isFinal: false,
        isActive: true,
        colorId: 'color-1',
        color: { id: 'color-1', name: 'Azul', key: 'blue', bgClass: 'bg-blue-500', textClass: 'text-blue-500' },
        _count: { visits: 5 },
      },
      {
        id: 'vs-2',
        name: 'Completada',
        order: 999,
        isInitial: false,
        isFinal: true,
        isActive: true,
        colorId: 'color-2',
        color: { id: 'color-2', name: 'Verde', key: 'green', bgClass: 'bg-green-500', textClass: 'text-green-500' },
        _count: { visits: 3 },
      },
    ] as never)

    const response = await GET(createRequest('GET'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.visitStatuses).toHaveLength(2)
    expect(data.visitStatuses[0].name).toBe('Agendada')
    expect(data.visitStatuses[0]._count.visits).toBe(5)
  })

  it('debe filtrar estados inactivos por defecto', async () => {
    vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET'))

    expect(prisma.visitStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    )
  })

  it('debe incluir estados inactivos si includeInactive=true', async () => {
    vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET', undefined, { includeInactive: 'true' }))

    expect(prisma.visitStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      })
    )
  })

  it('debe incluir color por defecto', async () => {
    vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET'))

    expect(prisma.visitStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          color: expect.any(Object),
        }),
      })
    )
  })

  it('debe excluir color si includeColor=false', async () => {
    vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET', undefined, { includeColor: 'false' }))

    const call = vi.mocked(prisma.visitStatus.findMany).mock.calls[0][0]
    expect(call?.select?.color).toBeFalsy()
  })

  it('debe incluir _count de visitas', async () => {
    vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET'))

    expect(prisma.visitStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          _count: {
            select: { visits: true },
          },
        }),
      })
    )
  })

  it('debe ordenar por order asc', async () => {
    vi.mocked(prisma.visitStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET'))

    expect(prisma.visitStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { order: 'asc' },
      })
    )
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.visitStatus.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await GET(createRequest('GET'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener los estados de visita')
  })
})

describe('POST /api/visit-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mocks por defecto - estado normal sin conflictos
    vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({
      id: 'color-1',
      name: 'Azul',
    } as never)
    vi.mocked(prisma.visitStatus.create).mockResolvedValue({
      id: 'vs-new',
      name: 'Nuevo Estado',
      order: 10,
      color: { id: 'color-1', name: 'Azul' },
    } as never)
  })

  describe('validaciones Zod', () => {
    it('debe rechazar sin nombre', async () => {
      const request = createRequest('POST', { colorId: '00000000-0000-0000-0000-000000000001' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar con nombre vacío', async () => {
      const request = createRequest('POST', {
        name: '',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar nombre muy largo (>50 caracteres)', async () => {
      const request = createRequest('POST', {
        name: 'a'.repeat(51),
        colorId: '00000000-0000-0000-0000-000000000001',
      })
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
      expect(data.error).toBe('Datos inválidos')
    })
  })

  describe('nombre único', () => {
    it('debe rechazar nombre duplicado', async () => {
      vi.mocked(prisma.visitStatus.findUnique).mockResolvedValue({
        id: 'existing',
        name: 'Agendada',
      } as never)

      const request = createRequest('POST', {
        name: 'Agendada',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado con el nombre "Agendada"')
    })
  })

  describe('validación estado inicial/final', () => {
    it('debe rechazar si ya existe estado inicial activo', async () => {
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue({
        id: 'existing-initial',
        name: 'Agendada',
        isInitial: true,
        isActive: true,
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
      expect(data.error).toContain('Solo puede haber uno')
    })

    it('debe rechazar si ya existe estado final activo', async () => {
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue({
        id: 'existing-final',
        name: 'Completada',
        isFinal: true,
        isActive: true,
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
      expect(data.error).toContain('Solo puede haber uno')
    })

    it('debe permitir estado inicial si no existe otro activo', async () => {
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.visitStatus.create).mockResolvedValue({
        id: 'vs-new',
        name: 'Agendada',
        order: 0,
        isInitial: true,
      } as never)

      const request = createRequest('POST', {
        name: 'Agendada',
        colorId: '00000000-0000-0000-0000-000000000001',
        isInitial: true,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
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
      expect(data.error).toBe('El color seleccionado no existe')
    })
  })

  describe('auto-cálculo de order', () => {
    it('debe usar order=0 para estado inicial', async () => {
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.visitStatus.create).mockResolvedValue({
        id: 'vs-new',
        name: 'Inicial',
        order: 0,
      } as never)

      const request = createRequest('POST', {
        name: 'Inicial',
        colorId: '00000000-0000-0000-0000-000000000001',
        isInitial: true,
      })
      await POST(request)

      expect(prisma.visitStatus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 0,
          }),
        })
      )
    })

    it('debe usar order=999 para estado final', async () => {
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.visitStatus.create).mockResolvedValue({
        id: 'vs-new',
        name: 'Final',
        order: 999,
      } as never)

      const request = createRequest('POST', {
        name: 'Final',
        colorId: '00000000-0000-0000-0000-000000000001',
        isFinal: true,
      })
      await POST(request)

      expect(prisma.visitStatus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 999,
          }),
        })
      )
    })

    it('debe calcular order=10 para primer estado normal', async () => {
      // No hay estados normales previos
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.visitStatus.create).mockResolvedValue({
        id: 'vs-new',
        name: 'Normal',
        order: 10,
      } as never)

      const request = createRequest('POST', {
        name: 'Normal',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      await POST(request)

      expect(prisma.visitStatus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 10,
          }),
        })
      )
    })

    it('debe calcular order basado en máximo existente + 10', async () => {
      // Hay un estado normal con order=20
      vi.mocked(prisma.visitStatus.findFirst).mockResolvedValue({
        order: 20,
      } as never)

      const request = createRequest('POST', {
        name: 'Normal',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      await POST(request)

      expect(prisma.visitStatus.create).toHaveBeenCalledWith(
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
      expect(data.visitStatus).toBeDefined()
      expect(data.visitStatus.name).toBe('Nuevo Estado')
    })

    it('debe incluir color en la respuesta', async () => {
      const request = createRequest('POST', {
        name: 'Nuevo Estado',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(data.visitStatus.color).toBeDefined()
    })

    it('debe respetar isActive si se proporciona', async () => {
      const request = createRequest('POST', {
        name: 'Estado Inactivo',
        colorId: '00000000-0000-0000-0000-000000000001',
        isActive: false,
      })
      await POST(request)

      expect(prisma.visitStatus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        })
      )
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando create falla', async () => {
      vi.mocked(prisma.visitStatus.create).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('POST', {
        name: 'Test',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear el estado de visita')
    })
  })
})
