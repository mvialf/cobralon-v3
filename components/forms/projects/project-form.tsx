'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { projectFormSchema, type ProjectFormData } from '@/lib/validations/project-validations'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { FormGrid } from '@/components/ui/form-grid'
import { StatusBadge } from '@/components/ui/status-badge'
import { Combobox } from '@/components/ui/combobox'
import { AddressFields } from '@/components/forms/fields/address-fields'
import { ProjectFinancialFields } from '@/components/forms/fields/project-financial-fields'
import { ProjectDetailsFields } from '@/components/forms/fields/project-details-fields'
import { useConfiguration } from '@/hooks/use-configuration'
import {
  Form,
  FormRoot,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void | Promise<void>
  isSubmitting?: boolean
  defaultValues?: Partial<ProjectFormData>
  showSubmitButton?: boolean
}

export interface ProjectFormHandle {
  submit: () => void
  reset: () => void
}

interface Customer {
  id: string
  name: string
  phone: string
}

interface ProjectStatus {
  id: string
  name: string
  isInitial?: boolean
  color: {
    bgClass: string
  }
}

export const ProjectForm = React.forwardRef<ProjectFormHandle, ProjectFormProps>(
  ({ onSubmit, isSubmitting, defaultValues, showSubmitButton = true }, ref) => {
    const { configuration } = useConfiguration()

    const [customers, setCustomers] = React.useState<Customer[]>([])
    const [loadingCustomers, setLoadingCustomers] = React.useState(true)

    const [projectStatuses, setProjectStatuses] = React.useState<ProjectStatus[]>([])
    const [loadingStatuses, setLoadingStatuses] = React.useState(true)

    const form = useForm<ProjectFormData>({
      resolver: zodResolver(projectFormSchema),
      defaultValues: {
        customerId: '',
        projectNumber: '',
        projectName: '',
        phone: '',
        street: '',
        apartment: '',
        comuna: '',
        region: configuration.region || '',
        projectStatusId: '',
        date: new Date(),
        subtotal: 0,
        taxRate: 19,
        currency: configuration.currency || 'CLP',
        windowsCount: 0,
        squareMeters: 0,
        description: '',
        ...defaultValues,
      },
    })

    // Wrapper del onSubmit para calcular totalAmount automáticamente
    const handleFormSubmit = React.useCallback(
      (data: ProjectFormData) => {
        // Calcular totalAmount basado en subtotal y taxRate
        const calculatedTotal = data.subtotal + data.subtotal * ((data.taxRate || 0) / 100)

        // Agregar totalAmount calculado al data
        const dataWithTotal = {
          ...data,
          totalAmount: calculatedTotal,
        }

        // Llamar al onSubmit original con data + totalAmount calculado
        return onSubmit(dataWithTotal as ProjectFormData & { totalAmount: number })
      },
      [onSubmit]
    )

    // Exponer métodos al componente padre vía ref
    React.useImperativeHandle(ref, () => ({
      submit: () => {
        // Ejecutar validación y submit del formulario
        form.handleSubmit(handleFormSubmit)()
      },
      reset: () => {
        form.reset()
      },
    }))

    // Reset form cuando defaultValues cambian (para modo edición)
    React.useEffect(() => {
      if (defaultValues) {
        form.reset({
          customerId: defaultValues.customerId || '',
          projectNumber: defaultValues.projectNumber || '',
          projectName: defaultValues.projectName || '',
          phone: defaultValues.phone || '',
          street: defaultValues.street || '',
          apartment: defaultValues.apartment || '',
          comuna: defaultValues.comuna || '',
          region: defaultValues.region || configuration.region || '',
          projectStatusId: defaultValues.projectStatusId || '',
          date: defaultValues.date || new Date(),
          subtotal: defaultValues.subtotal || 0,
          taxRate: defaultValues.taxRate || 19,
          currency: defaultValues.currency || configuration.currency || 'CLP',
          windowsCount: defaultValues.windowsCount || 0,
          squareMeters: defaultValues.squareMeters || 0,
          description: defaultValues.description || '',
        })
      }
    }, [defaultValues, form, configuration])

    // Cargar lista de customers al montar
    React.useEffect(() => {
      async function loadCustomers() {
        try {
          const response = await fetch('/api/customers/list')
          if (!response.ok) throw new Error('Error al cargar clientes')
          const data = await response.json()
          setCustomers(data.customers || [])
        } catch (error) {
          console.error('Error al cargar clientes:', error)
        } finally {
          setLoadingCustomers(false)
        }
      }

      loadCustomers()
    }, [])

    // Cargar lista de project statuses al montar
    React.useEffect(() => {
      async function loadStatuses() {
        try {
          const response = await fetch('/api/project-status')
          if (!response.ok) throw new Error('Error al cargar estados')
          const data = await response.json()
          const statuses = data.projectStatuses || []
          setProjectStatuses(statuses)

          // Si no hay projectStatusId seteado y no estamos editando, usar initialStatus
          if (!defaultValues?.projectStatusId && !form.getValues('projectStatusId')) {
            const initialStatus = statuses.find((s: ProjectStatus) => s.isInitial)
            if (initialStatus) {
              form.setValue('projectStatusId', initialStatus.id)
            }
          }
        } catch (error) {
          console.error('Error al cargar estados:', error)
        } finally {
          setLoadingStatuses(false)
        }
      }

      loadStatuses()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Cuando se selecciona un customer, autocompletar phone
    const handleCustomerSelect = (customerId: string) => {
      const selectedCustomer = customers.find((c) => c.id === customerId)
      if (selectedCustomer) {
        form.setValue('customerId', selectedCustomer.id)
        // Autocompletar phone (pero usuario puede editarlo después)
        form.setValue('phone', selectedCustomer.phone)
      }
    }

    return (
      <Form {...form}>
        <FormRoot onSubmit={form.handleSubmit(handleFormSubmit)}>
          <FormGrid columns="3-1">
            {/* Cliente - Combobox */}
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        handleCustomerSelect(value)
                      }}
                      options={customers}
                      getOptionValue={(c) => c.id}
                      getOptionLabel={(c) => c.name}
                      renderOption={(c) => (
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.phone}</span>
                        </div>
                      )}
                      placeholder="Seleccionar cliente"
                      searchPlaceholder="Buscar cliente..."
                      emptyMessage="No se encontraron clientes"
                      contentWidth="400px"
                      loading={loadingCustomers}
                      modal
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Número de Proyecto */}
            <FormField
              control={form.control}
              name="projectNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proyecto *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGrid>

          <FormGrid columns="2-1">
            {/* Glosa */}
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Glosa</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfono */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <PhoneInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGrid>

          <FormGrid columns={2}>
            {/* Estado - Combobox */}
            <FormField
              control={form.control}
              name="projectStatusId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Estado *</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={projectStatuses}
                      getOptionValue={(status) => status.id}
                      getOptionLabel={(status) => status.name}
                      renderOption={(status) => (
                        <StatusBadge bgClass={status.color.bgClass} label={status.name} />
                      )}
                      placeholder="Seleccionar estado"
                      searchPlaceholder="Buscar estado..."
                      emptyMessage="No se encontraron estados"
                      contentWidth="300px"
                      loading={loadingStatuses}
                      modal
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de Ingreso */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Ingreso *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value instanceof Date
                          ? field.value.toISOString().split('T')[0]
                          : field.value
                      }
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGrid>

          <AddressFields control={form.control} defaultRegion={configuration.region} />

          <ProjectFinancialFields control={form.control} currency={form.watch('currency')} />

          <ProjectDetailsFields control={form.control} />

          {showSubmitButton && (
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar Proyecto'}
              </Button>
            </div>
          )}
        </FormRoot>
      </Form>
    )
  }
)

ProjectForm.displayName = 'ProjectForm'
