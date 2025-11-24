'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { StatusOptionDisplay, type StatusOption } from '@/components/ui/status-option-display'
import { cn } from '@/lib/utils'

/**
 * Tipo para opciones de badge editables
 * @deprecated Usar StatusOption en su lugar (alias por compatibilidad)
 */
export type EditableBadgeOption = StatusOption

// Re-exportar StatusOption como alias principal
export type { StatusOption }

/**
 * Props para el componente EditableBadge
 */
export interface EditableBadgeProps {
  /** Valor actual seleccionado (puede ser null si no hay selección) */
  value: EditableBadgeOption | null
  /** Lista de opciones disponibles para seleccionar */
  options: EditableBadgeOption[]
  /** Callback cuando se selecciona una nueva opción */
  onChange?: (optionId: string) => void
  /** Indica si hay una operación pendiente (deshabilita interacción) */
  isPending?: boolean
  /** Modo solo lectura - solo muestra el badge sin dropdown */
  readOnly?: boolean
  /** Texto a mostrar durante operaciones pendientes */
  loadingText?: string
  /** Texto a mostrar cuando no hay valor seleccionado */
  placeholder?: string
  /** Clase CSS adicional para el badge */
  className?: string
}

/**
 * EditableBadge - Badge interactivo que permite cambiar su valor mediante dropdown
 *
 * @description
 * Componente genérico reutilizable que funciona en dos modos:
 * - **Modo interactivo**: Muestra dropdown al hacer click para cambiar el valor
 * - **Modo solo lectura**: Solo muestra el badge actual sin interacción
 *
 * Características:
 * - Feedback visual durante operaciones asíncronas (isPending)
 * - Marca visualmente la opción actual con icono de check
 * - Previene selección redundante (no dispara onChange si se selecciona el mismo valor)
 * - Colores configurables desde DB (compatible con StatusBadge)
 * - Accesible (keyboard navigation, screen readers)
 *
 * @example
 * ```tsx
 * // Modo interactivo (en tabla con edición inline)
 * <EditableBadge
 *   value={project.projectStatus}
 *   options={allProjectStatuses}
 *   onChange={(statusId) => updateProjectStatus(project.id, statusId)}
 *   isPending={isUpdating}
 * />
 *
 * // Modo solo lectura (en cards o vistas de detalle)
 * <EditableBadge
 *   value={project.projectStatus}
 *   readOnly
 * />
 * ```
 *
 * @see StatusBadge - Componente base usado para renderizar el badge
 * @see EditableBadgeOption - Interfaz para las opciones
 */
export function EditableBadge({
  value,
  options,
  onChange,
  isPending = false,
  readOnly = false,
  loadingText = 'Actualizando...',
  placeholder = 'Sin selección',
  className,
}: EditableBadgeProps) {
  // Modo solo lectura - solo muestra el badge
  if (readOnly || !onChange) {
    if (!value) {
      return <span className={cn('text-sm text-muted-foreground', className)}>{placeholder}</span>
    }

    return <StatusBadge bgClass={value.color.bgClass} label={value.label} className={className} />
  }

  // Modo interactivo - muestra dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-0 font-normal hover:bg-transparent"
          disabled={isPending}
          aria-label={
            value
              ? `Cambiar ${value.label}. Click para ver opciones.`
              : 'Seleccionar opción. Click para ver opciones.'
          }
        >
          {isPending ? (
            <StatusBadge bgClass="bg-gray-500" label={loadingText} className="cursor-wait" />
          ) : value ? (
            <StatusBadge
              bgClass={value.color.bgClass}
              label={value.label}
              className="cursor-pointer"
            />
          ) : (
            <span className={cn('text-sm text-muted-foreground cursor-pointer', className)}>
              {placeholder}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => {
          const isSelected = value?.id === option.id

          return (
            <DropdownMenuItem
              key={option.id}
              onClick={() => {
                // Prevenir selección redundante y durante operaciones pendientes
                if (!isSelected && !isPending) {
                  onChange(option.id)
                }
              }}
              className="cursor-pointer"
              aria-current={isSelected ? 'true' : 'false'}
            >
              <StatusOptionDisplay option={option} isSelected={isSelected} showCheck />
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
