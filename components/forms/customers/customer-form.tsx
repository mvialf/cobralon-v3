'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { customerSchema, type CustomerFormData } from '@/lib/validations/customer-validations'
import { normalizePhone } from '@/lib/utils/phone'
import { useCheckDuplicateCustomer } from '@/hooks/queries/use-customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/ui/form'

interface CustomerFormProps {
  onSubmit: (data: CustomerFormData) => void | Promise<void>
  defaultValues?: Partial<CustomerFormData>
  submitLabel?: string
  isSubmitting?: boolean
  /** ID del cliente actual (para excluirlo de la búsqueda de duplicados en edición) */
  excludeId?: string
}

export function CustomerForm({
  onSubmit,
  defaultValues,
  submitLabel = 'Guardar',
  isSubmitting = false,
  excludeId,
}: CustomerFormProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      phone: normalizePhone(defaultValues?.phone || ''),
      email: defaultValues?.email || '',
    },
  })

  const nameValue = form.watch('name')
  const { data: duplicates } = useCheckDuplicateCustomer(nameValue, excludeId)

  return (
    <Form {...form}>
      <FormRoot onSubmit={form.handleSubmit(onSubmit)}>
        {/* Nombre */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Juan Perez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Advertencia de cliente similar */}
        {duplicates && duplicates.length > 0 && (
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Posible cliente duplicado</AlertTitle>
            <AlertDescription>
              <p>Ya existen clientes con nombre similar:</p>
              <ul className="mt-1 list-disc pl-4">
                {duplicates.map((c) => (
                  <li key={c.id}>
                    {c.name} — {c.phone}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Telefono */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <PhoneInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Correo */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo</FormLabel>
              <FormControl>
                <Input type="email" placeholder="correo@ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || form.formState.isSubmitting}
        >
          {isSubmitting || form.formState.isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </FormRoot>
    </Form>
  )
}
