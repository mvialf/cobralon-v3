'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { VisitForm, VisitFormHandle } from '@/components/forms/visits/visit-form'
import { type CreateVisitInput } from '@/lib/validations/visit-validations'
import { useCreateVisit } from '@/hooks/queries/use-visits'
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
  ScrollableDialogTrigger,
} from '@/components/ui/scrollable-dialog'

interface NewVisitDialogProps {
  onVisitCreated?: () => void
}

export function NewVisitDialog({ onVisitCreated }: NewVisitDialogProps) {
  const [open, setOpen] = React.useState(false)
  const formRef = React.useRef<VisitFormHandle>(null)

  // React Query mutation hook
  const createMutation = useCreateVisit()

  const handleSubmit = async (data: CreateVisitInput) => {
    try {
      // Mutation hook maneja loading, errores, invalidación y toast
      await createMutation.mutateAsync(data)

      setOpen(false)
      formRef.current?.reset()
      onVisitCreated?.()
    } catch (error) {
      // Error ya manejado por el hook (toast.error)
      console.error('Error al crear visita:', error)
    }
  }

  return (
    <ScrollableDialog open={open} onOpenChange={setOpen}>
      <ScrollableDialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Visita
        </Button>
      </ScrollableDialogTrigger>
      <ScrollableDialogContent className="sm">
        <ScrollableDialogHeader>
          <ScrollableDialogTitle>Nueva Visita</ScrollableDialogTitle>
        </ScrollableDialogHeader>
        <ScrollableDialogBody>
          <ScrollableDialogDescription asChild>
            <div className="space-y-4">
              <VisitForm
                ref={formRef}
                onSubmit={handleSubmit}
                isSubmitting={createMutation.isPending}
                showSubmitButton={false}
              />
            </div>
          </ScrollableDialogDescription>
        </ScrollableDialogBody>
        <ScrollableDialogFooter>
          <ScrollableDialogClose asChild>
            <Button variant="outline" disabled={createMutation.isPending}>
              Cancelar
            </Button>
          </ScrollableDialogClose>
          <Button onClick={() => formRef.current?.submit()} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Guardando...' : 'Guardar Visita'}
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </ScrollableDialog>
  )
}
