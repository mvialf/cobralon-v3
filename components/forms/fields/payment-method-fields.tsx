'use client'

import * as React from 'react'
import { Control, useWatch } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PaymentMethod {
  id: string
  name: string
  hasInstallments: boolean
  maxInstallments: number | null
}

interface PaymentMethodFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  paymentMethods: PaymentMethod[]
  loading?: boolean
  onPaymentMethodChange?: (methodId: string) => void
}

/**
 * Componente reutilizable para campos de método de pago
 * Incluye: método de pago + número de cuotas (condicional)
 *
 * Maneja automáticamente:
 * - Mostrar campo de cuotas solo si hasInstallments es true
 * - Callback onPaymentMethodChange para que el padre resetee cuotas
 */
export function PaymentMethodFields({
  control,
  paymentMethods,
  loading = false,
  onPaymentMethodChange,
}: PaymentMethodFieldsProps) {
  // Watch payment method ID para mostrar campo de cuotas
  const watchedPaymentMethodId = useWatch({
    control,
    name: 'paymentMethodId',
  })

  const selectedPaymentMethod = React.useMemo(
    () => paymentMethods.find((m) => m.id === watchedPaymentMethodId),
    [paymentMethods, watchedPaymentMethodId]
  )

  return (
    <div className="space-y-4">
      {/* Método de Pago */}
      <FormField
        control={control}
        name="paymentMethodId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Método de Pago *</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value)
                // Notificar al padre para que resetee cuotas si es necesario
                onPaymentMethodChange?.(value)
              }}
              value={field.value}
              disabled={loading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Número de Cuotas (condicional) */}
      {selectedPaymentMethod?.hasInstallments && (
        <FormField
          control={control}
          name="selectedInstallments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Cuotas</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={(field.value ?? 1).toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuotas" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1 cuota (contado)</SelectItem>
                  {Array.from(
                    { length: (selectedPaymentMethod?.maxInstallments || 2) - 1 },
                    (_, i) => i + 2
                  ).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} cuotas sin interés
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
