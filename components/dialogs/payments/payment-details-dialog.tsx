'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, User, CreditCard, FileText, DollarSign, FolderOpen } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/format'
import { useConfiguration } from '@/hooks/use-configuration'

interface Payment {
  id: string
  type: 'Project' | 'Customer' // ← NUEVO: Tipo de pago
  amount: number
  currency: string
  date: Date | string // Compatible con API response
  reference: string | null
  customer?: {
    id: string
    name: string
  }
  paymentMethod?: {
    id: string
    name: string
  }
  allocations: Array<{
    id: string
    allocatedAmount: number
    project?: {
      id: string
      projectNumber: string
      projectName: string | null
    }
  }>
}

interface PaymentDetailsDialogProps {
  payment: Payment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentDetailsDialog({ payment, open, onOpenChange }: PaymentDetailsDialogProps) {
  const { configuration } = useConfiguration()

  if (!payment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Pago</DialogTitle>
          <DialogDescription>Información completa del registro de pago</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Monto */}
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">
              {formatCurrency(payment.amount, payment.currency)}
            </span>
          </div>

          <Separator />

          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Fecha:</span>
                <span className="text-sm">
                  {formatDate(payment.date, 'full', configuration.locale)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cliente:</span>
                <span className="text-sm">{payment.customer?.name || '-'}</span>
              </div>

              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Método de Pago:</span>
                <span className="text-sm">{payment.paymentMethod?.name || '-'}</span>
              </div>

              {payment.reference && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Referencia:</span>
                  <span className="text-sm font-mono">{payment.reference}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proyectos Asignados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Proyectos Asignados ({payment.allocations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payment.allocations.map((alloc) => (
                  <div
                    key={alloc.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                  >
                    <div>
                      <div className="font-medium">{alloc.project?.projectNumber || '-'}</div>
                      {alloc.project?.projectName && (
                        <div className="text-sm text-muted-foreground">
                          {alloc.project.projectName}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(alloc.allocatedAmount, payment.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ID del Pago (para referencia técnica) */}
          <div className="text-xs text-muted-foreground text-center pt-2">ID: {payment.id}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
