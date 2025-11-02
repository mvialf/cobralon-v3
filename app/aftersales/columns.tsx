'use client'

import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableDropdown } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
      return <span className="text-sm">{formatDate(date, { variant: 'short' })}</span>
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
        </>
      )
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
]
