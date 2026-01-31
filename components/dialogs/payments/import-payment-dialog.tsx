'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileSpreadsheet, Upload, CheckCircle2, Download } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  parsePaymentExcel,
  validateExcelFile,
  type PaymentParseResult,
  type ParsedPaymentRow,
} from '@/lib/excel/payment-parser'
import { downloadPaymentTemplate } from '@/lib/excel/payment-template'
import { ImportPreviewTable } from '@/components/forms/payments/import-preview-table'

type ImportState = 'upload' | 'preview' | 'importing' | 'complete'

interface ImportPaymentDialogProps {
  onImportComplete?: () => void
}

export function ImportPaymentDialog({ onImportComplete }: ImportPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<ImportState>('upload')
  const [parseResult, setParseResult] = useState<PaymentParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)

  const onDrop = async (acceptedFiles: File[]) => {
    setError(null)

    if (acceptedFiles.length === 0) {
      setError('No se seleccionó ningún archivo')
      return
    }

    const file = acceptedFiles[0]

    // Validar archivo
    const validation = validateExcelFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Archivo inválido')
      return
    }

    try {
      // Parsear Excel
      const result = await parsePaymentExcel(file)
      setParseResult(result)
      setState('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    multiple: false,
  })

  const handleImport = async () => {
    if (!parseResult) return

    setState('importing')
    setImportProgress(0)
    setError(null)

    try {
      // Filtrar solo pagos válidos
      const validPayments = parseResult.payments
        .filter((p) => p.isValid && p.data)
        .map((p) => p.data as ParsedPaymentRow)

      // Llamar al API
      const response = await fetch('/api/payments/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: validPayments }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al importar pagos')
      }

      setImportedCount(data.imported || 0)
      setImportProgress(100)
      setState('complete')

      // Notificar al padre
      onImportComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar pagos')
      setState('preview')
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Resetear estado después de cerrar
    setTimeout(() => {
      setState('upload')
      setParseResult(null)
      setError(null)
      setImportProgress(0)
      setImportedCount(0)
    }, 200)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar Pagos
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {state === 'upload' && 'Importar Pagos desde Excel'}
            {state === 'preview' && 'Vista Previa de Importación'}
            {state === 'importing' && 'Importando Pagos...'}
            {state === 'complete' && 'Importación Completada'}
          </SheetTitle>
          <SheetDescription>
            {state === 'upload' &&
              'Sube un archivo Excel con los datos de los pagos. Solo se permiten pagos 1:1 (un pago asignado completamente a un proyecto).'}
            {state === 'preview' && 'Revisa los datos antes de importar'}
            {state === 'importing' && 'Procesando los pagos...'}
            {state === 'complete' && 'Los pagos fueron importados exitosamente'}
          </SheetDescription>
        </SheetHeader>

        {/* Estado: Upload */}
        {state === 'upload' && (
          <div className="space-y-4 px-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-sm text-muted-foreground">Suelta el archivo aquí...</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    Arrastra un archivo Excel aquí, o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground">Formatos: .xlsx, .xls (máx. 5MB)</p>
                </>
              )}
            </div>

            {/* Instrucciones */}
            <Alert>
              <AlertDescription className="space-y-2">
                <p className="font-medium">
                  El archivo Excel debe contener las siguientes columnas:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>
                    • <strong>Número Proyecto</strong> (requerido) - Debe existir en el sistema
                  </li>
                  <li>
                    • <strong>Monto</strong> (requerido) - Monto del pago
                  </li>
                  <li>
                    • <strong>Fecha</strong> (requerido) - Formato: DD/MM/YYYY
                  </li>
                  <li>
                    • <strong>Método de Pago</strong> (requerido) - Debe existir en el sistema
                  </li>
                  <li>• Cuotas (opcional) - Solo si el método lo permite</li>
                  <li>• Referencia (opcional) - N° de comprobante/boleta</li>
                  <li>• Notas (opcional) - Observaciones</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Botón de template */}
            <Button
              type="button"
              variant="outline"
              onClick={async () => downloadPaymentTemplate()}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar Template de Ejemplo
            </Button>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Estado: Preview */}
        {state === 'preview' && parseResult && (
          <div className="space-y-4 px-4 flex-1 overflow-hidden">
            <ImportPreviewTable
              payments={parseResult.payments}
              validCount={parseResult.validCount}
              errorCount={parseResult.errorCount}
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Estado: Importing */}
        {state === 'importing' && (
          <div className="space-y-4 py-8 px-4">
            <Progress value={importProgress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              Importando {parseResult?.validCount} pagos...
            </p>
          </div>
        )}

        {/* Estado: Complete */}
        {state === 'complete' && (
          <div className="py-8 px-4 text-center space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <div>
              <p className="text-lg font-semibold">¡Importación Exitosa!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Se importaron {importedCount} pago{importedCount === 1 ? '' : 's'} correctamente.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <SheetFooter className="flex-row justify-end gap-2">
          {state === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {state === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setState('upload')
                  setParseResult(null)
                  setError(null)
                }}
              >
                ← Volver
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parseResult || parseResult.validCount === 0}
              >
                Importar {parseResult?.validCount || 0} Pago
                {parseResult?.validCount === 1 ? '' : 's'}
              </Button>
            </>
          )}

          {state === 'complete' && <Button onClick={handleClose}>Cerrar</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
