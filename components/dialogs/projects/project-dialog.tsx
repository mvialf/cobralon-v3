'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

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

  const handleCancel = () => {
    onOpenChange?.(false)
  }

  const title = mode === 'create' ? 'Crear Proyecto' : 'Editar Proyecto'
  const description =
    mode === 'create'
      ? 'Ingresa los datos del nuevo proyecto'
      : 'Actualiza la información del proyecto'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* ScrollArea para contenido largo */}
        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="py-4">
            <ProjectForm
              ref={formRef}
              showSubmitButton={false}
              onSubmit={handleSubmit}
              defaultValues={defaultValues}
              isSubmitting={isSubmitting}
            />
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={() => formRef.current?.submit()} disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : mode === 'create'
                ? 'Crear Proyecto'
                : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
