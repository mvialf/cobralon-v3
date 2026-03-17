/**
 * Tests para app/api/projects/[id]/route.ts (GET/PUT/DELETE endpoints)
 *
 * Valida:
 * - GET: Obtención con balance calculado, UUID validation
 * - PUT: Validaciones Zod, recálculo de total/balance, seguridad totalAmount
 * - DELETE: Eliminación exitosa, UUID validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

// Mock de logger-middleware (usado internamente por withApiHandler)
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
    customer: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    paymentAllocation: {
      aggregate: vi.fn(),
    },
    projectUninstallTag: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock de business logic (derivePaymentProgress se usa en GET)
vi.mock('@/lib/business-logic/project-balance', () => ({
  derivePaymentProgress: vi.fn().mockReturnValue({
    totalPaid: 500000,
    percentPaid: 42,
    isFullyPaid: false,
  }),
}))

vi.mock('@/lib/business-logic/totals', () => ({
  calculateProjectTotal: vi.fn((subtotal: number, taxRate: number) => {
    return subtotal * (1 + taxRate / 100)
  }),
}))

import { prisma } from '@/lib/db'
import { derivePaymentProgress } from '@/lib/business-logic/project-balance'
import { calculateProjectTotal } from '@/lib/business-logic/totals'
import { GET, PUT, DELETE } from '../route'

// Helper para crear params
function createParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// Helper para crear NextRequest
function createRequest(method: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/projects/test-id', {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  })
}

// UUID válido para tests
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// Proyecto mock base
const mockProject = {
  id: 'project-1',
  projectNumber: 'P-001',
  projectName: null,
  customerId: 'customer-1',
  phone: '+56912345678',
  street: 'Av. Principal 123',
  apartment: null,
  comuna: 'Las Condes',
  region: 'Metropolitana',
  subtotal: new Decimal(1000000),
  taxRate: new Decimal(19),
  total: new Decimal(1190000),
  totalAmount: new Decimal(1190000),
  balance: new Decimal(690000),
  currency: 'CLP',
  windowsCount: 5,
  squareMeters: new Decimal(50),
  description: null,
  customer: { id: 'customer-1', name: 'Test Customer', phone: '+56912345678' },
  projectStatus: { id: 'status-1', name: 'En progreso', isFinal: false, color: null },
  uninstallTags: [],
}

describe('GET /api/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 400 para UUID inválido', async () => {
    const request = createRequest('GET')
    const response = await GET(request, createParams('not-a-uuid'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
  })

  it('debe retornar 404 cuando proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const request = createRequest('GET')
    const response = await GET(request, createParams(VALID_UUID))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Proyecto no encontrado')
  })

  it('debe retornar proyecto con balance calculado', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)

    const request = createRequest('GET')
    const response = await GET(request, createParams(VALID_UUID))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.totalPaid).toBeDefined()
    expect(data.balance).toBeDefined()
    expect(data.percentPaid).toBeDefined()
  })

  it('debe llamar a derivePaymentProgress', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)

    const request = createRequest('GET')
    await GET(request, createParams(VALID_UUID))

    expect(derivePaymentProgress).toHaveBeenCalled()
  })

  it('debe convertir Decimal a number en respuesta', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)

    const request = createRequest('GET')
    const response = await GET(request, createParams(VALID_UUID))
    const data = await response.json()

    expect(typeof data.totalAmount).toBe('number')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error('DB Error'))

    const request = createRequest('GET')
    const response = await GET(request, createParams(VALID_UUID))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener el proyecto')
  })
})

describe('PUT /api/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.paymentAllocation.aggregate).mockResolvedValue({
      _sum: { allocatedAmount: new Decimal(500000) },
    } as never)

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const mockTx = {
        project: {
          update: vi.fn().mockResolvedValue({ id: 'project-1' }),
          findUnique: vi.fn().mockResolvedValue({
            ...mockProject,
            customer: mockProject.customer,
            projectStatus: mockProject.projectStatus,
            uninstallTags: [],
          }),
        },
        projectUninstallTag: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      }
      return fn(mockTx as never)
    })
  })

  describe('validaciones', () => {
    it('debe retornar 400 para UUID inválido', async () => {
      const request = createRequest('PUT', { projectName: 'Nuevo' })
      const response = await PUT(request, createParams('not-a-uuid'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('UUID inválido')
    })

    it('debe retornar 404 cuando proyecto no existe', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', { projectName: 'Nuevo' })
      const response = await PUT(request, createParams(VALID_UUID))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Proyecto no encontrado')
    })

    it('debe rechazar customerId inexistente', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', { customerId: 'nonexistent' })
      const response = await PUT(request, createParams(VALID_UUID))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('cliente no existe')
    })
  })

  describe('SEGURIDAD: Recálculo de total', () => {
    it('debe recalcular total cuando cambia subtotal', async () => {
      const request = createRequest('PUT', { subtotal: 2000000 })
      await PUT(request, createParams(VALID_UUID))

      expect(calculateProjectTotal).toHaveBeenCalledWith(2000000, 19)
    })

    it('debe recalcular total cuando cambia taxRate', async () => {
      const request = createRequest('PUT', { taxRate: 21 })
      await PUT(request, createParams(VALID_UUID))

      expect(calculateProjectTotal).toHaveBeenCalledWith(1000000, 21)
    })

    it('debe recalcular cuando cambian ambos', async () => {
      const request = createRequest('PUT', { subtotal: 2000000, taxRate: 21 })
      await PUT(request, createParams(VALID_UUID))

      expect(calculateProjectTotal).toHaveBeenCalledWith(2000000, 21)
    })

    it('debe IGNORAR totalAmount enviado por cliente', async () => {
      const request = createRequest('PUT', {
        subtotal: 2000000,
        taxRate: 19,
        totalAmount: 100000,
      })
      await PUT(request, createParams(VALID_UUID))

      expect(calculateProjectTotal).toHaveBeenCalledWith(2000000, 19)
    })
  })

  describe('recálculo de balance', () => {
    it('debe recalcular balance cuando cambia totalAmount', async () => {
      let updateData: Record<string, unknown> | null = null
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const mockTx = {
          project: {
            update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
              updateData = args.data
              return { id: 'project-1' }
            }),
            findUnique: vi.fn().mockResolvedValue(mockProject),
          },
          projectUninstallTag: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest('PUT', { subtotal: 2000000 })
      await PUT(request, createParams(VALID_UUID))

      expect(updateData?.['balance']).toBeDefined()
    })

    it('debe usar allocations existentes para calcular balance', async () => {
      vi.mocked(prisma.paymentAllocation.aggregate).mockResolvedValue({
        _sum: { allocatedAmount: new Decimal(500000) },
      } as never)

      const request = createRequest('PUT', { subtotal: 2000000 })
      await PUT(request, createParams(VALID_UUID))

      expect(prisma.paymentAllocation.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: VALID_UUID },
          _sum: { allocatedAmount: true },
        })
      )
    })
  })

  describe('actualización parcial', () => {
    it('debe actualizar solo projectNumber', async () => {
      const request = createRequest('PUT', { projectNumber: 'P-002' })
      const response = await PUT(request, createParams(VALID_UUID))

      expect(response.status).toBe(200)
      expect(calculateProjectTotal).not.toHaveBeenCalled()
    })

    it('debe actualizar projectName', async () => {
      const request = createRequest('PUT', { projectName: 'Mi Proyecto' })
      const response = await PUT(request, createParams(VALID_UUID))

      expect(response.status).toBe(200)
    })

    it('debe permitir limpiar projectName (null)', async () => {
      const request = createRequest('PUT', { projectName: '' })
      const response = await PUT(request, createParams(VALID_UUID))

      expect(response.status).toBe(200)
    })

    it('debe actualizar dirección', async () => {
      const request = createRequest('PUT', {
        street: 'Nueva Calle 456',
        apartment: 'Depto 101',
        comuna: 'Providencia',
        region: 'Metropolitana',
      })
      const response = await PUT(request, createParams(VALID_UUID))

      expect(response.status).toBe(200)
    })

    it('debe cambiar projectStatusId', async () => {
      const request = createRequest('PUT', { projectStatusId: 'status-2' })
      const response = await PUT(request, createParams(VALID_UUID))

      expect(response.status).toBe(200)
    })

    it('debe permitir desconectar projectStatus (null)', async () => {
      const request = createRequest('PUT', { projectStatusId: null })
      const response = await PUT(request, createParams(VALID_UUID))

      expect(response.status).toBe(200)
    })
  })

  describe('actualización de uninstallTags', () => {
    it('debe actualizar tags cuando se envían', async () => {
      let deletedTags = false
      let createdTags = false
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const mockTx = {
          project: {
            update: vi.fn().mockResolvedValue({ id: 'project-1' }),
            findUnique: vi.fn().mockResolvedValue(mockProject),
          },
          projectUninstallTag: {
            deleteMany: vi.fn().mockImplementation(() => {
              deletedTags = true
              return { count: 0 }
            }),
            createMany: vi.fn().mockImplementation(() => {
              createdTags = true
              return { count: 2 }
            }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest('PUT', {
        uninstallTagIds: [
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        ],
      })
      await PUT(request, createParams(VALID_UUID))

      expect(deletedTags).toBe(true)
      expect(createdTags).toBe(true)
    })

    it('debe eliminar todas las tags si se envía array vacío', async () => {
      let deletedTags = false
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const mockTx = {
          project: {
            update: vi.fn().mockResolvedValue({ id: 'project-1' }),
            findUnique: vi.fn().mockResolvedValue(mockProject),
          },
          projectUninstallTag: {
            deleteMany: vi.fn().mockImplementation(() => {
              deletedTags = true
              return { count: 0 }
            }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest('PUT', { uninstallTagIds: [] })
      await PUT(request, createParams(VALID_UUID))

      expect(deletedTags).toBe(true)
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando transacción falla', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'))

      const request = createRequest('PUT', { projectName: 'Test' })
      const response = await PUT(request, createParams(VALID_UUID))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar proyecto')
    })
  })
})

describe('DELETE /api/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 400 para UUID inválido', async () => {
    const request = createRequest('DELETE')
    const response = await DELETE(request, createParams('not-a-uuid'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
  })

  it('debe retornar 404 cuando proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const request = createRequest('DELETE')
    const response = await DELETE(request, createParams(VALID_UUID))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Proyecto no encontrado')
  })

  it('debe eliminar proyecto existente', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.project.delete).mockResolvedValue(mockProject as never)

    const request = createRequest('DELETE')
    const response = await DELETE(request, createParams(VALID_UUID))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Proyecto eliminado exitosamente')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.project.delete).mockRejectedValue(new Error('FK Constraint'))

    const request = createRequest('DELETE')
    const response = await DELETE(request, createParams(VALID_UUID))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al eliminar proyecto')
  })
})
