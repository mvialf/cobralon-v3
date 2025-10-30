'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

/**
 * React Query Provider
 *
 * Configura QueryClient con opciones optimizadas para el proyecto:
 * - staleTime: 60s - Datos considerados frescos por 1 minuto
 * - gcTime: 5min - Garbage collection después de 5 minutos de inactividad
 * - retry: 1 - Un solo reintento automático en caso de error
 * - refetchOnWindowFocus: true - Refetch al volver a la pestaña (sync multi-tab)
 * - refetchOnReconnect: true - Refetch al reconectar internet
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Crear QueryClient en useState para evitar recrear en cada render
  // https://tanstack.com/query/latest/docs/framework/react/guides/ssr#initial-setup
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Datos frescos por 1 minuto (evita refetch innecesario en SSR)
            staleTime: 60 * 1000,
            // Garbage collection después de 5 minutos
            gcTime: 5 * 60 * 1000,
            // 1 retry automático en caso de error
            retry: 1,
            // Refetch al volver a la pestaña (sync multi-tab)
            refetchOnWindowFocus: true,
            // Refetch al reconectar internet
            refetchOnReconnect: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools - Solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}
