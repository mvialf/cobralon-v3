'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
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
  hasInstallments: boolean
  maxInstallments: number | null
}> = []

interface PaymentToCustomerFormProps {
  onSubmit: (data: PaymentToCustomerFormValues, currency: string) => void | Promise<void>
  isSubmitting?: boolean
  preselectedCustomerId?: string // ← NUEVO: Si viene, el cliente está pre-seleccionado
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
}: PaymentToCustomerFormProps) {
  // State para cliente seleccionado
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  // State para proyectos del cliente
  const [customerProjects, setCustomerProjects] = useState<ProjectWithBalance[]>([])

  // State para allocations (mantenemos sincronizado con form)
  const [allocations, setAllocations] = useState<
    Array<{ projectId: string; allocatedAmount: number }>
  >([])

  // State para modo de distribución
  const [distributionMode, setDistributionMode] = useState<'fifo' | 'manual'>('manual')

  // Form setup
  const defaultValues = useMemo(
    () => ({
      customerId: preselectedCustomerId || '', // Pre-cargar si viene
      amount: 0,
      date: new Date(),
      paymentMethodId: '',
      notes: '',
      allocations: [],
    }),
    [preselectedCustomerId]
  )

  const form = useForm<PaymentToCustomerFormValues>({
    resolver: zodResolver(paymentToCustomerSchema),
    defaultValues,
  })

  // Fetch proyectos del cliente seleccionado
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['customer-projects', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return []
      const res = await fetch(`/api/payments/customer-projects?customerId=${selectedCustomerId}`)
      if (!res.ok) throw new Error('Error al cargar proyectos')
      const data = await res.json()
      // ⚠️ IMPORTANTE: Transformar strings ISO a Date objects
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

  // Actualizar customerProjects cuando se cargan
  useEffect(() => {
    if (projects && projects.length > 0) {
      setCustomerProjects(projects)
    } else {
      setCustomerProjects([])
    }
  }, [projects])

  // Inicializar allocations automáticamente cuando se cargan proyectos
  useEffect(() => {
    if (customerProjects.length > 0) {
      const initialAllocations = customerProjects.map((project) => ({
        projectId: project.id,
        allocatedAmount: 0,
      }))
      setAllocations(initialAllocations)
    }
  }, [customerProjects])

  // Sincronizar allocations con form
  useEffect(() => {
    form.setValue('allocations', allocations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations])

  // Handler: Calcular FIFO
  const handleCalculateFIFO = () => {
    if (!watchedAmount || watchedAmount <= 0) {
      form.setError('amount', { message: 'Ingrese un monto válido antes de calcular FIFO' })
      return
    }

    if (customerProjects.length === 0) {
      alert('No hay proyectos disponibles para distribuir')
      return
    }

    const fifoAllocations = calculateFIFO(watchedAmount, customerProjects)
    setAllocations(fifoAllocations)
  }

  // Handler: Eliminar allocation
  const handleRemoveAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index))
  }

  // Handler: Cambiar monto asignado
  const handleChangeAllocation = (index: number, amount: number) => {
    const updated = [...allocations]
    updated[index].allocatedAmount = amount
    setAllocations(updated)
  }

  // Handler: Reset installments cuando cambia método de pago
  // ⚠️ IMPORTANTE: Memoizado para evitar loop infinito de re-renders
  // form.setValue es estable (react-hook-form garantiza que no cambia)
  const handlePaymentMethodChange = useCallback(() => {
    form.setValue('selectedInstallments', null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calcular suma de allocations
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
  const difference = watchedAmount - totalAllocated
  const isValidSum = Math.abs(difference) < 0.01

  // Submit handler
  const handleSubmit = (values: PaymentToCustomerFormValues) => {
    // Validar que hay allocations
    if (values.allocations.length === 0) {
      form.setError('allocations', { message: 'Debe asignar el pago a al menos un proyecto' })
      return
    }

    // Validar suma
    if (!isValidSum) {
      form.setError('allocations', {
        message: 'La suma de allocations debe ser igual al monto total',
      })
      return
    }

    // Derivar currency del primer proyecto
    const firstAllocation = values.allocations[0]
    const project = customerProjects.find((p) => p.id === firstAllocation.projectId)
    const currency = project?.currency || 'CLP'

    onSubmit(values, currency)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        {/* 1. Cliente: Búsqueda o Pre-seleccionado */}
        <CustomerSearchField
          control={form.control}
          preselectedCustomerId={preselectedCustomerId}
          onCustomerSelect={(customer) => {
            if (customer) {
              setSelectedCustomerId(customer.id)
            } else {
              setSelectedCustomerId(null)
            }
            // Reset allocations y modo cuando cambia cliente
            setAllocations([])
            setDistributionMode('manual')
          }}
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
            {!loadingProjects && allocations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Este cliente no tiene proyectos con saldo pendiente.</p>
              </div>
            )}
            {/* Validación Visual */}
            {allocations.length > 0 && (
              <div className="flex justify-center gap-4">
                <Card className="p-2">
                  <CardContent className="flex flex-col">
                    <span className="text-sm text-center text-muted-foreground">Asignado:</span>
                    <span className="text-center font-semibold">
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
                  <CardContent className="flex flex-col gap-1">
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
            {!loadingProjects && allocations.length > 0 && (
              <div className="border rounded-lg">
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
                    {allocations.map((alloc, index) => {
                      const project = customerProjects.find((p) => p.id === alloc.projectId)
                      if (!project) return null

                      return (
                        <TableRow key={index}>
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
                          <TableCell className="text-right">
                            {formatCurrency(project.balance, project.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyInput
                              value={alloc.allocatedAmount}
                              onChange={(value) => handleChangeAllocation(index, value)}
                              currency={project.currency}
                              className="text-right"
                              disabled={distributionMode === 'fifo'}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAllocation(index)}
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

        {/* Submit button */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !selectedCustomerId ||
              customerProjects.length === 0 ||
              allocations.length === 0 ||
              !isValidSum
            }
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
