/**
 * Tests para lib/business-logic/installments.ts
 *
 * Valida:
 * - calculateInstallments()
 * - validateInstallmentsSum()
 * - getTotalPendingInstallments()
 * - getInstallmentStatus()
 * - generatePrismaInstallmentsCreate()
 */

import { describe, it, expect } from 'vitest'
import {
  calculateInstallments,
  validateInstallmentsSum,
  getTotalPendingInstallments,
  getInstallmentStatus,
  generatePrismaInstallmentsCreate,
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
    expect(result[0].dueDate).toEqual(new Date('2025-01-15')) // mes +0

    expect(result[1].installmentNumber).toBe(2)
    expect(result[1].amount).toBe(333.33)
    expect(result[1].dueDate).toEqual(new Date('2025-02-15')) // mes +1

    expect(result[2].installmentNumber).toBe(3)
    expect(result[2].amount).toBeCloseTo(333.34, 2) // ← Absorbe 0.01
    expect(result[2].dueDate).toEqual(new Date('2025-03-15')) // mes +2

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

  it('debe generar fechas de vencimiento mensuales (mismo día cada mes)', () => {
    const result = calculateInstallments(300, 3, new Date('2025-01-15'))

    expect(result[0].dueDate).toEqual(new Date('2025-01-15')) // Cuota 1: mes +0
    expect(result[1].dueDate).toEqual(new Date('2025-02-15')) // Cuota 2: mes +1
    expect(result[2].dueDate).toEqual(new Date('2025-03-15')) // Cuota 3: mes +2
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

  // Edge cases adicionales P2
  it('debe manejar 1 cuota (pago único)', () => {
    const result = calculateInstallments(1000, 1, new Date('2025-01-15'))

    expect(result).toHaveLength(1)
    expect(result[0].installmentNumber).toBe(1)
    expect(result[0].amount).toBe(1000) // Todo el monto en una cuota
    expect(result[0].dueDate).toEqual(new Date('2025-01-15'))
  })

  it('debe manejar 12 cuotas (máximo permitido)', () => {
    const result = calculateInstallments(1200, 12, new Date('2025-01-01'))

    expect(result).toHaveLength(12)

    // Cuota base: 1200 / 12 = 100 exacto
    result.forEach((inst, i) => {
      expect(inst.installmentNumber).toBe(i + 1)
      expect(inst.amount).toBe(100)
    })

    // Suma exacta
    const sum = result.reduce((acc, inst) => acc + inst.amount, 0)
    expect(sum).toBe(1200)
  })

  it('debe manejar montos muy grandes', () => {
    const largeAmount = 100000000 // $100 millones
    const result = calculateInstallments(largeAmount, 3, new Date('2025-01-01'))

    expect(result).toHaveLength(3)

    // Cuota base: Math.floor((100000000 / 3) * 100) / 100 = 33333333.33
    expect(result[0].amount).toBe(33333333.33)
    expect(result[1].amount).toBe(33333333.33)
    expect(result[2].amount).toBeCloseTo(33333333.34, 2) // Absorbe centavo

    // Suma exacta
    const sum = result.reduce((acc, inst) => acc + inst.amount, 0)
    expect(sum).toBe(largeAmount)
  })

  it('debe manejar montos muy pequeños', () => {
    const result = calculateInstallments(0.1, 3, new Date('2025-01-01'))

    expect(result).toHaveLength(3)

    // Cuota base: Math.floor((0.1 / 3) * 100) / 100 = 0.03
    expect(result[0].amount).toBe(0.03)
    expect(result[1].amount).toBe(0.03)
    expect(result[2].amount).toBeCloseTo(0.04, 2) // Absorbe centavo

    // Suma exacta
    const sum = result.reduce((acc, inst) => acc + inst.amount, 0)
    expect(sum).toBeCloseTo(0.1, 2)
  })

  it('debe calcular fechas correctas para 12 cuotas (1 año completo)', () => {
    const result = calculateInstallments(1200, 12, new Date('2025-01-01'))

    // Primera cuota: día del pago
    expect(result[0].dueDate).toEqual(new Date('2025-01-01'))

    // Última cuota: +11 meses
    expect(result[11].dueDate).toEqual(new Date('2025-12-01'))
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
    const pastDate = new Date('2020-01-01')
    const futureDate1 = new Date('2099-01-01')
    const futureDate2 = new Date('2099-02-01')

    const installments = [
      { amount: 100, dueDate: pastDate },
      { amount: 100, dueDate: futureDate1 },
      { amount: 100, dueDate: futureDate2 },
    ]

    const totalPending = getTotalPendingInstallments(installments)

    expect(totalPending).toBe(200) // Solo las futuras (pendientes)
  })

  it('debe retornar 0 si todas están vencidas', () => {
    const installments = [
      { amount: 100, dueDate: new Date('2020-01-01') },
      { amount: 100, dueDate: new Date('2020-06-01') },
    ]

    const totalPending = getTotalPendingInstallments(installments)

    expect(totalPending).toBe(0)
  })

  it('debe manejar array vacío', () => {
    const installments: Array<{ amount: number; dueDate: Date }> = []

    const totalPending = getTotalPendingInstallments(installments)

    expect(totalPending).toBe(0)
  })

  it('debe contar solo cuotas con vencimiento futuro', () => {
    const installments = [
      { amount: 100, dueDate: new Date('2099-01-01') },
      { amount: 100, dueDate: new Date('2020-01-01') },
      { amount: 100, dueDate: new Date('2020-06-01') },
    ]

    const totalPending = getTotalPendingInstallments(installments)

    expect(totalPending).toBe(100) // Solo la futura
  })
})

// Clase mock que simula Decimal de Prisma
class MockDecimal {
  value: number
  constructor(v: number | string) {
    this.value = Number(v)
  }
}

describe('generatePrismaInstallmentsCreate', () => {
  const baseDate = new Date('2025-01-15')

  it('debe retornar undefined cuando selectedInstallments es null', () => {
    const result = generatePrismaInstallmentsCreate(1000, null, baseDate, MockDecimal)
    expect(result).toBeUndefined()
  })

  it('debe retornar undefined cuando selectedInstallments es undefined', () => {
    const result = generatePrismaInstallmentsCreate(1000, undefined, baseDate, MockDecimal)
    expect(result).toBeUndefined()
  })

  it('debe retornar undefined cuando selectedInstallments es 0', () => {
    const result = generatePrismaInstallmentsCreate(1000, 0, baseDate, MockDecimal)
    expect(result).toBeUndefined()
  })

  it('debe retornar undefined cuando selectedInstallments es 1', () => {
    const result = generatePrismaInstallmentsCreate(1000, 1, baseDate, MockDecimal)
    expect(result).toBeUndefined()
  })

  it('debe retornar { create: [...] } con installments correctos para 3 cuotas', () => {
    const result = generatePrismaInstallmentsCreate(1000, 3, baseDate, MockDecimal)

    expect(result).toBeDefined()
    expect(result!.create).toHaveLength(3)
    expect(result!.create[0].installmentNumber).toBe(1)
    expect(result!.create[1].installmentNumber).toBe(2)
    expect(result!.create[2].installmentNumber).toBe(3)
  })

  it('debe crear amounts como instancias de la DecimalClass proporcionada', () => {
    const result = generatePrismaInstallmentsCreate(1000, 3, baseDate, MockDecimal)

    result!.create.forEach((inst) => {
      expect(inst.amount).toBeInstanceOf(MockDecimal)
    })
  })

  it('debe generar fechas de vencimiento mensuales (mismo día cada mes)', () => {
    const result = generatePrismaInstallmentsCreate(900, 3, baseDate, MockDecimal)

    expect(result!.create[0].dueDate).toEqual(new Date('2025-01-15'))
    expect(result!.create[1].dueDate).toEqual(new Date('2025-02-15'))
    expect(result!.create[2].dueDate).toEqual(new Date('2025-03-15'))
  })
})

describe('getInstallmentStatus', () => {
  it('debe retornar "due" para cuotas con fecha de vencimiento pasada', () => {
    const pastDate = new Date('2020-01-01')
    expect(getInstallmentStatus(pastDate)).toBe('due')
  })

  it('debe retornar "upcoming" para cuotas con fecha de vencimiento futura', () => {
    const futureDate = new Date('2099-01-01')
    expect(getInstallmentStatus(futureDate)).toBe('upcoming')
  })

  it('debe usar timezone de la aplicación para la comparación', () => {
    // Una cuota que vence hoy debe ser "due"
    const today = new Date()
    today.setHours(12, 0, 0, 0) // Mediodía de hoy
    expect(getInstallmentStatus(today)).toBe('due')
  })
})
