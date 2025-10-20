'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ProjectForm } from '@/components/forms/projects/project-form'
import { type ProjectFormData } from '@/lib/validations/project-validations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface NewProjectDialogProps {
  onProjectCreated?: () => void
}

export function NewProjectDialog({ onProjectCreated }: NewProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Nuevo Proyecto</DialogTitle>
          <DialogDescription>
            Ingresa los datos del nuevo proyecto. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  )
}
