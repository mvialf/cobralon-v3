'use client'

import * as React from 'react'
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
import { Button } from '@/components/ui/button'

import { ProjectForm, ProjectFormHandle } from '@/components/forms/projects/project-form'
import { type ProjectFormData } from '@/lib/validations/project-validations'

interface ProjectDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => void | Promise<void>
  defaultValues?: Partial<ProjectFormData>
  mode?: 'create' | 'edit'
}

/**
 * Dialog scrollable con formulario de proyecto
 *
 * Ejemplo de uso:
 * ```tsx
 * <ProjectDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onSubmit={async (data) => {
 *     await createProject(data)
 *   }}
 *   mode="create"
 * />
 * ```
 */
export function ProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  mode = 'create',
}: ProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const formRef = React.useRef<ProjectFormHandle>(null)

  const handleSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange?.(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = mode === 'create' ? 'Crear Proyecto' : 'Editar Proyecto'
  const description =
    mode === 'create'
      ? 'Ingresa los datos del nuevo proyecto'
      : 'Actualiza la información del proyecto'

  return (
    <ScrollableDialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm">
        <ScrollableDialogHeader>
          <ScrollableDialogTitle>{title}</ScrollableDialogTitle>
        </ScrollableDialogHeader>

        <ScrollableDialogBody>
          <ScrollableDialogDescription asChild>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">{description}</p>
              <ProjectForm
                ref={formRef}
                showSubmitButton={false}
                onSubmit={handleSubmit}
                defaultValues={defaultValues}
                isSubmitting={isSubmitting}
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
            {isSubmitting
              ? 'Guardando...'
              : mode === 'create'
                ? 'Crear Proyecto'
                : 'Guardar Cambios'}
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </ScrollableDialog>
  )
}
