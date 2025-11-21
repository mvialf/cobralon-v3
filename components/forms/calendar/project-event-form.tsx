'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'

import {
  createProjectEventWithProjectUpdateSchema,
  type ProjectEventWithProjectUpdateFormValues,
} from '@/lib/validations/calendar-validations'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/ui/phone-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectSearchField } from '@/components/forms/search/project-search-field'
import { AddressFields } from '@/components/forms/fields/address-fields'
import { ProjectDetailsFields } from '@/components/forms/fields/project-details-fields'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'

interface ProjectEventFormProps {
  onSubmit: (data: ProjectEventWithProjectUpdateFormValues) => void | Promise<void>
  defaultValues?: Partial<ProjectEventWithProjectUpdateFormValues>
}

export interface ProjectEventFormHandle {
  submit: () => void
  reset: () => void
}

export const ProjectEventForm = React.forwardRef<ProjectEventFormHandle, ProjectEventFormProps>(
  ({ onSubmit, defaultValues }, ref) => {
    // State para detalles del proyecto seleccionado
    const [projectDetails, setProjectDetails] = React.useState<{
      projectNumber: string
      projectName: string | null
      projectStatus: {
        name: string
        color: {
          bgClass: string
          textClass?: string
        }
      } | null
      customer: {
        name: string
        phone: string
      }
      street: string
      apartment: string | null
      comuna: string
      region: string
      phone: string
      windowsCount: number
      squareMeters: number
      description: string | null
    } | null>(null)

    const form = useForm<ProjectEventWithProjectUpdateFormValues>({
      resolver: zodResolver(createProjectEventWithProjectUpdateSchema),
      defaultValues: {
        projectId: '',
        scheduledDate: '',
        notes: '',
        phone: '',
        street: '',
        apartment: null,
        comuna: '',
        region: '',
        windowsCount: 0,
        squareMeters: 0,
        description: null,
        ...defaultValues,
      },
    })

    // Exponer métodos al parent via ref
    React.useImperativeHandle(ref, () => ({
      submit: () => {
        // Usar getValues() para capturar TODOS los valores (incluidos disabled)
        const allValues = form.getValues()
        form.handleSubmit(() => onSubmit(allValues))()
      },
      reset: () => form.reset(),
    }))

    // Cargar detalles completos del proyecto cuando se selecciona
    const projectId = form.watch('projectId')
    React.useEffect(() => {
      if (!projectId) {
        setProjectDetails(null)
        return
      }

      // Fetch proyecto completo para obtener todos los detalles
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          const details = {
            projectNumber: data.projectNumber,
            projectName: data.projectName,
            projectStatus: data.projectStatus
              ? {
                  name: data.projectStatus.name,
                  color: {
                    bgClass: data.projectStatus.color.bgClass,
                    textClass: data.projectStatus.color.textClass,
                  },
                }
              : null,
            customer: {
              name: data.customer.name,
              phone: data.customer.phone,
            },
            street: data.street,
            apartment: data.apartment,
            comuna: data.comuna,
            region: data.region,
            phone: data.phone,
            windowsCount: data.windowsCount,
            squareMeters: Number(data.squareMeters),
            description: data.description,
          }

          setProjectDetails(details)

          // Poblar campos del formulario con datos del proyecto
          form.reset({
            projectId: data.id,
            scheduledDate: form.getValues('scheduledDate') || '',
            notes: form.getValues('notes') || '',
            phone: data.phone,
            street: data.street,
            apartment: data.apartment || null,
            comuna: data.comuna,
            region: data.region,
            windowsCount: data.windowsCount,
            squareMeters: Number(data.squareMeters),
            description: data.description || null,
          })
        })
        .catch((err) => {
          console.error('Error fetching project details:', err)
          setProjectDetails(null)
        })
    }, [projectId, form])

    // Formatear fecha para el input type="date"
    const formatDateForInput = (date: Date | string): string => {
      if (!date) return ''
      const d = typeof date === 'string' ? new Date(date) : date
      return format(d, 'yyyy-MM-dd')
    }

    return (
      <Form {...form}>
        <div className="space-y-4">
          {/* 1. Selección de Proyecto */}
          <ProjectSearchField
            control={form.control}
            filterMode="active"
            showFinancialCards={false}
            onProjectSelect={(project) => {
              if (project) {
                form.setValue('projectId', project.id)
                form.clearErrors('projectId')
              }
            }}
          />

          {/* 2. Datos del Proyecto (editables) */}
          <Card>
            <CardHeader>
              <CardTitle>Datos del Proyecto</CardTitle>
              <CardDescription>
                {projectDetails
                  ? 'Verifica y corrige los datos si es necesario'
                  : 'Selecciona un proyecto para habilitar estos campos'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Teléfono */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} disabled={!projectDetails} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dirección */}
              <AddressFields control={form.control} disabled={!projectDetails} />

              {/* Detalles del proyecto */}
              <ProjectDetailsFields control={form.control} disabled={!projectDetails} />
            </CardContent>
          </Card>

          {/* 3. Datos del Evento */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campo: Fecha programada */}
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha programada *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? formatDateForInput(field.value) : ''}
                        onChange={(e) => {
                          // Convertir string del input a Date
                          const dateValue = e.target.value
                          field.onChange(dateValue)
                        }}
                      />
                    </FormControl>
                    <FormDescription>Fecha en la que se realizará el evento</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: Notas (opcional) */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas adicionales sobre el evento..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </Form>
    )
  }
)

ProjectEventForm.displayName = 'ProjectEventForm'
