'use client'

import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, Eye, Receipt, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableDropdown } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { EditableBadge, type EditableBadgeOption } from '@/components/ui/editable-badge'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { PaymentProgressSummary } from '@/components/summarys/payment-progress-summary'
import { ViewProjectDetailsDialog } from '@/components/dialogs/projects/view-project-details-dialog'
import { ViewProjectPaymentsDialog } from '@/components/dialogs/projects/view-project-payments-dialog'
import { EditProjectDialog } from '@/components/dialogs/projects/edit-project-dialog'
import { PaymentToProjectDialog } from '@/components/dialogs/payments/payment-to-project-dialog'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'

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
  percentPaid: number // Porcentaje pagado (0-100) - calculado en backend
  customer: {
    id: string
    name: string
    phone: string
  }
}

interface ColumnsProps {
  onProjectDeleted?: () => void
  onProjectUpdated?: () => void
  /** Lista de estados disponibles para el EditableBadge */
  statuses?: EditableBadgeOption[]
  /** Estado de actualización (projectId actual siendo actualizado) */
  updatingProjectId?: string | null
}

/**
 * Type-safe interface for table meta in Projects DataTable
 * Defines callbacks available through table.options.meta
 */
interface ProjectsTableMeta {
  /** Callback to handle project status change */
  handleStatusChange?: (projectId: string, newStatusId: string) => Promise<void>
}

/**
 * Type guard to safely access table meta with proper TypeScript inference
 */
function getProjectsTableMeta(table: any): ProjectsTableMeta {
  return (table.options.meta || {}) as ProjectsTableMeta
}

export const createColumns = ({
  onProjectDeleted,
  onProjectUpdated,
  statuses = [],
  updatingProjectId = null,
}: ColumnsProps = {}): ColumnDef<Project>[] => [
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
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    accessorKey: 'projectStatus',
    header: 'Estado',
    cell: ({ row, table }) => {
      const project = row.original
      const status = project.projectStatus

      // Obtener el callback de actualización desde meta (type-safe)
      const { handleStatusChange } = getProjectsTableMeta(table)

      // Determinar si este proyecto específico está siendo actualizado
      const isPending = updatingProjectId === project.id

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
              ? (statusId: string) => handleStatusChange(project.id, statusId)
              : undefined
          }
          isPending={isPending}
          placeholder="Sin estado"
        />
      )
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
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
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
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
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
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },
  {
    accessorKey: 'date',
    header: 'Fecha Ingreso',
    cell: ({ row }) => {
      return formatDate(row.original.date, 'short', 'es-CL')
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
  {
    accessorKey: 'totalPaid',
    header: 'Total Pagado',
    cell: ({ row }) => {
      return (
        <PaymentProgressSummary
          totalPaid={row.original.totalPaid}
          percentPaid={row.original.percentPaid}
        />
      )
    },
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },
  {
    accessorKey: 'balance',
    header: 'Saldo',
    cell: ({ row }) => {
      const balance = row.original.balance

      return (
        <span>
          {new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(balance)}
        </span>
      )
    },
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <ProjectActionsCell
        project={row.original}
        onProjectDeleted={onProjectDeleted}
        onProjectUpdated={onProjectUpdated}
      />
    ),
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
]

/**
 * Componente de acciones para cada fila de la tabla de proyectos
 */
function ProjectActionsCell({
  project,
  onProjectDeleted,
  onProjectUpdated,
}: {
  project: Project
  onProjectDeleted?: () => void
  onProjectUpdated?: () => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

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
      <DataTableDropdown>
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

        {/* Registrar pago */}
        <DropdownMenuItem onClick={() => setPaymentDialogOpen(true)}>
          <DollarSign className="mr-2 h-4 w-4" />
          Registrar pago
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

        <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>

        <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DataTableDropdown>

      {/* Dialogs */}
      <ViewProjectDetailsDialog
        projectId={project.id}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <ViewProjectPaymentsDialog
        projectId={project.id}
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
      />

      {/* Dialog para editar proyecto */}
      <EditProjectDialog
        projectId={project.id}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProjectUpdated={onProjectUpdated}
      />

      {/* Dialog para registrar pago */}
      <PaymentToProjectDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        preselectedProjectId={project.id}
        onSuccess={() => {
          // Refetch la tabla cuando se registra un pago exitosamente
          onProjectDeleted?.()
        }}
      />
    </>
  )
}
