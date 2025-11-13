'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { aftersaleSchema, type AftersaleFormValues } from '@/lib/validations/aftersale-validations'
import { normalizePhone } from '@/lib/utils/phone'
import { FormGrid } from '@/components/ui/form-grid'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import { PhoneInput } from '@/components/ui/phone-input'
import { ProjectSearchField } from '@/components/forms/search/project-search-field'
import { AddressProjectSummary } from '@/components/summarys/address-project-summary'
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
    const [selectedProjectDetails, setSelectedProjectDetails] = React.useState<{
      street: string
      apartment: string | null
      comuna: string
      region: string
    } | null>(null)

    const form = useForm<AftersaleFormValues>({
      resolver: zodResolver(aftersaleSchema),
      defaultValues: {
        projectId: '',
        aftersaleStatusId: '',
        contactPhone: normalizePhone(defaultValues?.contactPhone || ''), // Normalizar teléfono para datos legacy
        description: '',
        reportedAt: new Date(),
        tasks: [], // Lista de tareas vacía por defecto
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

    // Cargar detalles del proyecto seleccionado (dirección y teléfono)
    const projectId = form.watch('projectId')
    React.useEffect(() => {
      if (!projectId) {
        setSelectedProjectDetails(null)
        return
      }

      // Fetch proyecto completo para obtener dirección y teléfono
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedProjectDetails({
            street: data.street,
            apartment: data.apartment,
            comuna: data.comuna,
            region: data.region,
          })

          // Autocompletar teléfono del proyecto (normalizado para manejar datos legacy)
          if (data.phone) {
            form.setValue('contactPhone', normalizePhone(data.phone))
          }
        })
        .catch((err) => console.error('Error fetching project details:', err))
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId])

    return (
      <Form {...form}>
        <div className="grid gap-4">
          {/* Proyecto - Búsqueda con filtro de finalizados */}
          <ProjectSearchField
            control={form.control}
            filterByFinalState={true}
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
                      placeholder="Seleccionar estado..."
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

          {/* Dirección del Proyecto */}
          {selectedProjectDetails && (
            <AddressProjectSummary
              street={selectedProjectDetails.street}
              apartment={selectedProjectDetails.apartment}
              comuna={selectedProjectDetails.comuna}
              region={selectedProjectDetails.region}
            />
          )}

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
