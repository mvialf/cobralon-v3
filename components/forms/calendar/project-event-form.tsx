'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'

import {
  createProjectEventWithProjectUpdateSchema,
  type ProjectEventWithProjectUpdateFormValues,
} from '@/lib/validations/calendar-validations'

import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Combobox } from '@/components/ui/combobox'
import { StatusBadge } from '@/components/ui/status-badge'
import { FormGrid } from '@/components/ui/form-grid'
import { ProjectSearchField } from '@/components/forms/search/project-search-field'
import { AddressFields } from '@/components/forms/fields/address-fields'
import { ProjectDetailsFields } from '@/components/forms/fields/project-details-fields'
import { TagSelector } from '@/components/custom/tag-system'
import { useUninstallTags } from '@/hooks/use-uninstall-tags'
import type { UninstallTag } from '@/components/custom/tag-system/types'
import { cn } from '@/lib/utils'
import { getRegionCodigoByNombre } from '@/lib/regiones-chile'
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

interface ProjectStatus {
  id: string
  name: string
  color: {
    bgClass: string
    textClass?: string
  }
}

export const ProjectEventForm = React.forwardRef<ProjectEventFormHandle, ProjectEventFormProps>(
  ({ onSubmit, defaultValues }, ref) => {
    // Fetch project statuses
    const { data: projectStatuses = [], isLoading: loadingStatuses } = useQuery<ProjectStatus[]>({
      queryKey: ['project-statuses'],
      queryFn: async () => {
        console.log('🔄 Fetching project statuses...')
        const res = await fetch('/api/project-status')
        if (!res.ok) throw new Error('Error al cargar estados')
        const data = await res.json()
        console.log('✅ Project statuses loaded:', data.projectStatuses.length, 'statuses')
        console.log('📋 Statuses:', data.projectStatuses)
        return data.projectStatuses
      },
    })

    // Hook para uninstall tags (reemplaza useQuery manual)
    const {
      availableTags,
      availableColors,
      createTag,
      editTag,
      deleteTag,
      loading: _loadingTags,
    } = useUninstallTags()

    // State para detalles del proyecto seleccionado
    const [projectDetails, setProjectDetails] = React.useState<{
      projectNumber: string
      projectName: string | null
      projectStatus: {
        id: string
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
        projectStatusId: '',
        phone: '',
        street: '',
        apartment: null,
        comuna: '',
        region: '',
        windowsCount: 0,
        squareMeters: 0,
        description: null,
        uninstallTagIds: [],
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

      console.log('🔍 Fetching project details for:', projectId)

      // Fetch proyecto completo para obtener todos los detalles
      fetch(`/api/projects/${projectId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }
          return res.json()
        })
        .then((data) => {
          console.log('📦 Project data received:', data)
          console.log('🎨 Project status:', data.projectStatus)
          console.log('🏷️ UninstallTagIds from API:', data.uninstallTagIds)

          const details = {
            projectNumber: data.projectNumber,
            projectName: data.projectName,
            projectStatus: data.projectStatus
              ? {
                  id: data.projectStatus.id,
                  name: data.projectStatus.name,
                  color: {
                    bgClass: data.projectStatus.color.bgClass,
                    textClass: data.projectStatus.color.textClass || 'text-white',
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

          // Convertir nombre de región a código (API devuelve nombre, form necesita código)
          const regionCodigo = getRegionCodigoByNombre(data.region) || data.region

          // Poblar campos del formulario con datos del proyecto
          const formData = {
            projectId: data.id,
            scheduledDate: form.getValues('scheduledDate') || '',
            projectStatusId: data.projectStatus?.id || '',
            phone: data.phone,
            street: data.street,
            apartment: data.apartment || null,
            comuna: data.comuna,
            region: regionCodigo, // ← Usa código en lugar de nombre
            windowsCount: data.windowsCount,
            squareMeters: Number(data.squareMeters),
            description: data.description || null,
            uninstallTagIds: data.uninstallTagIds || [],
          }

          console.log('📝 Setting form values:', formData)
          console.log('🔖 ProjectStatusId being set:', formData.projectStatusId)
          console.log('🏷️ UninstallTagIds being set:', formData.uninstallTagIds)
          console.log('🗺️ Region converted:', data.region, '→', regionCodigo)

          form.reset(formData)
        })
        .catch((err) => {
          console.error('❌ Error fetching project details:', err)
          setProjectDetails(null)
        })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId])

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

          <div className="space-y-4">
            {/* Grid: Fecha programada + Estado + Teléfono */}
            <FormGrid columns={3}>
              {/* Campo: Fecha programada */}
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="">
                    <FormLabel>Fecha evento *</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        disabled={!projectDetails}
                        modal
                      />
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
                      <PhoneInput {...field} disabled={!projectDetails} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGrid>

            {/* Dirección */}
            <AddressFields control={form.control} disabled={!projectDetails} />

            {/* Detalles del proyecto */}
            <ProjectDetailsFields control={form.control} disabled={!projectDetails} />

            {/* Tags de Desinstalación - usando TagSelector profesional */}
            <FormField
              control={form.control}
              name="uninstallTagIds"
              render={({ field }) => {
                // Transformar IDs a objetos UninstallTag completos para TagSelector
                const selectedTagObjects =
                  (field.value
                    ?.map((id) => availableTags.find((tag) => tag.id === id))
                    .filter(Boolean) as UninstallTag[]) || []

                // Handler: recibir objetos UninstallTag, enviar IDs al form
                const handleChange = (tags: UninstallTag[]) => {
                  field.onChange(tags.map((t) => t.id))
                }

                return (
                  <FormItem>
                    <FormControl>
                      <div className={cn(!projectDetails && 'opacity-50 pointer-events-none')}>
                        <TagSelector
                          selectedTags={selectedTagObjects}
                          availableTags={availableTags}
                          availableColors={availableColors}
                          onTagsChange={handleChange}
                          onCreateTag={createTag}
                          onEditTag={editTag}
                          onDeleteTag={deleteTag}
                          label="Desinstalación"
                          showFullNameInSelected
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          </div>

          {/* 3. Datos del Evento */}
          <div>
            {/* Campo: Fecha programada */}
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem className="w-1/2">
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
          </div>
        </div>
      </Form>
    )
  }
)

ProjectEventForm.displayName = 'ProjectEventForm'
