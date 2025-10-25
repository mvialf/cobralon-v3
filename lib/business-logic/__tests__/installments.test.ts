/**
 * Tests para lib/business-logic/installments.ts
 *
 * Valida:
 * - calculateInstallments()
 * - validateInstallmentsSum()
 * - getTotalPendingInstallments()
 */

import { describe, it, expect } from 'vitest'
import {
  calculateInstallments,
  validateInstallmentsSum,
  getTotalPendingInstallments,
} from '../installments'

describe('calculateInstallments', () => {
  it('debe dividir $1,000 en 3 cuotas con última absorbiendo centavos', () => {
    const result = calculateInstallments(1000, 3, new Date('2025-01-15'))

    // Cálculo esperado:
    // baseAmount = Math.floor((1000 / 3) * 100) / 100 = 333.33
    // totalBase = 333.33 * 2 = 666.66
    // lastAmount = 1000 - 666.66 = 333.34

    expect(result).toHaveLength(3)
    expect(result[0].installmentNumber).toBe(1)
    expect(result[0].amount).toBe(333.33)
    expect(result[0].dueDate).toEqual(new Date('2025-01-15')) // +0 días

    expect(result[1].installmentNumber).toBe(2)
    expect(result[1].amount).toBe(333.33)
    expect(result[1].dueDate).toEqual(new Date('2025-02-14')) // +30 días

    expect(result[2].installmentNumber).toBe(3)
    expect(result[2].amount).toBeCloseTo(333.34, 2) // ← Absorbe 0.01
    expect(result[2].dueDate).toEqual(new Date('2025-03-16')) // +60 días

    // Validar suma exacta
    const sum = result.reduce((acc, inst) => acc + inst.amount, 0)
    expect(sum).toBe(1000)
  })

  it('debe dividir $1,200 en 3 cuotas exactamente (sin centavos)', () => {
    const result = calculateInstallments(1200, 3, new Date('2025-01-01'))

    expect(result).toHaveLength(3)
    expect(result[0].amount).toBe(400)
    expect(result[1].amount).toBe(400)
    expect(result[2].amount).toBe(400)

    const sum = result.reduce((acc, inst) => acc + inst.amount, 0)
    expect(sum).toBe(1200)
  })

  it('debe manejar caso extremo: $100 en 7 cuotas', () => {
    const result = calculateInstallments(100, 7, new Date('2025-01-01'))

    // Cálculo esperado:
    // baseAmount = Math.floor((100 / 7) * 100) / 100 = 14.28
    // totalBase = 14.28 * 6 = 85.68
    // lastAmount = 100 - 85.68 = 14.32

    expect(result).toHaveLength(7)
    expect(result[0].amount).toBe(14.28)
    expect(result[1].amount).toBe(14.28)
    expect(result[2].amount).toBe(14.28)
    expect(result[3].amount).toBe(14.28)
    expect(result[4].amount).toBe(14.28)
    expect(result[5].amount).toBe(14.28)
    expect(result[6].amount).toBeCloseTo(14.32, 2) // ← Absorbe 0.04

    const sum = result.reduce((acc, inst) => acc + inst.amount, 0)
    expect(sum).toBe(100)
  })

  it('debe generar fechas de vencimiento correctas (cada 30 días)', () => {
    const result = calculateInstallments(300, 3, new Date('2025-01-15'))

    expect(result[0].dueDate).toEqual(new Date('2025-01-15')) // Cuota 1: +0 días
    expect(result[1].dueDate).toEqual(new Date('2025-02-14')) // Cuota 2: +30 días
    expect(result[2].dueDate).toEqual(new Date('2025-03-16')) // Cuota 3: +60 días
  })

  it('debe lanzar error si installments < 1', () => {
    expect(() => {
      calculateInstallments(1000, 0, new Date())
    }).toThrow('Número de cuotas inválido')
  })

  it('debe lanzar error si installments > 12', () => {
    expect(() => {
      calculateInstallments(1000, 13, new Date())
    }).toThrow('Número de cuotas inválido')
  })

  it('debe lanzar error si amount <= 0', () => {
    expect(() => {
      calculateInstallments(0, 3, new Date())
    }).toThrow('El monto debe ser mayor a 0')

    expect(() => {
      calculateInstallments(-100, 3, new Date())
    }).toThrow('El monto debe ser mayor a 0')
  })
})

describe('validateInstallmentsSum', () => {
  it('debe validar suma exacta', () => {
    const installments = [
      { amount: 100, installmentNumber: 1, dueDate: new Date() },
      { amount: 100, installmentNumber: 2, dueDate: new Date() },
      { amount: 100, installmentNumber: 3, dueDate: new Date() },
    ]

    const isValid = validateInstallmentsSum(installments, 300)

    expect(isValid).toBe(true)
  })

  it('debe validar suma con diferencia dentro de tolerancia', () => {
    const installments = calculateInstallments(1000, 3, new Date())

    const isValid = validateInstallmentsSum(installments, 1000)

    // La función calculateInstallments garantiza suma exacta
    expect(isValid).toBe(true)
  })

  it('debe rechazar suma incorrecta', () => {
    const installments = [
      { amount: 100, installmentNumber: 1, dueDate: new Date() },
      { amount: 100, installmentNumber: 2, dueDate: new Date() },
      { amount: 50, installmentNumber: 3, dueDate: new Date() },
    ]

    const isValid = validateInstallmentsSum(installments, 300)

    // Suma = 250, esperado = 300, diferencia = 50 > tolerancia
    expect(isValid).toBe(false)
  })
})

describe('getTotalPendingInstallments', () => {
  it('debe sumar solo cuotas pendientes', () => {
    const installments = [
      { amount: 100, status: 'paid' },
      { amount: 100, status: 'pending' },
      { amount: 100, status: 'pending' },
    ]

    const totalPending = getTotalPendingInstallments(installments)

    expect(totalPending).toBe(200) // Solo las pendientes
  })

  it('debe retornar 0 si todas están pagadas', () => {
    const installments = [
      { amount: 100, status: 'paid' },
      { amount: 100, status: 'paid' },
    ]

    const totalPending = getTotalPendingInstallments(installments)

    expect(totalPending).toBe(0)
  })

  it('debe manejar array vacío', () => {
    const installments: any[] = []

    const totalPending = getTotalPendingInstallments(installments)

    expect(totalPending).toBe(0)
  })

  it('debe ignorar estados que no sean "pending"', () => {
    const installments = [
      { amount: 100, status: 'pending' },
      { amount: 100, status: 'cancelled' },
      { amount: 100, status: 'overdue' },
    ]

    const totalPending = getTotalPendingInstallments(installments)

    expect(totalPending).toBe(100) // Solo "pending"
  })
})
