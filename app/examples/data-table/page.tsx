'use client'

/**
 * DATATABLE EXAMPLES PAGE
 *
 * Esta página demuestra TODAS las capacidades del DataTable component:
 *
 * ✅ Features implementadas:
 * - Sorting (todas las columnas)
 * - Filtering (faceted filters por estado y prioridad)
 * - Pagination (control de paginación)
 * - Search (búsqueda global)
 * - Row Selection (checkboxes + bulk actions demo)
 * - Meta Alignment (left, center, right)
 * - Actions Dropdown (edit, delete, view)
 * - Custom Cell Rendering (componentes summary)
 * - Conditional Styling (colores según valor)
 * - Stats Cards (métricas en tiempo real)
 *
 * 📊 Datos: 40 registros mock con edge cases
 * 🎨 Componentes: PaymentProgressSummary, StatusBadge, PriorityBadge
 */

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Download, Info, TrendingUp, DollarSign, Package, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  mockTableData,
  MOCK_STATUSES,
  MOCK_PRIORITIES,
  getTableStats,
  type MockProject,
} from './mock-data'
import { exampleColumns } from './columns'

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
 * Stats Card Component
 */
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  description: string
  icon: any
  trend?: 'up' | 'down'
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
          {trend && (
            <span className={trend === 'up' ? 'text-success' : 'text-destructive'}>
              {' '}
              {trend === 'up' ? '↑' : '↓'}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * PÁGINA PRINCIPAL
 */
export default function DataTableExamplesPage() {
  const [selectedRows, setSelectedRows] = useState<MockProject[]>([])

  // Calcular estadísticas
  const stats = getTableStats(mockTableData)

  // Handler para bulk actions (demo)
  const handleBulkExport = () => {
    if (selectedRows.length === 0) {
      toast.error('Selecciona al menos un registro')
      return
    }
    toast.success(`Exportando ${selectedRows.length} registros (demo)`)
  }

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) {
      toast.error('Selecciona al menos un registro')
      return
    }
    toast.error(`Eliminando ${selectedRows.length} registros (demo)`)
  }

  return (
    <AppLayout
      pageTitle="DataTable Examples"
      pageDescription="Showcase completo de capacidades del DataTable"
      breadcrumbs={[{ label: 'Ejemplos', href: '/examples' }, { label: 'DataTable' }]}
    >
      {/* Hero Section */}
      <div className="mb-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Demo Interactiva del DataTable</AlertTitle>
          <AlertDescription>
            Esta página demuestra TODAS las capacidades del DataTable: sorting, filtering,
            pagination, search, row selection, alineaciones, y más. Los datos son mock (40
            registros) con edge cases incluidos.
          </AlertDescription>
        </Alert>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard
          title="Total Proyectos"
          value={stats.totalProjects.toString()}
          description="40 registros de ejemplo"
          icon={Package}
        />
        <StatsCard
          title="Monto Total"
          value={formatCurrency(stats.totalAmount)}
          description={`${formatCurrency(stats.totalPaid)} pagados`}
          icon={DollarSign}
          trend="up"
        />
        <StatsCard
          title="Proyectos Activos"
          value={stats.inProgressProjects.toString()}
          description={`${stats.pendingProjects} pendientes`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Completados"
          value={stats.completedProjects.toString()}
          description={`${Math.round((stats.completedProjects / stats.totalProjects) * 100)}% del total`}
          icon={CheckCircle2}
        />
      </div>

      {/* Features List */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Features Demostradas</CardTitle>
          <CardDescription>Todas las capacidades del DataTable en esta tabla</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">Sorting (todas las columnas)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">Filtering (faceted filters)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">Pagination</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">Search global</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">Row Selection</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">Meta Alignment (L/C/R)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">Actions Dropdown</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">Custom Cell Rendering</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">Conditional Styling</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">PaymentProgressSummary</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">StatusBadge</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">✓</Badge>
              <span className="text-sm">PriorityBadge</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions (si hay selección) */}
      {selectedRows.length > 0 && (
        <Card className="mb-6 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="default" className="text-base px-3 py-1">
                  {selectedRows.length} seleccionados
                </Badge>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-sm text-muted-foreground">Acciones masivas disponibles</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar seleccionados
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  Eliminar seleccionados (demo)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main DataTable */}
      {/*
        IMPORTANTE: Manejo de Overflow Horizontal

        overflow-hidden en Card: Previene que el contenido de la tabla "escape" y cause
                                scroll horizontal a nivel de página completa

        overflow-x-auto en CardContent: Permite scroll horizontal SOLO dentro del contenedor
                                       cuando la tabla excede el ancho disponible

        Este patrón previene scroll horizontal duplicado (página + tabla) cuando tienes
        8+ columnas. Ver docs/template/components/data-table.md#handling-horizontal-overflow
      */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>DataTable Completo</CardTitle>
          <CardDescription>
            Con sorting, filtering, pagination, search, row selection y más. Prueba todas las
            funcionalidades.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <DataTable
            columns={exampleColumns}
            data={mockTableData}
            searchKey="customerName"
            searchPlaceholder="Buscar por cliente..."
            enableRowSelection
            onRowSelectionChange={setSelectedRows}
            filterableColumns={[
              {
                id: 'status',
                title: 'Estado',
                options: MOCK_STATUSES,
              },
              {
                id: 'priority',
                title: 'Prioridad',
                options: MOCK_PRIORITIES,
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Code Reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Archivos de Código</CardTitle>
          <CardDescription>Esta demo está construida con los siguientes archivos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Página</Badge>
              <code className="text-xs">app/examples/data-table/page.tsx</code>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Columnas</Badge>
              <code className="text-xs">app/examples/data-table/columns.tsx</code>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Datos</Badge>
              <code className="text-xs">app/examples/data-table/mock-data.ts</code>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center gap-2">
              <Badge variant="outline">Componente Base</Badge>
              <code className="text-xs">components/data-table/data-table.tsx</code>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Summary</Badge>
              <code className="text-xs">components/summarys/payment-progress-summary.tsx</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edge Cases Info */}
      <Alert className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Edge Cases Incluidos</AlertTitle>
        <AlertDescription>
          Los datos mock incluyen casos especiales: proyectos 100% pagados (balance = 0), proyectos
          sin pagos (percentPaid = 0), nombres largos, valores null (projectName), fechas
          antiguas/recientes, y diferentes estados/prioridades para testing completo.
        </AlertDescription>
      </Alert>
    </AppLayout>
  )
}
