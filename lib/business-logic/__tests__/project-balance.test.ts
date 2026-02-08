/**
 * Tests para lib/business-logic/project-balance.ts
 *
 * Valida:
 * - calculateProjectBalance()
 * - getTotalPendingBalance()
 */

import { describe, it, expect } from 'vitest'
import {
  calculateProjectBalance,
  derivePaymentProgress,
  getTotalPendingBalance,
} from '../project-balance'

describe('calculateProjectBalance', () => {
  it('debe calcular balance correcto con allocations', () => {
    const project = {
      totalAmount: 1000000,
      allocations: [
        { allocatedAmount: 300000 },
        { allocatedAmount: 250000 },
        { allocatedAmount: 150000 },
      ],
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(700000)
    expect(result.balance).toBe(300000)
    expect(result.percentPaid).toBe(70)
    expect(result.isFullyPaid).toBe(false)
  })

  it('debe manejar proyecto sin allocations', () => {
    const project = {
      totalAmount: 1000000,
      allocations: undefined,
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(0)
    expect(result.balance).toBe(1000000)
    expect(result.percentPaid).toBe(0)
    expect(result.isFullyPaid).toBe(false)
  })

  it('debe marcar isFullyPaid cuando balance = 0', () => {
    const project = {
      totalAmount: 1000000,
      allocations: [{ allocatedAmount: 1000000 }],
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(1000000)
    expect(result.balance).toBe(0)
    expect(result.percentPaid).toBe(100)
    expect(result.isFullyPaid).toBe(true)
  })

  it('debe manejar sobrepago (balance negativo)', () => {
    const project = {
      totalAmount: 1000000,
      allocations: [{ allocatedAmount: 1200000 }],
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(1200000)
    expect(result.balance).toBe(-200000)
    expect(result.percentPaid).toBe(120)
    expect(result.isFullyPaid).toBe(true)
  })

  it('debe manejar totalAmount null', () => {
    const project = {
      totalAmount: null,
      allocations: [{ allocatedAmount: 500000 }],
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(500000)
    expect(result.balance).toBe(-500000)
    expect(result.percentPaid).toBe(0) // División por 0 → 0
    expect(result.isFullyPaid).toBe(true) // balance negativo → fully paid
  })

  it('debe manejar totalAmount null sin allocations', () => {
    const project = {
      totalAmount: null,
      allocations: [],
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(0)
    expect(result.balance).toBe(0) // null → 0
    expect(result.percentPaid).toBe(0)
    expect(result.isFullyPaid).toBe(true) // balance 0 → fully paid
  })

  it('debe manejar allocations con montos decimales', () => {
    const project = {
      totalAmount: 1000.00,
      allocations: [
        { allocatedAmount: 333.33 },
        { allocatedAmount: 333.33 },
        { allocatedAmount: 333.34 },
      ],
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(1000)
    expect(result.balance).toBeCloseTo(0, 2)
    expect(result.isFullyPaid).toBe(true)
  })

  it('debe calcular percentPaid mayor a 100 en sobrepago', () => {
    const project = {
      totalAmount: 100000,
      allocations: [{ allocatedAmount: 150000 }],
    }

    const result = calculateProjectBalance(project)

    expect(result.percentPaid).toBe(150)
    expect(result.isFullyPaid).toBe(true)
  })

  it('debe manejar totalAmount 0', () => {
    const project = {
      totalAmount: 0,
      allocations: [{ allocatedAmount: 100 }],
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(100)
    expect(result.balance).toBe(-100)
    expect(result.percentPaid).toBe(0) // División por 0 evitada
    expect(result.isFullyPaid).toBe(true)
  })

  it('debe manejar muchas allocations', () => {
    const project = {
      totalAmount: 1000000,
      allocations: Array(100).fill({ allocatedAmount: 10000 }),
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(1000000)
    expect(result.balance).toBe(0)
    expect(result.isFullyPaid).toBe(true)
  })

  it('debe manejar montos muy grandes', () => {
    const project = {
      totalAmount: 999999999999,
      allocations: [{ allocatedAmount: 500000000000 }],
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(500000000000)
    expect(result.balance).toBe(499999999999)
    expect(result.percentPaid).toBeCloseTo(50, 0)
    expect(result.isFullyPaid).toBe(false)
  })

  it('debe manejar montos muy pequeños', () => {
    const project = {
      totalAmount: 0.01,
      allocations: [{ allocatedAmount: 0.005 }],
    }

    const result = calculateProjectBalance(project)

    expect(result.totalPaid).toBe(0.005)
    expect(result.balance).toBeCloseTo(0.005, 5)
    expect(result.percentPaid).toBe(50)
    expect(result.isFullyPaid).toBe(false)
  })
})

describe('derivePaymentProgress', () => {
  it('debe derivar progreso normal', () => {
    const result = derivePaymentProgress(1000000, 300000)

    expect(result.totalPaid).toBe(700000)
    expect(result.percentPaid).toBe(70)
    expect(result.isFullyPaid).toBe(false)
  })

  it('debe marcar isFullyPaid cuando balance = 0', () => {
    const result = derivePaymentProgress(1000000, 0)

    expect(result.totalPaid).toBe(1000000)
    expect(result.percentPaid).toBe(100)
    expect(result.isFullyPaid).toBe(true)
  })

  it('debe manejar sobrepago (balance negativo)', () => {
    const result = derivePaymentProgress(1000000, -200000)

    expect(result.totalPaid).toBe(1200000)
    expect(result.percentPaid).toBe(120)
    expect(result.isFullyPaid).toBe(true)
  })

  it('debe manejar total = 0', () => {
    const result = derivePaymentProgress(0, 0)

    expect(result.totalPaid).toBe(0)
    expect(result.percentPaid).toBe(0)
    expect(result.isFullyPaid).toBe(true)
  })
})

describe('getTotalPendingBalance', () => {
  it('debe sumar solo balances positivos', () => {
    const projects = [
      {
        totalAmount: 1000000,
        paymentAllocations: [{ allocatedAmount: 600000, payment: { status: 'ACTIVE' } }],
      },
      {
        totalAmount: 500000,
        paymentAllocations: [{ allocatedAmount: 500000, payment: { status: 'ACTIVE' } }], // Balance 0
      },
      {
        totalAmount: 2000000,
        paymentAllocations: [{ allocatedAmount: 800000, payment: { status: 'ACTIVE' } }],
      },
    ]

    const totalPending = getTotalPendingBalance(projects)

    // P1: 400,000 (pendiente) ✅
    // P2: 0 (pagado) ❌ no suma
    // P3: 1,200,000 (pendiente) ✅
    expect(totalPending).toBe(1600000)
  })

  it('debe ignorar proyectos con balance negativo (sobrepagos)', () => {
    const projects = [
      {
        totalAmount: 1000000,
        paymentAllocations: [{ allocatedAmount: 1200000, payment: { status: 'ACTIVE' } }], // Sobrepago
      },
      {
        totalAmount: 500000,
        paymentAllocations: [{ allocatedAmount: 300000, payment: { status: 'ACTIVE' } }],
      },
    ]

    const totalPending = getTotalPendingBalance(projects)

    // P1: -200,000 (sobrepago) → Math.max(0, -200000) = 0 ❌
    // P2: 200,000 (pendiente) ✅
    expect(totalPending).toBe(200000)
  })

  it('debe retornar 0 si todos los proyectos están pagados', () => {
    const projects = [
      {
        totalAmount: 1000000,
        paymentAllocations: [{ allocatedAmount: 1000000, payment: { status: 'ACTIVE' } }],
      },
      {
        totalAmount: 500000,
        paymentAllocations: [{ allocatedAmount: 500000, payment: { status: 'ACTIVE' } }],
      },
    ]

    const totalPending = getTotalPendingBalance(projects)

    expect(totalPending).toBe(0)
  })

  it('debe manejar array vacío', () => {
    const projects: any[] = []

    const totalPending = getTotalPendingBalance(projects)

    expect(totalPending).toBe(0)
  })
})
