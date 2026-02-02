'use client'

import { useState } from 'react'
import { type ColumnDef, type Table } from '@tanstack/react-table'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { DataTableDropdown, DataTableColumnHeader } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { EditableBadge, type EditableBadgeOption } from '@/components/ui/editable-badge'
import { EditVisitDialog } from '@/components/dialogs/visits/edit-visit-dialog'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'
import Link from 'next/link'

export interface Visit {
  id: string
  name: string
  phone: string | null
  street: string
  apartment: string | null
  comuna: string
  region: string
  date: Date | string
  observations: string | null
  visitStatus: {
    id: string
    name: string
    isInitial?: boolean
    isFinal?: boolean
    color: {
      bgClass: string
      textClass: string
    }
  }
  createdAt: Date | string
  updatedAt: Date | string
}

interface ColumnsProps {
  onVisitDeleted?: () => void
  onVisitUpdated?: () => void
  /** Lista de estados disponibles para el EditableBadge */
  statuses?: EditableBadgeOption[]
  /** Estado de actualización (visitId actual siendo actualizado) */
  updatingVisitId?: string | null
}

/**
 * Type-safe interface for table meta in Visits DataTable
 */
interface VisitsTableMeta {
  /** Callback to handle visit status change */
  handleStatusChange?: (visitId: string, newStatusId: string) => Promise<void>
}

/**
 * Type guard to safely access table meta
 */
function getVisitsTableMeta(table: Table<Visit>): VisitsTableMeta {
  return (table.options.meta || {}) as VisitsTableMeta
}

export const createColumns = ({
  onVisitDeleted,
  onVisitUpdated,
  statuses = [],
  updatingVisitId = null,
}: ColumnsProps = {}): ColumnDef<Visit>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => {
      const visit = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{visit.name}</span>
          {visit.phone && <span className="text-sm text-muted-foreground">{visit.phone}</span>}
        </div>
      )
    },
    enableSorting: true,
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Solicitud" />,
    cell: ({ row }) => {
      const date = row.original.date
      return formatDate(date, 'short', 'es-CL')
    },
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.original.date).getTime()
      const dateB = new Date(rowB.original.date).getTime()
      return dateA - dateB
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
  {
    accessorKey: 'visitStatus',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row, table }) => {
      const visit = row.original
      const status = visit.visitStatus

      // Obtener el callback de actualización desde meta (type-safe)
      const { handleStatusChange } = getVisitsTableMeta(table)

      // Determinar si esta visita específica está siendo actualizada
      const isPending = updatingVisitId === visit.id

      // Transformar status a EditableBadgeOption format
      const value: EditableBadgeOption = {
        id: status.id,
        label: status.name,
        color: status.color,
      }

      return (
        <EditableBadge
          value={value}
          options={statuses}
          onChange={
            handleStatusChange
              ? (statusId: string) => handleStatusChange(visit.id, statusId)
              : undefined
          }
          isPending={isPending}
          placeholder="Sin estado"
        />
      )
    },
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const statusA = rowA.original.visitStatus.name
      const statusB = rowB.original.visitStatus.name
      return statusA.localeCompare(statusB)
    },
    filterFn: (row, _id, filterValue) => {
      const status = row.original.visitStatus
      if (filterValue.includes(status.id)) {
        return true
      }
      return false
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
  {
    accessorKey: 'comuna',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Comuna" />,
    cell: ({ row }) => {
      const visit = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{visit.comuna}</span>
          <span className="text-sm text-muted-foreground">{visit.street}</span>
        </div>
      )
    },
    enableSorting: true,
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-center">Acciones</div>,
    cell: function Cell({ row }) {
      const visit = row.original
      const [editOpen, setEditOpen] = useState(false)
      const [isDeleting, setIsDeleting] = useState(false)

      const handleDelete = async () => {
        if (
          !confirm(
            `¿Estás seguro de eliminar la visita de "${visit.name}"?\n\nEsta acción no se puede deshacer.`
          )
        ) {
          return
        }

        setIsDeleting(true)

        try {
          const response = await fetch(`/api/visits/${visit.id}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Error al eliminar visita')
          }

          toast.success('Visita eliminada exitosamente')
          onVisitDeleted?.()
        } catch (error) {
          console.error('Error al eliminar visita:', error)
          toast.error(error instanceof Error ? error.message : 'Error al eliminar visita')
        } finally {
          setIsDeleting(false)
        }
      }

      return (
        <>
          <DataTableDropdown triggerLabel={`Abrir menú para visita de ${visit.name}`}>
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Ver detalles */}
            <DropdownMenuItem asChild>
              <Link href={`/visits/${visit.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </Link>
            </DropdownMenuItem>

            {/* Editar */}
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar visita
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Eliminar */}
            <DropdownMenuItem
              onSelect={handleDelete}
              disabled={isDeleting}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Eliminando...' : 'Eliminar visita'}
            </DropdownMenuItem>
          </DataTableDropdown>

          {/* Edit Dialog */}
          <EditVisitDialog
            visitId={visit.id}
            open={editOpen}
            onOpenChange={setEditOpen}
            onVisitUpdated={onVisitUpdated}
          />
        </>
      )
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
]
