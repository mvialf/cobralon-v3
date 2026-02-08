'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  createVisitEventWithUpdateSchema,
  type VisitEventWithUpdateFormValues,
} from '@/lib/validations/visit-event-validations'
import { useVisitStatuses } from '@/hooks/queries/use-visit-statuses'
import { getRegionCodigoByNombre } from '@/lib/regiones-chile'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/ui/phone-input'
import { Combobox } from '@/components/ui/combobox'
import { StatusOptionDisplay } from '@/components/ui/status-option-display'
import { FormGrid } from '@/components/ui/form-grid'
import {
  VisitSearchField,
  type VisitSearchResult,
} from '@/components/forms/search/visit-search-field'
import { AddressFields } from '@/components/forms/fields/address-fields'
import { TeamTagsField } from '@/components/forms/fields/team-tags-field'
import { formatDateForInput } from '@/lib/utils'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface VisitEventFormProps {
  onSubmit: (data: VisitEventWithUpdateFormValues) => void | Promise<void>
  defaultValues?: Partial<VisitEventWithUpdateFormValues>
}

export interface VisitEventFormHandle {
  submit: () => void
  reset: () => void
}

export const VisitEventForm = React.forwardRef<VisitEventFormHandle, VisitEventFormProps>(
  ({ onSubmit, defaultValues }, ref) => {
    // Fetch visit statuses usando hook compartido con caché
    const { data: visitStatuses = [], isLoading: loadingStatuses } = useVisitStatuses()

    // State para detalles de la visita seleccionada
    const [visitDetails, setVisitDetails] = React.useState<VisitSearchResult | null>(null)

    const form = useForm<VisitEventWithUpdateFormValues>({
      resolver: zodResolver(createVisitEventWithUpdateSchema),
      defaultValues: {
        visitId: '',
        scheduledDate: '',
        visitStatusId: '',
        name: '',
        phone: '',
        observations: '',
        street: '',
        apartment: null,
        comuna: '',
        region: '',
        teamTagIds: [],
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

    // Cargar detalles completos de la visita cuando se selecciona
    const visitId = form.watch('visitId')
    React.useEffect(() => {
      if (!visitId) {
        setVisitDetails(null)
        return
      }

      console.log('🔍 Fetching visit details for:', visitId)

      // Fetch visita completa para obtener todos los detalles
      fetch(`/api/visits/${visitId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }
          return res.json()
        })
        .then((data) => {
          console.log('📦 Visit data received:', data)

          const details: VisitSearchResult = {
            id: data.id,
            name: data.name,
            phone: data.phone || null,
            street: data.street,
            apartment: data.apartment || null,
            comuna: data.comuna,
            region: data.region,
            date: data.date,
            observations: data.observations || null,
            visitStatus: data.visitStatus,
          }

          setVisitDetails(details)

          // Convertir nombre de región a código (API devuelve nombre, form necesita código)
          const regionCodigo = getRegionCodigoByNombre(data.region) || data.region

          // Poblar campos del formulario con datos de la visita
          // IMPORTANTE: Preservar teamTagIds existentes (vienen del evento, no de la visita)
          const formData: VisitEventWithUpdateFormValues = {
            visitId: data.id,
            scheduledDate: form.getValues('scheduledDate') || '',
            visitStatusId: data.visitStatus.id,
            name: data.name,
            phone: data.phone || '',
            observations: data.observations || '',
            street: data.street,
            apartment: data.apartment || null,
            comuna: data.comuna,
            region: regionCodigo,
            teamTagIds: form.getValues('teamTagIds') || [], // ← Preservar del evento
          }

          console.log('📝 Setting form values:', formData)
          form.reset(formData)
        })
        .catch((err) => {
          console.error('❌ Error fetching visit details:', err)
          setVisitDetails(null)
        })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visitId])

    return (
      <Form {...form}>
        <div className="space-y-4">
          {/* 1. Selección de Visita */}
          <VisitSearchField
            control={form.control}
            onVisitSelect={(visit) => {
              if (visit) {
                form.setValue('visitId', visit.id)
                form.clearErrors('visitId')
              }
            }}
          />

          {/* Info de la visita (solo lectura) */}
          {visitDetails && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                {visitDetails.name} - {visitDetails.comuna}
              </p>
            </div>
          )}

          {/* 2. Datos de la Visita (editables) */}
          <div className="space-y-4">
            {/* Grid: Fecha programada + Estado */}
            <FormGrid columns={2}>
              {/* Campo: Fecha programada */}
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha evento *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? formatDateForInput(field.value) : ''}
                        onChange={(e) => {
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
                name="visitStatusId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Estado *</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        options={visitStatuses}
                        getOptionValue={(status) => status.id}
                        getOptionLabel={(status) => status.name}
                        renderOption={(status) => (
                          <StatusOptionDisplay
                            option={{
                              id: status.id,
                              label: status.name,
                              color: status.color,
                            }}
                          />
                        )}
                        placeholder="Seleccionar estado"
                        searchPlaceholder="Buscar estado..."
                        emptyMessage="No se encontraron estados"
                        contentWidth="300px"
                        loading={loadingStatuses}
                        disabled={!visitDetails}
                        modal
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGrid>

            {/* Grid: Nombre + Teléfono */}
            <FormGrid columns={2}>
              {/* Nombre */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!visitDetails}
                        placeholder="Nombre del prospecto"
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
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} value={field.value || ''} disabled={!visitDetails} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGrid>

            {/* Dirección */}
            <AddressFields control={form.control} disabled={!visitDetails} />

            {/* Team Tags - Integrantes asignados al evento */}
            <TeamTagsField control={form.control} disabled={!visitDetails} />

            {/* Observaciones */}
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      disabled={!visitDetails}
                      placeholder="Observaciones adicionales..."
                      rows={3}
                    />
                  </FormControl>
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

VisitEventForm.displayName = 'VisitEventForm'
