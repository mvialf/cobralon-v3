'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateAdjustmentReason,
  useUpdateAdjustmentReason,
} from '@/hooks/queries/use-adjustment-reasons'
import {
  adjustmentReasonSchema,
  WARNING_LEVELS,
  type AdjustmentReason,
  type AdjustmentReasonFormValues,
} from '@/lib/validations/adjustment-reason-validations'

interface AdjustmentReasonDialogProps {
  mode: 'create' | 'edit'
  reason?: AdjustmentReason
  onSuccess: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AdjustmentReasonDialog({
  mode,
  reason,
  onSuccess,
  open,
  onOpenChange,
}: AdjustmentReasonDialogProps) {
  const createMutation = useCreateAdjustmentReason()
  const updateMutation = useUpdateAdjustmentReason()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const form = useForm<AdjustmentReasonFormValues>({
    resolver: zodResolver(adjustmentReasonSchema),
    defaultValues: {
      name: reason?.name || '',
      warningLevel: reason?.warningLevel || 'none',
      isActive: reason?.isActive ?? true,
    },
  })

  if (mode === 'edit' && !reason) {
    return null
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(data)
      } else {
        await updateMutation.mutateAsync({ id: reason!.id, ...data })
      }
      onSuccess()
      onOpenChange?.(false)
    } catch {
      // Error manejado por el hook (toast automatico)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nueva Razon de Ajuste' : 'Editar Razon de Ajuste'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Agrega una nueva razon para aplicar ajustes a proyectos'
              : 'Modifica la configuracion de la razon de ajuste'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Descuento comercial" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nivel de advertencia */}
            <FormField
              control={form.control}
              name="warningLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel de Advertencia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un nivel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WARNING_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activo */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Activo</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'create'
                ? 'Creando...'
                : 'Guardando...'
              : mode === 'create'
                ? 'Crear Razon'
                : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
