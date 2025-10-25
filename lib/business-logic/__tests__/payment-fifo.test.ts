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
})
