'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'

interface ConfirmDeleteDialogProps {
  /** Estado de apertura del dialog */
  open: boolean
  /** Callback para cambiar el estado de apertura */
  onOpenChange: (open: boolean) => void
  /** Callback ejecutado cuando se confirma la eliminación */
  onConfirm: () => void | Promise<void>
  /** Título del dialog */
  title: string
  /** Descripción/mensaje del dialog */
  description: string
  /** Texto del botón de confirmación (default: "Eliminar") */
  confirmText?: string
  /** Texto del botón de cancelación (default: "Cancelar") */
  cancelText?: string
  /** Si true, el botón de confirmación usa variante destructive (default: true) */
  destructive?: boolean
  /** Estado de carga durante la operación de eliminación */
  isDeleting?: boolean
}

/**
 * Dialog de confirmación reutilizable para operaciones destructivas
 *
 * Reemplaza window.confirm() con un AlertDialog accesible y estilizado
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false)
 * const [isDeleting, setIsDeleting] = useState(false)
 *
 * const handleConfirm = async () => {
 *   setIsDeleting(true)
 *   try {
 *     await deleteProject(projectId)
 *     setOpen(false)
 *   } finally {
 *     setIsDeleting(false)
 *   }
 * }
 *
 * <ConfirmDeleteDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onConfirm={handleConfirm}
 *   title="Eliminar proyecto"
 *   description="¿Estás seguro de eliminar el proyecto P-001?"
 *   isDeleting={isDeleting}
 * />
 * ```
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  destructive = true,
  isDeleting = false,
}: ConfirmDeleteDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className={destructive ? buttonVariants({ variant: 'destructive' }) : buttonVariants()}
          >
            {isDeleting ? 'Eliminando...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
