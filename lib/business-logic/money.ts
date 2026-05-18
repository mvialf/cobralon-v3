import Decimal from 'decimal.js'

import { FINANCIAL, getCurrencyConfig } from '@/lib/constants/financial-constants'

export type MoneyInput = number | string | Decimal | { toString(): string }

function assertFiniteDecimal(value: Decimal) {
  if (!value.isFinite()) {
    throw new Error('El monto debe ser un número finito')
  }
}

export function money(value: MoneyInput): Decimal {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('El monto debe ser un número finito')
  }

  const decimal =
    value instanceof Decimal
      ? value
      : new Decimal(
          typeof value === 'string' || typeof value === 'number' ? value : value.toString()
        )
  assertFiniteDecimal(decimal)
  return decimal
}

export function moneyToNumber(value: MoneyInput): number {
  return money(value).toNumber()
}

export function moneyToFixed(value: MoneyInput, decimals = 2): string {
  return money(value).toFixed(decimals)
}

export function addMoney(...values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((sum, value) => sum.plus(money(value)), new Decimal(0))
}

export function subtractMoney(a: MoneyInput, b: MoneyInput): Decimal {
  return money(a).minus(money(b))
}

export function sumMoney(values: MoneyInput[]): Decimal {
  return addMoney(...values)
}

export function minMoney(a: MoneyInput, b: MoneyInput): Decimal {
  const left = money(a)
  const right = money(b)
  return left.lessThanOrEqualTo(right) ? left : right
}

export function maxMoney(a: MoneyInput, b: MoneyInput): Decimal {
  const left = money(a)
  const right = money(b)
  return left.greaterThanOrEqualTo(right) ? left : right
}

export function absMoney(value: MoneyInput): Decimal {
  return money(value).abs()
}

export function negateMoney(value: MoneyInput): Decimal {
  return money(value).negated()
}

export function compareMoney(a: MoneyInput, b: MoneyInput): number {
  return money(a).comparedTo(money(b))
}

export function equalsMoney(
  a: MoneyInput,
  b: MoneyInput,
  tolerance: MoneyInput = FINANCIAL.TOLERANCE
): boolean {
  return absMoney(subtractMoney(a, b)).lessThanOrEqualTo(money(tolerance))
}

export function greaterThanMoney(a: MoneyInput, b: MoneyInput): boolean {
  return money(a).greaterThan(money(b))
}

export function greaterThanOrEqualMoney(a: MoneyInput, b: MoneyInput): boolean {
  return money(a).greaterThanOrEqualTo(money(b))
}

export function lessThanMoney(a: MoneyInput, b: MoneyInput): boolean {
  return money(a).lessThan(money(b))
}

export function lessThanOrEqualMoney(a: MoneyInput, b: MoneyInput): boolean {
  return money(a).lessThanOrEqualTo(money(b))
}

export function greaterThanMoneyWithTolerance(
  a: MoneyInput,
  b: MoneyInput,
  tolerance: MoneyInput = FINANCIAL.TOLERANCE
): boolean {
  return subtractMoney(a, b).greaterThan(money(tolerance))
}

export function roundMoney(value: MoneyInput, decimals = 2): Decimal {
  return money(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP)
}

export function roundMoneyForCurrency(value: MoneyInput, currency = 'CLP'): Decimal {
  return roundMoney(value, getCurrencyConfig(currency).decimals)
}

export function floorMoney(value: MoneyInput, decimals = 2): Decimal {
  return money(value).toDecimalPlaces(decimals, Decimal.ROUND_FLOOR)
}

export function splitMoneyRemainder(total: MoneyInput, parts: number, decimals = 2): Decimal[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error('El número de partes debe ser un entero positivo')
  }

  const totalAmount = money(total)
  const base = floorMoney(totalAmount.dividedBy(parts), decimals)
  const baseTotal = base.times(parts - 1)
  const last = totalAmount.minus(baseTotal)

  return Array.from({ length: parts }, (_, index) => (index === parts - 1 ? last : base))
}

export function distributeMoneyProportionally(
  amounts: MoneyInput[],
  total: MoneyInput,
  decimals = 0
): Decimal[] {
  if (amounts.length === 0) return []
  if (amounts.length === 1) return [money(total)]

  const sourceAmounts = amounts.map(money)
  const sourceTotal = sumMoney(sourceAmounts)
  if (sourceTotal.equals(0)) return sourceAmounts.map(() => new Decimal(0))

  const targetTotal = money(total)
  const result: Decimal[] = []
  let assigned = new Decimal(0)

  for (let index = 0; index < sourceAmounts.length; index++) {
    const isLast = index === sourceAmounts.length - 1

    if (isLast) {
      result.push(targetTotal.minus(assigned))
      continue
    }

    const proportional = floorMoney(
      targetTotal.times(sourceAmounts[index]).dividedBy(sourceTotal),
      decimals
    )
    result.push(proportional)
    assigned = assigned.plus(proportional)
  }

  return result
}
