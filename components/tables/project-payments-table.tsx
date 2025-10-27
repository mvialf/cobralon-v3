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
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/format'
import { useConfiguration } from '@/hooks/use-configuration'

interface ProjectPaymentsTableProps {
  projectId: string
  hidePaymentMethod?: boolean
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
  type: string
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
    type: string
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
 * - Ordenados cronológicamente (ascendente: del más antiguo al más reciente)
 * - Numeración secuencial (N° con (*) si es pago dividido), fecha, monto asignado
 * - Opcionalmente: método de pago (según prop hidePaymentMethod)
 * - Nota al pie: (*) indica pagos obtenidos de pago global de cliente
 * - Sin acciones (tabla puramente informativa)
 */
export function ProjectPaymentsTable({
  projectId,
  hidePaymentMethod = false,
}: ProjectPaymentsTableProps) {
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { configuration } = useConfiguration()

  // Extraer solo el locale necesario para evitar re-renders
  const locale = configuration.locale

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
              type: payment.type,
              notes: payment.notes,
              paymentMethod: payment.paymentMethod,
              customer: payment.customer,
            },
          }))
      )

      // Ordenar por fecha ascendente (cronológico: más antiguo primero)
      projectAllocations.sort((a: PaymentAllocation, b: PaymentAllocation) => {
        return new Date(a.payment.date).getTime() - new Date(b.payment.date).getTime()
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardDescription className="text-pay-foreground">
            Cargando historial de pagos...
          </CardDescription>
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
          <CardDescription className="text-pay-foreground">
            Historial de pagos asociados a este proyecto
          </CardDescription>
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
    <div className="bg-transparent">
      <div className="text-pay-foreground pb-2">Historial de pagos asociados a este proyecto</div>

      <Table className="border border-pay-foreground rounded-md shadow-pay">
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-pay-card bg-primary">N°</TableHead>
            <TableHead className="text-pay-card bg-primary">Fecha</TableHead>
            {!hidePaymentMethod && <TableHead>Método</TableHead>}
            <TableHead className="text-pay-card bg-primary">Monto Asignado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-pay-card">
          {allocations.map((allocation, index) => (
            <TableRow key={allocation.id}>
              <TableCell className="font-medium text-pay-foreground">
                {allocation.payment.type === 'Customer' ? '(*) ' : ''}
                {index + 1}
              </TableCell>
              <TableCell className="font-medium text-pay-foreground">
                {formatDate(allocation.payment.date, 'short', locale)}
              </TableCell>
              {!hidePaymentMethod && (
                <TableCell className="font-medium text-pay-foreground">
                  <div className="flex items-center gap-2">
                    {allocation.payment.paymentMethod.name}
                  </div>
                </TableCell>
              )}
              <TableCell className="font-medium text-pay-foreground text-right">
                {formatCurrency(allocation.allocatedAmount, allocation.payment.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <tfoot>
          <TableRow>
            <TableCell
              colSpan={hidePaymentMethod ? 3 : 4}
              className="text-xs text-pay-foreground pt-2 pb-3 px-4"
            >
              (*) Obtenido de pago global de cliente
            </TableCell>
          </TableRow>
        </tfoot>
      </Table>
    </div>
  )
}
