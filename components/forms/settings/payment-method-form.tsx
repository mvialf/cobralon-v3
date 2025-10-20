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
        requiresReference: false,
        icon: null,
        ...defaultValues,
      },
    })

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
                  <Input placeholder="Ej: Transferencia Bancaria" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Requiere Referencia */}
          <FormField
            control={form.control}
            name="requiresReference"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Requiere número de referencia</FormLabel>
                  <FormDescription>
                    Si está activado, el formulario pedirá un número de transacción o comprobante al
                    registrar pagos con este método.
                  </FormDescription>
                </div>
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
                  <Input
                    placeholder="Ej: Banknote, CreditCard, Smartphone"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Nombre de icono de Lucide React (ej: Banknote, CreditCard, Smartphone)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    )
  }
)

PaymentMethodForm.displayName = 'PaymentMethodForm'
