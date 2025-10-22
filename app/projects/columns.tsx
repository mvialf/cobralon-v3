'use client'

import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2, Eye, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { ViewProjectDetailsSheet } from '@/components/dialogs/projects/view-project-details-sheet'
import { ViewProjectPaymentsSheet } from '@/components/dialogs/projects/view-project-payments-sheet'
import { toast } from 'sonner'

export interface Project {
  id: string
  projectNumber: string
  projectName: string | null
  date: Date | string // Fecha de ingreso del proyecto
  projectStatus: {
    id: string
    name: string
    isFinal?: boolean // Indica si es un estado final (ej: Completado)
    color: {
      bgClass: string
    }
  } | null
  total: number // Decimal se convierte a number en JSON
  totalPaid: number // Total pagado (solo pagos ACTIVE) - calculado en backend
  balance: number // Saldo pendiente (total - totalPaid) - calculado en backend
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
          projectId={project.id}
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
    id: 'projectState',
    accessorFn: (row) => {
      // Calcular estado del proyecto: Activo vs Finalizado
      const isFullyPaid = row.balance === 0
      const hasFinalStatus = row.projectStatus?.isFinal ?? false
      return isFullyPaid && hasFinalStatus ? 'Finalizado' : 'Activo'
    },
    header: 'Estado Proyecto',
    cell: ({ row }) => {
      const state = row.getValue('projectState') as string
      const variant = state === 'Finalizado' ? 'success' : 'default'
      return <Badge variant={variant}>{state}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
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
    accessorKey: 'date',
    header: 'Fecha Ingreso',
    cell: ({ row }) => {
      const date = row.original.date
      // Convertir a Date si es string
      const dateObj = typeof date === 'string' ? new Date(date) : date
      // Formatear en español (dd/mm/yyyy)
      return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(dateObj)
    },
  },
  {
    accessorKey: 'totalPaid',
    header: 'Total Pagado',
    cell: ({ row }) => {
      const totalPaid = row.original.totalPaid
      const total = row.original.total

      // Calcular porcentaje pagado
      const percentPaid = total > 0 ? Math.round((totalPaid / total) * 100) : 0

      // Determinar color del badge según porcentaje
      let badgeVariant: 'success' | 'default' | 'secondary' | 'destructive' | 'outline' = 'default'

      if (percentPaid === 100) {
        badgeVariant = 'success'
      } else if (percentPaid >= 67) {
        badgeVariant = 'default'
      } else if (percentPaid >= 34) {
        badgeVariant = 'secondary'
      } else {
        badgeVariant = 'destructive'
      }

      // Formatear como moneda CLP (sin decimales)
      const formattedAmount = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(totalPaid)

      return (
        <div className="flex items-center gap-2">
          <span>{formattedAmount}</span>
          <Badge variant={badgeVariant}>{percentPaid}%</Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'balance',
    header: 'Saldo',
    cell: ({ row }) => {
      const balance = row.original.balance

      // Color: rojo si deuda, verde si pagado completamente
      const colorClass =
        balance > 0.01 ? 'text-destructive font-medium' : 'text-green-600 font-medium'

      return (
        <span className={colorClass}>
          {new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(balance)}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <ProjectActionsCell project={row.original} onProjectDeleted={onProjectDeleted} />
    ),
  },
]

/**
 * Componente de acciones para cada fila de la tabla de proyectos
 */
function ProjectActionsCell({
  project,
  onProjectDeleted,
}: {
  project: Project
  onProjectDeleted?: () => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [paymentsOpen, setPaymentsOpen] = useState(false)

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>

          {/* Ver detalles */}
          <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </DropdownMenuItem>

          {/* Ver pagos */}
          <DropdownMenuItem onClick={() => setPaymentsOpen(true)}>
            <Receipt className="mr-2 h-4 w-4" />
            Ver pagos
          </DropdownMenuItem>

          <DropdownMenuSeparator />

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

      {/* Sheets */}
      <ViewProjectDetailsSheet
        projectId={project.id}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <ViewProjectPaymentsSheet
        projectId={project.id}
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
      />
    </>
  )
}
