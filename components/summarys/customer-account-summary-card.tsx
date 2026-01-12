import { CircleDollarSign, Wallet, FileText } from 'lucide-react'

interface CustomerAccountSummaryCardProps {
  totalProjects: number // Suma de totalAmount de proyectos seleccionados
  totalPaid: number // Suma de pagos (allocations en proyectos seleccionados)
  balance: number // totalProjects - totalPaid
  currency: string
}

/**
 * Card con resumen del estado de cuenta de cliente (multi-proyecto)
 *
 * Layout:
 * ┌────────────────┐  ┌─────────────────────────────────────┐
 * │                │  │ Proyectos: $1,300,000               │
 * │     SALDO      │  └─────────────────────────────────────┘
 * │    $600,000    │  ┌─────────────────────────────────────┐
 * │                │  │ Abonos: $700,000                    │
 * └────────────────┘  └─────────────────────────────────────┘
 *   (doble altura)       (2 cards apiladas)
 *
 * Usa estilos CSS capture para consistencia con CaptureDialog
 */
export function CustomerAccountSummaryCard({
  totalProjects,
  totalPaid,
  balance,
  currency,
}: CustomerAccountSummaryCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <div className="flex gap-4">
      {/* Card de Saldo - Doble altura (ocupa toda la columna izquierda) */}
      <div className="w-1/2 bg-capture-card shadow-capture p-4 rounded-xl flex flex-col justify-center">
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

      {/* Columna derecha: Proyectos + Abonos apilados */}
      <div className="w-1/2 flex flex-col gap-4">
        {/* Card de Proyectos */}
        <div className="bg-capture-card shadow-capture p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-capture-green" />
            <p className="text-lg font-medium text-capture-foreground">Proyectos</p>
          </div>
          <div className="text-2xl text-right font-semibold pt-2 text-capture-foreground">
            {formatCurrency(totalProjects)}
          </div>
        </div>

        {/* Card de Abonos */}
        <div className="bg-capture-card shadow-capture p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-capture-orange" />
            <p className="text-lg font-medium text-capture-foreground">Abonos</p>
          </div>
          <div className="text-2xl text-right font-semibold pt-2 text-capture-foreground">
            {formatCurrency(totalPaid)}
          </div>
        </div>
      </div>
    </div>
  )
}
