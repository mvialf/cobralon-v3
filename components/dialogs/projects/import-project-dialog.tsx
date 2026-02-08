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
import { ImportPreviewTable } from '@/components/forms/projects/import-preview-table'
import {
  parseProjectExcel,
  validateExcelFile,
  type ProjectParseResult,
} from '@/lib/excel/project-parser'
import { downloadProjectTemplate } from '@/lib/excel/project-template'
import { toast } from 'sonner'

interface ImportProjectDialogProps {
  onImportComplete?: () => void
}

type Step = 'upload' | 'preview' | 'importing' | 'complete'

export function ImportProjectDialog({ onImportComplete }: ImportProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [_file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ProjectParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)

  // Configurar dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Validar archivo
      const validation = validateExcelFile(file)
      if (!validation.valid) {
        setError(validation.error || 'Archivo inválido')
        return
      }

      setError(null)
      setFile(file)
      setIsProcessing(true)

      try {
        // Parsear Excel
        const result = await parseProjectExcel(file)
        setParseResult(result)
        setStep('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al procesar el archivo')
      } finally {
        setIsProcessing(false)
      }
    },
  })

  // Manejar importación
  const handleImport = async () => {
    if (!parseResult || parseResult.validCount === 0) return

    setStep('importing')
    setImportProgress(0)

    try {
      // Obtener solo proyectos válidos
      const validProjects = parseResult.projects
        .filter((p) => p.isValid && p.data)
        .map((p) => p.data!)

      // Enviar a API
      const response = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: validProjects }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al importar proyectos')
      }

      const result = await response.json()
      setImportedCount(result.imported)
      setImportProgress(100)
      setStep('complete')

      toast.success(
        `Se importaron ${result.imported} proyecto${result.imported === 1 ? '' : 's'} correctamente.`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
      setStep('preview')

      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  // Reset dialog
  const handleClose = () => {
    const wasSuccessful = step === 'complete'
    setOpen(false)
    setTimeout(() => {
      setStep('upload')
      setFile(null)
      setParseResult(null)
      setError(null)
      setIsProcessing(false)
      setImportProgress(0)
      setImportedCount(0)

      // Notificar al padre para recargar datos solo si la importación fue exitosa
      if (wasSuccessful) {
        onImportComplete?.()
      }
    }, 200)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose()
        } else {
          setOpen(true)
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Importar Proyectos</SheetTitle>
          <SheetDescription>
            {step === 'upload' && 'Sube un archivo Excel con los datos de tus proyectos'}
            {step === 'preview' && 'Revisa los datos antes de importar'}
            {step === 'importing' && 'Importando proyectos...'}
            {step === 'complete' && 'Importación completada'}
          </SheetDescription>
        </SheetHeader>

        {/* Paso 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 px-4">
            {/* Dropzone */}
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
                      Formatos soportados: .xlsx, .xls (máx. 10MB)
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Descargar template */}
            <div className="flex items-center justify-center">
              <Button
                type="button"
                variant="link"
                className="gap-2"
                onClick={async () => downloadProjectTemplate()}
              >
                <Download className="h-4 w-4" />
                Descargar template de ejemplo
              </Button>
            </div>

            {/* Instrucciones */}
            <div className="rounded-md bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Formato del archivo Excel:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Primera fila debe contener los encabezados</li>
                <li>
                  <strong>Campos obligatorios:</strong> Número Proyecto, Cliente, Calle, Comuna,
                  Región, Estado, Fecha, Subtotal
                </li>
                <li>
                  <strong>Campos opcionales:</strong> Glosa, Teléfono, Depto, IVA (%), Ventanas, M²,
                  Descripción
                </li>
                <li>El sistema buscará o creará el cliente automáticamente</li>
                <li>Si no se proporciona teléfono, se usará el teléfono del cliente existente</li>
                <li>El estado del proyecto debe coincidir con uno existente en el sistema</li>
              </ul>
            </div>
          </div>
        )}

        {/* Paso 2: Preview */}
        {step === 'preview' && parseResult && (
          <div className="space-y-4 px-4 flex-1 overflow-hidden">
            <ImportPreviewTable
              projects={parseResult.projects}
              validCount={parseResult.validCount}
              errorCount={parseResult.errorCount}
            />
          </div>
        )}

        {/* Paso 3: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 py-8 px-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2 w-full max-w-md">
                <p className="text-sm font-medium">Importando proyectos...</p>
                <Progress value={importProgress} className="h-2" />
              </div>
            </div>
          </div>
        )}

        {/* Paso 4: Complete */}
        {step === 'complete' && (
          <div className="space-y-4 py-8 px-4">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">¡Importación exitosa!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Se importaron {importedCount} proyecto{importedCount === 1 ? '' : 's'}{' '}
                  correctamente
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <SheetFooter className="flex-row justify-end gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                ← Volver
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parseResult || parseResult.validCount === 0}
              >
                Importar {parseResult?.validCount || 0} proyecto
                {parseResult?.validCount === 1 ? '' : 's'}
              </Button>
            </>
          )}

          {step === 'complete' && <Button onClick={handleClose}>Cerrar</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
