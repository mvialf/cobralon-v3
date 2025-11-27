'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Download, Users, Briefcase, CreditCard, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ExportTab = 'customers' | 'projects' | 'payments'

export default function ExportDataPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ExportTab>('customers')

  // Estados de loading por entidad
  const [isExporting, setIsExporting] = useState<Record<ExportTab, boolean>>({
    customers: false,
    projects: false,
    payments: false,
  })

  // Filtros de Clientes
  const [customerSearch, setCustomerSearch] = useState('')

  // Filtros de Proyectos
  const [projectSearch, setProjectSearch] = useState('')
  const [projectState, setProjectState] = useState<'all' | 'Activo' | 'Finalizado'>('all')

  // Filtros de Pagos
  const [paymentType, setPaymentType] = useState<'all' | 'Project' | 'Customer'>('all')
  const [paymentStartDate, setPaymentStartDate] = useState('')
  const [paymentEndDate, setPaymentEndDate] = useState('')

  // Leer tab desde query params al montar
  useEffect(() => {
    const tab = searchParams.get('tab') as ExportTab
    if (tab && ['customers', 'projects', 'payments'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Actualizar URL cuando cambia el tab
  const handleTabChange = (value: string) => {
    const newTab = value as ExportTab
    setActiveTab(newTab)
    router.push(`/settings/export?tab=${newTab}`, { scroll: false })
  }

  // Handler genérico de descarga
  const downloadFile = async (response: Response, defaultFilename: string) => {
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = defaultFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Exportar Clientes
  const handleExportCustomers = useCallback(async () => {
    setIsExporting((prev) => ({ ...prev, customers: true }))
    try {
      const params = new URLSearchParams()
      if (customerSearch) params.append('search', customerSearch)

      const response = await fetch(`/api/customers/export?${params}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al exportar')
      }

      await downloadFile(response, `clientes-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exportando clientes:', error)
    } finally {
      setIsExporting((prev) => ({ ...prev, customers: false }))
    }
  }, [customerSearch])

  // Exportar Proyectos
  const handleExportProjects = useCallback(async () => {
    setIsExporting((prev) => ({ ...prev, projects: true }))
    try {
      const params = new URLSearchParams()
      if (projectSearch) params.append('search', projectSearch)
      params.append('projectState', projectState) // Siempre enviar (la API espera este parámetro)

      const response = await fetch(`/api/projects/export?${params}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al exportar')
      }

      await downloadFile(response, `proyectos-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exportando proyectos:', error)
    } finally {
      setIsExporting((prev) => ({ ...prev, projects: false }))
    }
  }, [projectSearch, projectState])

  // Exportar Pagos
  const handleExportPayments = useCallback(async () => {
    setIsExporting((prev) => ({ ...prev, payments: true }))
    try {
      const params = new URLSearchParams()
      params.append('type', paymentType) // Siempre enviar type (la API espera este parámetro)
      if (paymentStartDate) params.append('startDate', paymentStartDate)
      if (paymentEndDate) params.append('endDate', paymentEndDate)

      const response = await fetch(`/api/payments/export?${params}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al exportar')
      }

      await downloadFile(response, `pagos-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exportando pagos:', error)
    } finally {
      setIsExporting((prev) => ({ ...prev, payments: false }))
    }
  }, [paymentType, paymentStartDate, paymentEndDate])

  // Limpiar filtros
  const clearCustomerFilters = () => setCustomerSearch('')
  const clearProjectFilters = () => {
    setProjectSearch('')
    setProjectState('all')
  }
  const clearPaymentFilters = () => {
    setPaymentType('all')
    setPaymentStartDate('')
    setPaymentEndDate('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Exportar Datos</h2>
        <p className="text-muted-foreground">
          Exporta clientes, proyectos y pagos a archivos Excel con filtros avanzados
        </p>
      </div>

      {/* Info General */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription>
          Los archivos se exportan en formato Excel (.xlsx). Puedes aplicar filtros antes de
          exportar para obtener solo los datos que necesitas.
        </AlertDescription>
      </Alert>

      {/* Tabs de Exportación */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Proyectos
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Pagos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Clientes */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Exportar Clientes
              </CardTitle>
              <CardDescription>
                Exporta la lista de clientes con sus datos de contacto y estadísticas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Columnas incluidas */}
              <div className="rounded-md bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Columnas incluidas:</p>
                <p className="text-sm text-muted-foreground">
                  Nombre, Teléfono, Email, Saldo a Favor, Fecha Registro, Cantidad de Proyectos
                </p>
              </div>

              {/* Filtros */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Filtros</Label>
                  {customerSearch && (
                    <Button variant="ghost" size="sm" onClick={clearCustomerFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer-search">Búsqueda</Label>
                    <Input
                      id="customer-search"
                      placeholder="Nombre, teléfono o email..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Botón Export */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleExportCustomers} disabled={isExporting.customers}>
                  {isExporting.customers ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isExporting.customers ? 'Exportando...' : 'Exportar Clientes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Proyectos */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Exportar Proyectos
              </CardTitle>
              <CardDescription>
                Exporta proyectos con sus direcciones, datos financieros y estado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Columnas incluidas */}
              <div className="rounded-md bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Columnas incluidas:</p>
                <p className="text-sm text-muted-foreground">
                  N° Proyecto, Glosa, Cliente, Teléfono, Dirección (Calle, Depto, Comuna, Región),
                  Estado, Fecha, Subtotal, IVA, Total, Saldo, Ventanas, M², Descripción
                </p>
              </div>

              {/* Filtros */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Filtros</Label>
                  {(projectSearch || projectState !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={clearProjectFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-search">Búsqueda</Label>
                    <Input
                      id="project-search"
                      placeholder="N° proyecto, cliente o nombre..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-state">Estado del Proyecto</Label>
                    <Select
                      value={projectState}
                      onValueChange={(v) => setProjectState(v as typeof projectState)}
                    >
                      <SelectTrigger id="project-state">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Activo">Solo Activos</SelectItem>
                        <SelectItem value="Finalizado">Solo Finalizados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Botón Export */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleExportProjects} disabled={isExporting.projects}>
                  {isExporting.projects ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isExporting.projects ? 'Exportando...' : 'Exportar Proyectos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pagos */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Exportar Pagos
              </CardTitle>
              <CardDescription>
                Exporta pagos con sus asignaciones a proyectos y datos de transacción
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Columnas incluidas */}
              <div className="rounded-md bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Columnas incluidas:</p>
                <p className="text-sm text-muted-foreground">
                  Fecha, Monto, Moneda, Tipo, Cliente, Método de Pago, Proyectos, Cuotas,
                  Referencia, Notas
                </p>
              </div>

              {/* Filtros */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Filtros</Label>
                  {(paymentType !== 'all' || paymentStartDate || paymentEndDate) && (
                    <Button variant="ghost" size="sm" onClick={clearPaymentFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="payment-type">Tipo de Pago</Label>
                    <Select
                      value={paymentType}
                      onValueChange={(v) => setPaymentType(v as typeof paymentType)}
                    >
                      <SelectTrigger id="payment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Project">Solo Proyecto</SelectItem>
                        <SelectItem value="Customer">Solo Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-start">Fecha desde</Label>
                    <Input
                      id="payment-start"
                      type="date"
                      value={paymentStartDate}
                      onChange={(e) => setPaymentStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-end">Fecha hasta</Label>
                    <Input
                      id="payment-end"
                      type="date"
                      value={paymentEndDate}
                      onChange={(e) => setPaymentEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Botón Export */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleExportPayments} disabled={isExporting.payments}>
                  {isExporting.payments ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isExporting.payments ? 'Exportando...' : 'Exportar Pagos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
