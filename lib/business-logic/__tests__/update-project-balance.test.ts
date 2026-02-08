/**
 * Tests para lib/business-logic/update-project-balance.ts
 *
 * Valida:
 * - updateProjectBalance()
 * - updateMultipleProjectBalances()
 * - verifyProjectBalance()
 * - updateProjectBalanceWithAdjustments()
 *
 * NOTA: Estas funciones interactúan con la DB, por lo que mockeamos Prisma.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import {
  updateProjectBalance,
  updateMultipleProjectBalances,
  verifyProjectBalance,
  updateProjectBalanceWithAdjustments,
} from '../update-project-balance'

// Helper para crear mock de proyecto
// Usamos 'as any' porque solo necesitamos los campos que usa la función,
// no el modelo completo de Prisma
function createMockProject(overrides: {
  id?: string
  total?: number
  balance?: number
  totalAmount?: number | null
  paymentAllocations?: Array<{ allocatedAmount: number | Decimal }>
  adjustments?: Array<{ amount: number | Decimal }>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any {
  return {
    id: overrides.id ?? 'project-1',
    total: new Decimal(overrides.total ?? 1000000),
    balance: new Decimal(overrides.balance ?? 1000000),
    totalAmount: overrides.totalAmount !== undefined
      ? (overrides.totalAmount === null ? null : new Decimal(overrides.totalAmount))
      : new Decimal(overrides.total ?? 1000000),
    paymentAllocations: (overrides.paymentAllocations ?? []).map((alloc) => ({
      allocatedAmount: typeof alloc.allocatedAmount === 'number'
        ? new Decimal(alloc.allocatedAmount)
        : alloc.allocatedAmount,
    })),
    adjustments: (overrides.adjustments ?? []).map((adj) => ({
      amount: typeof adj.amount === 'number' ? new Decimal(adj.amount) : adj.amount,
    })),
  }
}

describe('updateProjectBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe calcular y actualizar balance correctamente con allocations', async () => {
    const mockProject = createMockProject({
      id: 'project-1',
      total: 1000000,
      paymentAllocations: [
        { allocatedAmount: 300000 },
        { allocatedAmount: 200000 },
      ],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalance('project-1')

    // Balance esperado: 1,000,000 - 500,000 = 500,000
    expect(result).toBe(500000)

    // Verificar que se llamó update con el balance correcto
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: {
        balance: new Decimal(500000),
      },
    })
  })

  it('debe retornar balance completo cuando no hay allocations', async () => {
    const mockProject = createMockProject({
      id: 'project-2',
      total: 500000,
      paymentAllocations: [],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalance('project-2')

    expect(result).toBe(500000)
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-2' },
      data: {
        balance: new Decimal(500000),
      },
    })
  })

  it('debe retornar 0 cuando proyecto está completamente pagado', async () => {
    const mockProject = createMockProject({
      id: 'project-3',
      total: 1000000,
      paymentAllocations: [{ allocatedAmount: 1000000 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalance('project-3')

    expect(result).toBe(0)
  })

  it('debe manejar balance negativo (sobrepago)', async () => {
    const mockProject = createMockProject({
      id: 'project-4',
      total: 1000000,
      paymentAllocations: [{ allocatedAmount: 1200000 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalance('project-4')

    // Balance negativo indica sobrepago
    expect(result).toBe(-200000)
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-4' },
      data: {
        balance: new Decimal(-200000),
      },
    })
  })

  it('debe lanzar error si proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    await expect(updateProjectBalance('non-existent')).rejects.toThrow(
      'Project non-existent not found'
    )

    expect(prisma.project.update).not.toHaveBeenCalled()
  })

  it('debe manejar allocations con valores Decimal de Prisma', async () => {
    const mockProject = createMockProject({
      id: 'project-5',
      total: 1000000,
      paymentAllocations: [
        { allocatedAmount: new Decimal(333333.33) },
        { allocatedAmount: new Decimal(333333.33) },
        { allocatedAmount: new Decimal(333333.34) },
      ],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalance('project-5')

    // 1,000,000 - 1,000,000 = 0
    expect(result).toBe(0)
  })

  it('debe manejar montos pequeños con decimales', async () => {
    const mockProject = createMockProject({
      id: 'project-6',
      total: 100.50,
      paymentAllocations: [{ allocatedAmount: 50.25 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalance('project-6')

    expect(result).toBeCloseTo(50.25, 2)
  })
})

describe('updateMultipleProjectBalances', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe actualizar todos los proyectos en batch', async () => {
    const projects = [
      createMockProject({ id: 'p1', total: 1000, paymentAllocations: [{ allocatedAmount: 500 }] }),
      createMockProject({ id: 'p2', total: 2000, paymentAllocations: [{ allocatedAmount: 1000 }] }),
      createMockProject({ id: 'p3', total: 3000, paymentAllocations: [{ allocatedAmount: 1500 }] }),
    ]

    vi.mocked(prisma.project.findUnique)
      .mockResolvedValueOnce(projects[0])
      .mockResolvedValueOnce(projects[1])
      .mockResolvedValueOnce(projects[2])
    vi.mocked(prisma.project.update).mockResolvedValue(projects[0])

    const result = await updateMultipleProjectBalances(['p1', 'p2', 'p3'])

    expect(result).toBe(3)
    expect(prisma.project.update).toHaveBeenCalledTimes(3)
  })

  it('debe lanzar error si un proyecto falla', async () => {
    const project1 = createMockProject({ id: 'p1', total: 1000, paymentAllocations: [] })

    vi.mocked(prisma.project.findUnique)
      .mockResolvedValueOnce(project1)
      .mockResolvedValueOnce(null) // p2 no existe → lanza error

    vi.mocked(prisma.project.update).mockResolvedValue(project1)

    await expect(
      updateMultipleProjectBalances(['p1', 'p2', 'p3'])
    ).rejects.toThrow('Project p2 not found')

    // Solo se actualizó p1 antes del error
    expect(prisma.project.update).toHaveBeenCalledTimes(1)
  })

  it('debe manejar array vacío', async () => {
    const result = await updateMultipleProjectBalances([])

    expect(result).toBe(0)
    expect(prisma.project.findUnique).not.toHaveBeenCalled()
  })

  it('debe manejar un solo proyecto', async () => {
    const project = createMockProject({ id: 'single', total: 5000, paymentAllocations: [] })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(project)
    vi.mocked(prisma.project.update).mockResolvedValue(project)

    const result = await updateMultipleProjectBalances(['single'])

    expect(result).toBe(1)
  })
})

describe('verifyProjectBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar true si balance DB coincide con calculado', async () => {
    const mockProject = createMockProject({
      id: 'project-1',
      total: 1000000,
      balance: 500000,
      paymentAllocations: [{ allocatedAmount: 500000 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)

    const result = await verifyProjectBalance('project-1')

    expect(result).toBe(true)
  })

  it('debe retornar false si balance DB no coincide', async () => {
    const mockProject = createMockProject({
      id: 'project-2',
      total: 1000000,
      balance: 600000, // Incorrecto: debería ser 500000
      paymentAllocations: [{ allocatedAmount: 500000 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)

    const result = await verifyProjectBalance('project-2')

    expect(result).toBe(false)
  })

  it('debe permitir diferencia dentro de tolerancia (0.01)', async () => {
    const mockProject = createMockProject({
      id: 'project-3',
      total: 1000000,
      balance: 500000.005, // Diferencia de 0.005 (dentro de tolerancia)
      paymentAllocations: [{ allocatedAmount: 500000 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)

    const result = await verifyProjectBalance('project-3')

    expect(result).toBe(true)
  })

  it('debe fallar si diferencia excede tolerancia', async () => {
    const mockProject = createMockProject({
      id: 'project-4',
      total: 1000000,
      balance: 500000.02, // Diferencia de 0.02 (fuera de tolerancia)
      paymentAllocations: [{ allocatedAmount: 500000 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)

    const result = await verifyProjectBalance('project-4')

    expect(result).toBe(false)
  })

  it('debe lanzar error si proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    await expect(verifyProjectBalance('non-existent')).rejects.toThrow(
      'Project non-existent not found'
    )
  })

  it('debe verificar correctamente proyecto sin allocations', async () => {
    const mockProject = createMockProject({
      id: 'project-5',
      total: 1000000,
      balance: 1000000, // Balance = total cuando no hay pagos
      paymentAllocations: [],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)

    const result = await verifyProjectBalance('project-5')

    expect(result).toBe(true)
  })

  it('debe verificar correctamente proyecto con sobrepago', async () => {
    const mockProject = createMockProject({
      id: 'project-6',
      total: 1000000,
      balance: -200000, // Sobrepago de 200k
      paymentAllocations: [{ allocatedAmount: 1200000 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)

    const result = await verifyProjectBalance('project-6')

    expect(result).toBe(true)
  })
})

describe('updateProjectBalanceWithAdjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe restar ajustes del balance base', async () => {
    const mockProject = createMockProject({
      id: 'project-1',
      total: 1000000,
      totalAmount: 1000000,
      paymentAllocations: [{ allocatedAmount: 300000 }],
      adjustments: [{ amount: 100000 }], // Ajuste de 100k
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalanceWithAdjustments('project-1')

    // Balance base: 1,000,000 - 300,000 = 700,000
    // Balance final: 700,000 - 100,000 = 600,000
    expect(result).toBe(600000)
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: {
        balance: new Decimal(600000),
      },
    })
  })

  it('debe sumar múltiples ajustes', async () => {
    const mockProject = createMockProject({
      id: 'project-2',
      total: 1000000,
      totalAmount: 1000000,
      paymentAllocations: [],
      adjustments: [
        { amount: 50000 },
        { amount: 30000 },
        { amount: 20000 },
      ],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalanceWithAdjustments('project-2')

    // Balance base: 1,000,000 - 0 = 1,000,000
    // Total ajustes: 100,000
    // Balance final: 1,000,000 - 100,000 = 900,000
    expect(result).toBe(900000)
  })

  it('debe manejar ajustes negativos (devoluciones)', async () => {
    const mockProject = createMockProject({
      id: 'project-3',
      total: 1000000,
      totalAmount: 1000000,
      paymentAllocations: [{ allocatedAmount: 500000 }],
      adjustments: [{ amount: -100000 }], // Ajuste negativo = aumenta balance
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalanceWithAdjustments('project-3')

    // Balance base: 1,000,000 - 500,000 = 500,000
    // Balance final: 500,000 - (-100,000) = 600,000
    expect(result).toBe(600000)
  })

  it('debe funcionar sin ajustes (igual que updateProjectBalance)', async () => {
    const mockProject = createMockProject({
      id: 'project-4',
      total: 1000000,
      totalAmount: 1000000,
      paymentAllocations: [{ allocatedAmount: 400000 }],
      adjustments: [],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalanceWithAdjustments('project-4')

    expect(result).toBe(600000)
  })

  it('debe lanzar error si proyecto no existe', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    await expect(updateProjectBalanceWithAdjustments('non-existent')).rejects.toThrow(
      'Project non-existent not found'
    )
  })

  it('debe usar transacción de Prisma cuando se proporciona', async () => {
    const mockProject = createMockProject({
      id: 'project-5',
      total: 500000,
      totalAmount: 500000,
      paymentAllocations: [],
      adjustments: [],
    })

    // Mock de transacción
    const mockTx = {
      project: {
        findUnique: vi.fn().mockResolvedValue(mockProject),
        update: vi.fn().mockResolvedValue(mockProject),
      },
    }

    const result = await updateProjectBalanceWithAdjustments('project-5', mockTx as any)

    expect(result).toBe(500000)
    expect(mockTx.project.findUnique).toHaveBeenCalled()
    expect(mockTx.project.update).toHaveBeenCalled()
    // Prisma global NO debe haber sido llamado
    expect(prisma.project.findUnique).not.toHaveBeenCalled()
    expect(prisma.project.update).not.toHaveBeenCalled()
  })

  it('debe usar totalAmount si está disponible, fallback a total', async () => {
    const mockProject = createMockProject({
      id: 'project-6',
      total: 1000000,
      totalAmount: 900000, // Diferente de total
      paymentAllocations: [{ allocatedAmount: 400000 }],
      adjustments: [],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalanceWithAdjustments('project-6')

    // Debe usar totalAmount (900k), no total (1M)
    expect(result).toBe(500000) // 900,000 - 400,000
  })

  it('debe manejar balance negativo con ajustes', async () => {
    const mockProject = createMockProject({
      id: 'project-7',
      total: 1000000,
      totalAmount: 1000000,
      paymentAllocations: [{ allocatedAmount: 1200000 }], // Sobrepago
      adjustments: [{ amount: 50000 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject)

    const result = await updateProjectBalanceWithAdjustments('project-7')

    // Balance base: 1,000,000 - 1,200,000 = -200,000
    // Balance final: -200,000 - 50,000 = -250,000
    expect(result).toBe(-250000)
  })
})

describe('Escenarios de integración', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe mantener consistencia: verify después de update', async () => {
    const mockProject = createMockProject({
      id: 'project-int-1',
      total: 1000000,
      balance: 0, // Inicialmente incorrecto
      paymentAllocations: [{ allocatedAmount: 300000 }],
    })

    // Mock que simula actualización y retorna proyecto actualizado
    const updatedProject = createMockProject({
      id: 'project-int-1',
      total: 1000000,
      balance: 700000, // Balance correcto después de update
      paymentAllocations: [{ allocatedAmount: 300000 }],
    })

    vi.mocked(prisma.project.findUnique)
      .mockResolvedValueOnce(mockProject) // Para updateProjectBalance
      .mockResolvedValueOnce(updatedProject) // Para verifyProjectBalance
    vi.mocked(prisma.project.update).mockResolvedValue(updatedProject)

    // Primero actualizar
    await updateProjectBalance('project-int-1')

    // Ahora verificar (debe encontrar consistencia)
    const isConsistent = await verifyProjectBalance('project-int-1')
    expect(isConsistent).toBe(true)
  })

  it('debe detectar inconsistencia por modificación externa', async () => {
    const mockProject = createMockProject({
      id: 'project-int-2',
      total: 1000000,
      balance: 999999, // Modificado externamente (incorrecto)
      paymentAllocations: [{ allocatedAmount: 0 }],
    })

    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject)

    // Balance calculado debería ser 1,000,000, pero DB tiene 999,999
    const isConsistent = await verifyProjectBalance('project-int-2')
    expect(isConsistent).toBe(false) // Diferencia de 1 > tolerancia
  })
})
