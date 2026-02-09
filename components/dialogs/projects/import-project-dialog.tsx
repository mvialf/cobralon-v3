'use client'

import { ImportSheet } from '@/components/dialogs/shared/import-sheet'
import { ImportPreviewTable } from '@/components/forms/projects/import-preview-table'
import {
  parseProjectExcel,
  validateExcelFile,
  type ProjectParseResult,
} from '@/lib/excel/project-parser'
import { downloadProjectTemplate } from '@/lib/excel/project-template'

function ProjectPreviewTable({ parseResult }: { parseResult: ProjectParseResult }) {
  return (
    <ImportPreviewTable
      projects={parseResult.projects}
      validCount={parseResult.validCount}
      errorCount={parseResult.errorCount}
    />
  )
}

function ProjectInstructions() {
  return (
    <div className="rounded-md bg-muted p-4 space-y-2">
      <p className="text-sm font-medium">Formato del archivo Excel:</p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
        <li>Primera fila debe contener los encabezados</li>
        <li>
          <strong>Campos obligatorios:</strong> Número Proyecto, Cliente, Calle, Comuna, Región,
          Estado, Fecha, Subtotal
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
  )
}

interface ImportProjectDialogProps {
  onImportComplete?: () => void
}

export function ImportProjectDialog({ onImportComplete }: ImportProjectDialogProps) {
  return (
    <ImportSheet<ProjectParseResult>
      onImportComplete={onImportComplete}
      config={{
        parseExcel: parseProjectExcel,
        validateFile: validateExcelFile,
        downloadTemplate: downloadProjectTemplate,
        importEndpoint: '/api/projects/import',
        getValidItems: (r) => r.projects.filter((p) => p.isValid && p.data).map((p) => p.data!),
        requestBodyKey: 'projects',
        entityLabel: 'proyectos',
        entityLabelSingular: 'proyecto',
        sheetTitle: 'Importar Proyectos',
        maxFileSize: 'máx. 10MB',
        instructions: <ProjectInstructions />,
        PreviewTable: ProjectPreviewTable,
        callbackOnClose: true,
      }}
    />
  )
}
