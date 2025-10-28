// lib/transformers/__tests__/payment-transformers.test.ts

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
    notes: null,
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
    type: 'Project',
    reference: null,
    notes: null,
    customer: { id: 'customer-1', name: 'John Doe', phone: '+56912345678' },
    paymentMethod: { id: 'method-1', name: 'Efectivo', icon: 'banknote' },
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
    notes: null,
    customer: { id: 'customer-2', name: 'Jane Smith', phone: '+56987654321' },
    paymentMethod: { id: 'method-2', name: 'Transferencia', icon: 'building' },
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

      // Project A tiene 3 allocations (alloc-1, alloc-3, alloc-4)
      expect(result).toHaveLength(3)
      expect(result[0].allocatedAmount).toBe(500) // alloc-1
      expect(result[1].allocatedAmount).toBe(2000) // alloc-3
      expect(result[2].allocatedAmount).toBe(1500) // alloc-4
    })

    it('debe retornar array vacío si no hay allocations para el proyecto', () => {
      const result = extractProjectAllocations(mockPayments, 'project-Z')
      expect(result).toEqual([])
    })

    it('debe incluir todos los datos del payment', () => {
      const result = extractProjectAllocations(mockPayments, 'project-A')

      expect(result[0].payment).toMatchObject({
        id: 'payment-1',
        amount: 1000,
        currency: 'CLP',
        date: '2025-01-15T00:00:00Z',
        type: 'Project',
        customer: { id: 'customer-1', name: 'John Doe' },
        paymentMethod: { id: 'method-1', name: 'Efectivo' },
      })
    })

    it('debe manejar pagos sin allocations para el proyecto', () => {
      const paymentsWithoutTarget: PaymentFromAPI[] = [
        {
          ...mockPayments[0],
          allocations: [
            {
              id: 'alloc-x',
              allocatedAmount: 100,
              project: {
                id: 'project-X',
                projectNumber: 'P 0099-2025',
                projectName: 'Other Project',
                currency: 'CLP',
              },
            },
          ],
        },
      ]

      const result = extractProjectAllocations(paymentsWithoutTarget, 'project-A')
      expect(result).toEqual([])
    })
  })

  describe('sortAllocationsByDate', () => {
    it('debe ordenar ascendente por defecto (más antiguo primero)', () => {
      const unsorted = extractProjectAllocations(mockPayments, 'project-A')
      const sorted = sortAllocationsByDate(unsorted)

      // Orden esperado: Jan 10 → Jan 15 → Jan 20
      expect(sorted[0].payment.date).toBe('2025-01-10T00:00:00Z')
      expect(sorted[1].payment.date).toBe('2025-01-15T00:00:00Z')
      expect(sorted[2].payment.date).toBe('2025-01-20T00:00:00Z')
    })

    it('debe ordenar descendente cuando se especifica', () => {
      const unsorted = extractProjectAllocations(mockPayments, 'project-A')
      const sorted = sortAllocationsByDate(unsorted, 'desc')

      // Orden esperado: Jan 20 → Jan 15 → Jan 10
      expect(sorted[0].payment.date).toBe('2025-01-20T00:00:00Z')
      expect(sorted[1].payment.date).toBe('2025-01-15T00:00:00Z')
      expect(sorted[2].payment.date).toBe('2025-01-10T00:00:00Z')
    })

    it('no debe mutar el array original', () => {
      const original = extractProjectAllocations(mockPayments, 'project-A')
      const originalCopy = [...original]

      sortAllocationsByDate(original, 'desc')

      // Array original no debe cambiar
      expect(original).toEqual(originalCopy)
    })

    it('debe manejar array vacío sin errores', () => {
      const result = sortAllocationsByDate([])
      expect(result).toEqual([])
    })

    it('debe manejar array con un solo elemento', () => {
      const unsorted = extractProjectAllocations(mockPayments, 'project-B')
      const sorted = sortAllocationsByDate(unsorted)

      expect(sorted).toHaveLength(1)
      expect(sorted[0].id).toBe('alloc-2')
    })
  })

  describe('processProjectPayments', () => {
    it('debe extraer y ordenar en un solo paso (asc)', () => {
      const result = processProjectPayments(mockPayments, 'project-A', 'asc')

      expect(result).toHaveLength(3)
      expect(result[0].payment.date).toBe('2025-01-10T00:00:00Z')
      expect(result[1].payment.date).toBe('2025-01-15T00:00:00Z')
      expect(result[2].payment.date).toBe('2025-01-20T00:00:00Z')
    })

    it('debe extraer y ordenar descendente', () => {
      const result = processProjectPayments(mockPayments, 'project-A', 'desc')

      expect(result).toHaveLength(3)
      expect(result[0].payment.date).toBe('2025-01-20T00:00:00Z')
      expect(result[2].payment.date).toBe('2025-01-10T00:00:00Z')
    })

    it('debe usar orden ascendente por defecto', () => {
      const result = processProjectPayments(mockPayments, 'project-A')

      // Default es 'asc'
      expect(result[0].payment.date).toBe('2025-01-10T00:00:00Z')
    })

    it('debe retornar array vacío si proyecto no existe', () => {
      const result = processProjectPayments(mockPayments, 'project-Z')
      expect(result).toEqual([])
    })
  })
})
