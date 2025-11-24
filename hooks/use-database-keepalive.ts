/**
 * useDatabaseKeepalive Hook
 *
 * Mantiene la base de datos Neon activa durante la sesión del usuario
 * haciendo ping periódico al endpoint de warmup.
 *
 * @example
 * ```tsx
 * // En tu layout o página principal
 * function Dashboard() {
 *   useDatabaseKeepalive({ enabled: true })
 *   return <div>...</div>
 * }
 * ```
 */

'use client'

import { useEffect, useRef } from 'react'

interface UseDatabaseKeepaliveOptions {
  /**
   * Habilitar keepalive (default: false)
   * Solo habilitar cuando el usuario esté activamente usando la app
   */
  enabled?: boolean

  /**
   * Intervalo en milisegundos (default: 4 minutos)
   * Neon suspende después de 5 minutos, así que hacemos ping cada 4 min
   */
  intervalMs?: number

  /**
   * Callback cuando el ping es exitoso
   */
  onSuccess?: (data: { latency: string; coldStart: boolean }) => void

  /**
   * Callback cuando el ping falla
   */
  onError?: (error: Error) => void
}

export function useDatabaseKeepalive({
  enabled = false,
  intervalMs = 4 * 60 * 1000, // 4 minutos
  onSuccess,
  onError,
}: UseDatabaseKeepaliveOptions = {}) {
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Función para hacer ping al endpoint de warmup
    const pingDatabase = async () => {
      try {
        const response = await fetch('/api/health/warmup')
        const data = await response.json()

        if (response.ok) {
          onSuccess?.(data)
          console.debug('Database keepalive ping successful:', data)
        } else {
          throw new Error(data.message || 'Warmup failed')
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        onError?.(err)
        console.error('Database keepalive ping failed:', err)
      }
    }

    // Hacer ping inicial inmediatamente
    pingDatabase()

    // Configurar intervalo
    intervalRef.current = setInterval(pingDatabase, intervalMs)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        console.debug('Database keepalive stopped')
      }
    }
  }, [enabled, intervalMs, onSuccess, onError])
}
