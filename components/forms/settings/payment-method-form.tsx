'use client'

import * as React from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'

import {
  paymentMethodSchema,
  type PaymentMethodFormValues,
} from '@/lib/validations/payment-method-validations'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
        hasCommission: false,
        commissionTiers: [],
        ...defaultValues,
      },
    })

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'commissionTiers',
    })

    // Watch para mostrar/ocultar secciones
    const hasInstallments = form.watch('hasInstallments')
    const hasCommission = form.watch('hasCommission')

    // Exponer métodos al parent via ref
    React.useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onSubmit)(),
      reset: () => form.reset(),
    }))

    // Separar tier base de tramos por cuotas
    const baseTierIndex = fields.findIndex(
      (f) => f.minInstallments === null && f.maxInstallments === null
    )
    const installmentTierIndices = fields
      .map((f, i) => (f.minInstallments !== null ? i : -1))
      .filter((i) => i !== -1)

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
                      // Si se desmarca, limpiar maxInstallments y tramos por cuotas
                      if (!checked) {
                        form.setValue('maxInstallments', null)
                        // Remover tramos por cuotas (mantener tier base)
                        const tiersToRemove = installmentTierIndices.sort((a, b) => b - a)
                        tiersToRemove.forEach((i) => remove(i))
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

          {/* Sección: Comisiones */}
          <FormField
            control={form.control}
            name="hasCommission"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      if (checked) {
                        // Agregar tier base si no existe
                        if (baseTierIndex === -1) {
                          append({
                            minInstallments: null,
                            maxInstallments: null,
                            percentageFee: 0,
                            fixedFee: 0,
                          })
                        }
                      } else {
                        // Limpiar todos los tiers
                        const allIndices = fields.map((_, i) => i).sort((a, b) => b - a)
                        allIndices.forEach((i) => remove(i))
                      }
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>¿Cobra comisión?</FormLabel>
                  <FormDescription>
                    La entidad de cobro descuenta un porcentaje o monto fijo por transacción
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {hasCommission && (
            <div className="space-y-4 rounded-md border p-4">
              {/* Tier base */}
              {baseTierIndex !== -1 && (
                <div className="space-y-3">
                  <FormLabel className="text-sm font-medium">Comisión base</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`commissionTiers.${baseTierIndex}.percentageFee`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Porcentaje (%)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              placeholder="Ej: 2.95"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) =>
                                field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`commissionTiers.${baseTierIndex}.fixedFee`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Monto fijo ($)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min={0}
                              placeholder="Ej: 350"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) =>
                                field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Tramos por cuotas (solo si tiene cuotas) */}
              {hasInstallments && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium">Tramos por cuotas</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          minInstallments: 2,
                          maxInstallments: 6,
                          percentageFee: 0,
                          fixedFee: 0,
                        })
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Agregar tramo
                    </Button>
                  </div>

                  {installmentTierIndices.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Sin tramos adicionales. Se usará la comisión base para todas las cuotas.
                    </p>
                  )}

                  {installmentTierIndices.map((tierIndex) => (
                    <div
                      key={fields[tierIndex].id}
                      className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2"
                    >
                      <FormField
                        control={form.control}
                        name={`commissionTiers.${tierIndex}.minInstallments`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Desde</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={36}
                                placeholder="2"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === '' ? null : Number(e.target.value)
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`commissionTiers.${tierIndex}.maxInstallments`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Hasta</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={36}
                                placeholder="6"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === '' ? null : Number(e.target.value)
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`commissionTiers.${tierIndex}.percentageFee`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">%</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                placeholder="5.00"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) =>
                                  field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`commissionTiers.${tierIndex}.fixedFee`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Fijo ($)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                min={0}
                                placeholder="0"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) =>
                                  field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => remove(tierIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Errores globales de commissionTiers */}
              {form.formState.errors.commissionTiers?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.commissionTiers.root.message}
                </p>
              )}
            </div>
          )}
        </div>
      </Form>
    )
  }
)

PaymentMethodForm.displayName = 'PaymentMethodForm'
