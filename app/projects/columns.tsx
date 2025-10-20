'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { toast } from 'sonner'

export interface Project {
  id: string
  projectNumber: string
  projectName: string | null
  projectStatus: {
    id: string
    name: string
    color: {
      bgClass: string
    }
  } | null
  total: number // Decimal se convierte a number en JSON
  customer: {
    id: string
    name: string
    phone: string
  }
}

interface ColumnsProps {
  onProjectDeleted?: () => void
}

export const createColumns = ({ onProjectDeleted }: ColumnsProps = {}): ColumnDef<Project>[] => [
  {
    accessorKey: 'projectNumber',
    header: 'Proyecto',
    cell: ({ row }) => {
      const project = row.original
      return (
        <ProjectNameSummary
          projectNumber={project.projectNumber}
          customerName={project.customer.name}
          projectName={project.projectName}
        />
      )
    },
  },
  {
    accessorKey: 'projectStatus',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.original.projectStatus
      if (!status) return <span className="text-muted-foreground">Sin estado</span>
      return <StatusBadge bgClass={status.color.bgClass} label={status.name} />
    },
    filterFn: (row, _id, filterValue) => {
      const status = row.original.projectStatus
      // Si el filtro es "null", mostrar solo proyectos sin estado
      if (filterValue.includes('null')) {
        if (!status) return true
      }
      // Si hay status, verificar si su id está en los valores del filtro
      if (status && filterValue.includes(status.id)) {
        return true
      }
      return false
    },
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) => {
      const total = row.original.total
      // Formatear como moneda CLP (sin decimales)
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(total)
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const project = row.original

      const handleDelete = async () => {
        if (!confirm(`¿Estás seguro de eliminar el proyecto ${project.projectNumber}?`)) {
          return
        }

        try {
          const response = await fetch(`/api/projects/${project.id}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Error al eliminar proyecto')
          }

          toast.success('Proyecto eliminado exitosamente')
          onProjectDeleted?.()
        } catch (error) {
          console.error('Error al eliminar proyecto:', error)
          toast.error(error instanceof Error ? error.message : 'Error al eliminar proyecto')
        }
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(`${project.customer.name} - ${project.projectNumber}`)
              }
            >
              Copiar información
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
