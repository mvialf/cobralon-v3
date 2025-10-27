'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Loader2 } from 'lucide-react'
import { PaymentSummaryCard } from '@/components/summarys/payment-summary-card'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { Skeleton } from '@/components/ui/skeleton'
import { snapdom } from '@zumer/snapdom'
import { toast } from 'sonner'

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
      <DialogContent className="max-w-xl bg-pay-bg p-0">
        {/* Botón de copiar - positioned absolute, FUERA del área de captura */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          disabled={isLoading || !project || isCopying}
          title="Copiar al portapapeles"
          className="absolute top-4 right-4 z-10 text-pay-foreground hover:bg-pay-foreground/10"
        >
          {isCopying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Copy className="h-5 w-5" />}
        </Button>

        {/* 📸 TODO ESTO SE CAPTURA COMO IMAGEN (desde línea 199) */}
        {/* ref={contentRef} marca TODO el contenedor: header + contenido */}
        <div ref={contentRef} className="bg-white text-gray-800 max-h-[90vh] overflow-y-auto">
          {/* ✅ INCLUIDO EN CAPTURA: Header completo */}
          <DialogHeader className="px-2 py-4 border-b border-gray-200">
            <DialogTitle className="text-gray-900">ESTADO DE CUENTA</DialogTitle>
            {isLoading ? (
              <DialogDescription className="text-gray-600">Cargando...</DialogDescription>
            ) : project ? (
              <ProjectNameSummary
                projectNumber={project.projectNumber}
                customerName={project.customerName}
                projectName={project.projectName}
                className="pt-2"
              />
            ) : null}
          </DialogHeader>

          {/* ✅ INCLUIDO EN CAPTURA: Contenido completo */}
          {isLoading ? (
            <div className="space-y-6 py-6 px-2">
              <Skeleton className="h-32 w-full bg-gray-200" />
              <Skeleton className="h-64 w-full bg-gray-200" />
            </div>
          ) : project ? (
            <div className="space-y-6 py-6 px-2">
              {/* ✅ INCLUIDO EN CAPTURA: Resumen de Pagos */}
              <PaymentSummaryCard
                variant="dashboard"
                totalAmount={project.totalAmount}
                currency={project.currency}
                totalPaid={project.totalPaid}
                balance={project.balance}
                percentPaid={project.percentPaid}
              />

              {/* ✅ INCLUIDO EN CAPTURA: Tabla de Pagos completa */}
              <div className="overflow-x-auto">
                <ProjectPaymentsTable projectId={projectId} hidePaymentMethod />
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
