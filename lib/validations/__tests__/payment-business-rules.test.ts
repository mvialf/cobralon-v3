import { describe, expect, it } from 'vitest'

import {
  validateCustomerCreditApplication,
  validatePaymentApplicationSum,
} from '../payment-business-rules'

describe('validatePaymentApplicationSum', () => {
  it('debe ser válido cuando las allocations suman el monto total', () => {
    const result = validatePaymentApplicationSum(100000, [
      { projectId: 'p1', allocatedAmount: 60000 },
      { projectId: 'p2', allocatedAmount: 40000 },
    ])

    expect(result.valid).toBe(true)
  })

  it('debe ser inválido cuando las allocations no suman el monto total', () => {
    const result = validatePaymentApplicationSum(100000, [
      { projectId: 'p1', allocatedAmount: 50000 },
    ])

    expect(result.valid).toBe(false)
    expect(result.error).toContain('no suman el monto total')
  })
})

describe('validateCustomerCreditApplication', () => {
  const getProjectBalance = (projectId: string) => {
    const balances: Record<string, number> = {
      p1: 100000,
      p2: 150000,
    }
    return balances[projectId] ?? 0
  }

  it('debe ser válido cuando no hay crédito aplicado', () => {
    const result = validateCustomerCreditApplication(
      [{ projectId: 'p1', allocatedAmount: 100000, creditApplied: 0 }],
      50000,
      getProjectBalance
    )

    expect(result.valid).toBe(true)
  })

  it('debe ser válido cuando el crédito aplicado está dentro de los límites', () => {
    const result = validateCustomerCreditApplication(
      [
        { projectId: 'p1', allocatedAmount: 50000, creditApplied: 30000 },
        { projectId: 'p2', allocatedAmount: 0, creditApplied: 20000 },
      ],
      50000,
      getProjectBalance
    )

    expect(result.valid).toBe(true)
  })

  it('debe ser inválido cuando el crédito total excede el crédito disponible', () => {
    const result = validateCustomerCreditApplication(
      [
        { projectId: 'p1', allocatedAmount: 0, creditApplied: 30000 },
        { projectId: 'p2', allocatedAmount: 0, creditApplied: 30000 },
      ],
      50000,
      getProjectBalance
    )

    expect(result.valid).toBe(false)
    expect(result.error).toBe('El crédito aplicado excede el crédito disponible del cliente')
  })

  it('debe ser inválido cuando el crédito excede el balance restante de un proyecto', () => {
    const result = validateCustomerCreditApplication(
      [{ projectId: 'p1', allocatedAmount: 50000, creditApplied: 60000 }],
      100000,
      getProjectBalance
    )

    expect(result.valid).toBe(false)
    expect(result.error).toBe(
      'El crédito aplicado no puede superar el balance restante de cada proyecto'
    )
  })

  it('debe considerar el balance completo cuando no hay monto asignado en efectivo', () => {
    const result = validateCustomerCreditApplication(
      [{ projectId: 'p1', allocatedAmount: 0, creditApplied: 100001 }],
      200000,
      getProjectBalance
    )

    expect(result.valid).toBe(false)
  })

  it('debe permitir crédito igual al balance restante dentro de la tolerancia', () => {
    const result = validateCustomerCreditApplication(
      [{ projectId: 'p1', allocatedAmount: 50000, creditApplied: 50000 }],
      100000,
      getProjectBalance
    )

    expect(result.valid).toBe(true)
  })
})
