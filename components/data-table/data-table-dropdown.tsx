import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

interface DataTableDropdownProps {
  /**
   * Contenido del dropdown (DropdownMenuLabel, DropdownMenuItem, etc.)
   */
  children: React.ReactNode
  /**
   * Alineación del contenido del dropdown respecto al trigger
   * @default "end"
   */
  align?: 'start' | 'end' | 'center'
  /**
   * Texto para screen readers (accesibilidad)
   * @default "Abrir menu"
   */
  triggerLabel?: string
}

/**
 * Dropdown estándar para columnas de actions en DataTable.
 *
 * Encapsula el patrón común de DropdownMenu + Trigger con botón ghost + icono MoreHorizontal.
 * Elimina la necesidad de repetir el código del trigger en cada tabla.
 *
 * @example
 * ```tsx
 * // En columns.tsx
 * import { DataTableDropdown } from '@/components/data-table'
 *
 * {
 *   id: 'actions',
 *   cell: ({ row }) => {
 *     const item = row.original
 *
 *     return (
 *       <DataTableDropdown>
 *         <DropdownMenuLabel>Acciones</DropdownMenuLabel>
 *         <DropdownMenuItem onClick={() => handleEdit(item)}>
 *           <Pencil className="mr-2 h-4 w-4" />
 *           Editar
 *         </DropdownMenuItem>
 *         <DropdownMenuItem onClick={() => handleDelete(item)}>
 *           <Trash2 className="mr-2 h-4 w-4" />
 *           Eliminar
 *         </DropdownMenuItem>
 *       </DataTableDropdown>
 *     )
 *   },
 * }
 * ```
 */
export function DataTableDropdown({
  children,
  align = 'end',
  triggerLabel = 'Abrir menu',
}: DataTableDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{triggerLabel}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
