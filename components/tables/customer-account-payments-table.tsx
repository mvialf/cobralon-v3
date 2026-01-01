'use client'

import { formatCurrency, formatDate } from '@/lib/format'
import { useConfiguration } from '@/hooks/use-configuration'
import type { ConsolidatedPayment } from '@/lib/transformers/customer-account-transformers'

interface CustomerAccountPaymentsTableProps {
  payments: ConsolidatedPayment[]
  currency: string
}

/**
 * Tabla de pagos consolidados para estado de cuenta de cliente
 *
 * Lógica híbrida del (*):
 * - Sin (*): Pago completo (todas sus allocations están en proyectos seleccionados)
 * - Con (*): Pago parcial (algunas allocations están fuera de la selección)
 *
 * | Abono    | Fecha    | Valor      |
 * |----------|----------|------------|
 * | 1        | 15-Ene   | $500,000   | <- completo
 * | 2        | 20-Ene   | $100,000   | <- directo
 * | (*) 3    | 25-Ene   | $150,000   | <- parcial
 *
 * (*) Pago parcialmente visible
 *
 * Usa estilos CSS capture para consistencia con CaptureDialog
 */
export function CustomerAccountPaymentsTable({
  payments,
  currency,
}: CustomerAccountPaymentsTableProps) {
  const { configuration } = useConfiguration()
  const locale = configuration.locale

  const hasPartialPayments = payments.some((p) => p.isPartial)

  if (payments.length === 0) {
    return (
      <div className="bg-transparent">
        <div className="text-capture-foreground text-md font-normal pb-2">Historial de pagos</div>
        <div className="flex flex-col items-center justify-center py-8 text-center border border-capture-border rounded-md">
          <p className="text-capture-foreground text-sm font-normal">
            No hay pagos registrados para los proyectos seleccionados
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-transparent">
      <div className="text-capture-foreground text-md font-normal pb-2">Historial de pagos</div>

      <div className="overflow-hidden">
        <table className="w-full border border-capture-border shadow-capture rounded-md">
          <thead className="bg-capture-border">
            <tr className="border-b">
              <th className="w-20 py-2 px-4 text-capture-foreground bg-transparent text-end text-sm">
                Abono
              </th>
              <th className="py-2 px-4 text-capture-foreground bg-transparent text-center text-sm">
                Fecha
              </th>
              <th className="w-32 py-2 px-4 text-capture-foreground bg-transparent text-right text-sm">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="bg-pay-card">
            {payments.map((payment, index) => (
              <tr key={payment.id} className="border-b last:border-b-0">
                <td className="py-2 px-4 font-medium text-capture-foreground text-end text-sm">
                  {payment.isPartial ? '(*) ' : ''}
                  {index + 1}
                </td>
                <td className="py-2 px-4 font-medium text-capture-foreground text-center text-sm">
                  {formatDate(payment.date, 'short', locale)}
                </td>
                <td className="py-2 px-4 font-medium text-capture-foreground text-right text-sm">
                  {formatCurrency(payment.displayAmount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {hasPartialPayments && (
          <p className="text-xs font-normal text-capture-foreground pt-2 px-4">
            (*) Pago parcialmente visible (incluye otros proyectos no seleccionados)
          </p>
        )}
      </div>
    </div>
  )
}
