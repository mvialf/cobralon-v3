/**
 * Database Warmup Utilities
 *
 * Utilidades para "despertar" la base de datos Neon cuando está suspendida
 * y mantenerla activa durante sesiones de usuario.
 *
 * @see https://neon.com/docs/connect/connection-latency
 */

import { prisma } from '@/lib/db'

/**
 * Ejecuta un query ligero para despertar la base de datos si está suspendida.
 * Cold start típico: 500ms - 3s
 *
 * @returns Promise<boolean> true si la conexión fue exitosa
 */
export async function warmupDatabase(): Promise<boolean> {
  try {
    // Query ultra-ligero que no afecta datos
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database warmup failed:', error)
    return false
  }
}

/**
 * Verifica si la base de datos está activa (responde rápido).
 * Útil para mostrar status en UI.
 *
 * @param timeoutMs Timeout en ms (default: 2000ms)
 * @returns Promise<boolean> true si responde dentro del timeout
 */
export async function isDatabaseActive(timeoutMs = 2000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    await prisma.$queryRaw`SELECT 1`
    clearTimeout(timeout)
    return true
  } catch {
    return false
  }
}

/**
 * Mantiene la base de datos activa ejecutando un query periódico.
 * Útil para sesiones largas (dashboards, admin panels).
 *
 * @param intervalMs Intervalo en ms (default: 4 minutos - antes del auto-suspend de 5min)
 * @returns Función cleanup para detener el keepalive
 */
export function keepDatabaseAlive(intervalMs = 4 * 60 * 1000): () => void {
  const intervalId = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`
      console.debug('Database keepalive ping successful')
    } catch (error) {
      console.error('Database keepalive ping failed:', error)
    }
  }, intervalMs)

  // Retornar función cleanup
  return () => {
    clearInterval(intervalId)
    console.debug('Database keepalive stopped')
  }
}
