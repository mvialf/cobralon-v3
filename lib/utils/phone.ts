/**
 * Utilidades para manejo de números de teléfono
 *
 * Este módulo proporciona funciones para normalizar y validar números de teléfono
 * en formato E.164 (internacional con prefijo +).
 *
 * @module lib/utils/phone
 */

/**
 * Normaliza un número de teléfono al formato E.164 (con prefijo internacional)
 *
 * Casos que maneja:
 * - String vacío: "" → ""
 * - Ya tiene prefijo: "+56912345678" → "+56912345678" (sin cambios)
 * - Sin prefijo: "912345678" → "+56912345678"
 * - Con espacios/guiones: "9 1234 5678" → "+56912345678"
 * - Prefijo sin +: "56912345678" → "+56912345678"
 * - null/undefined: → ""
 *
 * @param phone - Número de teléfono en cualquier formato
 * @param countryCode - Código de país sin + (default: '56' para Chile)
 * @returns Número normalizado en formato E.164 o string vacío
 *
 * @example
 * ```typescript
 * normalizePhone('912345678')        // "+56912345678"
 * normalizePhone('+56912345678')     // "+56912345678"
 * normalizePhone('9 1234 5678')      // "+56912345678"
 * normalizePhone('56912345678')      // "+56912345678"
 * normalizePhone('')                 // ""
 * normalizePhone(null)               // ""
 * ```
 */
export function normalizePhone(phone: string | null | undefined, countryCode = '56'): string {
  // Manejar valores nulos/undefined
  if (!phone) return ''

  // Limpiar espacios, guiones, paréntesis y puntos
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '')

  // String vacío después de limpiar
  if (cleaned.length === 0) return ''

  // Ya tiene + al inicio → retornar sin cambios
  if (cleaned.startsWith('+')) return cleaned

  // Tiene código de país sin + → agregar +
  if (cleaned.startsWith(countryCode)) return '+' + cleaned

  // Solo número local → agregar código de país completo
  return `+${countryCode}${cleaned}`
}

/**
 * Valida que un número de teléfono esté en formato E.164 válido para Chile
 *
 * Formato válido: +56 seguido de 9 dígitos
 * - Primer dígito debe ser 2-9 (no 0 ni 1)
 * - Total: 9 dígitos después del +56
 *
 * Ejemplos válidos:
 * - Celular: +56912345678 (9 + 8 dígitos)
 * - Fijo RM: +56212345678 (2 + 8 dígitos)
 * - Fijo región: +56331234567 (33 + 7 dígitos)
 *
 * @param phone - Número de teléfono a validar
 * @returns true si el formato es válido, false en caso contrario
 *
 * @example
 * ```typescript
 * validateChileanPhone('+56912345678')  // true
 * validateChileanPhone('+56212345678')  // true
 * validateChileanPhone('912345678')     // false (sin prefijo)
 * validateChileanPhone('+56112345678')  // false (inicia con 1)
 * validateChileanPhone('+5691234567')   // false (8 dígitos, faltan 1)
 * ```
 */
export function validateChileanPhone(phone: string): boolean {
  // Vacío o null se considera válido (opcional)
  if (!phone || phone.length === 0) return true

  // Validación estricta para Chile: +56 + 9 dígitos (primer dígito 2-9)
  const chilePhonePattern = /^\+56[2-9]\d{8}$/

  return chilePhonePattern.test(phone)
}

/**
 * Formatea un número de teléfono E.164 a un formato legible (con espacios)
 *
 * @param phone - Número en formato E.164
 * @returns Número formateado con espacios para mejor legibilidad
 *
 * @example
 * ```typescript
 * formatPhoneForDisplay('+56912345678')  // "+56 9 1234 5678"
 * formatPhoneForDisplay('+56212345678')  // "+56 2 1234 5678"
 * ```
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone || phone.length === 0) return ''

  // Si no está normalizado, normalizarlo primero
  const normalized = normalizePhone(phone)

  // Formato: +56 9 1234 5678
  // +56 X XXXX XXXX
  if (normalized.length === 12 && normalized.startsWith('+56')) {
    return `${normalized.slice(0, 3)} ${normalized.slice(3, 4)} ${normalized.slice(4, 8)} ${normalized.slice(8)}`
  }

  // Si no coincide con el formato esperado, retornar sin cambios
  return normalized
}
