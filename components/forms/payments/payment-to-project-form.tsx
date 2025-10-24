'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'

import {
  paymentToProjectSchema,
  type PaymentToProjectFormValues,
  type ProjectWithBalance,
} from '@/lib/validations/payment-validations'
import { formatCurrency } from '@/lib/format'
import { useDebounce } from '@/hooks/use-debounce'

import { Combobox } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/ui/form'
import { FormGrid } from '@/components/ui/form-grid'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

interface PaymentToProjectFormProps {
  onSubmit: (data: PaymentToProjectFormValues, project: ProjectWithBalance) => void | Promise<void>
  isSubmitting?: boolean
}

/**
 * Formulario para "Pago a Proyecto" (1:1)
 *
 * Flujo simplificado donde:
 * 1. Usuario busca y selecciona un proyecto (combobox muestra cliente + proyecto)
 * 2. customerId y currency se derivan automáticamente del proyecto
 * 3. 100% del monto se asigna al proyecto
 * 4. Validación de monto vs balance se hace en submit con form.setError()
 */
export function PaymentToProjectForm({
  onSubmit,
  isSubmitting = false,
}: PaymentToProjectFormProps) {
  // State para búsqueda de proyectos
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  // State para proyecto seleccionado
  const [selectedProject, setSelectedProject] = useState<ProjectWithBalance | null>(null)

  // Form setup
  const form = useForm<PaymentToProjectFormValues>({
    resolver: zodResolver(paymentToProjectSchema),
    defaultValues: {
      projectId: '',
      amount: 0,
      date: new Date(),
      paymentMethodId: '',
      notes: '',
    },
  })

  // Fetch proyectos (server-side search)
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects-search', debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/payments/search-projects?q=${debouncedSearch}&limit=20`)
      if (!res.ok) throw new Error('Error al buscar proyectos')
      return res.json() as Promise<ProjectWithBalance[]>
    },
    enabled: debouncedSearch.length >= 2,
  })

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery<
    Array<{
      id: string
      name: string
      hasInstallments: boolean
      maxInstallments: number | null
    }>
  >({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await fetch('/api/payment-methods')
      if (!res.ok) throw new Error('Error al cargar métodos de pago')
      const data = await res.json()
      return data.paymentMethods || []
    },
  })

  // Cuando cambia el proyecto seleccionado
  const watchedProjectId = form.watch('projectId')
  useEffect(() => {
    if (watchedProjectId && projects.length > 0) {
      const project = projects.find((p: ProjectWithBalance) => p.id === watchedProjectId)
      if (project) {
        setSelectedProject(project)
      }
    } else {
      setSelectedProject(null)
    }
  }, [watchedProjectId, projects])

  // Watch payment method para mostrar campo de cuotas
  const watchedPaymentMethodId = form.watch('paymentMethodId')
  const selectedPaymentMethod = paymentMethods.find((m) => m.id === watchedPaymentMethodId)

  // Submit handler
  const handleSubmit = (values: PaymentToProjectFormValues) => {
    if (!selectedProject) {
      form.setError('projectId', { message: 'Debe seleccionar un proyecto' })
      return
    }

    // Validar monto <= balance
    if (values.amount > selectedProject.balance) {
      form.setError('amount', {
        message: `El monto no puede ser mayor al balance pendiente (${formatCurrency(selectedProject.balance, selectedProject.currency)})`,
      })
      return
    }

    onSubmit(values, selectedProject)
  }

  return (
    <Form {...form}>
      <FormRoot onSubmit={form.handleSubmit(handleSubmit)}>
        {/* 1. Buscar Proyecto (Combobox con server-side search) */}
        <FormField
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proyecto *</FormLabel>
              <FormControl>
                <Combobox<ProjectWithBalance>
                  value={field.value}
                  onValueChange={field.onChange}
                  options={projects}
                  getOptionValue={(p) => p.id}
                  getOptionLabel={(p) => `${p.projectNumber} - ${p.customer.name}`}
                  renderOption={(project) => (
                    <div className="space-y-0.5">
                      <div className="text-sm text-muted-foreground">
                        Proyecto #{project.projectNumber}
                      </div>
                      <div className="font-medium">
                        {project.customer.name}
                        {project.projectName && ` - ${project.projectName}`}
                      </div>
                    </div>
                  )}
                  placeholder="Buscar proyecto..."
                  searchPlaceholder="Escribe número, nombre o cliente..."
                  emptyMessage={
                    debouncedSearch.length < 2
                      ? 'Escribe al menos 2 caracteres para buscar'
                      : 'No se encontraron proyectos con balance pendiente'
                  }
                  loading={loadingProjects}
                  loadingText="Buscando proyectos..."
                  contentWidth="400px"
                  onSearchChange={setSearchTerm}
                  disableFiltering={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 2. Cards: Balance Pendiente */}
        {selectedProject && (
          <div className="flex justify-center gap-4">
            <Card className="p-2">
              <CardContent className="flex flex-col ">
                <p className="text-sm text-center text-muted-foreground">Saldo pendiente</p>
                <p className="text-lg text-center font-semibold">
                  {formatCurrency(selectedProject.balance, selectedProject.currency)}
                </p>
              </CardContent>
            </Card>
            <Card className="p-2">
              <CardContent className="flex flex-col">
                <p className="text-sm text-center text-muted-foreground">Total del proyecto</p>
                <p className="text-lg text-center font-semibold">
                  {formatCurrency(selectedProject.totalAmount, selectedProject.currency)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <FormGrid columns={2}>
          {/* Monto del Pago */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto del Pago *</FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                    currency={selectedProject?.currency}
                    disabled={!selectedProject}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha del Pago *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value instanceof Date
                        ? field.value.toISOString().split('T')[0]
                        : field.value
                    }
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormGrid>

        {/* 3. Método de Pago */}
        <FormField
          control={form.control}
          name="paymentMethodId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método de Pago *</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  // Reset cuotas si cambia el método
                  form.setValue('selectedInstallments', null)
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 3.5. Número de Cuotas (condicional) */}
        {selectedPaymentMethod?.hasInstallments && (
          <FormField
            control={form.control}
            name="selectedInstallments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Cuotas</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === '1' ? null : Number(value))}
                  value={field.value?.toString() || '1'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuotas" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 cuota (contado)</SelectItem>
                    {Array.from(
                      { length: (selectedPaymentMethod?.maxInstallments || 2) - 1 },
                      (_, i) => i + 2
                    ).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} cuotas sin interés
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 4. Notas (opcional) */}
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
          <Button type="submit" disabled={isSubmitting || !selectedProject}>
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </div>
      </FormRoot>
    </Form>
  )
}
