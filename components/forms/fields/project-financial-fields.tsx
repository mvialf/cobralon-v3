'use client'

import * as React from 'react'
import { Control, useWatch } from 'react-hook-form'

import { calculateProjectTotal } from '@/lib/business-logic/totals'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FormGrid } from '@/components/ui/form-grid'
import { CurrencyInput } from '@/components/ui/currency-input'
import { PercentageInput } from '@/components/ui/percentage-input'

interface ProjectFinancialFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  currency?: string
}

/**
 * Componente reutilizable para campos financieros de proyecto
 * Incluye: Subtotal + TaxRate + Total (calculado automáticamente)
 *
 * Renderiza 3 campos en FormGrid(3):
 * - Subtotal (CurrencyInput editable)
 * - Impuesto (PercentageInput editable)
 * - Total (CurrencyInput disabled, calculado automáticamente)
 *
 * El cálculo del total se hace con useMemo observando subtotal y taxRate.
 */
export function ProjectFinancialFields({ control, currency }: ProjectFinancialFieldsProps) {
  // Watch subtotal y taxRate para calcular total
  const subtotal = useWatch({
    control,
    name: 'subtotal',
  })

  const taxRate = useWatch({
    control,
    name: 'taxRate',
  })

  // Calcular total automáticamente usando business logic
  const total = React.useMemo(() => {
    if (!subtotal) return 0
    return calculateProjectTotal(subtotal, taxRate || 0)
  }, [subtotal, taxRate])

  return (
    <FormGrid columns={3}>
      {/* Subtotal */}
      <FormField
        control={control}
        name="subtotal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Subtotal *</FormLabel>
            <FormControl>
              <CurrencyInput value={field.value} onChange={field.onChange} currency={currency} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Impuesto */}
      <FormField
        control={control}
        name="taxRate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Impuesto</FormLabel>
            <FormControl>
              <PercentageInput
                value={field.value}
                onValueChange={(value) => field.onChange(value || 0)}
                placeholder="19.0"
                decimalScale={1}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Total (calculado automáticamente, read-only) */}
      <FormItem>
        <FormLabel>Total</FormLabel>
        <FormControl>
          <CurrencyInput
            value={total}
            onChange={() => {}}
            disabled
            className="bg-muted"
            currency={currency}
          />
        </FormControl>
      </FormItem>
    </FormGrid>
  )
}
