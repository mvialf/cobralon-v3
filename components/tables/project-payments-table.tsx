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
import { Skeleton } from '@/components/ui/skeleton'
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
 * Tabla de pagos de un proyecto (solo lectura)
 *
 * Muestra:
 * - Lista de pagos del proyecto (via allocations)
 * - Fecha, método, monto asignado, referencia
 * - Sin acciones (tabla puramente informativa)
 */
export function ProjectPaymentsTable({ projectId }: ProjectPaymentsTableProps) {
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
