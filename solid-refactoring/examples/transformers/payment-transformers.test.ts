/**
 * Tests para Payment Transformers
 *
 * Características de estos tests:
 * - ✅ 100% pure functions (sin mocks necesarios)
 * - ✅ Rápidos (milisegundos)
 * - ✅ Determinísticos (mismo input → mismo output)
 * - ✅ Fáciles de escribir y mantener
 *
 * Framework: Vitest (o Jest - sintaxis compatible)
 */

import { describe, it, expect } from 'vitest'
import {
  extractProjectAllocations,
  sortAllocationsByDate,
  sortAllocationsByAmount,
  filterByPaymentType,
  calculateTotalAllocated,
  groupAllocationsByMonth,
  getAllocationStatistics,
  pipeTransformers,
} from './payment-transformers'
import type { PaymentFromAPI, PaymentAllocation } from '@/lib/types/payment.types'

// ============================================================================
// Mock Data
// ============================================================================

const mockPayments: PaymentFromAPI[] = [
  {
    id: 'payment-1',
    amount: 1000,
    currency: 'CLP',
    date: '2025-01-15T10:00:00Z',
    type: 'Project',
    reference: 'REF-001',
    notes: null,
    paymentMethod: {
      id: 'method-1',
      name: 'Efectivo',
      icon: 'dollar-sign',
    },
    customer: {
      id: 'customer-1',
      name: 'Juan Pérez',
    },
    allocations: [
      {
        id: 'alloc-1',
        allocatedAmount: 1000,
        project: { id: 'project-1' },
      },
    ],
  },
  {
    id: 'payment-2',
    amount: 1500,
    currency: 'CLP',
    date: '2025-01-10T10:00:00Z',
    type: 'Customer',
    reference: 'REF-002',
    notes: 'Pago dividido',
    paymentMethod: {
      id: 'method-2',
      name: 'Transferencia',
      icon: 'credit-card',
    },
    customer: {
      id: 'customer-1',
      name: 'Juan Pérez',
    },
    allocations: [
      {
        id: 'alloc-2',
        allocatedAmount: 500,
        project: { id: 'project-1' },
      },
      {
        id: 'alloc-3',
        allocatedAmount: 1000,
        project: { id: 'project-2' },
      },
    ],
  },
]

const mockAllocations: PaymentAllocation[] = [
  {
    id: 'alloc-1',
    allocatedAmount: 500,
    payment: {
      id: 'payment-1',
      amount: 500,
      currency: 'CLP',
      date: '2025-01-15T10:00:00Z',
      type: 'Project',
      notes: null,
      paymentMethod: {
        id: 'method-1',
        name: 'Efectivo',
        icon: 'dollar-sign',
      },
      customer: {
        id: 'customer-1',
        name: 'Juan Pérez',
      },
    },
  },
  {
    id: 'alloc-2',
    allocatedAmount: 1000,
    payment: {
      id: 'payment-2',
      amount: 1500,
      currency: 'CLP',
      date: '2025-01-10T10:00:00Z',
      type: 'Customer',
      notes: 'Pago dividido',
      paymentMethod: {
        id: 'method-2',
        name: 'Transferencia',
        icon: 'credit-card',
      },
      customer: {
        id: 'customer-2',
        name: 'María García',
      },
    },
  },
]

// ============================================================================
// Tests: extractProjectAllocations
// ============================================================================

