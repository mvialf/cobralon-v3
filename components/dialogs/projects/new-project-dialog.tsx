'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { ProjectForm, ProjectFormHandle } from '@/components/forms/projects/project-form'
import { type ProjectFormData } from '@/lib/validations/project-validations'
import { useCreateProject } from '@/hooks/queries/use-projects'
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

interface NewProjectDialogProps {
  onProjectCreated?: () => void
}

export function NewProjectDialog({ onProjectCreated }: NewProjectDialogProps) {
  const [open, setOpen] = React.useState(false)
  const formRef = React.useRef<ProjectFormHandle>(null)

  // ✅ React Query mutation hook reemplaza fetch manual
  const createMutation = useCreateProject()

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      // Calcular total antes de enviar al backend
      const tax = data.subtotal * (data.taxRate / 100)
      const total = data.subtotal + tax

      // ✅ Mutation hook maneja loading, errores, invalidación y toast
      await createMutation.mutateAsync({
        ...data,
        total,
        totalAmount: total, // Campo legacy requerido por schema
      })

      setOpen(false)
      onProjectCreated?.()
    } catch (error) {
      // Error ya manejado por el hook (toast.error)
      console.error('Error al crear proyecto:', error)
    }
  }

  return (
    <ScrollableDialog open={open} onOpenChange={setOpen}>
      <ScrollableDialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </ScrollableDialogTrigger>
      <ScrollableDialogContent className="sm">
        <ScrollableDialogHeader>
          <ScrollableDialogTitle>Nuevo Proyecto</ScrollableDialogTitle>
        </ScrollableDialogHeader>
        <ScrollableDialogBody>
          <ScrollableDialogDescription asChild>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Ingresa los datos del nuevo proyecto. Haz clic en guardar cuando termines.
              </p>
              <ProjectForm
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
            {createMutation.isPending ? 'Guardando...' : 'Guardar Proyecto'}
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </ScrollableDialog>
  )
}
