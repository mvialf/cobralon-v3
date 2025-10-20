'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ProjectPaymentsTableProps {
  projectId: string
}

interface PaymentAllocation {
  id: string
  allocatedAmount: number
  payment: {
    id: string
    amount: number
    currency: string
    date: string
    reference: string | null
    notes: string | null
    status: string
    cancelledAt: string | null
    cancelledReason: string | null
    paymentMethod: {
      id: string
      name: string
      icon: string | null
    }
    customer: {
      id: string
      name: string
    }
  }
}

/**
 * Tabla de pagos de un proyecto con acción de anular
 *
 * Muestra:
 * - Lista de pagos del proyecto (via allocations)
 * - Fecha, método, monto asignado, referencia
 * - Estado (ACTIVE/CANCELLED)
 * - Botón para anular (solo si está ACTIVE)
 */
export function ProjectPaymentsTable({ projectId }: ProjectPaymentsTableProps) {
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancellingPaymentId, setCancellingPaymentId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const fetchPayments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/payments?projectId=${projectId}`)
      if (!response.ok) throw new Error('Error al cargar pagos')

      const data = await response.json()

      // Extraer allocations de este proyecto con toda la info del pago
      const projectAllocations = data.payments.flatMap((payment: any) =>
        payment.allocations
          .filter((alloc: any) => alloc.project.id === projectId)
          .map((alloc: any) => ({
            id: alloc.id,
            allocatedAmount: alloc.allocatedAmount,
            payment: {
              id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              date: payment.date,
              reference: payment.reference,
              notes: payment.notes,
              status: payment.status,
              cancelledAt: payment.cancelledAt,
              cancelledReason: payment.cancelledReason,
              paymentMethod: payment.paymentMethod,
              customer: payment.customer,
            },
          }))
      )

      // Ordenar por fecha descendente (más reciente primero)
      projectAllocations.sort((a: PaymentAllocation, b: PaymentAllocation) => {
        return new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime()
      })

      setAllocations(projectAllocations)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Error al cargar pagos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [projectId])

  const handleCancelPayment = async (paymentId: string) => {
    try {
      setCancellingPaymentId(paymentId)

      const response = await fetch(`/api/payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() || null }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al anular pago')
      }

      toast.success('Pago anulado exitosamente')
      setCancelReason('')
      fetchPayments() // Refetch data
    } catch (error) {
      console.error('Error cancelling payment:', error)
      toast.error(error instanceof Error ? error.message : 'Error al anular pago')
    } finally {
      setCancellingPaymentId(null)
    }
  }

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
      month: 'short',
      day: 'numeric',
    })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pagos del Proyecto</CardTitle>
          <CardDescription>Cargando historial de pagos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (allocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pagos del Proyecto</CardTitle>
          <CardDescription>Historial de pagos asociados a este proyecto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No hay pagos registrados para este proyecto
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagos del Proyecto</CardTitle>
        <CardDescription>Historial de pagos asociados a este proyecto</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Monto Asignado</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow key={allocation.id}>
                <TableCell>{formatDate(allocation.payment.date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {allocation.payment.paymentMethod.name}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(allocation.allocatedAmount, allocation.payment.currency)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {allocation.payment.reference || <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  {allocation.payment.status === 'ACTIVE' ? (
                    <Badge variant="default" className="bg-green-600">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Anulado</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {allocation.payment.status === 'ACTIVE' ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={cancellingPaymentId === allocation.payment.id}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Anular
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Anular este pago?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. El pago quedará marcado como anulado y
                            no se contabilizará en el balance del proyecto.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="space-y-4 py-4">
                          {/* Info del pago */}
                          <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Monto:</span>
                              <span className="font-medium">
                                {formatCurrency(
                                  allocation.allocatedAmount,
                                  allocation.payment.currency
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Método:</span>
                              <span>{allocation.payment.paymentMethod.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Fecha:</span>
                              <span>{formatDate(allocation.payment.date)}</span>
                            </div>
                          </div>

                          {/* Razón de anulación (opcional) */}
                          <div className="space-y-2">
                            <Label htmlFor="cancelReason">Razón de anulación (opcional)</Label>
                            <Textarea
                              id="cancelReason"
                              placeholder="Ej: Pago duplicado, error de ingreso..."
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>

                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setCancelReason('')}>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancelPayment(allocation.payment.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Anular Pago
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : allocation.payment.cancelledReason ? (
                    <div
                      className="text-xs text-muted-foreground"
                      title={allocation.payment.cancelledReason}
                    >
                      Anulado:{' '}
                      {allocation.payment.cancelledReason.length > 30
                        ? `${allocation.payment.cancelledReason.substring(0, 30)}...`
                        : allocation.payment.cancelledReason}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
