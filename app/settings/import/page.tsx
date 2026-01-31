'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FileSpreadsheet, Users, Briefcase, CreditCard } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import dynamic from 'next/dynamic'

const ImportCustomerDialog = dynamic(
  () =>
    import('@/components/dialogs/customer/import-customer-dialog').then((m) => ({
      default: m.ImportCustomerDialog,
    })),
  { ssr: false }
)

const ImportProjectDialog = dynamic(
  () =>
    import('@/components/dialogs/projects/import-project-dialog').then((m) => ({
      default: m.ImportProjectDialog,
    })),
  { ssr: false }
)

const ImportPaymentDialog = dynamic(
  () =>
    import('@/components/dialogs/payments/import-payment-dialog').then((m) => ({
      default: m.ImportPaymentDialog,
    })),
  { ssr: false }
)

type ImportTab = 'customers' | 'projects' | 'payments'

export default function ImportDataPage() {
  return (
    <Suspense fallback={<div className="p-4">Cargando...</div>}>
      <ImportDataContent />
    </Suspense>
  )
}

function ImportDataContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ImportTab>('customers')
  const [refreshKey, setRefreshKey] = useState(0)

  // Leer tab desde query params al montar
  useEffect(() => {
    const tab = searchParams.get('tab') as ImportTab
    if (tab && ['customers', 'projects', 'payments'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Actualizar URL cuando cambia el tab
  const handleTabChange = (value: string) => {
    const newTab = value as ImportTab
    setActiveTab(newTab)
    router.push(`/settings/import?tab=${newTab}`, { scroll: false })
  }

  // Handler para refrescar después de importación exitosa
  const handleImportComplete = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Importar Datos</h2>
        <p className="text-muted-foreground">
          Importa clientes, proyectos y pagos desde archivos Excel
        </p>
      </div>

      {/* Info General */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription>
          Todos los importadores soportan archivos Excel (.xlsx, .xls). Cada tipo tiene su propio
          template descargable con las columnas requeridas.
        </AlertDescription>
      </Alert>

      {/* Tabs de Importación */}
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
                Importar Clientes
              </CardTitle>
              <CardDescription>
                Importa múltiples clientes desde un archivo Excel con sus datos de contacto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información */}
              <div className="rounded-md bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Columnas requeridas:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    <strong>Nombre:</strong> Obligatorio, mínimo 2 caracteres
                  </li>
                  <li>
                    <strong>Teléfono:</strong> Obligatorio, formato chileno (ej: 987654321)
                  </li>
                  <li>
                    <strong>Email:</strong> Opcional, debe ser válido si se incluye
                  </li>
                </ul>
              </div>

              {/* Botón de Importación */}
              <div className="flex items-center justify-center py-4">
                <ImportCustomerDialog
                  key={`customer-${refreshKey}`}
                  onImportComplete={handleImportComplete}
                />
              </div>

              {/* Tips */}
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Tip:</strong> Los clientes duplicados por email serán rechazados. Revisa
                  la vista previa antes de confirmar la importación.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Proyectos */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Importar Proyectos
              </CardTitle>
              <CardDescription>
                Importa proyectos con sus direcciones, datos financieros y estado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información */}
              <div className="rounded-md bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Columnas obligatorias:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    <strong>Número Proyecto:</strong> Identificador único
                  </li>
                  <li>
                    <strong>Cliente:</strong> Nombre del cliente (se busca o crea automáticamente)
                  </li>
                  <li>
                    <strong>Dirección:</strong> Calle, Comuna, Región
                  </li>
                  <li>
                    <strong>Estado:</strong> Debe existir en el sistema
                  </li>
                  <li>
                    <strong>Financiero:</strong> Fecha, Subtotal
                  </li>
                </ul>
                <p className="text-sm font-medium mt-4">Columnas opcionales:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Glosa, Teléfono, Depto, IVA (%), Ventanas, M², Descripción</li>
                </ul>
              </div>

              {/* Botón de Importación */}
              <div className="flex items-center justify-center py-4">
                <ImportProjectDialog
                  key={`project-${refreshKey}`}
                  onImportComplete={handleImportComplete}
                />
              </div>

              {/* Tips */}
              <Alert>
                <AlertDescription className="text-sm space-y-2">
                  <p>
                    <strong>Tip 1:</strong> Si el cliente no existe, se creará automáticamente. El
                    teléfono del proyecto usa fallback al teléfono del cliente.
                  </p>
                  <p>
                    <strong>Tip 2:</strong> El estado del proyecto debe coincidir exactamente con
                    uno configurado en Settings → Project Status.
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pagos */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Importar Pagos
              </CardTitle>
              <CardDescription>
                Importa pagos 1:1 (un pago asignado completamente a un proyecto)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información */}
              <div className="rounded-md bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Columnas requeridas:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    <strong>Número Proyecto:</strong> Debe existir en el sistema
                  </li>
                  <li>
                    <strong>Monto:</strong> Valor del pago
                  </li>
                  <li>
                    <strong>Fecha:</strong> Formato DD/MM/YYYY
                  </li>
                  <li>
                    <strong>Método de Pago:</strong> Debe existir en el sistema
                  </li>
                </ul>
                <p className="text-sm font-medium mt-4">Columnas opcionales:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Cuotas (solo si el método lo permite)</li>
                  <li>Referencia (N° de comprobante/boleta)</li>
                  <li>Notas (observaciones)</li>
                </ul>
              </div>

              {/* Advertencia */}
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  <strong>Importante:</strong> Esta importación solo soporta pagos 1:1 (todo el
                  monto del pago va al proyecto especificado). Para pagos distribuidos, créalos
                  manualmente.
                </AlertDescription>
              </Alert>

              {/* Botón de Importación */}
              <div className="flex items-center justify-center py-4">
                <ImportPaymentDialog
                  key={`payment-${refreshKey}`}
                  onImportComplete={handleImportComplete}
                />
              </div>

              {/* Tips */}
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Tip:</strong> Verifica que el método de pago y el proyecto existan antes
                  de importar. El sistema validará automáticamente las reglas de cuotas.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
