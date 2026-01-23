/**
 * Column definitions for Projects DataTable
 */

import { type ColumnDef, type Table } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader, createSelectColumn } from '@/components/data-table'
import { EditableBadge } from '@/components/ui/editable-badge'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { PaymentProgressSummary } from '@/components/summarys/payment-progress-summary'
import { formatCurrency } from '@/lib/format'
import { calculateProjectState } from '@/lib/business-logic/project-state'
import { EditableDate } from '@/components/ui/editable-date'
import { ProjectActionsCell } from './components/project-actions-cell'
import {
  transformStatusToOption,
  sortByStatusName,
  filterByProjectStatus,
} from './utils/column-helpers'
import { type Project, type ColumnsProps, type ProjectsTableMeta } from './types'

// Re-export types for consumers
export { type Project } from './types'

/**
 * Type-safe helper to access table meta with proper TypeScript inference
 */
function getProjectsTableMeta(table: Table<Project>): ProjectsTableMeta {
  return (table.options.meta || {}) as ProjectsTableMeta
}

/**
 * Creates column definitions for Projects DataTable
 *
 * @param props - Configuration options for columns
 * @returns Array of column definitions
 */
export const createColumns = ({
  onDataChanged,
  statuses = [],
  updatingProjectId = null,
  updatingDateProjectId = null,
}: ColumnsProps = {}): ColumnDef<Project>[] => [
  // Columna de selección (checkbox)
  createSelectColumn<Project>(),
  {
    accessorKey: 'projectNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Proyecto" />,
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
    enableSorting: true,
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    accessorKey: 'projectStatus',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row, table }) => {
      const project = row.original
      const status = project.projectStatus

      // Obtener el callback de actualización desde meta (type-safe)
      const { handleStatusChange } = getProjectsTableMeta(table)

      // Determinar si este proyecto específico está siendo actualizado
      const isPending = updatingProjectId === project.id

      // Transformar status a EditableBadgeOption format usando helper
      const value = transformStatusToOption(status)

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
    enableSorting: true,
    sortingFn: sortByStatusName,
    filterFn: filterByProjectStatus,
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
  {
    id: 'projectState',
    accessorFn: (row) => {
      // Calcular estado del proyecto usando helper compartido
      return calculateProjectState(row.balance, row.projectStatus?.isFinal)
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado Proyecto" />,
    cell: ({ row }) => {
      const state = row.getValue('projectState') as string
      const variant = state === 'Finalizado' ? 'success' : 'default'
      return <Badge variant={variant}>{state}</Badge>
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      // Si el filtro incluye 'all', mostrar todas las filas
      if (value.includes('all')) return true
      return value.includes(row.getValue(id))
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
  {
    accessorKey: 'total',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => {
      return formatCurrency(row.original.total)
    },
    enableSorting: true,
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Ingreso" />,
    cell: ({ row, table }) => {
      const project = row.original
      const { handleDateChange } = getProjectsTableMeta(table)
      const isPending = updatingDateProjectId === project.id

      return (
        <EditableDate
          date={project.date}
          onChange={
            handleDateChange ? (newDate: Date) => handleDateChange(project.id, newDate) : undefined
          }
          isPending={isPending}
        />
      )
    },
    enableSorting: true,
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
  {
    accessorKey: 'totalPaid',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total Pagado" />,
    cell: ({ row }) => {
      return (
        <PaymentProgressSummary
          totalPaid={row.original.totalPaid}
          percentPaid={row.original.percentPaid}
        />
      )
    },
    enableSorting: true,
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Saldo" />,
    cell: ({ row }) => {
      return <span>{formatCurrency(row.original.balance)}</span>
    },
    enableSorting: true,
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <ProjectActionsCell project={row.original} onDataChanged={onDataChanged} />,
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
]
