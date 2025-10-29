'use client'

import { useRef, useState } from 'react'
import { snapdom } from '@zumer/snapdom'
import { toast } from 'sonner'

/**
 * Opciones de configuración para captura de diálogo
 */
export interface CaptureOptions {
  /** Escala de la imagen (default: 2 para pantallas Retina) */
  scale?: number
  /** Color de fondo de la imagen (default: '#ffffff') */
  backgroundColor?: string
}

/**
 * Opciones del hook useCaptureDialog
 */
interface UseCaptureDialogOptions {
  /** Opciones de captura de imagen */
  captureOptions?: CaptureOptions
  /** Función para generar texto de fallback si falla la captura */
  getFallbackText?: () => string
  /** Callback cuando la copia es exitosa */
  onSuccess?: () => void
  /** Callback cuando ocurre un error */
  onError?: (error: Error) => void
}

/**
 * Hook reutilizable para captura de contenido de diálogos como imagen PNG
 *
 * @example
 * ```tsx
 * const { contentRef, handleCopy, isCopying } = useCaptureDialog({
 *   getFallbackText: () => 'Mi texto de respaldo',
 *   onSuccess: () => console.log('Copiado!'),
 * })
 *
 * return (
 *   <div>
 *     <button onClick={handleCopy} disabled={isCopying}>Copiar</button>
 *     <div ref={contentRef}>Contenido a capturar</div>
 *   </div>
 * )
 * ```
 */
export function useCaptureDialog(options?: UseCaptureDialogOptions) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isCopying, setIsCopying] = useState(false)

  const { captureOptions = {}, getFallbackText, onSuccess, onError } = options || {}

  /**
   * Genera texto de fallback usando estrategia de 3 niveles:
   * 1. Función custom provista por usuario (máxima flexibilidad)
   * 2. Extraer texto del DOM (mejor que nada)
   * 3. Fallback genérico (último recurso)
   */
  const generateFallbackText = (): string => {
    // Nivel 1: Usuario proveyó función custom
    if (getFallbackText) {
      return getFallbackText()
    }

    // Nivel 2: Extraer texto del DOM
    if (contentRef.current) {
      const extractedText = contentRef.current.innerText.trim()
      if (extractedText) {
        return extractedText
      }
    }

    // Nivel 3: Fallback genérico
    return 'Contenido del diálogo'
  }

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

    setIsCopying(true)

    try {
      // ============================================================
      // FASE 1: PREPARACIÓN PARA CAPTURA
      // ============================================================

      // Esperar a que todas las fuentes web estén cargadas
      // Esto garantiza que el texto se renderice con la fuente correcta
      await document.fonts.ready

      // Delay para asegurar que el DOM esté completamente renderizado
      // Especialmente importante si el contenido tiene imágenes o SVG
      await new Promise((resolve) => setTimeout(resolve, 300))

      // ============================================================
      // FASE 2: CAPTURA DE IMAGEN (HTML → Canvas)
      // ============================================================

      const canvas = await snapdom.toCanvas(contentRef.current, {
        scale: captureOptions.scale ?? 2, // 2x resolution para pantallas Retina
        backgroundColor: captureOptions.backgroundColor ?? '#ffffff', // Fondo blanco sólido
      })

      // ============================================================
      // FASE 3: CONVERSIÓN A FORMATO PNG
      // ============================================================

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0) // 1.0 = máxima calidad
      })

      if (!blob) {
        throw new Error('No se pudo convertir a imagen PNG')
      }

      // ============================================================
      // FASE 4: COPIA AL PORTAPAPELES
      // ============================================================

      const clipboardItem = new ClipboardItem({ 'image/png': blob })
      await navigator.clipboard.write([clipboardItem])

      // ✅ ÉXITO
      toast.success('Imagen copiada al portapapeles')
      onSuccess?.()
    } catch (error) {
      console.error('Error al copiar imagen:', error)

      // ============================================================
      // PLAN B: FALLBACK A TEXTO PLANO
      // ============================================================

      try {
        const textToCopy = generateFallbackText()
        await navigator.clipboard.writeText(textToCopy)
        toast.warning('No se pudo copiar imagen. Copiado como texto.')
        onSuccess?.()
      } catch (fallbackError) {
        const err = fallbackError as Error
        toast.error('Error al copiar al portapapeles')
        onError?.(err)
      }
    } finally {
      setIsCopying(false)
    }
  }

  return {
    /** Ref para adjuntar al elemento que contiene el contenido a capturar */
    contentRef,
    /** Función para ejecutar la captura y copia */
    handleCopy,
    /** Estado de copia en progreso */
    isCopying,
  }
}
