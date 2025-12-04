'use client'

import { useState } from 'react'
import { Pencil, Trash2, Eye, Receipt, DollarSign, BadgePercent } from 'lucide-react'
import { DataTableDropdown } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ViewProjectDetailsDialog } from '@/components/dialogs/projects/view-project-details-dialog'
import { ViewProjectPaymentsDialog } from '@/components/dialogs/projects/view-project-payments-dialog'
import { EditProjectDialog } from '@/components/dialogs/projects/edit-project-dialog'
import { PaymentToProjectDialog } from '@/components/dialogs/payments/payment-to-project-dialog'
import { ProjectAdjustmentDialog } from '@/components/dialogs/projects/project-adjustment-dialog'
import { ConfirmDeleteDialog } from '@/components/dialogs/confirm-delete-dialog'
import { toast } from 'sonner'
import { type Project } from '../types'

interface ProjectActionsCellProps {
  project: Project
  onDataChanged?: () => void
}

/**
 * Componente de acciones para cada fila de la tabla de proyectos
 *
 * Renderiza el dropdown de acciones y todos los dialogs asociados
 */
export function ProjectActionsCell({ project, onDataChanged }: ProjectActionsCellProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar proyecto')
      }

      toast.success('Proyecto eliminado exitosamente')
      setDeleteConfirmOpen(false)
      onDataChanged?.()
    } catch (error) {
      console.error('Error al eliminar proyecto:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar proyecto')
    } finally {
      setIsDeleting(false)
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

        {/* Aplicar ajuste */}
        <DropdownMenuItem onClick={() => setAdjustmentDialogOpen(true)}>
          <BadgePercent className="mr-2 h-4 w-4" />
          Aplicar ajuste
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

        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DataTableDropdown>

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        title="Eliminar proyecto"
        description={`¿Estás seguro de eliminar el proyecto ${project.projectNumber}? Esta acción no se puede deshacer.`}
        isDeleting={isDeleting}
      />

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
        onProjectUpdated={onDataChanged}
      />

      {/* Dialog para registrar pago */}
      <PaymentToProjectDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        preselectedProjectId={project.id}
        onSuccess={() => {
          // Refetch la tabla cuando se registra un pago exitosamente
          onDataChanged?.()
        }}
      />

      {/* Dialog para aplicar ajuste */}
      <ProjectAdjustmentDialog
        projectId={project.id}
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        onSuccess={() => {
          // Refetch la tabla cuando se aplica un ajuste
          onDataChanged?.()
        }}
      />
    </>
  )
}
