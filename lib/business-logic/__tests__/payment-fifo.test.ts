/**
 * Tests para lib/business-logic/payment-fifo.ts
 *
 * Valida:
 * - calculateFIFO()
 * - validateAllocationsSum()
 * - filterProjectsWithBalance()
 */

import { describe, it, expect } from 'vitest'
import { calculateFIFO, validateAllocationsSum, filterProjectsWithBalance } from '../payment-fifo'
import type { ProjectWithBalance } from '../payment-fifo'

describe('calculateFIFO', () => {
  it('debe distribuir pago entre proyectos ordenados por fecha (FIFO)', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P3',
        projectNumber: '2024-003',
        projectName: 'Proyecto 3',
        totalAmount: 500000,
        currency: 'CLP',
        createdAt: new Date('2024-03-01'),
        paymentAllocations: [{ allocatedAmount: 300000 }],
      },
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: 'Proyecto 1',
        totalAmount: 1000000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [{ allocatedAmount: 700000 }],
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: 'Proyecto 2',
        totalAmount: 800000,
        currency: 'CLP',
        createdAt: new Date('2024-02-01'),
        paymentAllocations: [{ allocatedAmount: 400000 }],
      },
    ]

    // Pago de $500,000 a distribuir
    const allocations = calculateFIFO(500000, projects)

    // Resultado esperado (ordenado por fecha):
    // P1 (más antiguo): balance 300,000 → recibe 300,000 (cierra)
    // P2: balance 400,000 → recibe 200,000 (abono parcial)
    // P3: no recibe nada (se acabó el dinero)
    expect(allocations).toHaveLength(2)
    expect(allocations[0]).toEqual({
      projectId: 'P1',
      projectNumber: '2024-001',
      projectName: 'Proyecto 1',
      balance: 300000,
      allocatedAmount: 300000,
      isFullyPaid: true,
    })
    expect(allocations[1]).toEqual({
      projectId: 'P2',
      projectNumber: '2024-002',
      projectName: 'Proyecto 2',
      balance: 400000,
      allocatedAmount: 200000,
      isFullyPaid: false,
    })
  })

  it('debe manejar monto mayor que todos los balances', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 500000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [{ allocatedAmount: 300000 }],
      },
    ]

    // Balance P1 = 200,000, pero pago es $500,000
    const allocations = calculateFIFO(500000, projects)

    expect(allocations).toHaveLength(1)
    expect(allocations[0].allocatedAmount).toBe(200000) // Solo lo que necesita
    expect(allocations[0].isFullyPaid).toBe(true)
  })

  it('debe ignorar proyectos ya pagados completamente', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 1000000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [{ allocatedAmount: 1000000 }], // Balance = 0
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        totalAmount: 500000,
        currency: 'CLP',
        createdAt: new Date('2024-02-01'),
        paymentAllocations: [{ allocatedAmount: 200000 }],
      },
    ]

    const allocations = calculateFIFO(300000, projects)

    // P1 skip (balance 0), P2 recibe todo
    expect(allocations).toHaveLength(1)
    expect(allocations[0].projectId).toBe('P2')
    expect(allocations[0].allocatedAmount).toBe(300000)
  })

  it('debe retornar array vacío si no hay proyectos', () => {
    const projects: ProjectWithBalance[] = []

    const allocations = calculateFIFO(500000, projects)

    expect(allocations).toEqual([])
  })

  it('debe retornar array vacío si monto es 0', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 1000000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [{ allocatedAmount: 500000 }],
      },
    ]

    const allocations = calculateFIFO(0, projects)

    expect(allocations).toEqual([])
  })

  it('debe ignorar proyectos con balance negativo (sobrepago previo)', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: 'Proyecto sobrepagado',
        totalAmount: 1000000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [{ allocatedAmount: 1200000 }], // Sobrepago: balance = -200000
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: 'Proyecto pendiente',
        totalAmount: 500000,
        currency: 'CLP',
        createdAt: new Date('2024-02-01'),
        paymentAllocations: [{ allocatedAmount: 200000 }], // Balance = 300000
      },
    ]

    const allocations = calculateFIFO(500000, projects)

    // P1 tiene balance negativo → skip
    // P2 recibe el pago
    expect(allocations).toHaveLength(1)
    expect(allocations[0].projectId).toBe('P2')
    expect(allocations[0].allocatedAmount).toBe(300000)
    expect(allocations[0].isFullyPaid).toBe(true)
  })

  it('debe ordenar correctamente proyectos con misma fecha', () => {
    const sameDate = new Date('2024-01-15')
    const projects: ProjectWithBalance[] = [
      {
        id: 'P-B',
        projectNumber: '2024-002',
        projectName: 'Proyecto B',
        totalAmount: 100000,
        currency: 'CLP',
        createdAt: sameDate,
        paymentAllocations: [],
      },
      {
        id: 'P-A',
        projectNumber: '2024-001',
        projectName: 'Proyecto A',
        totalAmount: 100000,
        currency: 'CLP',
        createdAt: sameDate,
        paymentAllocations: [],
      },
    ]

    const allocations = calculateFIFO(150000, projects)

    // Con misma fecha, el orden se mantiene estable (B antes que A)
    expect(allocations).toHaveLength(2)
    expect(allocations[0].projectId).toBe('P-B')
    expect(allocations[0].allocatedAmount).toBe(100000)
    expect(allocations[1].projectId).toBe('P-A')
    expect(allocations[1].allocatedAmount).toBe(50000)
  })

  it('debe manejar proyecto sin paymentAllocations (undefined)', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: 'Nuevo proyecto',
        totalAmount: 500000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: undefined, // Sin allocations → balance = totalAmount
      },
    ]

    const allocations = calculateFIFO(300000, projects)

    expect(allocations).toHaveLength(1)
    expect(allocations[0].balance).toBe(500000) // Balance completo
    expect(allocations[0].allocatedAmount).toBe(300000)
    expect(allocations[0].isFullyPaid).toBe(false)
  })

  it('debe manejar proyecto con totalAmount null', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: 'Sin monto',
        totalAmount: 0,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [],
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: 'Con monto',
        totalAmount: 500000,
        currency: 'CLP',
        createdAt: new Date('2024-02-01'),
        paymentAllocations: [],
      },
    ]

    const allocations = calculateFIFO(300000, projects)

    // P1 con totalAmount null tiene balance 0 → skip
    // P2 recibe el pago
    expect(allocations).toHaveLength(1)
    expect(allocations[0].projectId).toBe('P2')
    expect(allocations[0].allocatedAmount).toBe(300000)
  })

  it('debe manejar monto negativo (retorna vacío)', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 500000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [],
      },
    ]

    const allocations = calculateFIFO(-100000, projects)

    // Monto negativo → no asigna nada
    expect(allocations).toEqual([])
  })

  it('debe distribuir múltiples proyectos hasta agotar el monto', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 100000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [],
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        totalAmount: 100000,
        currency: 'CLP',
        createdAt: new Date('2024-02-01'),
        paymentAllocations: [],
      },
      {
        id: 'P3',
        projectNumber: '2024-003',
        projectName: null,
        totalAmount: 100000,
        currency: 'CLP',
        createdAt: new Date('2024-03-01'),
        paymentAllocations: [],
      },
      {
        id: 'P4',
        projectNumber: '2024-004',
        projectName: null,
        totalAmount: 100000,
        currency: 'CLP',
        createdAt: new Date('2024-04-01'),
        paymentAllocations: [],
      },
    ]

    // Pago cubre exactamente 3 proyectos
    const allocations = calculateFIFO(300000, projects)

    expect(allocations).toHaveLength(3)
    expect(allocations.every((a) => a.isFullyPaid)).toBe(true)
    expect(allocations.map((a) => a.projectId)).toEqual(['P1', 'P2', 'P3'])
    // P4 no recibe nada
  })

  it('debe manejar montos con decimales (CLP sin centavos)', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 333333,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [{ allocatedAmount: 111111 }],
      },
    ]

    // Balance = 222222
    const allocations = calculateFIFO(222222, projects)

    expect(allocations[0].allocatedAmount).toBe(222222)
    expect(allocations[0].isFullyPaid).toBe(true)
  })
})

