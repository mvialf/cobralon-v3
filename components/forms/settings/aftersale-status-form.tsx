'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  aftersaleStatusSchema,
  type AftersaleStatusFormValues,
  type BadgeColor,
} from '@/lib/validations/aftersale-status-validations'

import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface AftersaleStatusFormProps {
  onSubmit: (data: AftersaleStatusFormValues) => void | Promise<void>
  defaultValues?: Partial<AftersaleStatusFormValues>
  badgeColors: BadgeColor[]
}

export interface AftersaleStatusFormHandle {
  submit: () => void
  reset: () => void
}

export const AftersaleStatusForm = React.forwardRef<
  AftersaleStatusFormHandle,
  AftersaleStatusFormProps
>(({ onSubmit, defaultValues, badgeColors }, ref) => {
  const form = useForm<AftersaleStatusFormValues>({
    resolver: zodResolver(aftersaleStatusSchema),
    defaultValues: {
      name: '',
      colorId: badgeColors[0]?.id || '',
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
              <FormLabel>Nombre del estado</FormLabel>
              <FormControl>
                <Input placeholder="Ej: En Revisión" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo: Color */}
        <FormField
          control={form.control}
          name="colorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <div className="grid grid-cols-3 gap-2">
                  {badgeColors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => field.onChange(color.id)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted ${
                        field.value === color.id ? 'border-primary ring-1 ring-primary' : ''
                      }`}
                    >
                      <div className={`h-4 w-4 rounded ${color.bgClass}`} />
                      <span>{color.name}</span>
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
})

AftersaleStatusForm.displayName = 'AftersaleStatusForm'
