'use client'

import { useState } from 'react'
import { type ColumnDef, type Table } from '@tanstack/react-table'
import { Pencil, Eye, Trash2 } from 'lucide-react'
import { DataTableDropdown, DataTableColumnHeader } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { EditableBadge, type EditableBadgeOption } from '@/components/ui/editable-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { AftersaleDialog } from '@/components/dialogs/aftersales/aftersale-dialog'
import { formatDate } from '@/lib/format'
import type { Aftersale } from '@/lib/validations/aftersale-validations'

interface ColumnsProps {
  onAftersaleUpdated?: () => void
  /** Lista de estados disponibles para el EditableBadge */
  statuses?: EditableBadgeOption[]
  /** Estado de actualización (aftersaleId actual siendo actualizado) */
  updatingAftersaleId?: string | null
}

/**
 * Type-safe interface for table meta in Aftersales DataTable
 * Defines callbacks available through table.options.meta
 */
interface AftersalesTableMeta {
  /** Callback to handle aftersale status change */
  handleStatusChange?: (aftersaleId: string, newStatusId: string) => Promise<void>
}

/**
 * Type guard to safely access table meta with proper TypeScript inference
 */
function getAftersalesTableMeta(table: Table<Aftersale>): AftersalesTableMeta {
  return (table.options.meta || {}) as AftersalesTableMeta
}

export const createColumns = ({
  onAftersaleUpdated,
  statuses = [],
  updatingAftersaleId = null,
}: ColumnsProps = {}): ColumnDef<Aftersale>[] => [
  {
    accessorKey: 'project',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Proyecto" />,
    cell: ({ row }) => {
      const aftersale = row.original
      return (
        <ProjectNameSummary
          projectId={aftersale.project.id}
          projectNumber={aftersale.project.projectNumber}
          customerName={aftersale.project.customer.name}
          projectName={aftersale.project.projectName}
        />
      )
    },
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const projectA = rowA.original.project.projectNumber
      const projectB = rowB.original.project.projectNumber
      return projectA.localeCompare(projectB)
    },
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    accessorKey: 'reportedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      const date = new Date(row.original.reportedAt)
      return <span className="text-sm">{formatDate(date, 'short', 'es-CL')}</span>
    },
    enableSorting: true,
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
  {
    accessorKey: 'aftersaleStatus',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row, table }) => {
      const aftersale = row.original
      const status = aftersale.aftersaleStatus

      // Obtener el callback de actualización desde meta (type-safe)
      const { handleStatusChange } = getAftersalesTableMeta(table)

      // Determinar si este caso específico está siendo actualizado
      const isPending = updatingAftersaleId === aftersale.id

      // Transformar status a EditableBadgeOption format
      const value: EditableBadgeOption | null = status
        ? {
            id: status.id,
            label: status.name,
            color: status.color,
          }
        : null

      return (
        <EditableBadge
          value={value}
          options={statuses}
          onChange={
            handleStatusChange
              ? (statusId: string) => handleStatusChange(aftersale.id, statusId)
              : undefined
          }
          isPending={isPending}
          placeholder="Sin estado"
        />
      )
    },
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const statusA = rowA.original.aftersaleStatus.name
      const statusB = rowB.original.aftersaleStatus.name
      return statusA.localeCompare(statusB)
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => {
      const description = row.original.description
      // Truncar descripción si es muy larga
      const truncated =
        description.length > 100 ? `${description.substring(0, 100)}...` : description

      return (
        <span className="text-sm text-muted-foreground" title={description}>
          {truncated}
        </span>
      )
    },
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      const aftersale = row.original
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { toast } = useToast()

      const handleDelete = async () => {
        try {
          const response = await fetch(`/api/aftersales/${aftersale.id}`, {
            method: 'DELETE',
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Error al eliminar el caso de postventa')
          }

          toast({
            title: 'Caso eliminado',
            description: data.message || 'El caso de postventa se eliminó correctamente',
          })

          setIsDeleteDialogOpen(false)
          onAftersaleUpdated?.()
        } catch (error) {
          toast({
            title: 'Error',
            description:
              error instanceof Error ? error.message : 'Error al eliminar el caso de postventa',
            variant: 'destructive',
          })
        }
      }

      return (
        <>
          <DataTableDropdown>
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // Aquí se puede agregar un dialog de vista detallada si se necesita
                console.log('Ver detalle:', aftersale.id)
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalle
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DataTableDropdown>

          {/* Edit Dialog */}
          {isEditDialogOpen && (
            <AftersaleDialog
              mode="edit"
              aftersale={aftersale}
              onSuccess={() => {
                onAftersaleUpdated?.()
                setIsEditDialogOpen(false)
              }}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
            />
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente el caso de
                  postventa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
]
