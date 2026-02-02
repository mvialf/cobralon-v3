'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCreditTransactionTypeLabel } from '@/lib/business-logic/credit-eligibility'
import { formatCurrency, formatDate } from '@/lib/format'

interface CreditHistoryDialogProps {
  customerId: string
  customerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CreditTransactionType = 'OVERPAYMENT' | 'APPLIED' | 'REFUND' | 'WITHDRAWAL' | 'ADJUSTMENT'

interface CreditTransaction {
  id: string
  amount: number
  type: CreditTransactionType
  description: string | null
  createdAt: string
  project: { id: string; projectNumber: string; projectName: string | null } | null
  payment: { id: string; amount: number; date: string } | null
}

interface CreditHistoryData {
  creditBalance: number
  transactions: CreditTransaction[]
}

const typeBadgeVariants: Record<CreditTransactionType, string> = {
  OVERPAYMENT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  APPLIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  WITHDRAWAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  ADJUSTMENT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  REFUND: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function TransactionReference({ transaction }: { transaction: CreditTransaction }) {
  if (transaction.project) {
    return <span className="text-muted-foreground">P-{transaction.project.projectNumber}</span>
  }
  if (transaction.payment) {
    return (
      <span className="text-muted-foreground">
        Pago {formatDate(transaction.payment.date, 'short')}
      </span>
    )
  }
  return <span className="text-muted-foreground">-</span>
}

export function CreditHistoryDialog({
  customerId,
  customerName,
  open,
  onOpenChange,
}: CreditHistoryDialogProps) {
  const [data, setData] = useState<CreditHistoryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchCreditHistory = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/customers/${customerId}/credit`)

      if (!response.ok) {
        throw new Error('Error al cargar historial de crédito')
      }

      const result: CreditHistoryData = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching credit history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    if (open && customerId) {
      fetchCreditHistory()
    }
  }, [open, customerId, fetchCreditHistory])

  useEffect(() => {
    if (!open) {
      setData(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de Crédito</DialogTitle>
          <DialogDescription>
            {customerName}
            {data && (
              <>
                {' '}
                &mdash; Saldo actual:{' '}
                <span className="font-medium">{formatCurrency(data.creditBalance)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : data && data.transactions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No hay transacciones de crédito registradas
          </div>
        ) : data ? (
          <div className="border rounded-md max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(tx.createdAt, 'short')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeBadgeVariants[tx.type]}>
                        {getCreditTransactionTypeLabel(tx.type)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium whitespace-nowrap ${
                        tx.amount > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                      {tx.description || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <TransactionReference transaction={tx} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
