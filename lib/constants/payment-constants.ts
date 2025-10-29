/**
 * Umbrales de progreso de pago
 *
 * Define los porcentajes que determinan el color del badge de progreso:
 * - COMPLETE (99.95%+): Verde - Considerado completamente pagado (maneja errores de redondeo)
 * - HIGH (67%+): Neutral - Más de 2/3 del total pagado
 * - MEDIUM (34%+): Secundario - Entre 1/3 y 2/3 del total pagado
 * - < MEDIUM: Rojo - Menos de 1/3 pagado, requiere atención
 */
export const PAYMENT_PROGRESS_THRESHOLDS = {
  /**
   * >= 99.95% se considera completamente pagado
   * Ejemplo: $1,000,000 total, $999,500 pagado → 99.95% → badge verde "100%"
   */
  COMPLETE: 99.95,

  /**
   * >= 67% indica buen progreso (más de 2/3 pagado)
   */
  HIGH: 67,

  /**
   * >= 34% indica progreso medio (más de 1/3 pagado)
   */
  MEDIUM: 34,

  // < 34% se considera bajo progreso (destructive variant)
} as const
