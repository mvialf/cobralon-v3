'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import {
  paymentToCustomerSchema,
  type PaymentToCustomerFormValues,
  type ProjectWithBalance,
  parseProjectsWithBalance,
} from '@/lib/validations/payment-validations'
import { calculateFIFO } from '@/lib/business-logic/payment-fifo'
import { FINANCIAL } from '@/lib/constants/financial-constants'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaymentMethodFields } from '@/components/forms/fields/payment-method-fields'
import { PaymentAmountDateFields } from '@/components/forms/fields/payment-amount-date-fields'
import { CustomerSearchField } from '@/components/forms/search/customer-search-field'

// ✅ Constantes fuera del componente para evitar re-renders infinitos
const EMPTY_PROJECTS: ProjectWithBalance[] = []
const EMPTY_PAYMENT_METHODS: Array<{
  id: string
  name: string
  active: boolean
  hasInstallments: boolean
  maxInstallments: number | null
}> = []

interface PaymentToCustomerFormProps {
  onSubmit: (data: PaymentToCustomerFormValues, currency: string) => void | Promise<void>
  isSubmitting?: boolean
  preselectedCustomerId?: string
  formId?: string // Para submit externo desde DialogFooter
}

/**
 * Formulario para "Pago a Cliente" (1:N)
 *
 * Flujo donde el usuario:
 * 1. Selecciona un cliente
 * 2. Ingresa el monto total del pago
 * 3. Distribuye el monto entre múltiples proyectos:
 *    - Modo FIFO: Distribución automática por antigüedad
 *    - Modo Manual: Distribución personalizada
 * 4. La suma de allocations debe ser exactamente igual al monto total
 */
