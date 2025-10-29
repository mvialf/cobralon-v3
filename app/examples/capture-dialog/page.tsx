'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CaptureDialog, useCaptureDialog } from '@/components/custom/capture-dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Copy, FileText, Image, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/format'

/**
 * Página de ejemplos de CaptureDialog
 */
export default function CaptureDialogExamplePage() {
  // Estados para controlar cada dialog
  const [openBasic, setOpenBasic] = useState(false)
  const [openFallback, setOpenFallback] = useState(false)
  const [openAdvanced, setOpenAdvanced] = useState(false)
  const [openCustomHook, setOpenCustomHook] = useState(false)

  return (
    <AppLayout
      pageTitle="CaptureDialog - Ejemplos"
      pageDescription="Demostración de componente CaptureDialog con diferentes casos de uso"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/examples' },
        { label: 'CaptureDialog' },
      ]}
    >
      <div className="space-y-6">
        {/* Header Info */}
        <Card>
          <CardHeader>
            <CardTitle>CaptureDialog Component</CardTitle>
            <CardDescription>
              Dialog que permite capturar su contenido como imagen PNG y copiarlo al portapapeles.
              Incluye fallback inteligente a texto plano si falla la captura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Experimental</Badge>
              <span className="text-sm text-muted-foreground">
                Validar con ≥3 casos reales antes de marcar como estable
              </span>
            </div>
            <div className="text-sm">
              <strong>Ubicación:</strong>{' '}
              <code className="bg-muted px-1.5 py-0.5 rounded">
                components/custom/capture-dialog/
              </code>
            </div>
            <div className="text-sm">
              <strong>Documentación:</strong>{' '}
              <a
                href="https://github.com/tu-repo/blob/main/components/custom/capture-dialog/README.md"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                README.md
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Ejemplo 1: Básico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Ejemplo 1: Uso Básico (Zero Config)
            </CardTitle>
            <CardDescription>
              CaptureDialog con configuración mínima. El fallback se extrae automáticamente del DOM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenBasic(true)}>Abrir Dialog Básico</Button>

            <CaptureDialog
              open={openBasic}
              onOpenChange={setOpenBasic}
              title="Resumen de Proyecto - Básico"
            >
              <div className="bg-capture-bg text-capture-foreground p-6 space-y-4">
                <div className="border-b border-capture-border pb-2">
                  <h2 className="text-xl font-semibold">RESUMEN DE PROYECTO</h2>
                  <p className="text-sm text-capture-foreground/70">
                    {formatDate(new Date(), 'short')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Proyecto:</span>
                    <span>P 0001-2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Cliente:</span>
                    <span>Acme Corporation</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold">$1,500,000 CLP</span>
                  </div>
                </div>
              </div>
            </CaptureDialog>
          </CardContent>
        </Card>

        {/* Ejemplo 2: Con Fallback Custom */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ejemplo 2: Con Fallback Custom
            </CardTitle>
            <CardDescription>
              Provee función <code>getFallbackText</code> para generar texto profesional si falla la
              imagen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenFallback(true)}>Abrir Dialog con Fallback</Button>

            <CaptureDialog
              open={openFallback}
              onOpenChange={setOpenFallback}
              title="Estado de Cuenta"
              getFallbackText={() =>
                `
ESTADO DE CUENTA
Fecha: ${formatDate(new Date(), 'short')}

Proyecto: P 0042-2025
Cliente: Tech Solutions Inc.
Descripción: Sistema de gestión empresarial

RESUMEN FINANCIERO
Total Proyecto: $5,250,000 CLP
Total Pagado: $3,150,000 CLP
Saldo Pendiente: $2,100,000 CLP
Porcentaje Pagado: 60%

Estado: En Proceso ✓
              `.trim()
              }
            >
              <div className="bg-capture-bg text-capture-foreground p-6 space-y-4">
                <div className="border-b border-capture-border pb-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">ESTADO DE CUENTA</h2>
                    <span className="text-sm">{formatDate(new Date(), 'short')}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold mb-2">Información del Proyecto</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-capture-foreground/70">Proyecto:</span>
                        <span className="font-medium">P 0042-2025</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-capture-foreground/70">Cliente:</span>
                        <span className="font-medium">Tech Solutions Inc.</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-capture-foreground/70">Descripción:</span>
                        <span>Sistema de gestión empresarial</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-capture-border" />

                  <div>
                    <h3 className="font-semibold mb-2">Resumen Financiero</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-capture-foreground/70">Total Proyecto:</span>
                        <span className="font-bold text-lg">$5,250,000 CLP</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-capture-foreground/70">Total Pagado:</span>
                        <span className="font-semibold text-capture-green">$3,150,000 CLP</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-capture-foreground/70">Saldo Pendiente:</span>
                        <span className="font-semibold text-capture-orange">$2,100,000 CLP</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-capture-foreground/70">Porcentaje Pagado:</span>
                        <span className="font-bold text-capture-blue">60%</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-capture-border" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-capture-foreground/70">Estado:</span>
                    <Badge className="bg-capture-blue text-white">En Proceso</Badge>
                  </div>
                </div>
              </div>
            </CaptureDialog>
          </CardContent>
        </Card>

        {/* Ejemplo 3: Con Callbacks */}
        <Card>
          <CardHeader>
            <CardTitle>Ejemplo 3: Con Callbacks de Success/Error</CardTitle>
            <CardDescription>
              Usa <code>onCopySuccess</code> y <code>onCopyError</code> para tracking, analytics,
              etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenAdvanced(true)}>Abrir Dialog con Callbacks</Button>

            <CaptureDialog
              open={openAdvanced}
              onOpenChange={setOpenAdvanced}
              title="Reporte Técnico"
              onCopySuccess={() => {
                console.log('✅ Imagen copiada exitosamente')
                // Aquí podrías agregar analytics, telemetry, etc.
              }}
              onCopyError={(error) => {
                console.error('❌ Error al copiar:', error)
                // Aquí podrías agregar error logging
              }}
            >
              <div className="bg-capture-bg text-capture-foreground p-6">
                <h3 className="text-lg font-bold mb-4">REPORTE TÉCNICO</h3>
                <p className="text-sm">
                  Este dialog incluye callbacks de éxito/error. Abre la consola del navegador para
                  ver los logs.
                </p>
                <div className="mt-4 p-4 bg-capture-card rounded">
                  <code className="text-xs">console.log(copiedSuccessfully)</code>
                </div>
              </div>
            </CaptureDialog>
          </CardContent>
        </Card>

        {/* Ejemplo 4: Usando Solo el Hook */}
        <Card>
          <CardHeader>
            <CardTitle>Ejemplo 4: Usando Solo el Hook (useCaptureDialog)</CardTitle>
            <CardDescription>
              Para casos donde necesitas usar la lógica en un dialog custom (Alert, Sheet, Drawer,
              etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenCustomHook(true)}>Abrir Dialog Custom (Solo Hook)</Button>

            <CustomDialogWithHook open={openCustomHook} onOpenChange={setOpenCustomHook} />
          </CardContent>
        </Card>

        {/* Documentación */}
        <Card>
          <CardHeader>
            <CardTitle>Documentación Completa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div>
                <strong>README:</strong>{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  components/custom/capture-dialog/README.md
                </code>
              </div>
              <div>
                <strong>ADR:</strong>{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  docs/template/decisions/011-capture-dialog-pattern.md
                </code>
              </div>
              <div>
                <strong>Patterns:</strong>{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  docs/template/methodology/patterns.md#9-patrón-de-captura-de-diálogos
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

/**
 * Componente que usa solo el hook useCaptureDialog
 * Ejemplo de uso en dialog custom (AlertDialog)
 */
function CustomDialogWithHook({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { contentRef, handleCopy, isCopying } = useCaptureDialog({
    getFallbackText: () =>
      `
DIALOG CUSTOM CON HOOK
Este dialog usa solo el hook useCaptureDialog,
sin el wrapper <CaptureDialog>.

Fecha: ${formatDate(new Date(), 'short')}
    `.trim(),
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <span />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Dialog Custom (Solo Hook)</AlertDialogTitle>
        </AlertDialogHeader>

        {/* Botón de copiar custom */}
        <div className="flex justify-end">
          <Button onClick={handleCopy} disabled={isCopying} size="sm" variant="outline">
            {isCopying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Copiando...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Contenido
              </>
            )}
          </Button>
        </div>

        {/* Contenido a capturar */}
        <div ref={contentRef} className="bg-capture-bg text-capture-foreground p-4 rounded">
          <h3 className="font-bold mb-2">DIALOG CUSTOM CON HOOK</h3>
          <p className="text-sm mb-4">
            Este dialog usa <code className="bg-capture-card px-1 py-0.5">useCaptureDialog</code>{' '}
            directamente, sin el wrapper <code>{'<CaptureDialog>'}</code>.
          </p>
          <div className="text-xs text-capture-foreground/70">
            Fecha: {formatDate(new Date(), 'short')}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
