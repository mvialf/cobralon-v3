'use client'

import * as React from 'react'
import { PAISES_CONFIG } from '@/lib/paises-config'

// ============================================================================
// Types
// ============================================================================

/**
 * Configuración completa del usuario
 */
export type UserConfiguration = {
  // Ubicación
  pais: string
  region: string
  ciudad: string
  comuna: string

  // Configuración derivada automáticamente del país
  currency: string
  locale: string

  // Configuración personalizable (modo personalizado)
  modoPersonalizado: boolean
  idioma: string
  timezone: string
  primerDia: string
}

/**
 * Context type con métodos para actualizar configuración
 */
export type ConfigurationContextType = {
  configuration: UserConfiguration
  updateConfiguration: (updates: Partial<UserConfiguration>) => void
  resetToDefaults: () => void
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIGURATION: UserConfiguration = {
  pais: 'cl',
  region: '',
  ciudad: '',
  comuna: '',
  currency: 'CLP',
  locale: 'es-CL',
  modoPersonalizado: false,
  idioma: 'Español',
  timezone: 'America/Santiago',
  primerDia: 'lunes',
}

const STORAGE_KEY = 'user-configuration'

// ============================================================================
// Context Creation
// ============================================================================

const ConfigurationContext = React.createContext<ConfigurationContextType | undefined>(undefined)

// ============================================================================
// Provider Component
// ============================================================================

export function ConfigurationProvider({ children }: { children: React.ReactNode }) {
  const [configuration, setConfiguration] = React.useState<UserConfiguration>(DEFAULT_CONFIGURATION)
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Cargar configuración de localStorage en mount (solo cliente)
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as UserConfiguration
        setConfiguration(parsed)
      }
    } catch (error) {
      console.error('Error loading configuration from localStorage:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Sincronizar con localStorage cuando cambia la configuración
  React.useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configuration))
      } catch (error) {
        console.error('Error saving configuration to localStorage:', error)
      }
    }
  }, [configuration, isInitialized])

  // Función para actualizar configuración
  const updateConfiguration = React.useCallback((updates: Partial<UserConfiguration>) => {
    setConfiguration((prev) => {
      const newConfig = { ...prev, ...updates }

      // Si cambió el país y NO está en modo personalizado, derivar configuración automática
      if (updates.pais && !newConfig.modoPersonalizado) {
        const paisConfig = PAISES_CONFIG[updates.pais]
        if (paisConfig) {
          newConfig.currency = paisConfig.currency
          newConfig.locale = paisConfig.locale
          newConfig.idioma = paisConfig.idioma
          newConfig.timezone = paisConfig.timezone
          newConfig.primerDia = paisConfig.primerDia
        }
      }

      // Si activa modo personalizado, mantener valores actuales
      // Si desactiva modo personalizado, derivar del país actual
      if (updates.modoPersonalizado === false) {
        const paisConfig = PAISES_CONFIG[newConfig.pais]
        if (paisConfig) {
          newConfig.currency = paisConfig.currency
          newConfig.locale = paisConfig.locale
          newConfig.idioma = paisConfig.idioma
          newConfig.timezone = paisConfig.timezone
          newConfig.primerDia = paisConfig.primerDia
        }
      }

      return newConfig
    })
  }, [])

  // Función para resetear a defaults
  const resetToDefaults = React.useCallback(() => {
    setConfiguration(DEFAULT_CONFIGURATION)
  }, [])

  const value = React.useMemo(
    () => ({
      configuration,
      updateConfiguration,
      resetToDefaults,
    }),
    [configuration, updateConfiguration, resetToDefaults]
  )

  return <ConfigurationContext.Provider value={value}>{children}</ConfigurationContext.Provider>
}

// ============================================================================
// Hook to use Configuration
// ============================================================================

/**
 * Hook para acceder a la configuración del usuario
 *
 * @example
 * ```tsx
 * const { configuration, updateConfiguration } = useConfiguration()
 *
 * // Leer valores
 * console.log(configuration.currency) // 'CLP'
 *
 * // Actualizar
 * updateConfiguration({ pais: 'ar' }) // Auto-deriva currency='ARS', locale='es-AR'
 * ```
 */
export function useConfiguration() {
  const context = React.useContext(ConfigurationContext)
  if (context === undefined) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider')
  }
  return context
}
