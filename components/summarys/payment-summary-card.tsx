'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from 'lucide-react'
import { calculateProjectBalance } from '@/lib/payment-fifo'

interface PaymentSummaryCardProps {
  projectId: string
  totalAmount: number | null
  currency: string
}

/**
 * Card con resumen del estado de pagos de un proyecto
 *
 * Muestra:
 * - Total del proyecto
 * - Total pagado
 * - Balance pendiente
 * - Progreso visual con barra
 * - Botón para registrar nuevo pago
 */
export function PaymentSummaryCard({ projectId, totalAmount, currency }: PaymentSummaryCardProps) {
  const [allocations, setAllocations] = useState<
    Array<{ allocatedAmount: number; payment?: { status: string } }>
  >([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAllocations = async () => {
    try {
      setIsLoading(true)
      // Obtener allocations del proyecto
      const response = await fetch(`/api/payments?projectId=${projectId}`)
      if (!response.ok) throw new Error('Error al cargar pagos')

      const data = await response.json()

      // Extraer allocations de este proyecto
      const projectAllocations = data.payments.flatMap((payment: any) =>
        payment.allocations
          .filter((alloc: any) => alloc.project.id === projectId)
          .map((alloc: any) => ({
            allocatedAmount: alloc.allocatedAmount,
            payment: { status: payment.status },
          }))
      )

      setAllocations(projectAllocations)
    } catch (error) {
      console.error('Error fetching allocations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllocations()
  }, [projectId])

  // Calcular balance usando la misma lógica que FIFO
  const { totalPaid, balance, percentPaid } = calculateProjectBalance({
    totalAmount,
    allocations,
  })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Pagos</CardTitle>
          <CardDescription>Cargando información de pagos...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Resumen de Pagos</CardTitle>
          <CardDescription>Estado financiero del proyecto</CardDescription>
        </div>
        <Link href="/payments">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Registrar Pago
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total del Proyecto */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total del Proyecto</span>
          <span className="text-lg font-semibold">{formatCurrency(totalAmount || 0)}</span>
        </div>

        {/* Total Pagado */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Pagado</span>
          <span className="text-lg font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(totalPaid)}
          </span>
        </div>

        {/* Balance Pendiente */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Balance Pendiente</span>
          <span
            className={`text-lg font-semibold ${
              balance > 0
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {formatCurrency(balance)}
          </span>
        </div>

        {/* Barra de Progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso de Pago</span>
            <span className="font-medium">{percentPaid.toFixed(1)}%</span>
          </div>
          <Progress value={percentPaid} className="h-2" />
        </div>

        {/* Estado */}
        {balance <= 0 && totalAmount && totalAmount > 0 ? (
          <div className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
            ✓ Proyecto pagado completamente
          </div>
        ) : balance > 0 ? (
          <div className="rounded-lg bg-orange-50 p-3 text-sm font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
            ⚠ Pendiente de pago
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
