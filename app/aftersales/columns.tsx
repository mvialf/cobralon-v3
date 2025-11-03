'use client'

import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Eye, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableDropdown } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
}

export const createColumns = ({
  onAftersaleUpdated,
}: ColumnsProps = {}): ColumnDef<Aftersale>[] => [
  {
    accessorKey: 'project',
    header: 'Proyecto',
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
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    accessorKey: 'reportedAt',
    header: 'Fecha',
    cell: ({ row }) => {
      const date = new Date(row.original.reportedAt)
      return <span className="text-sm">{formatDate(date, 'short')}</span>
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
  {
    accessorKey: 'aftersaleStatus',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.original.aftersaleStatus
      return (
        <Badge className={`${status.color.bgClass} ${status.color.textClass}`}>{status.name}</Badge>
      )
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
