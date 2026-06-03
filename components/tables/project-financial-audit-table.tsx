'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'

export type ProjectFinancialAuditTableApplication = {
  id: string
  sourceType: 'CASH' | 'CUSTOMER_CREDIT' | 'ADJUSTMENT'
  amount: number
  createdAt: string
  paymentId: string | null
  paymentAllocationId: string | null
  creditTransactionId: string | null
  projectAdjustmentId: string | null
  payment: {
    id: string
    date: string
    amount: number
    type: string
    reference: string | null
    paymentMethod: { id: string; name: string; icon: string | null } | null
  } | null
  paymentAllocation: {
    id: string
    allocatedAmount: number
  } | null
  creditTransaction: {
    id: string
    amount: number
    type: string
    description: string
    metadata: unknown
  } | null
  projectAdjustment: {
    id: string
    amount: number
    reason: string
    description: string | null
    appliedAt: string
    adjustmentReason: { name: string; warningLevel: string } | null
  } | null
}

function sourceLabel(sourceType: ProjectFinancialAuditTableApplication['sourceType']) {
  if (sourceType === 'CASH') return 'Efectivo'
  if (sourceType === 'CUSTOMER_CREDIT') return 'Credito cliente'
  return 'Ajuste'
}

function sourceVariant(sourceType: ProjectFinancialAuditTableApplication['sourceType']) {
  if (sourceType === 'CASH') return 'default'
  if (sourceType === 'CUSTOMER_CREDIT') return 'secondary'
  return 'outline'
}

function applicationDetail(application: ProjectFinancialAuditTableApplication) {
  if (application.sourceType === 'CUSTOMER_CREDIT' && application.creditTransaction) {
    return application.creditTransaction.description ?? application.creditTransaction.type
  }
  if (application.sourceType === 'ADJUSTMENT' && application.projectAdjustment) {
    return (
      application.projectAdjustment.adjustmentReason?.name ?? application.projectAdjustment.reason
    )
  }
  if (application.payment) {
    const method = application.payment.paymentMethod?.name ?? 'Pago'
    return application.payment.reference ? `${method} / ${application.payment.reference}` : method
  }
  if (application.creditTransaction) return application.creditTransaction.description
  if (application.projectAdjustment) return application.projectAdjustment.reason
  return 'Sin detalle asociado'
}

function applicationReference(application: ProjectFinancialAuditTableApplication) {
  return (
    application.paymentAllocationId ??
    application.creditTransactionId ??
    application.projectAdjustmentId ??
    application.id
  )
}

export function ProjectFinancialAuditTable({
  applications,
  currency,
}: {
  applications: ProjectFinancialAuditTableApplication[]
  currency: string
}) {
  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
        No hay aplicaciones registradas para este proyecto.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead>Referencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id}>
              <TableCell className="whitespace-nowrap text-sm">
                {formatDate(application.createdAt, 'short')}
              </TableCell>
              <TableCell>
                <Badge variant={sourceVariant(application.sourceType)}>
                  {sourceLabel(application.sourceType)}
                </Badge>
              </TableCell>
              <TableCell className="min-w-48 whitespace-normal text-sm">
                {applicationDetail(application)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">
                {formatCurrency(application.amount, currency)}
              </TableCell>
              <TableCell className="min-w-48 break-all font-mono text-xs text-muted-foreground">
                {applicationReference(application)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
