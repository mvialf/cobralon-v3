/**
 * Lógica de negocio para cálculo de cuotas sin interés
 *
 * Divide pagos en múltiples cuotas garantizando que:
 * - La suma de cuotas sea exactamente igual al monto total
 * - La última cuota absorba los centavos restantes (sin pérdida por redondeo)
 * - Las fechas de vencimiento se distribuyan uniformemente
 *
 * @module business-logic/installments
 */

import { FINANCIAL } from '../constants/financial-constants'

/**
 * Type para una cuota calculada
 */
export interface CalculatedInstallment {
  installmentNumber: number
  amount: number
  dueDate: Date
}

/**
 * Calcula la división de un pago en cuotas sin interés
 *
 * Algoritmo:
 * 1. Calcula cuota base redondeada a 2 decimales
 * 2. Multiplica cuota base por (N-1) cuotas
 * 3. Última cuota = Total - Suma(cuotas base)
 *    ↑ Esto GARANTIZA que la suma sea exacta (no pierde centavos)
 *
 * @param amount - Monto total a dividir
 * @param installments - Número de cuotas (1-12)
 * @param paymentDate - Fecha base para calcular vencimientos
 * @returns Array de cuotas con monto y fecha de vencimiento
 *
 * @example División con centavos
 * ```ts
 * // Ejemplo: $1,000 en 3 cuotas
 * const result = calculateInstallments(1000, 3, new Date('2025-01-15'))
 *
 * // Cálculo interno:
 * // baseAmount = Math.floor((1000 / 3) * 100) / 100 = 333.33
 * // totalBase = 333.33 * 2 = 666.66
 * // lastAmount = 1000 - 666.66 = 333.34
 *
 * // Resultado:
 * // [
 * //   { installmentNumber: 1, amount: 333.33, dueDate: '2025-01-15' },
 * //   { installmentNumber: 2, amount: 333.33, dueDate: '2025-02-14' },
 * //   { installmentNumber: 3, amount: 333.34, dueDate: '2025-03-16' }  ← Absorbe 0.01
 * // ]
 * // SUMA: 333.33 + 333.33 + 333.34 = 1000.00 ✅ Exacto
 * ```
 *
 * @example División exacta
 * ```ts
 * // Ejemplo: $1,200 en 3 cuotas (división exacta)
 * calculateInstallments(1200, 3, new Date('2025-01-01'))
 *
 * // Resultado:
 * // [
 * //   { installmentNumber: 1, amount: 400.00, dueDate: '2025-01-01' },
 * //   { installmentNumber: 2, amount: 400.00, dueDate: '2025-01-31' },
 * //   { installmentNumber: 3, amount: 400.00, dueDate: '2025-03-02' }
 * // ]
 * ```
 *
 * @example Caso extremo
 * ```ts
 * // Ejemplo: $100 en 7 cuotas
 * calculateInstallments(100, 7, new Date('2025-01-01'))
 *
 * // Cálculo interno:
 * // baseAmount = Math.floor((100 / 7) * 100) / 100 = 14.28
 * // totalBase = 14.28 * 6 = 85.68
 * // lastAmount = 100 - 85.68 = 14.32
 *
 * // Resultado:
 * // Cuotas 1-6: $14.28
 * // Cuota 7: $14.32 ← Absorbe 0.04 extra
 * // SUMA: $100.00 ✅ Exacto
 * ```
 *
 * @see {@link docs/ANALISIS-CALCULOS-FRONTEND.md#3} - Análisis exhaustivo
 */
export function calculateInstallments(
  amount: number,
  installments: number,
  paymentDate: Date
): CalculatedInstallment[] {
  // Validaciones
  if (installments < FINANCIAL.MIN_INSTALLMENTS || installments > FINANCIAL.MAX_INSTALLMENTS) {
    throw new Error(
      `Número de cuotas inválido. Debe estar entre ${FINANCIAL.MIN_INSTALLMENTS} y ${FINANCIAL.MAX_INSTALLMENTS}`
    )
  }

  if (amount <= 0) {
    throw new Error('El monto debe ser mayor a 0')
  }

  // PASO 1: Calcular cuota base redondeada a 2 decimales
  // Math.floor asegura que redondeamos hacia abajo para evitar sobrepaso
  const baseInstallmentAmount = Math.floor((amount / installments) * 100) / 100

  // PASO 2: Calcular total de cuotas base (N-1 cuotas)
  const totalBase = baseInstallmentAmount * (installments - 1)

  // PASO 3: Última cuota absorbe los centavos restantes
  // Esto GARANTIZA que la suma sea exacta
  const lastInstallmentAmount = amount - totalBase

  // PASO 4: Generar array de cuotas
  const result: CalculatedInstallment[] = []

  for (let i = 1; i <= installments; i++) {
    const isLastInstallment = i === installments

    // Determinar monto de esta cuota
    const installmentAmount = isLastInstallment ? lastInstallmentAmount : baseInstallmentAmount

    // Calcular fecha de vencimiento
    // Cuota 1: +0 días (fecha del pago)
    // Cuota 2: +30 días
    // Cuota N: +(N-1)*30 días
    const dueDate = new Date(paymentDate)
    dueDate.setDate(dueDate.getDate() + (i - 1) * FINANCIAL.DAYS_PER_INSTALLMENT)

    result.push({
      installmentNumber: i,
      amount: installmentAmount,
      dueDate,
    })
  }

  return result
}

/**
 * Valida que la suma de cuotas sea exactamente igual al monto total
 *
 * Útil para verificar que el cálculo fue correcto antes de persistir en DB.
 *
 * @param installments - Array de cuotas calculadas
 * @param expectedTotal - Monto total esperado
 * @returns true si la suma es exacta (dentro de tolerancia)
 *
 * @example
 * ```ts
 * const installments = calculateInstallments(1000, 3, new Date())
 * const isValid = validateInstallmentsSum(installments, 1000)
 * // => true
 * ```
 */
export function validateInstallmentsSum(
  installments: CalculatedInstallment[],
  expectedTotal: number
): boolean {
  const sum = installments.reduce((acc, inst) => acc + inst.amount, 0)
  return Math.abs(sum - expectedTotal) < FINANCIAL.TOLERANCE
}

/**
 * Calcula el total de cuotas pendientes
 *
 * @param installments - Array de cuotas con estado
 * @returns Suma de montos de cuotas pendientes
 *
 * @example
 * ```ts
 * const installments = [
 *   { amount: 100, status: 'paid' },
 *   { amount: 100, status: 'pending' },
 *   { amount: 100, status: 'pending' }
 * ]
 * getTotalPendingInstallments(installments)
 * // => 200 (solo las pendientes)
 * ```
 */
export function getTotalPendingInstallments(
  installments: Array<{ amount: number; status: string }>
): number {
  return installments
    .filter((inst) => inst.status === 'pending')
    .reduce((sum, inst) => sum + inst.amount, 0)
}
