'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  paymentMethodSchema,
  type PaymentMethodFormValues,
} from '@/lib/validations/payment-method-validations'

import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface PaymentMethodFormProps {
  onSubmit: (data: PaymentMethodFormValues) => void | Promise<void>
  defaultValues?: Partial<PaymentMethodFormValues>
}

export interface PaymentMethodFormHandle {
  submit: () => void
  reset: () => void
}

export const PaymentMethodForm = React.forwardRef<PaymentMethodFormHandle, PaymentMethodFormProps>(
  ({ onSubmit, defaultValues }, ref) => {
    const form = useForm<PaymentMethodFormValues>({
      resolver: zodResolver(paymentMethodSchema),
      defaultValues: {
        name: '',
        icon: null,
        hasInstallments: false,
        maxInstallments: null,
        ...defaultValues,
      },
    })

    // Watch hasInstallments para mostrar/ocultar maxInstallments
    const hasInstallments = form.watch('hasInstallments')

    // Exponer métodos al parent via ref
    React.useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onSubmit)(),
      reset: () => form.reset(),
    }))

    return (
      <Form {...form}>
        <div className="grid gap-4">
          {/* Campo: Nombre */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del método</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Icono (opcional) */}
          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Icono (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormDescription>
                  Nombre de icono de Lucide React (ej: Banknote, CreditCard, Smartphone)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Cuotas sin interés */}
          <FormField
            control={form.control}
            name="hasInstallments"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      // Si se desmarca, limpiar maxInstallments
                      if (!checked) {
                        form.setValue('maxInstallments', null)
                      }
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>¿Ofrece cuotas sin interés?</FormLabel>
                  <FormDescription>
                    Permite que los clientes paguen en cuotas a través de este método
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Campo: Máximo de cuotas (condicional) */}
          {hasInstallments && (
            <FormField
              control={form.control}
              name="maxInstallments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número máximo de cuotas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      max={36}
                      placeholder="Ej: 6"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : Number(e.target.value)
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Los clientes podrán elegir desde 1 hasta este número de cuotas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </Form>
    )
  }
)

PaymentMethodForm.displayName = 'PaymentMethodForm'
