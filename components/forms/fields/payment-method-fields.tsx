'use client'

import * as React from 'react'
import { Control, useFormContext, useWatch } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { computePaymentCommission } from '@/lib/business-logic/commission'
import { formatCurrency } from '@/lib/format'

interface CommissionTier {
  minInstallments: number | null
  maxInstallments: number | null
  percentageFee: number
  fixedFee: number
}

interface PaymentMethod {
  id: string
  name: string
  active?: boolean
  hasInstallments: boolean
  maxInstallments: number | null
  commissionTiers?: CommissionTier[]
}

interface PaymentMethodFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  paymentMethods: PaymentMethod[]
  loading?: boolean
  onPaymentMethodChange?: (methodId: string) => void
  /**
   * Auto-selecciona el primer método de pago activo cuando se cargan los métodos
   * @default true
   */
  autoSelectFirst?: boolean
  /** Monto del pago (para preview de comisión) */
  amount?: number
  /** Moneda del pago (para formatear preview de comisión) */
  currency?: string
}

/**
 * Componente reutilizable para campos de método de pago
 * Incluye: método de pago + número de cuotas (condicional)
 *
 * Maneja automáticamente:
 * - Auto-selección del primer método activo (configurable via autoSelectFirst)
 * - Mostrar campo de cuotas solo si hasInstallments es true
 * - Callback onPaymentMethodChange para que el padre resetee cuotas
 */
export function PaymentMethodFields({
  control,
  paymentMethods,
  loading = false,
  onPaymentMethodChange,
  autoSelectFirst = true,
  amount,
  currency = 'CLP',
}: PaymentMethodFieldsProps) {
  const { setValue } = useFormContext()

  // Watch payment method ID para mostrar campo de cuotas
  const watchedPaymentMethodId = useWatch({
    control,
    name: 'paymentMethodId',
  })

  // Auto-seleccionar el primer método de pago activo cuando se cargan
  React.useEffect(() => {
    if (!autoSelectFirst) return
    if (watchedPaymentMethodId) return // Ya hay uno seleccionado
    if (paymentMethods.length === 0) return

    // Encontrar el primer método activo, o el primero si ninguno tiene active
    const defaultMethod = paymentMethods.find((m) => m.active !== false) || paymentMethods[0]

    if (defaultMethod) {
      setValue('paymentMethodId', defaultMethod.id)
      onPaymentMethodChange?.(defaultMethod.id)
    }
  }, [autoSelectFirst, paymentMethods, watchedPaymentMethodId, setValue, onPaymentMethodChange])

  // Watch cuotas seleccionadas y monto para preview de comisión
  const watchedInstallments = useWatch({
    control,
    name: 'selectedInstallments',
  })

  const watchedAmount = useWatch({
    control,
    name: 'amount',
  })

  const selectedPaymentMethod = React.useMemo(
    () => paymentMethods.find((m) => m.id === watchedPaymentMethodId),
    [paymentMethods, watchedPaymentMethodId]
  )

  // Calcular preview de comisión
  // Usa amount del prop si disponible, sino watch del formulario
  const effectiveAmount = amount ?? (typeof watchedAmount === 'number' ? watchedAmount : 0)

  const commissionPreview = React.useMemo(() => {
    if (!effectiveAmount || effectiveAmount <= 0) return null
    if (!selectedPaymentMethod?.commissionTiers?.length) return null

    const tiers = selectedPaymentMethod.commissionTiers.map((t) => ({
      minInstallments: t.minInstallments,
      maxInstallments: t.maxInstallments,
      percentageFee: Number(t.percentageFee),
      fixedFee: Number(t.fixedFee),
    }))

    return computePaymentCommission(effectiveAmount, tiers, watchedInstallments)
  }, [effectiveAmount, selectedPaymentMethod, watchedInstallments])

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

      {/* Preview de comisión */}
      {commissionPreview && commissionPreview.commissionAmount > 0 && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Comisión: {commissionPreview.percentageFee}%
            {commissionPreview.fixedFee > 0 &&
              ` + ${formatCurrency(commissionPreview.fixedFee, currency)}`}{' '}
            ({formatCurrency(commissionPreview.commissionAmount, currency)})
          </span>
          <span className="mx-2">|</span>
          <span className="font-medium text-foreground">
            Neto: {formatCurrency(commissionPreview.netAmount, currency)}
          </span>
        </div>
      )}
    </div>
  )
}
