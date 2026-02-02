/**
 * CreditApplicationFields
 *
 * Sección de formulario para aplicar crédito a favor del cliente a un pago de proyecto.
 * Se muestra condicionalmente solo cuando el cliente tiene crédito disponible.
 *
 * Features:
 * - Input de cantidad de crédito a aplicar
 * - Validación: No puede exceder min(customerCredit, projectBalance)
 * - Visual summary mostrando balance antes/después
 * - Integrado con react-hook-form
 */

'use client'

import { type UseFormReturn } from 'react-hook-form'
import { DollarSign, TrendingDown, Wallet } from 'lucide-react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/format'
import { calculateMaxCreditApplication } from '@/lib/business-logic/credit-management'

interface CreditApplicationFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  customerCredit: number
  projectBalance: number
  customerName: string
}

export function CreditApplicationFields({
  form,
  customerCredit,
  projectBalance,
  customerName,
}: CreditApplicationFieldsProps) {
  const creditApplied = form.watch('creditApplied') || 0
  const maxApplicable = calculateMaxCreditApplication(customerCredit, projectBalance)

  // Cálculo de balances después de aplicar crédito
  const newCustomerCredit = customerCredit - creditApplied
  const projectedProjectBalance = projectBalance - creditApplied

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Crédito Disponible</h3>
      </div>

      {/* Info de crédito disponible */}
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">{customerName}</span> tiene{' '}
          <span className="font-bold text-primary">{formatCurrency(customerCredit, 'CLP')}</span> de
          crédito disponible. Puedes aplicar hasta{' '}
          <span className="font-bold">{formatCurrency(maxApplicable, 'CLP')}</span> a este proyecto.
        </AlertDescription>
      </Alert>

      {/* Input de cantidad a aplicar */}
      <FormField
        control={form.control}
        name="creditApplied"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Monto de Crédito a Aplicar</FormLabel>
            <FormControl>
              <CurrencyInput
                value={field.value}
                onChange={(value) => {
                  const numericValue = value ?? 0
                  const capped = Math.min(numericValue, maxApplicable)
                  field.onChange(capped)
                }}
                placeholder="0"
                max={maxApplicable}
                onBlur={field.onBlur}
                name={field.name}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Visual Summary si hay crédito aplicado */}
      {creditApplied > 0 && (
        <div className="space-y-2 rounded-md bg-background p-3 text-sm">
          <div className="font-medium text-muted-foreground">Resumen de Aplicación:</div>

          {/* Crédito del cliente */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              Crédito de {customerName}:
            </span>
            <div className="text-right">
              <div className="line-through text-muted-foreground">
                {formatCurrency(customerCredit, 'CLP')}
              </div>
              <div className="font-semibold text-orange-600">
                {formatCurrency(newCustomerCredit, 'CLP')}
              </div>
            </div>
          </div>

          {/* Balance del proyecto */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-green-500" />
              Balance del Proyecto:
            </span>
            <div className="text-right">
              <div className="line-through text-muted-foreground">
                {formatCurrency(projectBalance, 'CLP')}
              </div>
              <div className="font-semibold text-green-600">
                {formatCurrency(projectedProjectBalance, 'CLP')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
