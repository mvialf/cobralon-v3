'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { createVisitSchema, type CreateVisitInput } from '@/lib/validations/visit-validations'
import { normalizePhone } from '@/lib/utils/phone'
import { cn, formatDateValue, parseDateValue } from '@/lib/utils'
import { useConfiguration } from '@/hooks/use-configuration'
import { useVisitStatuses, getInitialVisitStatus } from '@/hooks/queries/use-visit-statuses'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Textarea } from '@/components/ui/textarea'
import { FormGrid } from '@/components/ui/form-grid'
import { AddressFields } from '@/components/forms/fields/address-fields'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface VisitFormProps {
  onSubmit: (data: CreateVisitInput) => void | Promise<void>
  isSubmitting?: boolean
  defaultValues?: Partial<CreateVisitInput>
  showSubmitButton?: boolean
}

export interface VisitFormHandle {
  submit: () => void
  reset: () => void
}

export const VisitForm = React.forwardRef<VisitFormHandle, VisitFormProps>(
  ({ onSubmit, isSubmitting, defaultValues, showSubmitButton = true }, ref) => {
    const { configuration } = useConfiguration()
    const { data: visitStatuses = [], isLoading: loadingStatuses } = useVisitStatuses()

    const form = useForm<CreateVisitInput>({
      resolver: zodResolver(createVisitSchema),
      defaultValues: {
        name: '',
        phone: normalizePhone(defaultValues?.phone || ''),
        street: '',
        apartment: '',
        comuna: '',
        region: configuration.region || '',
        visitStatusId: '',
        date: new Date(),
        scheduledTime: '',
        observations: '',
        ...defaultValues,
      },
    })

    // Exponer métodos al componente padre vía ref
    React.useImperativeHandle(ref, () => ({
      submit: () => {
        form.handleSubmit(onSubmit)()
      },
      reset: () => {
        form.reset()
      },
    }))

    // Reset form cuando defaultValues cambian (para modo edición)
    React.useEffect(() => {
      if (defaultValues) {
        form.reset({
          name: defaultValues.name || '',
          phone: normalizePhone(defaultValues.phone || ''),
          street: defaultValues.street || '',
          apartment: defaultValues.apartment || '',
          comuna: defaultValues.comuna || '',
          region: defaultValues.region || configuration.region || '',
          visitStatusId: defaultValues.visitStatusId || '',
          date: defaultValues.date || new Date(),
          scheduledTime: defaultValues.scheduledTime || '',
          observations: defaultValues.observations || '',
        })
      }
    }, [defaultValues, form, configuration])

    // Auto-seleccionar status inicial cuando se cargan los statuses
    React.useEffect(() => {
      if (!defaultValues?.visitStatusId && visitStatuses.length > 0) {
        const initialStatus = getInitialVisitStatus(visitStatuses)
        if (initialStatus) {
          form.setValue('visitStatusId', initialStatus.id)
        }
      }
    }, [defaultValues?.visitStatusId, visitStatuses, form])

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Datos del Prospecto */}
          <div className="space-y-4">
            <FormGrid columns={2}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <PhoneInput value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGrid>
          </div>

          {/* Dirección */}
          <AddressFields control={form.control} streetRequired={false} />

          {/* Estado, Fecha y Hora */}
          <div className="space-y-4">
            <FormGrid columns={2}>
              <FormField
                control={form.control}
                name="visitStatusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select
                      disabled={loadingStatuses}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              loadingStatuses ? 'Cargando estados...' : 'Seleccionar estado'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visitStatuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div className={cn('h-2 w-2 rounded-full', status.color.bgClass)} />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Solicitud *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        defaultValue={formatDateValue(field.value)}
                        onBlur={(e) => field.onChange(parseDateValue(e.target.value))}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGrid>

            {/* Hora Agendada (informativa) */}
            <FormField
              control={form.control}
              name="scheduledTime"
              render={({ field }) => (
                <FormItem className="max-w-[200px]">
                  <FormLabel>Hora Agendada</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Observaciones */}
          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas adicionales sobre la visita..."
                    className=""
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          {showSubmitButton && (
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar Visita'}
              </Button>
            </div>
          )}
        </form>
      </Form>
    )
  }
)

VisitForm.displayName = 'VisitForm'
