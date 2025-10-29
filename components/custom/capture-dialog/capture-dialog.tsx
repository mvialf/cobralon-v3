'use client'

import { ReactNode } from 'react'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Loader2, X } from 'lucide-react'
import { useCaptureDialog } from './use-capture-dialog'
import type { CaptureOptions } from './use-capture-dialog'

/**
 * Props para CaptureDialog
 */
export interface CaptureDialogProps {
  /** Control de apertura del dialog */
  open: boolean
  /** Callback para cambios de apertura */
  onOpenChange: (open: boolean) => void

  /** Título del dialog (OBLIGATORIO para accesibilidad) */
  title: string
  /** ClassName para el título (default: "sr-only" para ocultar visualmente) */
  titleClassName?: string

  /** Opciones de captura de imagen */
  captureOptions?: CaptureOptions
  /** Función para generar texto de fallback si falla la captura */
  getFallbackText?: () => string

  /** Callback cuando la copia es exitosa */
  onCopySuccess?: () => void
  /** Callback cuando ocurre un error */
  onCopyError?: (error: Error) => void

  /** Contenido del dialog */
  children: ReactNode

  /** Controles personalizados del header (reemplaza botones por defecto) */
  headerControls?: ReactNode
  /** ClassName para DialogContent */
  className?: string
  /** ClassName para el área de contenido capturable */
  contentClassName?: string

  /** Estado de carga (deshabilita botón de copiar) */
  isLoading?: boolean
}

/**
 * Dialog que permite capturar su contenido como imagen PNG
 *
 * @example
 * ```tsx
 * <CaptureDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Estado de Cuenta"
 * >
 *   <div className="bg-capture-bg text-capture-foreground p-6">
 *     <h2>Mi contenido</h2>
 *   </div>
 * </CaptureDialog>
 * ```
 *
 * @example Con fallback custom
 * ```tsx
 * <CaptureDialog
 *   title="Resumen"
 *   getFallbackText={() => `Cliente: ${name}\nTotal: ${total}`}
 * >
 *   <Content />
 * </CaptureDialog>
 * ```
 */
export function CaptureDialog({
  open,
  onOpenChange,
  title,
  titleClassName = 'sr-only',
  captureOptions,
  getFallbackText,
  onCopySuccess,
  onCopyError,
  children,
  headerControls,
  className = 'max-w-xl p-0 max-h-[90vh] overflow-y-auto gap-0',
  contentClassName = 'bg-capture-bg',
  isLoading = false,
}: CaptureDialogProps) {
  const { contentRef, handleCopy, isCopying } = useCaptureDialog({
    captureOptions,
    getFallbackText,
    onSuccess: onCopySuccess,
    onError: onCopyError,
  })

  // Determinar si el botón de copiar debe estar deshabilitado
  const isCopyDisabled = isLoading || isCopying

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        {/* Título accesible */}
        <DialogTitle className={titleClassName}>{title}</DialogTitle>

        {/* ❌ BARRA SUPERIOR - NO SE CAPTURA */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-capture-border bg-capture-bg">
          {headerControls ? (
            headerControls
          ) : (
            <div className="flex items-center gap-2">
              {/* Botón Copiar */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={isCopyDisabled}
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
          )}
        </div>

        {/* ✅ ÁREA DE CAPTURA - TODO ESTO SE CONVIERTE EN IMAGEN */}
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
