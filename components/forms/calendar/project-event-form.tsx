'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'

import {
  createProjectEventSchema,
  type ProjectEventFormValues,
} from '@/lib/validations/calendar-validations'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ProjectSearchField } from '@/components/forms/search/project-search-field'
import { ProjectDetailsSummary } from '@/components/summarys/project-details-summary'
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
  onSubmit: (data: ProjectEventFormValues) => void | Promise<void>
  defaultValues?: Partial<ProjectEventFormValues>
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

    const form = useForm<ProjectEventFormValues>({
      resolver: zodResolver(createProjectEventSchema),
      defaultValues: {
        projectId: '',
        scheduledDate: '',
        notes: '',
        ...defaultValues,
      },
    })

    // Exponer métodos al parent via ref
    React.useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onSubmit)(),
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
          setProjectDetails({
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
          })
        })
        .catch((err) => {
          console.error('Error fetching project details:', err)
          setProjectDetails(null)
        })
    }, [projectId])

    // Formatear fecha para el input type="date"
    const formatDateForInput = (date: Date | string): string => {
      if (!date) return ''
      const d = typeof date === 'string' ? new Date(date) : date
      return format(d, 'yyyy-MM-dd')
    }

    return (
      <Form {...form}>
        <div className="grid gap-4">
          {/* Campo: Proyecto */}
          <ProjectSearchField
            control={form.control}
            filterByFinalState={false}
            showFinancialCards={false}
            onProjectSelect={(project) => {
              if (project) {
                form.setValue('projectId', project.id)
                form.clearErrors('projectId')
              }
            }}
          />

          {/* Detalles del proyecto seleccionado */}
          {projectDetails && (
            <ProjectDetailsSummary
              projectNumber={projectDetails.projectNumber}
              projectName={projectDetails.projectName}
              projectStatus={projectDetails.projectStatus}
              customerName={projectDetails.customer.name}
              phone={projectDetails.phone}
              address={{
                street: projectDetails.street,
                apartment: projectDetails.apartment,
                comuna: projectDetails.comuna,
                region: projectDetails.region,
              }}
              windowsCount={projectDetails.windowsCount}
              squareMeters={projectDetails.squareMeters}
              description={projectDetails.description}
            />
          )}

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
        </div>
      </Form>
    )
  }
)

ProjectEventForm.displayName = 'ProjectEventForm'
