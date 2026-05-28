import { describe, expect, it } from 'vitest'
import {
  calculateAccountSummary,
  calculatePaymentRequest,
  type ConsolidatedPayment,
  type SelectedProject,
} from '../customer-account-transformers'

const projects: SelectedProject[] = [
  {
    id: 'project-new',
    projectNumber: 'P-003',
    projectName: 'Proyecto nuevo',
    totalAmount: 1000000,
    totalPaid: 600000,
    balance: 400000,
    currency: 'CLP',
    createdAt: '2025-03-01T00:00:00.000Z',
  },
  {
    id: 'project-old',
    projectNumber: 'P-001',
    projectName: 'Proyecto antiguo',
    totalAmount: 800000,
    totalPaid: 300000,
    balance: 500000,
    currency: 'CLP',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'project-paid',
    projectNumber: 'P-002',
    projectName: 'Proyecto pagado',
    totalAmount: 300000,
    totalPaid: 300000,
    balance: 0,
    currency: 'CLP',
    createdAt: '2025-02-01T00:00:00.000Z',
  },
]

const visiblePayments: ConsolidatedPayment[] = [
  {
    id: 'payment-1',
    date: '2025-01-15T00:00:00.000Z',
    displayAmount: 100000,
    totalAmount: 100000,
    currency: 'CLP',
    isPartial: false,
    paymentMethod: {
      name: 'Transferencia',
      icon: null,
    },
  },
]

describe('customer-account-transformers', () => {
  describe('calculateAccountSummary', () => {
    it('debe usar saldos derivados de ProjectFinancials en vez de pagos visibles', () => {
      const summary = calculateAccountSummary(projects, visiblePayments)

      expect(summary.totalProjects).toBe(2100000)
      expect(summary.totalPaid).toBe(1200000)
      expect(summary.balance).toBe(900000)
      expect(summary.currency).toBe('CLP')
    })
  })

  describe('calculatePaymentRequest', () => {
    it('debe solicitar el saldo pendiente completo por defecto', () => {
      const result = calculatePaymentRequest(projects, { mode: 'full' })

      expect(result.isValid).toBe(true)
      expect(result.requestedTotal).toBe(900000)
      expect(result.projects.find((project) => project.id === 'project-new')?.requestedAmount).toBe(
        400000
      )
      expect(result.projects.find((project) => project.id === 'project-old')?.requestedAmount).toBe(
        500000
      )
      expect(
        result.projects.find((project) => project.id === 'project-paid')?.requestedAmount
      ).toBe(0)
    })

    it('debe calcular porcentaje sobre el balance pendiente de cada proyecto', () => {
      const result = calculatePaymentRequest(projects, { mode: 'percentage', percentage: 25 })

      expect(result.isValid).toBe(true)
      expect(result.requestedTotal).toBe(225000)
      expect(result.projects.find((project) => project.id === 'project-new')?.requestedAmount).toBe(
        100000
      )
      expect(result.projects.find((project) => project.id === 'project-old')?.requestedAmount).toBe(
        125000
      )
    })

    it('debe distribuir monto fijo por FIFO usando createdAt', () => {
      const result = calculatePaymentRequest(projects, { mode: 'fixed', fixedAmount: 600000 })

      expect(result.isValid).toBe(true)
      expect(result.requestedTotal).toBe(600000)
      expect(result.projects.find((project) => project.id === 'project-old')?.requestedAmount).toBe(
        500000
      )
      expect(result.projects.find((project) => project.id === 'project-new')?.requestedAmount).toBe(
        100000
      )
      expect(
        result.projects.find((project) => project.id === 'project-paid')?.requestedAmount
      ).toBe(0)
    })

    it('debe invalidar monto fijo mayor al saldo pendiente seleccionado', () => {
      const result = calculatePaymentRequest(projects, { mode: 'fixed', fixedAmount: 1000000 })

      expect(result.isValid).toBe(false)
      expect(result.requestedTotal).toBe(0)
      expect(result.error).toBe(
        'El monto solicitado no puede superar el saldo pendiente seleccionado'
      )
    })

    it('debe invalidar porcentaje fuera de rango', () => {
      const result = calculatePaymentRequest(projects, { mode: 'percentage', percentage: 0 })

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('El porcentaje debe estar entre 1 y 100')
    })
  })
})