describe('validateAllocationsSum', () => {
  it('debe validar suma exacta', () => {
    const allocations = [{ allocatedAmount: 600 }, { allocatedAmount: 400 }]

    const isValid = validateAllocationsSum(1000, allocations)

    expect(isValid).toBe(true)
  })

  it('debe validar dentro de tolerancia (0.01)', () => {
    const allocations = [{ allocatedAmount: 600.01 }, { allocatedAmount: 399.99 }]

    const isValid = validateAllocationsSum(1000, allocations)

    // Suma = 1000.00, tolerancia permite diferencia < 0.01
    expect(isValid).toBe(true)
  })

  it('debe rechazar diferencia significativa', () => {
    const allocations = [{ allocatedAmount: 600 }, { allocatedAmount: 350 }]

    const isValid = validateAllocationsSum(1000, allocations)

    // Suma = 950, diferencia = 50 > tolerancia
    expect(isValid).toBe(false)
  })

  it('debe validar array vacío cuando monto es 0', () => {
    const allocations: Array<{ allocatedAmount: number }> = []

    const isValid = validateAllocationsSum(0, allocations)

    expect(isValid).toBe(true) // 0 === 0
  })

  it('debe rechazar array vacío cuando monto > 0', () => {
    const allocations: Array<{ allocatedAmount: number }> = []

    const isValid = validateAllocationsSum(1000, allocations)

    expect(isValid).toBe(false) // 0 !== 1000
  })

  it('debe manejar una sola allocation', () => {
    const allocations = [{ allocatedAmount: 1000 }]

    const isValid = validateAllocationsSum(1000, allocations)

    expect(isValid).toBe(true)
  })

  it('debe rechazar suma mayor que monto esperado', () => {
    const allocations = [{ allocatedAmount: 600 }, { allocatedAmount: 500 }]

    const isValid = validateAllocationsSum(1000, allocations)

    // Suma = 1100 > 1000
    expect(isValid).toBe(false)
  })

  it('debe manejar muchas allocations pequeñas', () => {
    // 100 allocations de $10 cada una
    const allocations = Array(100).fill({ allocatedAmount: 10 })

    const isValid = validateAllocationsSum(1000, allocations)

    expect(isValid).toBe(true)
  })

  it('debe detectar error acumulativo mayor que tolerancia', () => {
    // 10 allocations con error que se acumula > 0.01
    const allocations = Array(10).fill({ allocatedAmount: 100.002 })

    // Suma real = 1000.02, esperado = 1000
    const isValid = validateAllocationsSum(1000, allocations)

    // Diferencia de 0.02 > tolerancia de 0.01
    expect(isValid).toBe(false)
  })
})

