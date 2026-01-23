'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * Crea una columna de selección (checkbox) reutilizable para cualquier DataTable.
 *
 * @example
 * ```tsx
 * import { createSelectColumn } from '@/components/data-table'
 *
 * const columns: ColumnDef<Project>[] = [
 *   createSelectColumn<Project>(),
 *   // ... resto de columnas
 * ]
 * ```
 */
export function createSelectColumn<T>(): ColumnDef<T> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: {
      headerClassName: 'w-[40px] text-center',
      cellClassName: 'text-center',
    },
  }
}
