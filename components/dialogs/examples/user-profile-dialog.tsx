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

import {
  UserProfileForm,
  type UserProfileFormHandle,
} from '@/components/forms/examples/user-profile-form'
import { type UserProfileFormValues } from '@/lib/validations/user-profile-validations'

interface UserProfileDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit: (data: UserProfileFormValues) => void | Promise<void>
  defaultValues?: Partial<UserProfileFormValues>
  title?: string
  description?: string
}

/**
 * Dialog scrollable con formulario de perfil de usuario
 *
 * Ejemplo de uso:
 * ```tsx
 * <UserProfileDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onSubmit={(data) => console.log(data)}
 * />
 * ```
 */
export function UserProfileDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  title = 'Editar Perfil',
  description = 'Actualiza tu información personal y preferencias',
}: UserProfileDialogProps) {
  const formRef = React.useRef<UserProfileFormHandle>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (data: UserProfileFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange?.(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = () => {
    formRef.current?.submit()
  }

  const handleCancel = () => {
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* ScrollArea para contenido largo */}
        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="py-4">
            <UserProfileForm ref={formRef} onSubmit={handleSubmit} defaultValues={defaultValues} />
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
