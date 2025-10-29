'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Loader2, X } from 'lucide-react'
import { PaymentSummaryCard } from '@/components/summarys/payment-summary-card'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { Skeleton } from '@/components/ui/skeleton'
import { snapdom } from '@zumer/snapdom'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'

interface ViewProjectPaymentsDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProjectPaymentData {
  totalAmount: number | null
  currency: string
  projectNumber: string
  projectName?: string | null
  customerName: string
  totalPaid: number // ← Calculado en backend
  balance: number // ← Calculado en backend
  percentPaid: number // ← Calculado en backend
}

/**
 * Dialog para visualizar pagos de un proyecto
 */
export function ViewProjectPaymentsDialog({
  projectId,
  open,
  onOpenChange,
}: ViewProjectPaymentsDialogProps) {
  const [project, setProject] = useState<ProjectPaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)

  const fetchProjectPaymentData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        throw new Error('Error al cargar proyecto')
      }

      const data = await response.json()
      setProject({
        totalAmount: data.totalAmount,
        currency: data.currency,
        projectNumber: data.projectNumber,
        projectName: data.projectName,
        customerName: data.customer.name,
        totalPaid: data.totalPaid, // ← Viene del backend
        balance: data.balance, // ← Viene del backend
        percentPaid: data.percentPaid, // ← Viene del backend
      })
    } catch (error) {
      console.error('Error fetching project payment data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  /**
   * Captura el contenido del dialog como imagen PNG y lo copia al portapapeles
   * Incluye fallback a texto plano si la captura de imagen falla
   */
  const handleCopy = async () => {
    // ============================================================
    // VALIDACIONES PREVIAS
    // ============================================================
    if (!contentRef.current) {
      toast.error('No hay contenido para copiar')
      return
    }

    if (!project) {
      toast.error('No hay datos del proyecto')
      return
    }

    if (isLoading) {
      toast.error('Esperando carga de datos...')
      return
    }

    setIsCopying(true) // Mostrar spinner en botón

    try {
      // ============================================================
      // FASE 1: PREPARACIÓN PARA CAPTURA
      // ============================================================

      // Esperar a que todas las fuentes web estén cargadas
      // Esto garantiza que el texto se renderice con la fuente correcta
      await document.fonts.ready

      // Delay para asegurar que el DOM esté completamente renderizado
      // Especialmente importante si la tabla tiene muchos rows o gráficos SVG
      await new Promise((resolve) => setTimeout(resolve, 300))

      // ============================================================
      // FASE 2: CAPTURA DE IMAGEN (HTML → Canvas)
      // ============================================================

      // 🎯 AQUÍ COMIENZA LA CAPTURA DE IMAGEN
      // snapdom.toCanvas() convierte el elemento HTML del contentRef
      // en un <canvas> element con todo el contenido visual
      const canvas = await snapdom.toCanvas(contentRef.current, {
        scale: 2, // 2x resolution para pantallas Retina (mejor calidad)
        backgroundColor: '#ffffff', // Fondo blanco sólido (no transparente)
      })
      // Resultado: canvas contiene la imagen renderizada del dialog

      // ============================================================
      // FASE 3: CONVERSIÓN A FORMATO PNG
      // ============================================================

      // Convertir el canvas a un Blob (archivo binario) en formato PNG
      // canvas.toBlob() es asíncrono, por eso usamos Promise
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0) // 1.0 = máxima calidad
      })

      if (!blob) {
        throw new Error('No se pudo convertir a imagen PNG')
      }
      // Resultado: blob contiene el archivo PNG listo para copiar

      // ============================================================
      // FASE 4: COPIA AL PORTAPAPELES ✂️📋
      // ============================================================

      // 🎯 AQUÍ SE COPIA LA IMAGEN AL PORTAPAPELES
      // ClipboardItem es la API moderna del navegador para manejar portapapeles
      const clipboardItem = new ClipboardItem({ 'image/png': blob })

      // navigator.clipboard.write() copia el ClipboardItem al portapapeles del sistema
      // Después de esto, el usuario puede hacer Ctrl+V / Cmd+V en cualquier app
      await navigator.clipboard.write([clipboardItem])

      // ✅ ÉXITO: La imagen ya está en el portapapeles
      toast.success('Imagen copiada al portapapeles')
    } catch (error) {
      console.error('Error al copiar imagen:', error)

      // ============================================================
      // PLAN B: FALLBACK A TEXTO PLANO
      // ============================================================

      // Plan B: Copiar como texto si falla la imagen
      const textToCopy = `
ESTADO DE CUENTA
Proyecto: ${project.projectNumber}
Cliente: ${project.customerName}
${project.projectName ? `Nombre: ${project.projectName}` : ''}
Total Proyecto: ${project.totalAmount?.toLocaleString()} ${project.currency}
Total Pagado: ${project.totalPaid.toLocaleString()} ${project.currency}
Saldo Pendiente: ${project.balance.toLocaleString()} ${project.currency}
Porcentaje Pagado: ${project.percentPaid}%
      `.trim()

      try {
        await navigator.clipboard.writeText(textToCopy)
        toast.warning('No se pudo copiar imagen. Copiado como texto.')
      } catch {
        toast.error('Error al copiar al portapapeles')
      }
    } finally {
      setIsCopying(false)
    }
  }

  useEffect(() => {
    if (open && projectId) {
      fetchProjectPaymentData()
    }
  }, [open, projectId, fetchProjectPaymentData])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 max-h-[90vh] overflow-y-auto gap-0">
        {/* Título accesible para lectores de pantalla */}
        <DialogTitle className="sr-only">Estado de Cuenta </DialogTitle>
        {/* ❌ BARRA SUPERIOR - NO SE CAPTURA */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-pay-border bg-pay-bg">
          <div className="flex items-center gap-2">
            {/* Botón Copiar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              disabled={isLoading || !project || isCopying}
              title="Copiar al portapapeles"
            >
              {isCopying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
            {/* Botón Cerrar */}
            <DialogClose asChild>
              <Button variant="ghost" size="icon" title="Cerrar" className="hover:bg-gray-100">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* ✅ ÁREA DE CAPTURA - TODO ESTO SE CONVIERTE EN IMAGEN */}
        <div ref={contentRef} className="bg-pay-bg">
          <div className="text-xl font-semibold text-pay-foreground px-4 py-2 ">
            {/* Header con información del proyecto */}
            <div className="px-4">
              <div className="flex items-center justify-between text-pay-foreground">
                <span>ESTADO DE CUENTA</span>
                <span className="text-sm font-normal">{formatDate(new Date(), 'short')}</span>
              </div>
            </div>
            {isLoading ? (
              <div className="px-4">
                <DialogDescription className="text-pay-foreground">Cargando...</DialogDescription>
              </div>
            ) : project ? (
              <div className="px-4 py-2 border-b border-t border-pay-border">
                <ProjectNameSummary
                  className="text-pay-foreground"
                  projectNumber={project.projectNumber}
                  customerName={project.customerName}
                  projectName={project.projectName}
                />
              </div>
            ) : null}

            {/* Contenido: Summary + Tabla */}
            {isLoading ? (
              <div className="space-y-4 py-6 px-4">
                <Skeleton className="h-32 w-full bg-pay-bg" />
                <Skeleton className="h-64 w-full bg-pay-bg" />
              </div>
            ) : project ? (
              <div className="space-y-4 py-4 px-4">
                {/* Resumen de Pagos */}
                <PaymentSummaryCard
                  variant="dashboard"
                  totalAmount={project.totalAmount}
                  currency={project.currency}
                  totalPaid={project.totalPaid}
                  balance={project.balance}
                  percentPaid={project.percentPaid}
                />

                {/* Tabla de Pagos */}
                <div className="px-0">
                  <ProjectPaymentsTable projectId={projectId} hidePaymentMethod />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
