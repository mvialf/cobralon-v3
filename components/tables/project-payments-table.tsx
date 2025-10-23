'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ProjectPaymentsTableProps {
  projectId: string
}

interface AllocationFromAPI {
  id: string
  allocatedAmount: number
  project: {
    id: string
  }
}

interface PaymentFromAPI {
  id: string
  amount: number
  currency: string
  date: string
  reference: string | null
  notes: string | null
  paymentMethod: {
    id: string
    name: string
    icon: string | null
  }
  customer: {
    id: string
    name: string
  }
  allocations: AllocationFromAPI[]
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
 * Tabla de pagos de un proyecto
 *
 * Muestra:
 * - Lista de pagos del proyecto (via allocations)
 * - Fecha, método, monto asignado, referencia
 * - Botón para eliminar pagos
 */
export function ProjectPaymentsTable({ projectId }: ProjectPaymentsTableProps) {
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/payments?projectId=${projectId}`)
      if (!response.ok) throw new Error('Error al cargar pagos')

      const data = await response.json()

      // Extraer allocations de este proyecto con toda la info del pago
      const projectAllocations = data.payments.flatMap((payment: PaymentFromAPI) =>
        payment.allocations
          .filter((alloc: AllocationFromAPI) => alloc.project.id === projectId)
          .map((alloc: AllocationFromAPI) => ({
            id: alloc.id,
            allocatedAmount: alloc.allocatedAmount,
            payment: {
              id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              date: payment.date,
              reference: payment.reference,
              notes: payment.notes,
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
  }, [projectId])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleDeletePayment = async (paymentId: string) => {
    try {
      setDeletingPaymentId(paymentId)

      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar pago')
      }

      toast.success('Pago eliminado exitosamente')
      fetchPayments() // Refetch data
    } catch (error) {
      console.error('Error deleting payment:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar pago')
    } finally {
      setDeletingPaymentId(null)
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
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingPaymentId === allocation.payment.id}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. El pago será eliminado permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

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

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePayment(allocation.payment.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar Pago
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
