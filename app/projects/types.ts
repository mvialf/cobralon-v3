/**
 * Type definitions for Projects module
 */

import { type EditableBadgeOption } from '@/components/ui/editable-badge'

/**
 * Project entity structure as returned by the API
 */
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

/**
 * Props for createColumns function
 */
export interface ColumnsProps {
  /** Callback ejecutado cuando cambian los datos (crear, actualizar, eliminar) */
  onDataChanged?: () => void
  /** Lista de estados disponibles para el EditableBadge */
  statuses?: EditableBadgeOption[]
  /** Estado de actualización (projectId actual siendo actualizado para estado) */
  updatingProjectId?: string | null
  /** Estado de actualización (projectId actual siendo actualizado para fecha) */
  updatingDateProjectId?: string | null
}

/**
 * Type-safe interface for table meta in Projects DataTable
 * Defines callbacks available through table.options.meta
 */
export interface ProjectsTableMeta {
  /** Callback to handle project status change */
  handleStatusChange?: (projectId: string, newStatusId: string) => Promise<void>
  /** Callback to handle project date change */
  handleDateChange?: (projectId: string, newDate: Date) => Promise<void>
}
