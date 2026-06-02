/**
 * Reglas de negocio centralizadas para validación de pagos
 *
 * Este módulo contiene funciones PURAS que validan las reglas de negocio
 * para pagos. Estas funciones pueden usarse tanto en frontend (hooks) como
 * en backend (API routes) para evitar duplicación de lógica.
 *
 * IMPORTANTE: Este es el ÚNICO lugar donde deben definirse estas validaciones.
 * Cualquier cambio en reglas de negocio debe hacerse aquí y se propagará
 * automáticamente a frontend y backend.
 *
 * @module validations/payment-business-rules
 */

import { FINANCIAL } from '../constants/financial-constants'
import {
  absMoney,
  greaterThanMoney,
  greaterThanMoneyWithTolerance,
  moneyToFixed,
  sumMoney,
  subtractMoney,
} from '../business-logic/money'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tipo de pago: Project (1:1) o Customer (1:N)
 */
export type PaymentType = 'Project' | 'Customer'

/**
 * Estructura mínima de una allocation para validación
 */
export interface AllocationForValidation {
  projectId: string
  allocatedAmount: number
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

// ============================================================================
// VALIDACIONES DE NEGOCIO
// ============================================================================

/**
 * Valida que el tipo de pago coincida con el número de allocations
 *
 * Reglas:
 * - Project: exactamente 1 allocation (pago directo a un proyecto)
 * - Customer: al menos 1 allocation (distribución FIFO entre múltiples proyectos)
 *
 * @param type - Tipo de pago ('Project' | 'Customer')
 * @param allocations - Array de allocations
 * @returns Resultado de validación
 *
 * @example
 * ```ts
 * // Válido: pago Project con 1 allocation
 * validatePaymentType('Project', [{ projectId: 'abc', allocatedAmount: 1000 }])
 * // => { valid: true }
 *
 * // Inválido: pago Project con múltiples allocations
 * validatePaymentType('Project', [
 *   { projectId: 'abc', allocatedAmount: 500 },
 *   { projectId: 'def', allocatedAmount: 500 }
 * ])
 * // => { valid: false, error: '...' }
 * ```
 */
export function validatePaymentType(
  type: PaymentType,
  allocations: AllocationForValidation[]
): ValidationResult {
  if (type === 'Project' && allocations.length !== 1) {
    return {
      valid: false,
      error: 'Pago tipo "Project" debe tener exactamente 1 asignación',
    }
  }

  if (type === 'Customer' && allocations.length < 1) {
    return {
      valid: false,
      error: 'Pago tipo "Customer" debe tener al menos 1 asignación',
    }
  }

  return { valid: true }
}

/**
 * Valida que la suma de allocations sea igual al monto total del pago
 *
 * Usa tolerancia financiera (FINANCIAL.TOLERANCE = 0.01) para evitar
 * problemas de punto flotante.
 *
 * @param amount - Monto total del pago
 * @param allocations - Array de allocations
 * @returns Resultado de validación
 *
 * @example
 * ```ts
 * // Válido: suma exacta
 * validateAllocationsSum(1000, [
 *   { projectId: 'abc', allocatedAmount: 600 },
 *   { projectId: 'def', allocatedAmount: 400 }
 * ])
 * // => { valid: true }
 *
 * // Inválido: suma no coincide
 * validateAllocationsSum(1000, [
 *   { projectId: 'abc', allocatedAmount: 500 }
 * ])
 * // => { valid: false, error: '...' }
 * ```
 */
export function validateAllocationsSum(
  amount: number,
  allocations: AllocationForValidation[]
): ValidationResult {
  const totalAllocated = sumMoney(allocations.map((a) => a.allocatedAmount))
  const difference = absMoney(subtractMoney(totalAllocated, amount))

  if (greaterThanMoneyWithTolerance(difference, 0, FINANCIAL.TOLERANCE)) {
    return {
      valid: false,
      error: `Las asignaciones ($${moneyToFixed(totalAllocated, 2)}) no suman el monto total ($${moneyToFixed(amount, 2)})`,
    }
  }

  return { valid: true }
}

/**
 * Valida que la suma de allocations coincida con el dinero nuevo recibido.
 *
 * Semántica actual:
 * - Payment.amount representa solo dinero nuevo recibido.
 * - PaymentAllocation representa distribución del dinero nuevo.
 * - creditApplied se registra por separado como ProjectApplication.
 * - La suma de allocations solo valida dinero nuevo recibido.
 */
export function validatePaymentApplicationSum(
  amount: number,
  allocations: AllocationForValidation[]
): ValidationResult {
  return validateAllocationsSum(amount, allocations)
}

/**
 * Valida que no haya projectIds duplicados en las allocations
 *
 * Un pago no puede asignar el mismo proyecto más de una vez.
 *
 * @param allocations - Array de allocations
 * @returns Resultado de validación
 *
 * @example
 * ```ts
 * // Válido: IDs únicos
 * validateNoDuplicateProjects([
 *   { projectId: 'abc', allocatedAmount: 500 },
 *   { projectId: 'def', allocatedAmount: 500 }
 * ])
 * // => { valid: true }
 *
 * // Inválido: ID duplicado
 * validateNoDuplicateProjects([
 *   { projectId: 'abc', allocatedAmount: 300 },
 *   { projectId: 'abc', allocatedAmount: 700 }
 * ])
 * // => { valid: false, error: '...' }
 * ```
 */
export function validateNoDuplicateProjects(
  allocations: AllocationForValidation[]
): ValidationResult {
  const projectIds = allocations.map((a) => a.projectId)
  const uniqueIds = new Set(projectIds)

  if (projectIds.length !== uniqueIds.size) {
    return {
      valid: false,
      error: 'No puede asignar el mismo proyecto múltiples veces',
    }
  }

  return { valid: true }
}

/**
 * Valida que todos los montos de allocations sean positivos
 *
 * Cada allocation debe tener un allocatedAmount > 0.
 *
 * @param allocations - Array de allocations
 * @returns Resultado de validación
 */
export function validatePositiveAllocations(
  allocations: AllocationForValidation[]
): ValidationResult {
  const hasInvalidAmount = allocations.some((a) => !greaterThanMoney(a.allocatedAmount, 0))

  if (hasInvalidAmount) {
    return {
      valid: false,
      error: 'Todos los montos asignados deben ser mayores a 0',
    }
  }

  return { valid: true }
}

// ============================================================================
// VALIDACIÓN COMPLETA
// ============================================================================

/**
 * Ejecuta todas las validaciones de negocio para un pago
 *
 * Valida en orden:
 * 1. Tipo vs cantidad de allocations
 * 2. Suma de allocations vs total aplicado
 * 3. No projectIds duplicados
 * 4. Todos los montos positivos
 *
 * Se detiene en la primera validación que falla.
 *
 * @param type - Tipo de pago
 * @param amount - Monto total del pago
 * @param allocations - Array de allocations
 * @returns Resultado de validación (primera que falla o success)
 *
 * @example
 * ```ts
 * const result = validatePaymentAllocations('Project', 1000, [
 *   { projectId: 'abc', allocatedAmount: 1000 }
 * ])
 *
 * if (!result.valid) {
 *   throw new Error(result.error)
 * }
 * ```
 */
export function validatePaymentAllocations(
  type: PaymentType,
  amount: number,
  allocations: AllocationForValidation[]
): ValidationResult {
  // 1. Validar tipo vs cantidad de allocations
  const typeResult = validatePaymentType(type, allocations)
  if (!typeResult.valid) return typeResult

  // 2. Validar suma de allocations
  const sumResult = validatePaymentApplicationSum(amount, allocations)
  if (!sumResult.valid) return sumResult

  // 3. Validar no duplicados
  const duplicatesResult = validateNoDuplicateProjects(allocations)
  if (!duplicatesResult.valid) return duplicatesResult

  // 4. Validar montos positivos
  const positiveResult = validatePositiveAllocations(allocations)
  if (!positiveResult.valid) return positiveResult

  return { valid: true }
}

// ============================================================================
// VALIDACIONES ADICIONALES (para backend)
// ============================================================================

/**
 * Valida que todos los proyectos pertenezcan al mismo cliente
 *
 * Esta validación requiere datos de la DB, por lo que se usa principalmente en backend.
 *
 * @param projects - Array de proyectos con customerId
 * @param expectedCustomerId - ID del cliente esperado
 * @returns Resultado de validación
 */
export function validateSameCustomer(
  projects: Array<{ customerId: string }>,
  expectedCustomerId: string
): ValidationResult {
  const allSameCustomer = projects.every((p) => p.customerId === expectedCustomerId)

  if (!allSameCustomer) {
    return {
      valid: false,
      error: 'Todos los proyectos deben pertenecer al mismo cliente',
    }
  }

  return { valid: true }
}

/**
 * Valida que todos los proyectos tengan la misma moneda
 *
 * @param projects - Array de proyectos con currency
 * @param expectedCurrency - Moneda esperada
 * @returns Resultado de validación
 */
export function validateSameCurrency(
  projects: Array<{ currency: string }>,
  expectedCurrency: string
): ValidationResult {
  const allSameCurrency = projects.every((p) => p.currency === expectedCurrency)

  if (!allSameCurrency) {
    return {
      valid: false,
      error: 'Todos los proyectos deben tener la misma moneda que el pago',
    }
  }

  return { valid: true }
}
