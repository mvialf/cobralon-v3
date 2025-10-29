'use client'

/**
 * COLUMNS DEFINITION para DataTable Examples
 *
 * Este archivo demuestra TODAS las capacidades del DataTable:
 * - ✅ Meta Alignment (left, center, right)
 * - ✅ Sorting (todas las columnas)
 * - ✅ Filtering (faceted filters)
 * - ✅ Custom Cell Rendering (componentes summary)
 * - ✅ Conditional Styling (colores según valor)
 * - ✅ Actions Dropdown
 * - ✅ EditableBadge
 * - ✅ StatusBadge
 * - ✅ PaymentProgressSummary
 */

import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Eye, Edit, Trash2, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PaymentProgressSummary } from '@/components/summarys/payment-progress-summary'
import { formatDate } from '@/lib/format'
import { type MockProject } from './mock-data'
import { toast } from 'sonner'

/**
 * Componente para mostrar el nombre del proyecto con número
 */
function ProjectNameCell({
  projectNumber,
  projectName,
}: {
  projectNumber: string
  projectName: string | null
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{projectNumber}</span>
      {projectName && (
        <span className="text-sm text-muted-foreground line-clamp-1">{projectName}</span>
      )}
    </div>
  )
}

/**
 * Componente para mostrar cliente con teléfono
 */
function CustomerCell({
  customerName,
  customerPhone,
}: {
  customerName: string
  customerPhone: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium line-clamp-1">{customerName}</span>
      <span className="text-xs text-muted-foreground">{customerPhone}</span>
    </div>
  )
}

/**
 * Badge de estado con colores
 */
function StatusBadge({ status }: { status: MockProject['status'] }) {
  const variants: Record<
    MockProject['status'],
    'default' | 'success' | 'secondary' | 'destructive' | 'outline'
  > = {
    'En Proceso': 'default',
    Completado: 'success',
    Pendiente: 'secondary',
    Cancelado: 'destructive',
    'En Revisión': 'outline',
  }

  return <Badge variant={variants[status]}>{status}</Badge>
}

/**
 * Badge de prioridad con colores
 */
function PriorityBadge({ priority }: { priority: MockProject['priority'] }) {
  const config = {
    high: { label: 'Alta', variant: 'destructive' as const },
    medium: { label: 'Media', variant: 'default' as const },
    low: { label: 'Baja', variant: 'secondary' as const },
  }

  const { label, variant } = config[priority]
  return <Badge variant={variant}>{label}</Badge>
}

/**
 * Formatear moneda CLP
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Dropdown de acciones (demo)
 */
function ActionsDropdown({ project }: { project: MockProject }) {
  const handleView = () => {
    toast.info(`Ver detalles: ${project.projectNumber}`)
  }

  const handleEdit = () => {
    toast.info(`Editar: ${project.projectNumber}`)
  }

  const handleDelete = () => {
    toast.error(`Eliminar: ${project.projectNumber} (demo)`)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`${project.customerName} - ${project.projectNumber}`)
    toast.success('Información copiada')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menú</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleView}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copiar información
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * DEFINICIÓN DE COLUMNAS
 *
 * Cada columna demuestra una característica diferente del DataTable
 */
export const exampleColumns: ColumnDef<MockProject>[] = [
  // 1. COLUMNA TEXTO (Alineación Izquierda)
  {
    accessorKey: 'projectNumber',
    header: 'Proyecto',
    cell: ({ row }) => (
      <ProjectNameCell
        projectNumber={row.original.projectNumber}
        projectName={row.original.projectName}
      />
    ),
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
    enableSorting: true,
  },

  // 2. COLUMNA CLIENTE (Con sub-texto)
  {
    accessorKey: 'customerName',
    header: 'Cliente',
    cell: ({ row }) => (
      <CustomerCell
        customerName={row.original.customerName}
        customerPhone={row.original.customerPhone}
      />
    ),
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
    enableSorting: true,
  },

  // 3. BADGE ESTADO (Filtrable + Centro)
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
    enableSorting: true,
  },

  // 4. BADGE PRIORIDAD (Filtrable + Centro)
  {
    accessorKey: 'priority',
    header: 'Prioridad',
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
    enableSorting: true,
  },

  // 5. MONEDA (Alineación Derecha)
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) => formatCurrency(row.original.total),
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
    enableSorting: true,
  },

  // 6. PAYMENT PROGRESS (Componente Summary + Derecha)
  {
    accessorKey: 'totalPaid',
    header: 'Pagado',
    cell: ({ row }) => (
      <PaymentProgressSummary
        totalPaid={row.original.totalPaid}
        percentPaid={row.original.percentPaid}
      />
    ),
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
    enableSorting: true,
  },

  // 7. BALANCE CON CONDITIONAL STYLING (Colores según valor)
  {
    accessorKey: 'balance',
    header: 'Saldo',
    cell: ({ row }) => {
      const balance = row.original.balance
      const className =
        balance === 0
          ? 'text-success font-semibold'
          : balance > 2000000
            ? 'text-destructive font-semibold'
            : ''
      return <span className={className}>{formatCurrency(balance)}</span>
    },
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
    enableSorting: true,
  },

  // 8. FECHA (Centro)
  {
    accessorKey: 'date',
    header: 'Fecha',
    cell: ({ row }) => formatDate(row.original.date, 'short', 'es-CL'),
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
    enableSorting: true,
  },

  // 9. ASIGNADO (Texto simple)
  {
    accessorKey: 'assignedTo',
    header: 'Asignado',
    cell: ({ row }) => <span className="text-sm">{row.original.assignedTo}</span>,
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
    enableSorting: true,
  },

  // 10. ACTIONS DROPDOWN (Centro)
  {
    id: 'actions',
    cell: ({ row }) => <ActionsDropdown project={row.original} />,
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
    enableSorting: false,
  },
]
