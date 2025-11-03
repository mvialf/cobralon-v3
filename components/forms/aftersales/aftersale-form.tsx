'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { aftersaleSchema, type AftersaleFormValues } from '@/lib/validations/aftersale-validations'
import { FormGrid } from '@/components/ui/form-grid'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import { ProjectSearchField } from '@/components/forms/search/project-search-field'
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

    const form = useForm<AftersaleFormValues>({
      resolver: zodResolver(aftersaleSchema),
      defaultValues: {
        projectId: '',
        aftersaleStatusId: '',
        description: '',
        reportedAt: new Date(),
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
          </FormGrid>
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
        </div>
      </Form>
    )
  }
)

AftersaleForm.displayName = 'AftersaleForm'
