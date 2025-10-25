/**
 * Tests para lib/business-logic/project-balance.ts
 *
 * Valida:
 * - calculateProjectBalance()
 * - getTotalPendingBalance()
 */

import { describe, it, expect } from 'vitest'
import { calculateProjectBalance, getTotalPendingBalance } from '../project-balance'

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
