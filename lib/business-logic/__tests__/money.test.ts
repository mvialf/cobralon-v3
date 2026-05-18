import { Decimal } from '@prisma/client/runtime/library'
import { describe, expect, it } from 'vitest'

import {
  absMoney,
  addMoney,
  distributeMoneyProportionally,
  equalsMoney,
  floorMoney,
  greaterThanMoney,
  greaterThanMoneyWithTolerance,
  money,
  moneyToFixed,
  moneyToNumber,
  negateMoney,
  roundMoneyForCurrency,
  splitMoneyRemainder,
  subtractMoney,
  sumMoney,
} from '../money'

describe('money', () => {
  it('normaliza number, string y Decimal', () => {
    expect(money(1000).toString()).toBe('1000')
    expect(money('1000.50').toString()).toBe('1000.5')
    expect(money(new Decimal('0.10')).toString()).toBe('0.1')
  })

  it('rechaza montos no finitos', () => {
    expect(() => money(Number.NaN)).toThrow('finito')
    expect(() => money(Number.POSITIVE_INFINITY)).toThrow('finito')
  })

  it('suma y resta sin artefactos binarios', () => {
    expect(addMoney('0.1', '0.2').toString()).toBe('0.3')
    expect(subtractMoney('1.00', '0.99').toString()).toBe('0.01')
    expect(sumMoney(['33.33', '33.33', '33.34']).toString()).toBe('100')
  })

  it('compara con tolerancia financiera explícita', () => {
    expect(equalsMoney('100.00', '100.005')).toBe(true)
    expect(equalsMoney('100.00', '100.02')).toBe(false)
    expect(greaterThanMoney('100.02', '100.00')).toBe(true)
    expect(greaterThanMoneyWithTolerance('100.02', '100.00')).toBe(true)
    expect(greaterThanMoneyWithTolerance('100.005', '100.00')).toBe(false)
  })

  it('convierte solo en frontera de salida', () => {
    expect(moneyToNumber('1234.56')).toBe(1234.56)
    expect(moneyToFixed('1234.5')).toBe('1234.50')
  })

  it('redondea por moneda y soporta floor decimal', () => {
    expect(roundMoneyForCurrency('1378692.35', 'CLP').toString()).toBe('1378692')
    expect(roundMoneyForCurrency('99.999', 'USD').toString()).toBe('100')
    expect(floorMoney('14.285', 2).toString()).toBe('14.28')
  })

  it('maneja signo absoluto y negativo', () => {
    expect(absMoney('-50.25').toString()).toBe('50.25')
    expect(negateMoney('50.25').toString()).toBe('-50.25')
  })

  it('divide en partes con residuo en la última parte', () => {
    const result = splitMoneyRemainder('100', 7, 2)
    expect(result.map((value) => value.toNumber())).toEqual([
      14.28, 14.28, 14.28, 14.28, 14.28, 14.28, 14.32,
    ])
    expect(sumMoney(result).toString()).toBe('100')
  })

  it('distribuye proporcionalmente manteniendo suma exacta', () => {
    const result = distributeMoneyProportionally(['33334', '33333', '33333'], '97050', 0)
    expect(result.map((value) => value.toNumber())).toEqual([32350, 32349, 32351])
    expect(sumMoney(result).toString()).toBe('97050')
  })
})
