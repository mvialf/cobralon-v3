'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/format'
import { useConfiguration } from '@/hooks/use-configuration'
import { processProjectPayments } from '@/lib/transformers/payment-transformers'
import type { PaymentFromAPI, PaymentAllocation } from '@/lib/types/payment.types'

interface ProjectPaymentsTableProps {
  projectId: string
  hidePaymentMethod?: boolean
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

      const data: { payments: PaymentFromAPI[] } = await response.json()

      // Usar transformer: extrae allocations del proyecto y las ordena cronológicamente
      const processedAllocations = processProjectPayments(data.payments, projectId, 'asc')

      setAllocations(processedAllocations)
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
          <CardDescription className="text-capture-foreground">
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
          <CardDescription className="text-capture-foreground text-sm font-medium">
            Historial de pagos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-capture-foreground text-sm font-normal">
              No hay pagos registrados para este proyecto
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="bg-transparent">
      <div className="text-capture-foreground text-md font-normal pb-2">Historial de pagos</div>

      <div className="overflow-hidden rounded-xl shadow-capture">
        <table className="w-full">
          <thead className="bg-capture-border">
            <tr>
              <th className="w-20 py-2 px-4 text-capture-foreground text-md bg-transparent text-end text-sm">
                Abono
              </th>
              <th className="py-2 px-4 text-capture-foreground bg-transparent text-center text-sm">
                Fecha
              </th>
              {!hidePaymentMethod && (
                <th className="py-2 px-4 text-capture-foreground bg-transparent text-sm">Método</th>
              )}
              <th className="w-28 py-2 px-4 text-md text-capture-foreground bg-transparent text-end text-sm">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="bg-capture-card">
            {allocations.map((allocation, index) => (
              <tr key={allocation.id}>
                <td className="py-2 px-4 font-medium text-capture-foreground text-end text-sm">
                  {allocation.payment.type === 'Customer' ? '(*) ' : ''}
                  {index + 1}
                </td>
                <td className="py-2 px-4 font-medium text-capture-foreground text-center text-sm">
                  {formatDate(allocation.payment.date, 'short', locale)}
                </td>
                {!hidePaymentMethod && (
                  <td className="py-2 px-4 text-capture-foreground text-sm">
                    <div className="flex items-center gap-2">
                      {allocation.payment.paymentMethod.name}
                    </div>
                  </td>
                )}
                <td className="py-2 px-4 font-medium text-capture-foreground text-right text-sm">
                  {formatCurrency(allocation.allocatedAmount, allocation.payment.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {allocations.some((a) => a.payment.type === 'Customer') && (
          <p className="text-xs font-normal text-capture-foreground pt-2 px-4">
            (*) Obtenido de pago global de cliente
          </p>
        )}
      </div>
    </div>
  )
}
