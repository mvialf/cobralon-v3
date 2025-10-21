'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, User, CreditCard, FileText, DollarSign, FolderOpen, XCircle } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  currency: string
  date: string
  reference: string | null
  status: string
  cancelledAt?: string | null
  cancelledReason?: string | null
  customer: {
    id: string
    name: string
  }
  paymentMethod: {
    id: string
    name: string
  }
  allocations: Array<{
    id: string
    allocatedAmount: number
    project: {
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
  if (!payment) return null

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Pago</DialogTitle>
          <DialogDescription>Información completa del registro de pago</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estado y Monto */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {formatCurrency(payment.amount, payment.currency)}
              </span>
            </div>
            {payment.status === 'ACTIVE' ? (
              <Badge variant="default" className="bg-green-600">
                Activo
              </Badge>
            ) : (
              <Badge variant="destructive">Anulado</Badge>
            )}
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
                <span className="text-sm">{formatDate(payment.date)}</span>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cliente:</span>
                <span className="text-sm">{payment.customer.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Método de Pago:</span>
                <span className="text-sm">{payment.paymentMethod.name}</span>
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
                      <div className="font-medium">{alloc.project.projectNumber}</div>
                      {alloc.project.projectName && (
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

          {/* Información de Cancelación (si aplica) */}
          {payment.status === 'CANCELLED' && payment.cancelledAt && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  Información de Anulación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Fecha de Anulación:</span>
                  <span className="text-sm">{formatDate(payment.cancelledAt)}</span>
                </div>
                {payment.cancelledReason && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm font-medium">Razón:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {payment.cancelledReason}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ID del Pago (para referencia técnica) */}
          <div className="text-xs text-muted-foreground text-center pt-2">ID: {payment.id}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
