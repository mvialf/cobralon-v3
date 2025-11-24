/**
 * DatabaseKeepaliveProvider
 *
 * Provider que mantiene la base de datos Neon activa durante la sesión.
 * Envuélvelo en tu layout principal para habilitar keepalive global.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { DatabaseKeepaliveProvider } from '@/components/providers/database-keepalive-provider'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <DatabaseKeepaliveProvider>
 *           {children}
 *         </DatabaseKeepaliveProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */

'use client'

import { useDatabaseKeepalive } from '@/hooks/use-database-keepalive'
import { useEffect, useState } from 'react'

interface DatabaseKeepaliveProviderProps {
  children: React.ReactNode
  /**
   * Auto-habilitar keepalive (default: false)
   * Si false, solo se activa cuando el usuario interactúa con la app
   */
  autoEnable?: boolean
}

export function DatabaseKeepaliveProvider({
  children,
  autoEnable = false,
}: DatabaseKeepaliveProviderProps) {
  const [enabled, setEnabled] = useState(autoEnable)

  // Habilitar keepalive cuando el usuario interactúe con la página
  useEffect(() => {
    if (autoEnable) return

    const handleUserActivity = () => {
      setEnabled(true)
    }

    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']

    events.forEach((event) => {
      document.addEventListener(event, handleUserActivity, { once: true })
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserActivity)
      })
    }
  }, [autoEnable])

  useDatabaseKeepalive({
    enabled,
    intervalMs: 4 * 60 * 1000, // 4 minutos
    onSuccess: (data) => {
      if (data.coldStart) {
        console.info(
          `Database cold start detected (${data.latency}). Consider warmup on critical paths.`
        )
      }
    },
    onError: (error) => {
      console.error('Database keepalive error:', error.message)
    },
  })

  return <>{children}</>
}
