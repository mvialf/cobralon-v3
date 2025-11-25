'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { aftersaleSchema, type AftersaleFormValues } from '@/lib/validations/aftersale-validations'
import { normalizePhone } from '@/lib/utils/phone'
import { formatDateValue, parseDateValue } from '@/lib/utils'
import { getRegionCodigoByNombre } from '@/lib/regiones-chile'
import { FormGrid } from '@/components/ui/form-grid'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import { PhoneInput } from '@/components/ui/phone-input'
import { ProjectSearchField } from '@/components/forms/search/project-search-field'
import { AddressFields } from '@/components/forms/fields/address-fields'
import { TodoListField } from '@/components/custom/todo'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface AftersaleFormProps {
  onSubmit: (data: AftersaleFormValues) => void | Promise<void>
  defaultValues?: Partial<AftersaleFormValues>
}

export interface AftersaleFormHandle {
  submit: () => void
  reset: () => void
}

interface AftersaleStatus {
  id: string
  name: string
  color: {
    bgClass: string
    textClass: string
  }
}

export const AftersaleForm = React.forwardRef<AftersaleFormHandle, AftersaleFormProps>(
  ({ onSubmit, defaultValues }, ref) => {
    const [aftersaleStatuses, setAftersaleStatuses] = React.useState<AftersaleStatus[]>([])
    const [loadingStatuses, setLoadingStatuses] = React.useState(true)
    // Flag para mostrar campos de dirección solo cuando hay proyecto seleccionado
    const [hasProjectDetails, setHasProjectDetails] = React.useState(false)

    const form = useForm<AftersaleFormValues>({
      resolver: zodResolver(aftersaleSchema),
      defaultValues: {
        projectId: '',
        aftersaleStatusId: '',
        contactPhone: normalizePhone(defaultValues?.contactPhone || ''), // Normalizar teléfono para datos legacy
        description: '',
        reportedAt: new Date(),
        tasks: [], // Lista de tareas vacía por defecto
        // Campos de dirección (se poblarán al seleccionar proyecto)
        street: '',
        apartment: null,
        comuna: '',
        region: '',
        ...defaultValues,
      },
    })

    // Exponer métodos al parent via ref
    React.useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onSubmit)(),
      reset: () => form.reset(),
    }))

    // Cargar estados de postventa
    React.useEffect(() => {
      const loadStatuses = async () => {
        try {
          const response = await fetch('/api/aftersale-status')
          const data = await response.json()
          const statuses = data.aftersaleStatuses || []
          setAftersaleStatuses(statuses)

          // Si no hay aftersaleStatusId seteado y no estamos editando, usar initialStatus
          if (!defaultValues?.aftersaleStatusId && !form.getValues('aftersaleStatusId')) {
            const initialStatus = statuses.find(
              (s: AftersaleStatus & { isInitial?: boolean }) => s.isInitial
            )
            if (initialStatus) {
              form.setValue('aftersaleStatusId', initialStatus.id)
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

    // Cargar detalles del proyecto seleccionado y poblar formulario
    const projectId = form.watch('projectId')
    React.useEffect(() => {
      if (!projectId) {
        setHasProjectDetails(false)
        return
      }

      // Fetch proyecto completo para obtener todos los detalles
      fetch(`/api/projects/${projectId}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((data) => {
          // Convertir nombre de región a código (API devuelve nombre, form necesita código)
          const regionCodigo = getRegionCodigoByNombre(data.region) || data.region

          // Poblar todos los campos del formulario con datos del proyecto
          const formData = {
            projectId: data.id,
            aftersaleStatusId: form.getValues('aftersaleStatusId') || '',
            contactPhone: normalizePhone(data.phone || ''),
            description: form.getValues('description') || '',
            reportedAt: form.getValues('reportedAt') || new Date(),
            tasks: form.getValues('tasks') || [],
            // Campos de dirección
            street: data.street,
            apartment: data.apartment || null,
            comuna: data.comuna,
            region: regionCodigo,
          }

          form.reset(formData)
          setHasProjectDetails(true)
        })
        .catch((err) => {
          console.error('Error fetching project details:', err)
          setHasProjectDetails(false)
        })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId])

    return (
      <Form {...form}>
        <div className="grid gap-4">
          {/* Proyecto - Búsqueda con filtro de finalizados */}
          <ProjectSearchField
            control={form.control}
            filterByFinalState={true}
            showFinancialCards={false}
            onProjectSelect={(project) => {
              if (project) {
                form.setValue('projectId', project.id)
              }
            }}
          />

          <FormGrid columns={3}>
            {/* Estado de Postventa */}
            <FormField
              control={form.control}
              name="aftersaleStatusId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Estado *</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value}
                      onValueChange={field.onChange}
                      options={aftersaleStatuses}
                      getOptionValue={(s) => s.id}
                      getOptionLabel={(s) => s.name}
                      renderOption={(status) => (
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded ${status.color.bgClass}`} />
                          <span>{status.name}</span>
                        </div>
                      )}
                      searchPlaceholder="Buscar estado..."
                      emptyMessage="No se encontraron estados"
                      loading={loadingStatuses}
                      loadingText="Cargando estados..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Fecha de Reporte */}
            <FormField
              control={form.control}
              name="reportedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Reporte *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={formatDateValue(field.value)}
                      onChange={(e) => field.onChange(parseDateValue(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Teléfono de Contacto */}
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono*</FormLabel>
                  <FormControl>
                    <PhoneInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGrid>

          {/* Dirección del Proyecto (editable) */}
          <AddressFields control={form.control} disabled={!hasProjectDetails} />

          {/* Descripción */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción del Problema</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Lista de Tareas */}
          <FormField
            control={form.control}
            name="tasks"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Lista de Tareas</FormLabel>

                <FormControl>
                  <TodoListField
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    name="tasks"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    )
  }
)

AftersaleForm.displayName = 'AftersaleForm'
