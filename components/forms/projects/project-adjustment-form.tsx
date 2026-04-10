'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  projectAdjustmentFormSchema,
  type ProjectAdjustmentFormValues,
  defaultProjectAdjustmentValues,
} from '@/lib/validations/project-adjustment-validations'
import { useAdjustmentReasons } from '@/hooks/queries/use-adjustment-reasons'
import { formatCurrency } from '@/lib/format'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface ProjectAdjustmentFormProps {
  onSubmit: (data: ProjectAdjustmentFormValues) => void | Promise<void>
  isSubmitting?: boolean
  currentBalance: number
  currency: string
}

/**
 * Formulario para crear un ajuste de proyecto
 *
 * Permite aplicar descuentos, condonaciones o ajustes al balance de un proyecto
 */
export function ProjectAdjustmentForm({
  onSubmit,
  isSubmitting = false,
  currentBalance,
  currency,
}: ProjectAdjustmentFormProps) {
  const { data: adjustmentReasons = [], isLoading: loadingReasons } = useAdjustmentReasons()
  // Filtrar solo razones activas
  const activeReasons = adjustmentReasons.filter((r) => r.isActive)

  const form = useForm<ProjectAdjustmentFormValues>({
    resolver: zodResolver(projectAdjustmentFormSchema),
    defaultValues: defaultProjectAdjustmentValues,
  })

  const watchedAmount = form.watch('amount')
  const newBalance = currentBalance - (watchedAmount || 0)
  const exceedsBalance = watchedAmount > currentBalance && currentBalance > 0

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data)
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>Balance actual: {formatCurrency(currentBalance, currency)}</div>
        <div className="flex gap-4">
          {/* Razón del ajuste */}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razón del ajuste</FormLabel>
                <Select
                  onValueChange={(value) => {
                    // Guardar nombre de la razón y su ID
                    const selected = activeReasons.find((r) => r.id === value)
                    if (selected) {
                      field.onChange(selected.name)
                      form.setValue('reasonId', selected.id)
                    }
                  }}
                  value={activeReasons.find((r) => r.name === field.value)?.id || ''}
                  disabled={loadingReasons}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingReasons ? 'Cargando...' : 'Selecciona una razón'}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.id}>
                        {reason.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Monto del ajuste */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto del ajuste</FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                    currency={currency}
                    min={0}
                    max={currentBalance > 0 ? currentBalance : undefined}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Preview del impacto */}
        {watchedAmount > 0 && (
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium mb-2">Impacto del ajuste:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Balance actual:</span>
              <span className="text-right">{formatCurrency(currentBalance, currency)}</span>
              <span className="text-muted-foreground">Ajuste:</span>
              <span className="text-right text-destructive">
                -{formatCurrency(watchedAmount, currency)}
              </span>
              <span className="text-muted-foreground font-medium">Nuevo balance:</span>
              <span className={`text-right font-medium ${newBalance <= 0 ? 'text-green-600' : ''}`}>
                {formatCurrency(Math.max(0, newBalance), currency)}
              </span>
            </div>
          </div>
        )}

        {/* Alerta si excede el balance */}
        {exceedsBalance && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              El ajuste excede el balance actual. Máximo permitido:{' '}
              {formatCurrency(currentBalance, currency)}
            </AlertDescription>
          </Alert>
        )}

        {/* Notas adicionales */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas adicionales (opcional)</FormLabel>
              <FormControl>
                <Textarea className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botón de submit */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting || exceedsBalance}>
            {isSubmitting ? 'Aplicando...' : 'Aplicar Ajuste'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
