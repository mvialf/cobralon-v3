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
            onProjectSelect={(project) => {
              // No necesitamos guardar el proyecto completo, solo validar
              if (project) {
                form.clearErrors('projectId')
              }
            }}
          />

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
