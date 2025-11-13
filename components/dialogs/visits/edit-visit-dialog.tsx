'use client'

import * as React from 'react'
import { VisitForm, VisitFormHandle } from '@/components/forms/visits/visit-form'
import { type CreateVisitInput } from '@/lib/validations/visit-validations'
import { useVisit, useUpdateVisit } from '@/hooks/queries/use-visits'
import { Button } from '@/components/ui/button'
import {
  ScrollableDialog,
  ScrollableDialogBody,
  ScrollableDialogClose,
  ScrollableDialogContent,
  ScrollableDialogDescription,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
  ScrollableDialogTitle,
} from '@/components/ui/scrollable-dialog'

interface EditVisitDialogProps {
  visitId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onVisitUpdated?: () => void
}

/**
 * Dialog controlado para editar una visita existente
 *
 * Carga datos de la visita desde API, permite edición y actualiza via PUT
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false)
 *
 * <EditVisitDialog
 *   visitId={visit.id}
 *   open={open}
 *   onOpenChange={setOpen}
 *   onVisitUpdated={() => refetch()}
 * />
 * ```
 */
export function EditVisitDialog({
  visitId,
  open,
  onOpenChange,
  onVisitUpdated,
}: EditVisitDialogProps) {
  const formRef = React.useRef<VisitFormHandle>(null)

  // React Query hooks
  const { data: visit, isLoading } = useVisit(open ? visitId : undefined)
  const updateMutation = useUpdateVisit()

  // Transformar datos del API al formato del formulario
  const defaultValues = React.useMemo(() => {
    if (!visit) return undefined

    return {
      name: visit.name,
      phone: visit.phone || '',
      street: visit.street,
      apartment: visit.apartment || '',
      comuna: visit.comuna,
      region: visit.region,
      visitStatusId: visit.visitStatus?.id || '',
      scheduledDate: new Date(visit.scheduledDate),
      observations: visit.observations || '',
    }
  }, [visit])

  const handleSubmit = async (data: CreateVisitInput) => {
    try {
      // Mutation hook maneja loading, errores, invalidación y toast
      await updateMutation.mutateAsync({
        id: visitId,
        ...data,
      })

      onOpenChange(false)
      onVisitUpdated?.()
    } catch (error) {
      // Error ya manejado por el hook (toast.error)
      console.error('Error al actualizar visita:', error)
    }
  }

  // No renderizar dialog hasta que los datos estén cargados
  if (open && isLoading) {
    return null
  }

  return (
    <ScrollableDialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm">
        <ScrollableDialogHeader>
          <ScrollableDialogTitle>Editar Visita</ScrollableDialogTitle>
        </ScrollableDialogHeader>
        <ScrollableDialogBody>
          <ScrollableDialogDescription asChild>
            <div className="space-y-4">
              <VisitForm
                ref={formRef}
                onSubmit={handleSubmit}
                isSubmitting={updateMutation.isPending}
                defaultValues={defaultValues}
                showSubmitButton={false}
              />
            </div>
          </ScrollableDialogDescription>
        </ScrollableDialogBody>
        <ScrollableDialogFooter>
          <ScrollableDialogClose asChild>
            <Button variant="outline" disabled={updateMutation.isPending}>
              Cancelar
            </Button>
          </ScrollableDialogClose>
          <Button onClick={() => formRef.current?.submit()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Actualizando...' : 'Guardar Cambios'}
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </ScrollableDialog>
  )
}
