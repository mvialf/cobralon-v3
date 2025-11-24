import * as React from 'react'
import { Check, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Interface compartida para opciones de status
 * Usada por EditableBadge, ProjectForm, DataTableFilter, etc.
 */
export interface StatusOption {
  /** ID único de la opción */
  id: string
  /** Etiqueta a mostrar */
  label: string
  /** Configuración de color */
  color: {
    /** Clase de background (ej: "bg-blue-500") */
    bgClass: string
  }
}

/**
 * Props para StatusOptionDisplay
 */
export interface StatusOptionDisplayProps {
  /** Opción de status a renderizar */
  option: StatusOption
  /** Si la opción está seleccionada actualmente */
  isSelected?: boolean
  /** Mostrar checkbox para multi-select (usado en filtros) */
  showCheckbox?: boolean
  /** Mostrar check icon para single-select (usado en badge/form) */
  showCheck?: boolean
  /** Mostrar contador de facets (usado en filtros) */
  showCounter?: boolean
  /** Valor del contador */
  count?: number
}

/**
 * StatusOptionDisplay - Componente visual para opciones de status
 *
 * @description
 * Componente reutilizable que unifica la visualización de opciones de status
 * en diferentes contextos (filtros, forms, badges).
 *
 * Características:
 * - Muestra icono cuadrado de color + texto del status
 * - Soporta checkbox para multi-select (filtros)
 * - Soporta check icon para single-select (badge/form)
 * - Opcionalmente muestra contador de items (facets en filtros)
 * - Visual consistente, limpio y compacto
 *
 * @example
 * ```tsx
 * // En filtros multi-select
 * <StatusOptionDisplay
 *   option={statusOption}
 *   isSelected={true}
 *   showCheckbox
 *   showCounter
 *   count={5}
 * />
 *
 * // En forms/badge single-select
 * <StatusOptionDisplay
 *   option={statusOption}
 *   isSelected={true}
 *   showCheck
 * />
 * ```
 */
export function StatusOptionDisplay({
  option,
  isSelected = false,
  showCheckbox = false,
  showCheck = false,
  showCounter = false,
  count,
}: StatusOptionDisplayProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {/* Checkbox para multi-select (filtros) */}
        {showCheckbox && (
          <div
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
              isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'
            )}
          >
            <CheckIcon className="h-4 w-4" />
          </div>
        )}

        {/* Icono cuadrado pequeño con el color del status */}
        <div className={cn('h-3 w-3 rounded-sm flex-shrink-0', option.color.bgClass)} />

        {/* Texto del nombre del status */}
        <span className={cn('text-sm', isSelected && 'font-medium')}>{option.label}</span>

        {/* Check icon para single-select (badge/form) */}
        {showCheck && isSelected && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
      </div>

      {/* Contador de items (facets en filtros) */}
      {showCounter && count !== undefined && count > 0 && (
        <span className="flex h-4 w-4 items-center justify-center font-mono text-xs">{count}</span>
      )}
    </div>
  )
}
