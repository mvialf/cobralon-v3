/**
 * Tests para app/api/projects/import/route.ts (POST batch)
 *
 * Valida:
 * - Array de proyectos requerido
 * - Creación de customer si no existe
 * - Validación de estado de proyecto
 * - Cálculo de totalAmount
 * - Respuesta Multi-status (207)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

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
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    project: {
      create: vi.fn(),
    },
    projectStatus: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { POST } from '../route'

// Helper para llamar al handler
async function callPOST(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (POST as any)(request, context)
}

// Helper para crear request
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/projects/import', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Proyecto válido base
const validProject = {
  projectNumber: 'P-001',
  customerName: 'Test Customer',
  phone: '+56912345678',
  street: 'Av. Principal 123',
  comuna: 'Las Condes',
  region: 'Metropolitana',
  projectStatusName: 'En progreso',
  date: new Date('2024-01-15'),
  subtotal: 1000000,
  taxRate: 19,
  windowsCount: 5,
  squareMeters: 50,
}

describe('POST /api/projects/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks por defecto
    vi.mocked(prisma.projectStatus.findMany).mockResolvedValue([
      { id: 'status-1', name: 'En progreso' },
      { id: 'status-2', name: 'Completado' },
    ] as never)

    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      id: 'customer-1',
      name: 'Test Customer',
      phone: '+56912345678',
    } as never)

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: 'project-1',
      projectNumber: 'P-001',
    } as never)
  })

  describe('validaciones de entrada', () => {
    it('debe rechazar sin array de proyectos', async () => {
      const request = createRequest({})
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('array de proyectos')
    })

    it('debe rechazar array vacío', async () => {
      const request = createRequest({ projects: [] })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('array de proyectos')
    })
  })

  describe('manejo de cliente', () => {
    it('debe crear cliente si no existe y se proporciona teléfono', async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.customer.create).mockResolvedValue({
        id: 'new-customer',
        name: 'Test Customer',
        phone: '+56912345678',
      } as never)

      const request = createRequest({ projects: [validProject] })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Customer',
          phone: '+56912345678',
        }),
      })
    })

    it('debe fallar si cliente no existe y no hay teléfono', async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)

      const projectWithoutPhone = { ...validProject, phone: undefined }
      const request = createRequest({ projects: [projectWithoutPhone] })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(207) // Multi-status
      expect(data.failed).toBe(1)
      expect(data.errors[0].error).toContain('no existe')
      expect(data.errors[0].error).toContain('teléfono')
    })

    it('debe usar cliente existente sin crear nuevo', async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue({
        id: 'existing-customer',
        name: 'Test Customer',
        phone: '+56912345678',
      } as never)

      const request = createRequest({ projects: [validProject] })
      await callPOST(request)

      expect(prisma.customer.create).not.toHaveBeenCalled()
    })
  })

  describe('validación de estado', () => {
    it('debe fallar si estado de proyecto no existe', async () => {
      const projectWithInvalidStatus = {
        ...validProject,
        projectStatusName: 'Estado Inexistente',
      }

      const request = createRequest({ projects: [projectWithInvalidStatus] })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data.failed).toBe(1)
      expect(data.errors[0].error).toContain('no encontrado')
    })

    it('debe normalizar nombre de estado (case-insensitive)', async () => {
      const projectWithUpperCase = {
        ...validProject,
        projectStatusName: 'EN PROGRESO', // Uppercase
      }

      const request = createRequest({ projects: [projectWithUpperCase] })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('cálculo de totalAmount', () => {
    it('debe calcular totalAmount correctamente', async () => {
      let createdProject: Record<string, unknown> | null = null
      vi.mocked(prisma.project.create).mockImplementation((async (args: {
        data: Record<string, unknown>
      }) => {
        createdProject = args.data
        return { id: 'project-1' }
      }) as never)

      const request = createRequest({ projects: [validProject] })
      await callPOST(request)

      // totalAmount = subtotal * (1 + taxRate/100) = 1000000 * 1.19 = 1190000
      const totalAmount = createdProject?.['totalAmount'] as unknown as Decimal
      expect(Number(totalAmount)).toBeCloseTo(1190000, 2)
    })

    it('debe usar teléfono del cliente como fallback', async () => {
      const projectWithoutPhone = { ...validProject, phone: undefined }

      vi.mocked(prisma.customer.findFirst).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
        phone: '+56999999999', // Teléfono del cliente
      } as never)

      let createdProject: Record<string, unknown> | null = null
      vi.mocked(prisma.project.create).mockImplementation((async (args: {
        data: Record<string, unknown>
      }) => {
        createdProject = args.data
        return { id: 'project-1' }
      }) as never)

      const request = createRequest({ projects: [projectWithoutPhone] })
      await callPOST(request)

      expect(createdProject?.['phone']).toBe('+56999999999')
    })
  })

  describe('respuestas', () => {
    it('debe retornar 201 cuando todo es exitoso', async () => {
      const request = createRequest({ projects: [validProject] })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.imported).toBe(1)
    })

    it('debe retornar 207 (Multi-status) con éxitos parciales', async () => {
      const projects = [
        validProject,
        { ...validProject, projectNumber: 'P-002', projectStatusName: 'Inexistente' },
      ]

      const request = createRequest({ projects })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data.imported).toBe(1)
      expect(data.failed).toBe(1)
      expect(data.errors).toHaveLength(1)
    })

    it('debe incluir projectIds en respuesta exitosa', async () => {
      vi.mocked(prisma.project.create).mockResolvedValue({
        id: 'new-project-id',
        projectNumber: 'P-001',
      } as never)

      const request = createRequest({ projects: [validProject] })
      const response = await callPOST(request)
      const data = await response.json()

      expect(data.projectIds).toContain('new-project-id')
    })
  })

  describe('manejo de errores', () => {
    it('debe capturar errores por proyecto sin fallar todo el import', async () => {
      vi.mocked(prisma.project.create)
        .mockResolvedValueOnce({ id: 'p1', projectNumber: 'P-001' } as never)
        .mockRejectedValueOnce(new Error('Unique constraint failed'))

      const projects = [
        validProject,
        { ...validProject, projectNumber: 'P-002' },
      ]

      const request = createRequest({ projects })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data.imported).toBe(1)
      expect(data.failed).toBe(1)
    })

    it('debe retornar 500 cuando error global', async () => {
      vi.mocked(prisma.projectStatus.findMany).mockRejectedValue(new Error('DB Error'))

      const request = createRequest({ projects: [validProject] })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al importar proyectos')
    })
  })
})
