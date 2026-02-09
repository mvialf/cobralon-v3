'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { ImportSheet } from '@/components/dialogs/shared/import-sheet'
import { ImportPreviewTable } from '@/components/forms/payments/import-preview-table'
import {
  parsePaymentExcel,
  validateExcelFile,
  type PaymentParseResult,
  type ParsedPaymentRow,
} from '@/lib/excel/payment-parser'
import { downloadPaymentTemplate } from '@/lib/excel/payment-template'

function PaymentPreviewTable({ parseResult }: { parseResult: PaymentParseResult }) {
  return (
    <ImportPreviewTable
      payments={parseResult.payments}
      validCount={parseResult.validCount}
      errorCount={parseResult.errorCount}
    />
  )
}

function PaymentInstructions() {
  return (
    <Alert>
      <AlertDescription className="space-y-2">
        <p className="font-medium">El archivo Excel debe contener las siguientes columnas:</p>
        <ul className="text-sm space-y-1 ml-4">
          <li>
            &bull; <strong>Número Proyecto</strong> (requerido) - Debe existir en el sistema
          </li>
          <li>
            &bull; <strong>Monto</strong> (requerido) - Monto del pago
          </li>
          <li>
            &bull; <strong>Fecha</strong> (requerido) - Formato: DD/MM/YYYY
          </li>
          <li>
            &bull; <strong>Método de Pago</strong> (requerido) - Debe existir en el sistema
          </li>
          <li>&bull; Cuotas (opcional) - Solo si el método lo permite</li>
          <li>&bull; Referencia (opcional) - N° de comprobante/boleta</li>
          <li>&bull; Notas (opcional) - Observaciones</li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}

interface ImportPaymentDialogProps {
  onImportComplete?: () => void
}

export function ImportPaymentDialog({ onImportComplete }: ImportPaymentDialogProps) {
  return (
    <ImportSheet<PaymentParseResult>
      onImportComplete={onImportComplete}
      config={{
        parseExcel: parsePaymentExcel,
        validateFile: validateExcelFile,
        downloadTemplate: downloadPaymentTemplate,
        importEndpoint: '/api/payments/import',
        getValidItems: (r) =>
          r.payments.filter((p) => p.isValid && p.data).map((p) => p.data as ParsedPaymentRow),
        requestBodyKey: 'payments',
        entityLabel: 'pagos',
        entityLabelSingular: 'pago',
        sheetTitle: 'Importar Pagos',
        maxFileSize: 'máx. 5MB',
        instructions: <PaymentInstructions />,
        PreviewTable: PaymentPreviewTable,
        triggerLabel: 'Importar Pagos',
      }}
    />
  )
}