describe('filterProjectsWithBalance', () => {
  it('debe retornar solo proyectos con balance > 0', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 1000,
        currency: 'CLP',
        createdAt: new Date(),
        paymentAllocations: [{ allocatedAmount: 500 }], // balance: 500
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        totalAmount: 800,
        currency: 'CLP',
        createdAt: new Date(),
        paymentAllocations: [{ allocatedAmount: 800 }], // balance: 0
      },
      {
        id: 'P3',
        projectNumber: '2024-003',
        projectName: null,
        totalAmount: 1200,
        currency: 'CLP',
        createdAt: new Date(),
        paymentAllocations: [], // balance: 1200
      },
    ]

    const filtered = filterProjectsWithBalance(projects)

    expect(filtered).toHaveLength(2)
    expect(filtered.map((p) => p.id)).toEqual(['P1', 'P3'])
  })

  it('debe retornar array vacío si todos están pagados', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 1000,
        currency: 'CLP',
        createdAt: new Date(),
        paymentAllocations: [{ allocatedAmount: 1000 }],
      },
    ]

    const filtered = filterProjectsWithBalance(projects)

    expect(filtered).toEqual([])
  })

  it('debe excluir proyectos con balance negativo (sobrepagos)', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 1000,
        currency: 'CLP',
        createdAt: new Date(),
        paymentAllocations: [{ allocatedAmount: 1500 }], // Sobrepago: balance = -500
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        totalAmount: 800,
        currency: 'CLP',
        createdAt: new Date(),
        paymentAllocations: [{ allocatedAmount: 300 }], // balance: 500
      },
    ]

    const filtered = filterProjectsWithBalance(projects)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('P2')
  })

  it('debe manejar array vacío', () => {
    const projects: ProjectWithBalance[] = []

    const filtered = filterProjectsWithBalance(projects)

    expect(filtered).toEqual([])
  })

  it('debe manejar proyectos sin paymentAllocations', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 1000,
        currency: 'CLP',
        createdAt: new Date(),
        paymentAllocations: undefined, // Sin allocations → balance = totalAmount
      },
    ]

    const filtered = filterProjectsWithBalance(projects)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('P1')
  })

  it('debe excluir proyectos con totalAmount null', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 0, // Sin monto → balance = 0
        currency: 'CLP',
        createdAt: new Date(),
        paymentAllocations: [],
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        totalAmount: 1000,
        currency: 'CLP',
        createdAt: new Date(),
        paymentAllocations: [],
      },
    ]

    const filtered = filterProjectsWithBalance(projects)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('P2')
  })

  it('debe mantener orden original de proyectos', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P3',
        projectNumber: '2024-003',
        projectName: null,
        totalAmount: 1000,
        currency: 'CLP',
        createdAt: new Date('2024-03-01'),
        paymentAllocations: [],
      },
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        totalAmount: 1000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        paymentAllocations: [],
      },
    ]

    const filtered = filterProjectsWithBalance(projects)

    // Mantiene orden original, no ordena por fecha
    expect(filtered.map((p) => p.id)).toEqual(['P3', 'P1'])
  })
})
