/**
 * Tests para app/api/uninstall-tags/route.ts (GET/POST)
 *
 * Valida:
 * - GET: Lista tags ordenadas, filtro includeInactive
 * - POST: Validación Zod
 * - POST: Nombre único
 * - POST: colorId debe existir
 * - POST: Auto-generación de abbreviation
 * - POST: Auto-cálculo de order
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock automático de logger-middleware (usa lib/__mocks__/logger-middleware.ts)
vi.mock('@/lib/logger-middleware')

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    uninstallTag: {
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

// Helpers
async function callGET(searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/uninstall-tags')
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (GET as any)(new NextRequest(url), context)
}

async function callPOST(body: Record<string, unknown>) {
  const request = new NextRequest('http://localhost:3000/api/uninstall-tags', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (POST as any)(request, context)
}

describe('GET /api/uninstall-tags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar lista de uninstall tags', async () => {
    vi.mocked(prisma.uninstallTag.findMany).mockResolvedValue([
      { id: 'ut1', name: 'Aluminio', abbreviation: 'AL', order: 10 },
      { id: 'ut2', name: 'PVC', abbreviation: 'PV', order: 20 },
    ] as never)

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.uninstallTags).toHaveLength(2)
  })

  it('debe filtrar tags inactivas por defecto', async () => {
    vi.mocked(prisma.uninstallTag.findMany).mockResolvedValue([])

    await callGET()

    expect(prisma.uninstallTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    )
  })

  it('debe incluir tags inactivas si includeInactive=true', async () => {
    vi.mocked(prisma.uninstallTag.findMany).mockResolvedValue([])

    await callGET({ includeInactive: 'true' })

    expect(prisma.uninstallTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      })
    )
  })

  it('debe ordenar por order asc', async () => {
    vi.mocked(prisma.uninstallTag.findMany).mockResolvedValue([])

    await callGET()

    expect(prisma.uninstallTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { order: 'asc' },
      })
    )
  })

  it('debe incluir color por defecto', async () => {
    vi.mocked(prisma.uninstallTag.findMany).mockResolvedValue([])

    await callGET()

    expect(prisma.uninstallTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          color: expect.any(Object),
        }),
      })
    )
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.uninstallTag.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener las uninstall tags')
  })
})

describe('POST /api/uninstall-tags', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.uninstallTag.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue({
      id: 'color-1',
      name: 'Azul',
    } as never)
    vi.mocked(prisma.uninstallTag.create).mockResolvedValue({
      id: 'ut-new',
      name: 'Nueva Tag',
      abbreviation: 'NT',
      order: 10,
      color: { id: 'color-1', name: 'Azul' },
    } as never)
  })

  describe('validaciones Zod', () => {
    it('debe retornar 400 sin nombre', async () => {
      const response = await callPOST({
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar sin colorId', async () => {
      const response = await callPOST({ name: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('nombre único', () => {
    it('debe rechazar nombre duplicado', async () => {
      vi.mocked(prisma.uninstallTag.findUnique).mockResolvedValue({
        id: 'existing',
        name: 'Aluminio',
      } as never)

      const response = await callPOST({
        name: 'Aluminio',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Ya existe una tag')
    })
  })

  describe('validación colorId', () => {
    it('debe rechazar si colorId no existe', async () => {
      vi.mocked(prisma.badgeColor.findUnique).mockResolvedValue(null)

      const response = await callPOST({
        name: 'Test',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('color seleccionado no existe')
    })
  })

  describe('auto-generación de abbreviation', () => {
    it('debe auto-generar abbreviation si no se provee', async () => {
      await callPOST({
        name: 'Aluminio',
        colorId: '00000000-0000-0000-0000-000000000001',
      })

      // La abbreviation se genera automáticamente (primeras 2 letras mayúsculas)
      expect(prisma.uninstallTag.create).toHaveBeenCalled()
    })

    it('debe usar abbreviation si se provee', async () => {
      await callPOST({
        name: 'Aluminio',
        abbreviation: 'XX',
        colorId: '00000000-0000-0000-0000-000000000001',
      })

      expect(prisma.uninstallTag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            abbreviation: 'XX',
          }),
        })
      )
    })
  })

  describe('auto-cálculo de order', () => {
    it('debe calcular order como max + 10', async () => {
      vi.mocked(prisma.uninstallTag.findFirst).mockResolvedValue({
        order: 30,
      } as never)

      await callPOST({
        name: 'Nueva',
        colorId: '00000000-0000-0000-0000-000000000001',
      })

      expect(prisma.uninstallTag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 40,
          }),
        })
      )
    })

    it('debe usar order=10 si no hay tags existentes', async () => {
      vi.mocked(prisma.uninstallTag.findFirst).mockResolvedValue(null)

      await callPOST({
        name: 'Primera',
        colorId: '00000000-0000-0000-0000-000000000001',
      })

      expect(prisma.uninstallTag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 10,
          }),
        })
      )
    })
  })

  describe('creación exitosa', () => {
    it('debe crear tag y retornar 201', async () => {
      const response = await callPOST({
        name: 'Nueva Tag',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.uninstallTag).toBeDefined()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando create falla', async () => {
      vi.mocked(prisma.uninstallTag.create).mockRejectedValue(new Error('DB Error'))

      const response = await callPOST({
        name: 'Test',
        colorId: '00000000-0000-0000-0000-000000000001',
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear la uninstall tag')
    })
  })
})
