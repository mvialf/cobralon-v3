/**
 * Helper centralizado para manejo de timezone de la aplicación.
 *
 * Todos los servidores Vercel corren en UTC. Este módulo asegura que
 * las comparaciones de fechas se hagan consistentemente en la timezone
 * del usuario (America/Santiago por defecto).
 *
 * @module timezone
 */

import { toZonedTime, format } from 'date-fns-tz'
import { startOfDay, endOfDay } from 'date-fns'
import { PAISES_CONFIG } from '@/lib/paises-config'

/**
 * Timezone por defecto de la aplicación.
 * Se lee desde la config del país activo (Chile por defecto).
 */
export const APP_TZ = PAISES_CONFIG.cl.timezone // 'America/Santiago'

/**
 * Obtiene la fecha actual en la timezone de la aplicación.
 * Equivale a `new Date()` pero en la TZ local del negocio.
 */
export function getNowInAppTZ(): Date {
  return toZonedTime(new Date(), APP_TZ)
}

/**
 * Obtiene "hoy" (start of day) en la timezone de la aplicación.
 * Usa startOfDay sobre la fecha zoned para garantizar midnight local.
 */
export function getTodayAppTZ(): Date {
  return startOfDay(toZonedTime(new Date(), APP_TZ))
}

/**
 * Obtiene el final del día actual en la timezone de la aplicación.
 */
export function getEndOfTodayAppTZ(): Date {
  return endOfDay(toZonedTime(new Date(), APP_TZ))
}

/**
 * Convierte una fecha UTC a la timezone de la aplicación.
 * Útil para comparar fechas almacenadas en DB (UTC) con "hoy" local.
 */
export function toAppTZ(date: Date): Date {
  return toZonedTime(date, APP_TZ)
}

/**
 * Parsea un string ISO date (YYYY-MM-DD) como fecha local de la app.
 * Evita el problema de `new Date("2025-05-15")` que interpreta como UTC midnight.
 *
 * @param dateString - String en formato YYYY-MM-DD
 * @returns Date representando midnight en la timezone de la app
 */
export function parseDateAsLocal(dateString: string): Date {
  // dateString es "2025-05-15" → lo interpretamos como esa fecha en la TZ local
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Compara si una fecha ya pasó respecto a "hoy" en la timezone de la app.
 * Compara solo la parte de fecha (ignora hora).
 *
 * @param date - Fecha a comparar
 * @returns true si date <= hoy (en TZ local)
 */
export function isPastOrToday(date: Date): boolean {
  const today = getTodayAppTZ()
  const target = startOfDay(toZonedTime(date, APP_TZ))
  return target <= today
}

/**
 * Compara si una fecha es futura respecto a "hoy" en la timezone de la app.
 *
 * @param date - Fecha a comparar
 * @returns true si date > hoy (en TZ local)
 */
export function isFuture(date: Date): boolean {
  return !isPastOrToday(date)
}

/**
 * Formatea una fecha como string YYYY-MM-DD en la timezone de la app.
 * Útil para comparaciones de solo fecha sin riesgo de timezone.
 */
export function formatDateAppTZ(date: Date): string {
  return format(toZonedTime(date, APP_TZ), 'yyyy-MM-dd')
}
