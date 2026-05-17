'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

/** Interfaz mínima que deben cumplir todos los parse results */
interface BaseParseResult {
  validCount: number
  errorCount: number
  totalRows: number
}

interface ImportSheetConfig<TParseResult extends BaseParseResult> {
  parseExcel: (file: File) => Promise<TParseResult>
  validateFile: (file: File) => { valid: boolean; error?: string }
  downloadTemplate: () => void | Promise<void>
  importEndpoint: string
  getValidItems: (result: TParseResult) => unknown[]
  requestBodyKey: string
  entityLabel: string
  entityLabelSingular: string
  sheetTitle: string
  maxFileSize: string
  instructions: React.ReactNode
  PreviewTable: React.ComponentType<{ parseResult: TParseResult }>
  triggerLabel?: string
  /** Si true, llama onImportComplete solo al cerrar después de importación exitosa (como Project).
   *  Si false (default), llama onImportComplete inmediatamente al completar. */
  callbackOnClose?: boolean
}

interface ImportSheetProps<TParseResult extends BaseParseResult> {
  config: ImportSheetConfig<TParseResult>
  onImportComplete?: () => void
}

type Step = 'upload' | 'preview' | 'importing' | 'complete'

export function ImportSheet<TParseResult extends BaseParseResult>({
  config,
  onImportComplete,
}: ImportSheetProps<TParseResult>) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [parseResult, setParseResult] = useState<TParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (!file) return

      const validation = config.validateFile(file)
      if (!validation.valid) {
        setError(validation.error || 'Archivo inválido')
        return
      }

      setError(null)
      setIsProcessing(true)

      try {
        const result = await config.parseExcel(file)
        setParseResult(result)
        setStep('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al procesar el archivo')
      } finally {
        setIsProcessing(false)
      }
    },
  })

  const handleImport = async () => {
    if (!parseResult || parseResult.validCount === 0) return

    setStep('importing')
    setImportProgress(0)

    try {
      const validItems = config.getValidItems(parseResult)

      const response = await fetch(config.importEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [config.requestBodyKey]: validItems }),
      })

      const result = await response.json()

      if (!response.ok || result.success === false) {
        const partialMessage =
          result.message ||
          (result.imported !== undefined && result.failed !== undefined
            ? `Se importaron ${result.imported}, pero ${result.failed} fallaron.`
            : undefined)
        throw new Error(result.error || partialMessage || `Error al importar ${config.entityLabel}`)
      }

      setImportedCount(result.imported)
      setImportProgress(100)
      setStep('complete')

      toast.success(
        `Se importaron ${result.imported} ${result.imported === 1 ? config.entityLabelSingular : config.entityLabel} correctamente.`
      )

      if (!config.callbackOnClose) {
        onImportComplete?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
      setStep('preview')
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const handleClose = () => {
    const wasSuccessful = step === 'complete'
    setOpen(false)
    setTimeout(() => {
      setStep('upload')
      setParseResult(null)
      setError(null)
      setIsProcessing(false)
      setImportProgress(0)
      setImportedCount(0)

      if (config.callbackOnClose && wasSuccessful) {
        onImportComplete?.()
      }
    }, 200)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose()
    } else {
      setOpen(true)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          {config.triggerLabel ?? 'Importar'}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{config.sheetTitle}</SheetTitle>
          <SheetDescription>
            {step === 'upload' &&
              `Sube un archivo Excel con los datos de tus ${config.entityLabel}`}
            {step === 'preview' && 'Revisa los datos antes de importar'}
            {step === 'importing' && `Importando ${config.entityLabel}...`}
            {step === 'complete' && 'Importación completada'}
          </SheetDescription>
        </SheetHeader>

        {step === 'upload' && (
          <div className="space-y-4 px-4">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8
                transition-colors cursor-pointer
                flex flex-col items-center justify-center gap-4
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                ${isProcessing ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />

              {isProcessing ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Procesando archivo...</p>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {isDragActive
                        ? 'Suelta el archivo aquí'
                        : 'Arrastra un archivo Excel o haz click para seleccionar'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formatos soportados: .xlsx, .xls ({config.maxFileSize})
                    </p>
                  </div>
                </>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-center">
              <Button
                type="button"
                variant="link"
                className="gap-2"
                onClick={async () => config.downloadTemplate()}
              >
                <Download className="h-4 w-4" />
                Descargar template de ejemplo
              </Button>
            </div>

            {config.instructions}
          </div>
        )}

        {step === 'preview' && parseResult && (
          <div className="space-y-4 px-4 flex-1 overflow-hidden">
            <config.PreviewTable parseResult={parseResult} />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8 px-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2 w-full max-w-md">
                <p className="text-sm font-medium">Importando {config.entityLabel}...</p>
                <Progress value={importProgress} className="h-2" />
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4 py-8 px-4">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">¡Importación exitosa!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Se importaron {importedCount}{' '}
                  {importedCount === 1 ? config.entityLabelSingular : config.entityLabel}{' '}
                  correctamente
                </p>
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="flex-row justify-end gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                &larr; Volver
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parseResult || parseResult.validCount === 0}
              >
                Importar {parseResult?.validCount || 0}{' '}
                {parseResult?.validCount === 1 ? config.entityLabelSingular : config.entityLabel}
              </Button>
            </>
          )}

          {step === 'complete' && <Button onClick={handleClose}>Cerrar</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
