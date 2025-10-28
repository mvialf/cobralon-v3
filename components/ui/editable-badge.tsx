'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Interfaz para opciones de badge editables
 */
export interface EditableBadgeOption {
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
              className="flex items-center justify-between"
              aria-current={isSelected ? 'true' : 'false'}
            >
              <span className={cn(isSelected && 'font-medium text-primary')}>{option.label}</span>
              {isSelected && <Check className="ml-2 h-4 w-4 text-primary" aria-hidden="true" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
