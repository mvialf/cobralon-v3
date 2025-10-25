'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, CircleDollarSign, Wallet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import CircularProgressChart from '@/components/ui/circular-progress-chart'

interface PaymentSummaryCardProps {
  totalAmount: number | null
  currency: string
  totalPaid: number // ← Calculado en backend
  balance: number // ← Calculado en backend
  percentPaid: number // ← Calculado en backend
  variant?: 'card' | 'dashboard'
}

/**
 * Card con resumen del estado de pagos de un proyecto
 *
 * Muestra:
 * - Total del proyecto
 * - Total pagado
 * - Balance pendiente
 * - Progreso visual con barra o circular (según variant)
 * - Botón para registrar nuevo pago (solo en variant='card')
 *
 * @param variant - 'card' (default): Diseño compacto con Card | 'dashboard': Diseño visual con gráfico circular
 *
 * IMPORTANTE: totalPaid, balance y percentPaid vienen pre-calculados del backend.
 * NO recalcular en frontend para evitar inconsistencias.
 */
export function PaymentSummaryCard({
  totalAmount,
  currency,
  totalPaid,
  balance,
  percentPaid,
  variant = 'card',
}: PaymentSummaryCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  // Variant: Dashboard (diseño visual con gráfico circular)
  if (variant === 'dashboard') {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          {/* Card de Saldo (2/3) */}
          <Card className="w-2/3 flex flex-col">
            <CardContent className="flex-1 p-4">
              <div className="flex items-center gap-2 text-primary">
                <CircleDollarSign className="h-6 w-6" />
                <p className="text-xl font-medium">Saldo</p>
              </div>
              <div className="mt-auto pt-4">
                <div
                  className={`text-3xl font-semibold text-right ${
                    balance > 0
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {formatCurrency(balance)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Progreso Circular (1/3) */}
          <Card className="w-1/3 flex items-center justify-center">
            <CardContent className="p-2">
              <CircularProgressChart percentage={percentPaid} />
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          {/* Card de Abonos (1/2) */}
          <Card className="w-1/2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Wallet className="h-5 w-5" />
                <p className="text-lg font-medium">Abonos</p>
              </div>
              <div className="text-2xl text-right font-semibold pt-4 text-green-600 dark:text-green-400">
                {formatCurrency(totalPaid)}
              </div>
            </CardContent>
          </Card>

          {/* Card de Total Proyecto (1/2) */}
          <Card className="w-1/2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <FileText className="h-5 w-5" />
                <p className="text-lg font-medium">Proyecto</p>
              </div>
              <div className="text-2xl text-right font-semibold pt-4">
                {formatCurrency(totalAmount || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Variant: Card (diseño compacto default)
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
