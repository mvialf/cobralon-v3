import { CircleDollarSign, Wallet, FileText } from 'lucide-react'
import CircularProgressChart from '@/components/ui/circular-progress-chart'

interface PaymentSummaryCardProps {
  totalAmount: number | null
  currency: string
  totalPaid: number // ← Calculado en backend
  balance: number // ← Calculado en backend
  percentPaid: number // ← Calculado en backend
}

/**
 * Card con resumen del estado de pagos de un proyecto
 *
 * Muestra:
 * - Total del proyecto
 * - Total pagado
 * - Balance pendiente
 * - Progreso visual con gráfico circular
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
}: PaymentSummaryCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {/* Card de Saldo (2/3) */}
        <div className="w-2/3 bg-capture-card shadow-capture-md p-4 rounded-xl shadow-capture">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-6 w-6 text-primary" />
            <p className="text-xl font-medium text-capture-foreground">Saldo</p>
          </div>
          <div className="pt-4">
            <div className="text-3xl font-semibold text-right text-capture-foreground">
              {formatCurrency(balance)}
            </div>
          </div>
        </div>

        {/* Card de Progreso Circular (1/3) */}
        <div className="w-1/3 flex p-2 items-center justify-center bg-capture-card rounded-xl shadow-capture">
          <div className="p-0">
            <CircularProgressChart percentage={Math.round(percentPaid)} />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Card de Abonos (1/2) */}
        <div className="w-1/2 bg-capture-card shadow-capture-md p-4 rounded-xl shadow-capture">
          <div className="p-0">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-capture-orange" />
              <p className="text-lg font-medium text-capture-foreground">Abonos</p>
            </div>
            <div className="text-2xl text-right font-semibold pt-4 text-capture-foreground">
              {formatCurrency(totalPaid)}
            </div>
          </div>
        </div>

        {/* Card de Total Proyecto (1/2) */}
        <div className="w-1/2 bg-capture-card shadow-capture-md p-4 rounded-xl shadow-capture">
          <div className="p-0">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-capture-green" />
              <p className="text-lg font-medium text-capture-foreground">Proyecto</p>
            </div>
            <div className="text-2xl text-right font-semibold pt-4 text-capture-foreground">
              {formatCurrency(totalAmount || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
