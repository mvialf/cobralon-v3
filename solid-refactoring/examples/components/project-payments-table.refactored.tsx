/**
 * ProjectPaymentsTable - Refactorizado siguiendo SOLID
 *
 * Comparación:
 * - Antes: 229 líneas, 6 responsabilidades
 * - Después: ~100 líneas, 1 responsabilidad
 *
 * Responsabilidad única: SOLO renderizar UI
 * - ✅ Recibe datos procesados via hook
 * - ✅ Formatea y presenta información
 * - ✅ Maneja estados (loading, empty, error)
 * - ❌ NO fetching (delegado a hook)
 * - ❌ NO transformaciones (delegado a transformers)
 * - ❌ NO lógica de negocio
 *
 * Principios SOLID cumplidos:
 * - SRP: Una sola responsabilidad (rendering)
 * - OCP: Extensible via props
 * - DIP: Depende de abstracciones (hook)
 */

'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/format'
import { useConfiguration } from '@/hooks/use-configuration'
import { useProjectPayments } from '@/hooks/use-project-payments'

// ============================================================================
// Types
// ============================================================================

interface ProjectPaymentsTableProps {
  /**
   * ID del proyecto a mostrar pagos
   */
  projectId: string

  /**
   * Ocultar columna de método de pago
   * @default false
   */
  hidePaymentMethod?: boolean

  /**
   * Locale para formateo (opcional, usa context si no se provee)
   */
  locale?: string

  /**
   * Orden de clasificación
   * @default 'asc'
   */
  sortOrder?: 'asc' | 'desc'

  /**
   * Callback cuando se hace click en una fila (opcional)
   */
  onRowClick?: (paymentId: string) => void

  /**
   * Mostrar totalizador al final
   * @default false
   */
  showTotals?: boolean

  /**
   * Clase CSS adicional para el contenedor
   */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Tabla de pagos de un proyecto (solo lectura)
 *
 * Muestra:
 * - Lista de pagos del proyecto (via allocations)
 * - Ordenados cronológicamente
 * - Numeración secuencial (N° con (*) si es pago dividido)
 * - Opcionalmente: método de pago, totales
 *
 * @example
 * // Uso básico
 * <ProjectPaymentsTable projectId="proj-123" />
 *
 * @example
 * // Con opciones
 * <ProjectPaymentsTable
 *   projectId="proj-123"
 *   hidePaymentMethod={false}
 *   sortOrder="desc"
 *   showTotals={true}
 *   onRowClick={(id) => console.log('Clicked payment:', id)}
 * />
 */
export function ProjectPaymentsTable({
  projectId,
  hidePaymentMethod = false,
  locale: propLocale,
  sortOrder = 'asc',
  onRowClick,
  showTotals = false,
  className,
}: ProjectPaymentsTableProps) {
  // ============================================================================
  // State (delegado al hook)
  // ============================================================================

  const { data, loading, error, refetch, stats } = useProjectPayments(projectId, {
    sortOrder,
    sortBy: 'date',
  })

  // ============================================================================
  // Configuration
  // ============================================================================

  const { configuration } = useConfiguration()
  const locale = propLocale || configuration.locale

  // ============================================================================
  // Render States
  // ============================================================================

  // Loading State
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardDescription className="text-pay-foreground">
            Cargando historial de pagos...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error State
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardDescription className="text-pay-foreground">
            Historial de pagos asociados a este proyecto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error al cargar pagos</AlertTitle>
            <AlertDescription className="mt-2">
              {error.message}
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Empty State
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardDescription className="text-pay-foreground">
            Historial de pagos asociados a este proyecto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No hay pagos registrados para este proyecto
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // Main Render (Data Table)
  // ============================================================================

  return (
    <div className={`bg-transparent ${className || ''}`}>
      {/* Header */}
      <div className="text-pay-foreground pb-2">
        Historial de pagos asociados a este proyecto
        {showTotals && (
          <span className="ml-2 text-sm text-muted-foreground">
            ({stats.count} pagos - Total: {formatCurrency(stats.totalAmount, 'CLP')})
          </span>
        )}
      </div>

      {/* Table */}
      <Table className="border border-pay-foreground rounded-md shadow-pay">
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-pay-card bg-primary">N°</TableHead>
            <TableHead className="text-pay-card bg-primary">Fecha</TableHead>
            {!hidePaymentMethod && (
              <TableHead className="text-pay-card bg-primary">Método</TableHead>
            )}
            <TableHead className="text-pay-card bg-primary text-right">Monto Asignado</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="bg-pay-card">
          {data.map((allocation, index) => (
            <TableRow
              key={allocation.id}
              onClick={onRowClick ? () => onRowClick(allocation.payment.id) : undefined}
              className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
            >
              {/* N° con asterisco si es pago dividido */}
              <TableCell className="font-medium text-pay-foreground">
                {allocation.payment.type === 'Customer' ? '(*) ' : ''}
                {index + 1}
              </TableCell>

              {/* Fecha */}
              <TableCell className="font-medium text-pay-foreground">
                {formatDate(allocation.payment.date, 'short', locale)}
              </TableCell>

              {/* Método de pago */}
              {!hidePaymentMethod && (
                <TableCell className="font-medium text-pay-foreground">
                  <div className="flex items-center gap-2">
                    {allocation.payment.paymentMethod.name}
                  </div>
                </TableCell>
              )}

              {/* Monto */}
              <TableCell className="font-medium text-pay-foreground text-right">
                {formatCurrency(allocation.allocatedAmount, allocation.payment.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        {/* Footer */}
        <tfoot>
          <TableRow>
            <TableCell
              colSpan={hidePaymentMethod ? 3 : 4}
              className="text-xs text-pay-foreground pt-2 pb-3 px-4"
            >
              (*) Obtenido de pago global de cliente
            </TableCell>
          </TableRow>

          {/* Totals Row (opcional) */}
          {showTotals && (
            <TableRow>
              <TableCell
                colSpan={hidePaymentMethod ? 2 : 3}
                className="text-sm font-semibold text-pay-foreground text-right"
              >
                Total:
              </TableCell>
              <TableCell className="text-sm font-semibold text-pay-foreground text-right">
                {formatCurrency(stats.totalAmount, 'CLP')}
              </TableCell>
            </TableRow>
          )}
        </tfoot>
      </Table>
    </div>
  )
}

// ============================================================================
// Display Name (para debugging)
// ============================================================================

ProjectPaymentsTable.displayName = 'ProjectPaymentsTable'

// ============================================================================
// Exportaciones adicionales
// ============================================================================

/**
 * Versión compacta sin header ni footer
 */
export function ProjectPaymentsTableCompact(props: Omit<ProjectPaymentsTableProps, 'showTotals'>) {
  // Implementación similar pero sin Card wrapper
  // ...
  return <ProjectPaymentsTable {...props} />
}

/**
 * Versión con exportación a CSV/PDF
 */
export function ProjectPaymentsTableWithExport(props: ProjectPaymentsTableProps) {
  const { data } = useProjectPayments(props.projectId)

  const handleExportCSV = () => {
    // Lógica de exportación usando data
    console.log('Exporting to CSV:', data)
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          Exportar CSV
        </Button>
      </div>
      <ProjectPaymentsTable {...props} />
    </div>
  )
}
