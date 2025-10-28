/**
 * Tests para payment-transformers
 *
 * Testean pure functions sin necesidad de mocks
 */

import { describe, it, expect } from 'vitest'
import {
  extractProjectAllocations,
  sortAllocationsByDate,
  processProjectPayments,
} from '../payment-transformers'
import type { PaymentFromAPI } from '@/lib/types/payment.types'

// ============================================
// Mock Data
// ============================================

const mockPayments: PaymentFromAPI[] = [
  {
    id: 'payment-1',
    amount: 1000,
    currency: 'CLP',
    date: '2025-01-15T00:00:00Z',
    type: 'Project',
    reference: null,
    notes: 'Primer pago',
    customer: { id: 'customer-1', name: 'John Doe', phone: '+56912345678' },
    paymentMethod: { id: 'method-1', name: 'Efectivo', icon: 'banknote' },
    allocations: [
      {
        id: 'alloc-1',
        allocatedAmount: 500,
        project: {
          id: 'project-A',
          projectNumber: 'P 0001-2025',
          projectName: 'Project A',
          currency: 'CLP',
        },
      },
      {
        id: 'alloc-2',
        allocatedAmount: 500,
        project: {
          id: 'project-B',
          projectNumber: 'P 0002-2025',
          projectName: 'Project B',
          currency: 'CLP',
        },
      },
    ],
  },
  {
    id: 'payment-2',
    amount: 2000,
    currency: 'CLP',
    date: '2025-01-20T00:00:00Z',
    type: 'Customer',
    reference: 'REF-123',
    notes: null,
    customer: { id: 'customer-1', name: 'John Doe', phone: '+56912345678' },
    paymentMethod: { id: 'method-2', name: 'Transferencia', icon: 'credit-card' },
    allocations: [
      {
        id: 'alloc-3',
        allocatedAmount: 2000,
        project: {
          id: 'project-A',
          projectNumber: 'P 0001-2025',
          projectName: 'Project A',
          currency: 'CLP',
        },
      },
    ],
  },
  {
    id: 'payment-3',
    amount: 1500,
    currency: 'CLP',
    date: '2025-01-10T00:00:00Z',
    type: 'Project',
    reference: null,
    notes: 'Pago inicial',
    customer: { id: 'customer-1', name: 'John Doe', phone: '+56912345678' },
    paymentMethod: { id: 'method-1', name: 'Efectivo', icon: 'banknote' },
    allocations: [
      {
        id: 'alloc-4',
        allocatedAmount: 1500,
        project: {
          id: 'project-A',
          projectNumber: 'P 0001-2025',
          projectName: 'Project A',
          currency: 'CLP',
        },
      },
    ],
  },
]

// ============================================
// Tests
// ============================================

describe('payment-transformers', () => {
  describe('extractProjectAllocations', () => {
    it('debe extraer allocations de un proyecto específico', () => {
      const result = extractProjectAllocations(mockPayments, 'project-A')

      // Debe retornar 3 allocations (de 3 pagos diferentes)
      expect(result).toHaveLength(3)
      expect(result[0].allocatedAmount).toBe(500)
      expect(result[1].allocatedAmount).toBe(2000)
      expect(result[2].allocatedAmount).toBe(1500)
    })

    it('debe retornar array vacío si no hay allocations del proyecto', () => {
      const result = extractProjectAllocations(mockPayments, 'project-Z')
      expect(result).toEqual([])
    })

    it('debe incluir datos completos del payment', () => {
      const result = extractProjectAllocations(mockPayments, 'project-A')

      // Verificar que la primera allocation tiene toda la info del pago
      expect(result[0].payment).toMatchObject({
        id: 'payment-1',
        amount: 1000,
        currency: 'CLP',
        date: '2025-01-15T00:00:00Z',
        type: 'Project',
        notes: 'Primer pago',
        customer: { id: 'customer-1', name: 'John Doe' },
        paymentMethod: { id: 'method-1', name: 'Efectivo' },
      })
    })

    it('debe filtrar correctamente por projectId', () => {
      const resultA = extractProjectAllocations(mockPayments, 'project-A')
      const resultB = extractProjectAllocations(mockPayments, 'project-B')

      expect(resultA).toHaveLength(3)
      expect(resultB).toHaveLength(1)

      // Verificar que project-B solo tiene la allocation correcta
      expect(resultB[0].id).toBe('alloc-2')
      expect(resultB[0].allocatedAmount).toBe(500)
    })
  })

  describe('sortAllocationsByDate', () => {
    it('debe ordenar ascendente por defecto (cronológico)', () => {
      const unsorted = extractProjectAllocations(mockPayments, 'project-A')
      const sorted = sortAllocationsByDate(unsorted)

      // Orden esperado: 2025-01-10, 2025-01-15, 2025-01-20
      expect(sorted[0].payment.date).toBe('2025-01-10T00:00:00Z')
      expect(sorted[1].payment.date).toBe('2025-01-15T00:00:00Z')
      expect(sorted[2].payment.date).toBe('2025-01-20T00:00:00Z')
    })

    it('debe ordenar descendente cuando se especifica', () => {
      const unsorted = extractProjectAllocations(mockPayments, 'project-A')
      const sorted = sortAllocationsByDate(unsorted, 'desc')

      // Orden esperado: 2025-01-20, 2025-01-15, 2025-01-10
      expect(sorted[0].payment.date).toBe('2025-01-20T00:00:00Z')
      expect(sorted[1].payment.date).toBe('2025-01-15T00:00:00Z')
      expect(sorted[2].payment.date).toBe('2025-01-10T00:00:00Z')
    })

    it('no debe mutar el array original', () => {
      const original = extractProjectAllocations(mockPayments, 'project-A')
      const originalCopy = [...original]

      sortAllocationsByDate(original, 'desc')

      // El array original debe permanecer sin cambios
      expect(original).toEqual(originalCopy)
    })

    it('debe manejar array vacío correctamente', () => {
      const result = sortAllocationsByDate([])
      expect(result).toEqual([])
    })
  })

  describe('processProjectPayments', () => {
    it('debe extraer y ordenar en un solo paso (ascendente)', () => {
      const result = processProjectPayments(mockPayments, 'project-A', 'asc')

      expect(result).toHaveLength(3)
      // Verificar orden cronológico
      expect(result[0].payment.date).toBe('2025-01-10T00:00:00Z')
      expect(result[1].payment.date).toBe('2025-01-15T00:00:00Z')
      expect(result[2].payment.date).toBe('2025-01-20T00:00:00Z')
    })

    it('debe usar orden ascendente por defecto', () => {
      const result = processProjectPayments(mockPayments, 'project-A')

      // Mismo resultado que con 'asc' explícito
      expect(result[0].payment.date).toBe('2025-01-10T00:00:00Z')
      expect(result[2].payment.date).toBe('2025-01-20T00:00:00Z')
    })

    it('debe retornar array vacío para proyecto sin pagos', () => {
      const result = processProjectPayments(mockPayments, 'project-Z')
      expect(result).toEqual([])
    })
  })
})
