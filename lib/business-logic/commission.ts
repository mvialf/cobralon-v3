/**
 * Lógica de negocio para cálculo de comisiones de medios de pago
 *
 * Las entidades de cobro (Transbank, MercadoPago, Khipu) cobran comisiones
 * al comercio. Este módulo calcula la comisión aplicable y el monto neto
 * que realmente se recibe.
 *
 * - La comisión la absorbe la empresa (no se traspasa al cliente)
 * - Se soporta comisión base + opcionalmente tramos por cuotas
 * - La comisión se distribuye proporcionalmente entre las cuotas
 *
 * @module business-logic/commission
 */

import {
  addMoney,
  distributeMoneyProportionally,
  money,
  moneyToNumber,
  roundMoney,
  subtractMoney,
} from './money'

/**
 * Tier de comisión (desde DB)
 */
export interface CommissionTierData {
  minInstallments: number | null
  maxInstallments: number | null
  percentageFee: number // Ej: 2.95
  fixedFee: number // Ej: 350
}

/**
 * Resultado del cálculo de comisión
 */
export interface CommissionResult {
  /** Monto de comisión calculado */
  commissionAmount: number
  /** Monto neto (amount - commissionAmount) */
  netAmount: number
  /** Porcentaje aplicado (para auditoría) */
  percentageFee: number
  /** Fee fijo aplicado (para auditoría) */
  fixedFee: number
}

/**
 * Busca el tier de comisión aplicable dado un número de cuotas.
 *
 * Lógica:
 * 1. Si installments es null o 1 → busca tier base (min y max null)
 * 2. Si installments > 1 → busca tier cuyo rango incluya el valor
 * 3. Si no hay tramo específico para las cuotas → usa tier base como fallback
 * 4. Si no hay ningún tier → retorna null (comisión = 0)
 *
 * @param tiers - Lista de tiers del método de pago
 * @param installments - Número de cuotas seleccionadas (null = contado)
 * @returns Tier aplicable o null
 */
export function findApplicableTier(
  tiers: CommissionTierData[],
  installments: number | null | undefined
): CommissionTierData | null {
  if (tiers.length === 0) return null

  const baseTier = tiers.find((t) => t.minInstallments === null && t.maxInstallments === null)

  // Contado o sin cuotas: usar tier base
  if (!installments || installments <= 1) {
    return baseTier ?? null
  }

  // Buscar tramo específico para el número de cuotas
  const specificTier = tiers.find(
    (t) =>
      t.minInstallments !== null &&
      t.maxInstallments !== null &&
      installments >= t.minInstallments &&
      installments <= t.maxInstallments
  )

  // Si hay tramo específico usarlo, si no, fallback al base
  return specificTier ?? baseTier ?? null
}

/**
 * Calcula la comisión a partir de un monto y un tier.
 *
 * Fórmula: comisión = fixedFee + (amount * percentageFee / 100)
 *
 * @param amount - Monto bruto del pago
 * @param tier - Tier de comisión aplicable (null = sin comisión)
 * @returns Resultado con comisión, neto y tasas aplicadas
 *
 * @example
 * ```ts
 * // Transbank 2.95%
 * calculateCommission(100000, { percentageFee: 2.95, fixedFee: 0, ... })
 * // → { commissionAmount: 2950, netAmount: 97050, percentageFee: 2.95, fixedFee: 0 }
 *
 * // MercadoPago 3.49% + $350 fijo
 * calculateCommission(100000, { percentageFee: 3.49, fixedFee: 350, ... })
 * // → { commissionAmount: 3840, netAmount: 96160, percentageFee: 3.49, fixedFee: 350 }
 * ```
 */
export function calculateCommission(
  amount: number,
  tier: CommissionTierData | null
): CommissionResult {
  if (!tier) {
    return {
      commissionAmount: 0,
      netAmount: amount,
      percentageFee: 0,
      fixedFee: 0,
    }
  }

  const grossAmount = money(amount)
  const percentageFee = grossAmount.mul(money(tier.percentageFee)).div(100)
  const commissionAmount = roundMoney(addMoney(money(tier.fixedFee), percentageFee), 0)
  const netAmount = subtractMoney(grossAmount, commissionAmount)

  return {
    commissionAmount: moneyToNumber(commissionAmount),
    netAmount: moneyToNumber(netAmount),
    percentageFee: tier.percentageFee,
    fixedFee: tier.fixedFee,
  }
}

/**
 * Función principal: calcula la comisión de un pago completo.
 *
 * Combina findApplicableTier + calculateCommission en un solo paso.
 *
 * @param amount - Monto bruto del pago
 * @param tiers - Tiers de comisión del método de pago
 * @param installments - Número de cuotas (null = contado)
 * @returns Resultado de comisión o null si no hay tiers configurados
 */
export function computePaymentCommission(
  amount: number,
  tiers: CommissionTierData[],
  installments: number | null | undefined
): CommissionResult | null {
  if (tiers.length === 0) return null

  const tier = findApplicableTier(tiers, installments)
  return calculateCommission(amount, tier)
}

/**
 * Distribuye el monto neto proporcionalmente entre cuotas.
 *
 * Usa el mismo patrón de redondeo que installments.ts:
 * - Floor para cuotas base (evitar sobrepaso)
 * - Última cuota absorbe residuo (garantiza suma exacta)
 *
 * @param installmentAmounts - Montos brutos de cada cuota
 * @param totalNetAmount - Monto neto total del pago
 * @returns Array de montos netos por cuota
 *
 * @example
 * ```ts
 * // Pago $100.000 en 3 cuotas, comisión 3% ($3.000), neto $97.000
 * distributeNetToInstallments([33334, 33333, 33333], 97000)
 * // → [32334, 32333, 32333]  (suma = 97000 ✅)
 * ```
 */
export function distributeNetToInstallments(
  installmentAmounts: number[],
  totalNetAmount: number
): number[] {
  const count = installmentAmounts.length
  if (count === 0) return []
  if (count === 1) return [totalNetAmount]

  const distributedNet = distributeMoneyProportionally(
    installmentAmounts.map((amount) => money(amount)),
    money(totalNetAmount)
  )

  return distributedNet.map((amount) => moneyToNumber(amount))
}
