'use client'

import { ImportSheet } from '@/components/dialogs/shared/import-sheet'
import { ImportPreviewTable } from '@/components/forms/customers/import-preview-table'
import {
  parseCustomerExcel,
  validateExcelFile,
  type ParseResult,
} from '@/lib/excel/customer-parser'
import { downloadCustomerTemplate } from '@/lib/excel/customer-template'

function CustomerPreviewTable({ parseResult }: { parseResult: ParseResult }) {
  return (
    <ImportPreviewTable
      customers={parseResult.customers}
      validCount={parseResult.validCount}
      errorCount={parseResult.errorCount}
    />
  )
}

function CustomerInstructions() {
  return (
    <div className="rounded-md bg-muted p-4 space-y-2">
      <p className="text-sm font-medium">Formato del archivo Excel:</p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
        <li>Primera fila debe contener los encabezados</li>
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
  )
}

interface ImportCustomerDialogProps {
  onImportComplete?: () => void
}

export function ImportCustomerDialog({ onImportComplete }: ImportCustomerDialogProps) {
  return (
    <ImportSheet<ParseResult>
      onImportComplete={onImportComplete}
      config={{
        parseExcel: parseCustomerExcel,
        validateFile: validateExcelFile,
        downloadTemplate: downloadCustomerTemplate,
        importEndpoint: '/api/customers/import',
        getValidItems: (r) => r.customers.filter((c) => c.isValid && c.data).map((c) => c.data!),
        requestBodyKey: 'customers',
        entityLabel: 'clientes',
        entityLabelSingular: 'cliente',
        sheetTitle: 'Importar Clientes',
        maxFileSize: 'máx. 5MB',
        instructions: <CustomerInstructions />,
        PreviewTable: CustomerPreviewTable,
      }}
    />
  )
}
