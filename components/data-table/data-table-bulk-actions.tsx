'use client'

import * as React from 'react'
import { type Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Definición de una acción masiva para DataTable
 */
export interface BulkAction<T> {
  /** Identificador único de la acción */
  id: string
  /** Texto del botón */
  label: string
  /** Icono opcional (componente de Lucide) */
  icon?: React.ComponentType<{ className?: string }>
  /** Variante del botón */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  /** Callback que recibe las filas seleccionadas */
  onClick: (selectedRows: T[]) => void | Promise<void>
  /** Si está deshabilitado */
  disabled?: boolean
}

interface DataTableBulkActionsProps<T> {
  /** Instancia de tabla de TanStack */
  table: Table<T>
  /** Acciones masivas disponibles */
  actions: BulkAction<T>[]
  /** Clases CSS adicionales */
  className?: string
}

/**
 * Barra de acciones masivas que aparece cuando hay filas seleccionadas.
 *
 * Se posiciona como sticky en la parte inferior de la tabla con una animación
 * de entrada/salida suave.
 *
 * @example
 * ```tsx
 * <DataTableBulkActions
 *   table={table}
 *   actions={[
 *     {
 *       id: 'delete',
 *       label: 'Eliminar',
 *       icon: Trash2,
 *       variant: 'destructive',
 *       onClick: (rows) => handleBulkDelete(rows),
 *     },
 *   ]}
 * />
 * ```
 */
export function DataTableBulkActions<T>({
  table,
  actions,
  className,
}: DataTableBulkActionsProps<T>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length
  const hasSelection = selectedCount > 0

  // Estado de loading para acciones async
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null)

  // Handler que envuelve onClick para manejar async
  const handleAction = async (action: BulkAction<T>) => {
    if (action.disabled || loadingAction) return

    const rowsData = selectedRows.map((row) => row.original)
    const result = action.onClick(rowsData)

    // Si es una Promise, mostrar estado de loading
    if (result instanceof Promise) {
      setLoadingAction(action.id)
      try {
        await result
      } finally {
        setLoadingAction(null)
      }
    }
  }

  // Limpiar selección
  const handleClearSelection = () => {
    table.resetRowSelection()
  }

  // No renderizar si no hay selección
  if (!hasSelection) {
    return null
  }

  return (
    <div
      className={cn(
        // Posicionamiento sticky en la parte inferior
        'sticky bottom-0 z-10',
        // Contenedor con padding para separar del borde
        'px-4 py-3',
        // Animación de entrada
        'animate-in slide-in-from-bottom-2 duration-200',
        className
      )}
    >
      <div
        className={cn(
          // Contenedor interno con estilos
          'flex items-center justify-between gap-4',
          'rounded-lg border bg-muted/80 backdrop-blur-sm',
          'px-4 py-3 shadow-lg'
        )}
      >
        {/* Info de selección */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'seleccionado' : 'seleccionados'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Deseleccionar
          </Button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {actions.map((action) => {
            const Icon = action.icon
            const isLoading = loadingAction === action.id
            const isDisabled = action.disabled || loadingAction !== null

            return (
              <Button
                key={action.id}
                variant={action.variant || 'default'}
                size="sm"
                onClick={() => handleAction(action)}
                disabled={isDisabled}
              >
                {Icon && <Icon className={cn('h-4 w-4', action.label && 'mr-2')} />}
                {isLoading ? 'Procesando...' : action.label}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