export function PaymentToCustomerForm({
  onSubmit,
  isSubmitting = false,
  preselectedCustomerId,
  formId,
}: PaymentToCustomerFormProps) {
  // State para cliente seleccionado
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  // State para proyectos del cliente
  const [customerProjects, setCustomerProjects] = useState<ProjectWithBalance[]>([])

  // State para modo de distribución
  const [distributionMode, setDistributionMode] = useState<'fifo' | 'manual'>('manual')

  // Form setup
  const defaultValues = useMemo(
    () => ({
      customerId: preselectedCustomerId || '',
      amount: 0,
      date: new Date(),
      paymentMethodId: '',
      notes: '',
      allocations: [],
      selectedInstallments: 1, // Default: 1 cuota (contado)
    }),
    [preselectedCustomerId]
  )

  const form = useForm<PaymentToCustomerFormValues>({
    resolver: zodResolver(paymentToCustomerSchema),
    defaultValues,
  })

  // ✅ useFieldArray para manejar allocations - reemplaza useState manual
  const { fields, replace, update, remove } = useFieldArray({
    control: form.control,
    name: 'allocations',
  })

  // Fetch proyectos del cliente seleccionado
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['customer-projects', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return []
      const res = await fetch(`/api/payments/customer-projects?customerId=${selectedCustomerId}`)
      if (!res.ok) throw new Error('Error al cargar proyectos')
      const data = await res.json()
      return parseProjectsWithBalance(data)
    },
    enabled: !!selectedCustomerId,
  })

  // Memoize para evitar re-renders infinitos
  const projects = useMemo(() => projectsData || EMPTY_PROJECTS, [projectsData])

  // Fetch payment methods
  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await fetch('/api/payment-methods')
      if (!res.ok) throw new Error('Error al cargar métodos de pago')
      const data = await res.json()
      return data.paymentMethods || []
    },
  })

  // Memoize para evitar re-renders infinitos
  const paymentMethods = useMemo(
    () => paymentMethodsData || EMPTY_PAYMENT_METHODS,
    [paymentMethodsData]
  )

  // Watch amount para calcular FIFO
  const watchedAmount = form.watch('amount')

  // Inicializar allocations cuando se cargan proyectos
  useEffect(() => {
    if (projects && projects.length > 0) {
      setCustomerProjects(projects)
      // Inicializar allocations en el form directamente via useFieldArray
      const initialAllocations = projects.map((project) => ({
        projectId: project.id,
        allocatedAmount: 0,
      }))
      replace(initialAllocations)
    } else {
      setCustomerProjects([])
      replace([])
    }
  }, [projects, replace])

  // Auto-recalcular FIFO cuando cambia el monto en modo FIFO
  useEffect(() => {
    if (
      distributionMode === 'fifo' &&
      watchedAmount > 0 &&
      customerProjects.length > 0 &&
      fields.length > 0
    ) {
      handleCalculateFIFO()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAmount, distributionMode])

  // Handler: Calcular FIFO
  const handleCalculateFIFO = useCallback(() => {
    if (!watchedAmount || watchedAmount <= 0) {
      form.setError('amount', { message: 'Ingrese un monto válido antes de calcular FIFO' })
      return
    }

    if (customerProjects.length === 0) {
      return
    }

    // Calcular distribución FIFO
    const fifoAllocations = calculateFIFO(watchedAmount, customerProjects)

    // Actualizar cada field - mantiene todas las filas visibles
    fields.forEach((field, index) => {
      const fifoAllocation = fifoAllocations.find((f) => f.projectId === field.projectId)
      update(index, {
        projectId: field.projectId,
        allocatedAmount: fifoAllocation?.allocatedAmount || 0,
      })
    })
  }, [watchedAmount, customerProjects, form, fields, update])

  // Handler: Cambiar monto asignado (Eliminado en favor de FormField/Controller)

  // Handler: Reset installments cuando cambia método de pago
  const handlePaymentMethodChange = useCallback(() => {
    form.setValue('selectedInstallments', 1) // Reset a 1 cuota (contado)
  }, [form])

  // Handler: Cuando se selecciona un cliente (estable para evitar loop infinito en CustomerSearchField)
  const handleCustomerSelect = useCallback(
    (customer: { id: string } | null) => {
      setSelectedCustomerId(customer?.id || null)
      // Reset allocations y modo cuando cambia cliente
      replace([])
      setDistributionMode('manual')
    },
    [replace]
  )

  // ✅ useWatch para obtener las allocations en tiempo real y calcular totales
  const watchedAllocations = form.watch('allocations')

  // Calcular suma de allocations desde los valores observados
  const totalAllocated = useMemo(() => {
    return watchedAllocations?.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0) || 0
  }, [watchedAllocations])

  const difference = watchedAmount - totalAllocated
  const isValidSum = Math.abs(difference) < FINANCIAL.TOLERANCE

  // Submit handler
  const handleSubmit = (values: PaymentToCustomerFormValues) => {
    // 1. Filtrar allocations con monto > 0
    const allocationsWithValue = values.allocations.filter((a) => a.allocatedAmount > 0)

    // 2. Validar que hay al menos una allocation con valor
    if (allocationsWithValue.length === 0) {
      form.setError('allocations', {
        message: 'Debe asignar el pago a al menos un proyecto',
      })
      return
    }

    // 3. Validar suma (con las allocations filtradas)
    const totalAllocatedSubmit = allocationsWithValue.reduce((sum, a) => sum + a.allocatedAmount, 0)
    const differenceSubmit = watchedAmount - totalAllocatedSubmit
    if (Math.abs(differenceSubmit) >= FINANCIAL.TOLERANCE) {
      form.setError('allocations', {
        message: 'La suma de allocations debe ser igual al monto total',
      })
      return
    }

    // 4. Derivar currency del primer proyecto
    const firstAllocation = allocationsWithValue[0]
    const project = customerProjects.find((p) => p.id === firstAllocation.projectId)
    const currency = project?.currency || 'CLP'

    // 5. Enviar solo las allocations con valor > 0
    onSubmit({ ...values, allocations: allocationsWithValue }, currency)
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        {/* 1. Cliente: Búsqueda o Pre-seleccionado */}
        <CustomerSearchField
          control={form.control}
          preselectedCustomerId={preselectedCustomerId}
          onCustomerSelect={handleCustomerSelect}
        />

        {/* 3. Monto y Fecha */}
        <PaymentAmountDateFields
          control={form.control}
          currency={customerProjects[0]?.currency}
          disabled={!selectedCustomerId || customerProjects.length === 0}
          amountLabel="Monto Total del Pago *"
        />

        {/* 5. Método de Pago + Cuotas */}
        <PaymentMethodFields
          control={form.control}
          paymentMethods={paymentMethods}
          onPaymentMethodChange={handlePaymentMethodChange}
        />

        {/* 6. Sección de Allocations (solo si hay cliente seleccionado) */}
        {selectedCustomerId && (
          <div className="space-y-4">
            <FormLabel className="text-center">Distribución del Pago</FormLabel>

            {/* Loading State */}
            {loadingProjects && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Cargando proyectos...</p>
              </div>
            )}

            {/* Empty State */}
            {!loadingProjects && fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Este cliente no tiene proyectos con saldo pendiente.</p>
              </div>
            )}
            {/* Validación Visual */}
            {fields.length > 0 && (
              <div className="flex justify-center gap-4">
                <Card className="p-2">
                  <CardContent className="flex flex-col">
                    <span className="text-sm text-center text-muted-foreground">Asignado:</span>
                    <span className="text-center font-semibold text-primary">
                      {formatCurrency(totalAllocated, 'CLP')}
                    </span>
                  </CardContent>
                </Card>
                <Card className="p-2">
                  <CardContent className="flex flex-col">
                    <span className="text-sm text-center text-muted-foreground">Diferencia:</span>
                    <span
                      className={cn(
                        'text-center font-semibold',
                        isValidSum ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(Math.abs(difference), 'CLP')}
                      {!isValidSum && (difference > 0 ? ' (falta asignar)' : ' (sobrepasado)')}
                    </span>
                  </CardContent>
                </Card>
                <Card className="p-2">
                  <CardContent className="flex flex-col gap-1 items-center">
                    <label
                      htmlFor="auto-fifo"
                      className={cn(
                        'text-sm',
                        !watchedAmount || watchedAmount <= 0
                          ? 'text-muted-foreground cursor-not-allowed'
                          : 'cursor-pointer'
                      )}
                    >
                      Auto
                    </label>
                    <input
                      type="checkbox"
                      id="auto-fifo"
                      checked={distributionMode === 'fifo'}
                      disabled={!watchedAmount || watchedAmount <= 0}
                      onChange={(e) => {
                        const newMode = e.target.checked ? 'fifo' : 'manual'
                        setDistributionMode(newMode)
                        if (newMode === 'fifo') {
                          handleCalculateFIFO()
                        }
                      }}
                      className="h-4 w-4"
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabla de Allocations */}
            {!loadingProjects && fields.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proyecto</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Monto Asignado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const project = customerProjects.find((p) => p.id === field.projectId)
                      if (!project) return null

                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{project.projectNumber}</div>
                              {project.projectName && (
                                <div className="text-sm text-muted-foreground">
                                  {project.projectName}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(project.balance, project.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <FormField
                              control={form.control}
                              name={`allocations.${index}.allocatedAmount`}
                              render={({ field: inputField }) => (
                                <CurrencyInput
                                  value={inputField.value}
                                  onChange={inputField.onChange}
                                  currency={project.currency}
                                  disabled={distributionMode === 'fifo'}
                                  className="text-right max-w-[150px] ml-auto"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <FormMessage />
          </div>
        )}

        {/* 7. Notas (opcional) */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales sobre el pago..."
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit button - solo si no hay formId externo */}
        {!formId && (
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedCustomerId ||
                customerProjects.length === 0 ||
                fields.length === 0 ||
                !isValidSum
              }
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
