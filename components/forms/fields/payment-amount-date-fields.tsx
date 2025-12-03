'use client'

import * as React from 'react'
import { Control } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FormGrid } from '@/components/ui/form-grid'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatDateValue, parseDateValue } from '@/lib/utils'

interface PaymentAmountDateFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  currency?: string
  disabled?: boolean
  amountLabel?: string
  dateLabel?: string
}

/**
 * Componente reutilizable para campos de monto y fecha de pago
 * Incluye: CurrencyInput + date input en FormGrid(2)
 *
 * Usado en formularios de pagos para capturar el monto y fecha del pago.
 */
export function PaymentAmountDateFields({
  control,
  currency,
  disabled = false,
  amountLabel = 'Monto del Pago *',
  dateLabel = 'Fecha del Pago *',
}: PaymentAmountDateFieldsProps) {
  return (
    <FormGrid columns={2}>
      {/* Monto del Pago */}
      <FormField
        control={control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{amountLabel}</FormLabel>
            <FormControl>
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                currency={currency}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Fecha del Pago */}
      <FormField
        control={control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{dateLabel}</FormLabel>
            <FormControl>
              <Input
                type="date"
                defaultValue={formatDateValue(field.value)}
                onBlur={(e) => field.onChange(parseDateValue(e.target.value))}
                name={field.name}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormGrid>
  )
}
