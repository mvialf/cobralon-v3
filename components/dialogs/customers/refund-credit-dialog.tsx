'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Banknote, CreditCard, FileText } from 'lucide-react'
import { refundCreditSchema, type RefundCreditFormData } from '@/lib/validations/credit-validations'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'

interface RefundCreditDialogProps {
  customerId: string
  customerName: string
  availableCredit: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function RefundCreditDialog({
  customerId,
  customerName,
  availableCredit,
  open,
  onOpenChange,
  onSuccess,
}: RefundCreditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RefundCreditFormData>({
    resolver: zodResolver(
      refundCreditSchema.refine((data) => data.amount <= availableCredit, {
        message: `No puedes devolver más del crédito disponible (${formatCurrency(availableCredit, 'CLP')})`,
        path: ['amount'],
      })
    ),
    defaultValues: {
      amount: availableCredit, // Pre-llenar con total (caso común)
      refundDate: new Date().toISOString().split('T')[0], // Fecha actual
      refundMethod: 'TRANSFERENCIA',
      comments: '',
    },
  })

  const watchedAmount = form.watch('amount')

  const onSubmit = async (data: RefundCreditFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/customers/${customerId}/credit/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al procesar devolución')
      }

      toast.success(`Devolución de ${formatCurrency(data.amount, 'CLP')} procesada exitosamente`)

      onSuccess?.()
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error al procesar devolución:', error)
      toast.error(error instanceof Error ? error.message : 'Error al procesar devolución')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Devolver Crédito</DialogTitle>
          <DialogDescription>
            Cliente: <strong>{customerName}</strong>
            <br />
            Crédito disponible:{' '}
            <strong className="text-primary">{formatCurrency(availableCredit, 'CLP')}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Campo: Monto */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a devolver</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ingresa monto"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      max={availableCredit}
                    />
                  </FormControl>
                  <FormDescription className="flex justify-between text-xs">
                    <span>Máximo: {formatCurrency(availableCredit, 'CLP')}</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => form.setValue('amount', availableCredit)}
                    >
                      Devolver todo
                    </Button>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Fecha */}
            <FormField
              control={form.control}
              name="refundDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de devolución</FormLabel>
                  <FormControl>
                    <Input type="date" max={new Date().toISOString().split('T')[0]} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Método */}
            <FormField
              control={form.control}
              name="refundMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de devolución</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Efectivo
                        </div>
                      </SelectItem>
                      <SelectItem value="TRANSFERENCIA">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Transferencia bancaria
                        </div>
                      </SelectItem>
                      <SelectItem value="CHEQUE">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Cheque
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Comentarios */}
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Información adicional sobre la devolución</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Resumen visual */}
            <div className="rounded-lg bg-muted p-3 space-y-2">
              <p className="text-sm font-medium">Resumen</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédito actual:</span>
                  <span>{formatCurrency(availableCredit, 'CLP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Se devolverá:</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(watchedAmount || 0, 'CLP')}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Crédito restante:</span>
                  <span className="font-bold">
                    {formatCurrency(availableCredit - (watchedAmount || 0), 'CLP')}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar devolución
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