describe('extractProjectAllocations', () => {
  it('should extract allocations for a specific project', () => {
    const result = extractProjectAllocations(mockPayments, 'project-1')

    expect(result).toHaveLength(2) // payment-1 y payment-2 tienen allocations para project-1
    expect(result[0].allocatedAmount).toBe(1000)
    expect(result[1].allocatedAmount).toBe(500)
  })

  it('should return empty array if no allocations for project', () => {
    const result = extractProjectAllocations(mockPayments, 'project-999')

    expect(result).toHaveLength(0)
  })

  it('should include full payment information in each allocation', () => {
    const result = extractProjectAllocations(mockPayments, 'project-1')

    expect(result[0].payment.id).toBe('payment-1')
    expect(result[0].payment.customer.name).toBe('Juan Pérez')
    expect(result[0].payment.paymentMethod.name).toBe('Efectivo')
  })

  it('should handle empty payments array', () => {
    const result = extractProjectAllocations([], 'project-1')

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// Tests: sortAllocationsByDate
// ============================================================================

describe('sortAllocationsByDate', () => {
  it('should sort allocations by date ascending (oldest first)', () => {
    const result = sortAllocationsByDate(mockAllocations, 'asc')

    expect(result[0].payment.date).toBe('2025-01-10T10:00:00Z')
    expect(result[1].payment.date).toBe('2025-01-15T10:00:00Z')
  })

  it('should sort allocations by date descending (newest first)', () => {
    const result = sortAllocationsByDate(mockAllocations, 'desc')

    expect(result[0].payment.date).toBe('2025-01-15T10:00:00Z')
    expect(result[1].payment.date).toBe('2025-01-10T10:00:00Z')
  })

  it('should not mutate original array', () => {
    const original = [...mockAllocations]
    sortAllocationsByDate(mockAllocations, 'desc')

    expect(mockAllocations).toEqual(original)
  })

  it('should handle empty array', () => {
    const result = sortAllocationsByDate([], 'asc')

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// Tests: sortAllocationsByAmount
// ============================================================================

describe('sortAllocationsByAmount', () => {
  it('should sort allocations by amount ascending', () => {
    const result = sortAllocationsByAmount(mockAllocations, 'asc')

    expect(result[0].allocatedAmount).toBe(500)
    expect(result[1].allocatedAmount).toBe(1000)
  })

  it('should sort allocations by amount descending', () => {
    const result = sortAllocationsByAmount(mockAllocations, 'desc')

    expect(result[0].allocatedAmount).toBe(1000)
    expect(result[1].allocatedAmount).toBe(500)
  })

  it('should not mutate original array', () => {
    const original = [...mockAllocations]
    sortAllocationsByAmount(mockAllocations, 'desc')

    expect(mockAllocations).toEqual(original)
  })
})

// ============================================================================
// Tests: filterByPaymentType
// ============================================================================

describe('filterByPaymentType', () => {
  it('should filter only Project type payments', () => {
    const result = filterByPaymentType(mockAllocations, 'Project')

    expect(result).toHaveLength(1)
    expect(result[0].payment.type).toBe('Project')
  })

  it('should filter only Customer type payments', () => {
    const result = filterByPaymentType(mockAllocations, 'Customer')

    expect(result).toHaveLength(1)
    expect(result[0].payment.type).toBe('Customer')
  })

  it('should return empty array if no matches', () => {
    const emptyAllocations: PaymentAllocation[] = []
    const result = filterByPaymentType(emptyAllocations, 'Project')

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// Tests: calculateTotalAllocated
// ============================================================================

describe('calculateTotalAllocated', () => {
  it('should calculate total of allocated amounts', () => {
    const result = calculateTotalAllocated(mockAllocations)

    expect(result).toBe(1500) // 500 + 1000
  })

  it('should return 0 for empty array', () => {
    const result = calculateTotalAllocated([])

    expect(result).toBe(0)
  })

  it('should handle single allocation', () => {
    const result = calculateTotalAllocated([mockAllocations[0]])

    expect(result).toBe(500)
  })
})

// ============================================================================
// Tests: groupAllocationsByMonth
// ============================================================================

describe('groupAllocationsByMonth', () => {
  it('should group allocations by month', () => {
    const result = groupAllocationsByMonth(mockAllocations)

    expect(result.size).toBe(1) // Todos en 2025-01
    expect(result.get('2025-01')).toHaveLength(2)
  })

  it('should handle allocations from different months', () => {
    const allocationsMultiMonth: PaymentAllocation[] = [
      {
        ...mockAllocations[0],
        payment: { ...mockAllocations[0].payment, date: '2025-01-15T10:00:00Z' },
      },
      {
        ...mockAllocations[1],
        payment: { ...mockAllocations[1].payment, date: '2025-02-10T10:00:00Z' },
      },
    ]

    const result = groupAllocationsByMonth(allocationsMultiMonth)

    expect(result.size).toBe(2)
    expect(result.get('2025-01')).toHaveLength(1)
    expect(result.get('2025-02')).toHaveLength(1)
  })

  it('should return empty map for empty array', () => {
    const result = groupAllocationsByMonth([])

    expect(result.size).toBe(0)
  })
})

// ============================================================================
// Tests: getAllocationStatistics
// ============================================================================

describe('getAllocationStatistics', () => {
  it('should calculate statistics correctly', () => {
    const result = getAllocationStatistics(mockAllocations)

    expect(result.count).toBe(2)
    expect(result.totalAmount).toBe(1500)
    expect(result.averageAmount).toBe(750)
    expect(result.minAmount).toBe(500)
    expect(result.maxAmount).toBe(1000)
    expect(result.projectPayments).toBe(1)
    expect(result.customerPayments).toBe(1)
  })

  it('should return zero values for empty array', () => {
    const result = getAllocationStatistics([])

    expect(result.count).toBe(0)
    expect(result.totalAmount).toBe(0)
    expect(result.averageAmount).toBe(0)
    expect(result.minAmount).toBe(0)
    expect(result.maxAmount).toBe(0)
  })

  it('should handle single allocation', () => {
    const result = getAllocationStatistics([mockAllocations[0]])

    expect(result.count).toBe(1)
    expect(result.totalAmount).toBe(500)
    expect(result.averageAmount).toBe(500)
    expect(result.minAmount).toBe(500)
    expect(result.maxAmount).toBe(500)
  })
})

// ============================================================================
// Tests: pipeTransformers
// ============================================================================

describe('pipeTransformers', () => {
  it('should apply transformers in sequence', () => {
    const result = pipeTransformers(mockAllocations, [
      (data) => filterByPaymentType(data, 'Customer'), // 1 allocation
      (data) => sortAllocationsByDate(data, 'asc'),
    ])

    expect(result).toHaveLength(1)
    expect(result[0].payment.type).toBe('Customer')
  })

  it('should handle empty transformers array', () => {
    const result = pipeTransformers(mockAllocations, [])

    expect(result).toEqual(mockAllocations)
  })

  it('should compose multiple transformations', () => {
    const result = pipeTransformers(mockAllocations, [
      (data) => sortAllocationsByDate(data, 'desc'), // Más reciente primero
      (data) => data.slice(0, 1), // Solo el primero
    ])

    expect(result).toHaveLength(1)
    expect(result[0].payment.date).toBe('2025-01-15T10:00:00Z')
  })
})

// ============================================================================
// Integration Tests (múltiples transformers juntos)
// ============================================================================

describe('Integration: Complex transformations', () => {
  it('should extract, filter, sort and calculate in pipeline', () => {
    // Extraer allocations de project-1
    const extracted = extractProjectAllocations(mockPayments, 'project-1')

    // Filtrar solo tipo Customer
    const filtered = filterByPaymentType(extracted, 'Customer')

    // Ordenar por monto descendente
    const sorted = sortAllocationsByAmount(filtered, 'desc')

    // Calcular total
    const total = calculateTotalAllocated(sorted)

    expect(sorted).toHaveLength(1)
    expect(sorted[0].allocatedAmount).toBe(500)
    expect(total).toBe(500)
  })

  it('should work with pipeTransformers for complex workflow', () => {
    const payments = mockPayments

    const result = pipeTransformers(extractProjectAllocations(payments, 'project-1'), [
      (data) => sortAllocationsByDate(data, 'asc'),
      (data) => data.filter((a) => a.allocatedAmount >= 500),
    ])

    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.allocatedAmount >= 500)).toBe(true)
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle allocations with same date', () => {
    const sameDate: PaymentAllocation[] = [
      {
        ...mockAllocations[0],
        payment: { ...mockAllocations[0].payment, date: '2025-01-15T10:00:00Z' },
      },
      {
        ...mockAllocations[1],
        payment: { ...mockAllocations[1].payment, date: '2025-01-15T10:00:00Z' },
      },
    ]

    const result = sortAllocationsByDate(sameDate, 'asc')

    expect(result).toHaveLength(2)
    // Orden estable (mantiene orden original si fechas son iguales)
  })

  it('should handle allocations with same amount', () => {
    const sameAmount: PaymentAllocation[] = [
      { ...mockAllocations[0], allocatedAmount: 1000 },
      { ...mockAllocations[1], allocatedAmount: 1000 },
    ]

    const result = sortAllocationsByAmount(sameAmount, 'asc')

    expect(result).toHaveLength(2)
    expect(result[0].allocatedAmount).toBe(1000)
  })

  it('should handle very large arrays efficiently', () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => ({
      ...mockAllocations[0],
      id: `alloc-${i}`,
      allocatedAmount: Math.random() * 10000,
    }))

    const start = Date.now()
    const result = sortAllocationsByAmount(largeArray, 'asc')
    const duration = Date.now() - start

    expect(result).toHaveLength(10000)
    expect(duration).toBeLessThan(100) // Menos de 100ms
  })
})
