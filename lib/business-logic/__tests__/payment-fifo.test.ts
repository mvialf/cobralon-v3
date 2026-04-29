/**
 * Tests para lib/business-logic/payment-fifo.ts
 *
 * Valida:
 * - calculateFIFO()
 * - filterProjectsWithBalance()
 *
 * Tests de validateAllocationsSum viven en
 * lib/validations/__tests__/payment-business-rules.test.ts (fuente única).
 */

import { describe, it, expect } from 'vitest'
import { calculateFIFO, filterProjectsWithBalance } from '../payment-fifo'
import type { ProjectWithBalance } from '../payment-fifo'

describe('calculateFIFO', () => {
  it('debe distribuir pago entre proyectos ordenados por fecha (FIFO)', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P3',
        projectNumber: '2024-003',
        projectName: 'Proyecto 3',
        balance: 200000, // totalAmount 500000 - paid 300000
        createdAt: new Date('2024-03-01'),
      },
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: 'Proyecto 1',
        balance: 300000, // totalAmount 1000000 - paid 700000
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: 'Proyecto 2',
        balance: 400000, // totalAmount 800000 - paid 400000
        createdAt: new Date('2024-02-01'),
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
        balance: 200000, // totalAmount 500000 - paid 300000
        createdAt: new Date('2024-01-01'),
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
        balance: 0, // Pagado completamente
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        balance: 300000, // totalAmount 500000 - paid 200000
        createdAt: new Date('2024-02-01'),
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
        balance: 500000,
        createdAt: new Date('2024-01-01'),
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
        balance: -200000, // Sobrepago
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: 'Proyecto pendiente',
        balance: 300000, // totalAmount 500000 - paid 200000
        createdAt: new Date('2024-02-01'),
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
        balance: 100000,
        createdAt: sameDate,
      },
      {
        id: 'P-A',
        projectNumber: '2024-001',
        projectName: 'Proyecto A',
        balance: 100000,
        createdAt: sameDate,
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

  it('debe manejar proyecto con balance completo (sin pagos previos)', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: 'Nuevo proyecto',
        balance: 500000, // Sin pagos previos, balance = totalAmount
        createdAt: new Date('2024-01-01'),
      },
    ]

    const allocations = calculateFIFO(300000, projects)

    expect(allocations).toHaveLength(1)
    expect(allocations[0].balance).toBe(500000)
    expect(allocations[0].allocatedAmount).toBe(300000)
    expect(allocations[0].isFullyPaid).toBe(false)
  })

  it('debe manejar proyecto con balance 0', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: 'Sin monto',
        balance: 0,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: 'Con monto',
        balance: 500000,
        createdAt: new Date('2024-02-01'),
      },
    ]

    const allocations = calculateFIFO(300000, projects)

    // P1 con balance 0 → skip
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
        balance: 500000,
        createdAt: new Date('2024-01-01'),
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
        balance: 100000,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        balance: 100000,
        createdAt: new Date('2024-02-01'),
      },
      {
        id: 'P3',
        projectNumber: '2024-003',
        projectName: null,
        balance: 100000,
        createdAt: new Date('2024-03-01'),
      },
      {
        id: 'P4',
        projectNumber: '2024-004',
        projectName: null,
        balance: 100000,
        createdAt: new Date('2024-04-01'),
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
        balance: 222222, // totalAmount 333333 - paid 111111
        createdAt: new Date('2024-01-01'),
      },
    ]

    const allocations = calculateFIFO(222222, projects)

    expect(allocations[0].allocatedAmount).toBe(222222)
    expect(allocations[0].isFullyPaid).toBe(true)
  })
})

describe('filterProjectsWithBalance', () => {
  it('debe retornar solo proyectos con balance > 0', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        balance: 500,
        createdAt: new Date(),
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        balance: 0, // Pagado
        createdAt: new Date(),
      },
      {
        id: 'P3',
        projectNumber: '2024-003',
        projectName: null,
        balance: 1200,
        createdAt: new Date(),
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
        balance: 0,
        createdAt: new Date(),
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
        balance: -500, // Sobrepago
        createdAt: new Date(),
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        balance: 500,
        createdAt: new Date(),
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

  it('debe manejar proyectos con balance completo (sin pagos previos)', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        balance: 1000,
        createdAt: new Date(),
      },
    ]

    const filtered = filterProjectsWithBalance(projects)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('P1')
  })

  it('debe excluir proyectos con balance 0', () => {
    const projects: ProjectWithBalance[] = [
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        balance: 0,
        createdAt: new Date(),
      },
      {
        id: 'P2',
        projectNumber: '2024-002',
        projectName: null,
        balance: 1000,
        createdAt: new Date(),
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
        balance: 1000,
        createdAt: new Date('2024-03-01'),
      },
      {
        id: 'P1',
        projectNumber: '2024-001',
        projectName: null,
        balance: 1000,
        createdAt: new Date('2024-01-01'),
      },
    ]

    const filtered = filterProjectsWithBalance(projects)

    // Mantiene orden original, no ordena por fecha
    expect(filtered.map((p) => p.id)).toEqual(['P3', 'P1'])
  })
})
