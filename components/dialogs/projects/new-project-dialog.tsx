'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { ProjectForm, ProjectFormHandle } from '@/components/forms/projects/project-form'
import { type ProjectFormData } from '@/lib/validations/project-validations'
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
import { toast } from 'sonner'

interface NewProjectDialogProps {
  onProjectCreated?: () => void
}

export function NewProjectDialog({ onProjectCreated }: NewProjectDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const formRef = React.useRef<ProjectFormHandle>(null)

  const handleSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true)
    try {
      // Calcular total antes de enviar al backend
      const tax = data.subtotal * (data.taxRate / 100)
      const total = data.subtotal + tax

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          total, // Enviar total calculado
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear proyecto')
      }

      toast.success('Proyecto creado exitosamente')
      setOpen(false)
      onProjectCreated?.()
    } catch (error) {
      console.error('Error al crear proyecto:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear proyecto')
    } finally {
      setIsSubmitting(false)
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
      <ScrollableDialogContent className="sm:max-w-[700px]">
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
                isSubmitting={isSubmitting}
                showSubmitButton={false}
              />
            </div>
          </ScrollableDialogDescription>
        </ScrollableDialogBody>
        <ScrollableDialogFooter>
          <ScrollableDialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancelar
            </Button>
          </ScrollableDialogClose>
          <Button onClick={() => formRef.current?.submit()} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Proyecto'}
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </ScrollableDialog>
  )
}
