/**
 * Tests para app/api/aftersale-status/route.ts (GET/POST)
 *
 * Espejo de visit-status/__tests__/route.test.ts
 * Valida: lista, filtros, validaciones Zod, nombre único, inicial/final, colorId, order
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    aftersaleStatus: {
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

function createRequest(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
): Request {
  const url = new URL('http://localhost:3000/api/aftersale-status')
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

describe('GET /api/aftersale-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar lista de estados de postventa', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue([
      {
        id: 'as-1',
        name: 'Abierto',
        order: 0,
        isInitial: true,
        isFinal: false,
        isActive: true,
        colorId: 'color-1',
        color: { id: 'color-1', name: 'Amarillo', key: 'yellow', bgClass: 'bg-yellow-500', textClass: 'text-yellow-500' },
        _count: { aftersales: 5 },
      },
      {
        id: 'as-2',
        name: 'Cerrado',
        order: 999,
        isInitial: false,
        isFinal: true,
        isActive: true,
        colorId: 'color-2',
        color: { id: 'color-2', name: 'Verde', key: 'green', bgClass: 'bg-green-500', textClass: 'text-green-500' },
        _count: { aftersales: 3 },
      },
    ] as never)

    const response = await GET(createRequest('GET'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.aftersaleStatuses).toHaveLength(2)
    expect(data.aftersaleStatuses[0].name).toBe('Abierto')
    expect(data.aftersaleStatuses[0]._count.aftersales).toBe(5)
  })

  it('debe filtrar estados inactivos por defecto', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET'))

    expect(prisma.aftersaleStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    )
  })

  it('debe incluir estados inactivos si includeInactive=true', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET', undefined, { includeInactive: 'true' }))

    expect(prisma.aftersaleStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      })
    )
  })

  it('debe incluir color por defecto', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET'))

    expect(prisma.aftersaleStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          color: expect.any(Object),
        }),
      })
    )
  })

  it('debe excluir color si includeColor=false', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET', undefined, { includeColor: 'false' }))

    const call = vi.mocked(prisma.aftersaleStatus.findMany).mock.calls[0][0]
    expect(call?.select?.color).toBeFalsy()
  })

  it('debe incluir _count de aftersales', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockResolvedValue([])

    await GET(createRequest('GET'))

    expect(prisma.aftersaleStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          _count: {
            select: { aftersales: true },
          },
        }),
      })
    )
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.aftersaleStatus.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await GET(createRequest('GET'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener los estados de postventa')
  })
})

describe('POST /api/aftersale-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({
      id: 'color-1',
      name: 'Azul',
    } as never)
    vi.mocked(prisma.aftersaleStatus.create).mockResolvedValue({
      id: 'as-new',
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

      expect(response.status).toBe(400)
    })

    it('debe rechazar nombre muy largo (>50 caracteres)', async () => {
      const request = createRequest('POST', {
        name: 'a'.repeat(51),
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar colorId inválido (no UUID)', async () => {
      const request = createRequest('POST', { name: 'Test', colorId: 'not-a-uuid' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('nombre único', () => {
    it('debe rechazar nombre duplicado', async () => {
      vi.mocked(prisma.aftersaleStatus.findUnique).mockResolvedValue({
        id: 'existing',
        name: 'Abierto',
      } as never)

      const request = createRequest('POST', {
        name: 'Abierto',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe un estado con el nombre "Abierto"')
    })
  })

  describe('validación estado inicial/final', () => {
    it('debe rechazar si ya existe estado inicial activo', async () => {
      vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue({
        id: 'existing-initial',
        name: 'Abierto',
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
      vi.mocked(prisma.aftersaleStatus.findFirst).mockResolvedValue({
        id: 'existing-final',
        name: 'Cerrado',
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

  describe('creación exitosa', () => {
    it('debe crear estado y retornar 201', async () => {
      const request = createRequest('POST', {
        name: 'Nuevo Estado',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.aftersaleStatus).toBeDefined()
      expect(data.aftersaleStatus.name).toBe('Nuevo Estado')
    })
  })
})
