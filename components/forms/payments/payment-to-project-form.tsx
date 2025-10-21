'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import {
  paymentToProjectSchema,
  type PaymentToProjectFormValues,
  type ProjectWithBalance,
} from '@/lib/validations/payment-validations'
import { formatCurrency } from '@/lib/format'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'

import { Combobox } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface PaymentToProjectFormProps {
  onSubmit: (data: PaymentToProjectFormValues, project: ProjectWithBalance) => void | Promise<void>
  isSubmitting?: boolean
}

/**
 * Formulario para "Pago a Proyecto" (1:1)
 *
 * Flujo simplificado donde:
 * 1. Usuario busca y selecciona un proyecto
 * 2. customerId y currency se derivan automáticamente
 * 3. 100% del monto se asigna al proyecto
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

  // State para error de monto > balance
  const [amountError, setAmountError] = useState<string | null>(null)

  // Form setup
  const form = useForm<PaymentToProjectFormValues>({
    resolver: zodResolver(paymentToProjectSchema),
    defaultValues: {
      projectId: '',
      amount: 0,
      date: new Date(),
      paymentMethodId: '',
      reference: '',
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
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await fetch('/api/payment-methods')
      if (!res.ok) throw new Error('Error al cargar métodos de pago')
      const data = await res.json()
      return data.paymentMethods || []
    },
  })

  // Encontrar método seleccionado (para validar reference)
  const selectedMethodId = form.watch('paymentMethodId')
  const selectedMethod = paymentMethods.find((m: any) => m.id === selectedMethodId)

  // Cuando cambia el proyecto seleccionado
  const watchedProjectId = form.watch('projectId')
  useEffect(() => {
    if (watchedProjectId && projects.length > 0) {
      const project = projects.find((p: ProjectWithBalance) => p.id === watchedProjectId)
      if (project) {
        setSelectedProject(project)
        // Reset amount error cuando cambia de proyecto
        setAmountError(null)
      }
    } else {
      setSelectedProject(null)
    }
  }, [watchedProjectId, projects])

  // Validación de monto onBlur
  const handleAmountBlur = () => {
    const amount = form.getValues('amount')
    if (selectedProject && amount > selectedProject.balance) {
      setAmountError(
        `El monto no puede ser mayor al balance pendiente (${formatCurrency(selectedProject.balance, selectedProject.currency)})`
      )
    } else {
      setAmountError(null)
    }
  }

  // Submit handler
  const handleSubmit = (values: PaymentToProjectFormValues) => {
    if (!selectedProject) {
      form.setError('projectId', { message: 'Debe seleccionar un proyecto' })
      return
    }

    // Validar monto <= balance
    if (values.amount > selectedProject.balance) {
      setAmountError(
        `El monto no puede ser mayor al balance pendiente (${formatCurrency(selectedProject.balance, selectedProject.currency)})`
      )
      return
    }

    // Validar reference si el método lo requiere
    if (selectedMethod?.requiresReference && !values.reference) {
      form.setError('reference', {
        message: 'Este método de pago requiere una referencia',
      })
      return
    }

    onSubmit(values, selectedProject)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

        {/* 2. Cliente (readonly, auto-derivado) */}
        {selectedProject && (
          <div className="space-y-2">
            <FormLabel>Cliente</FormLabel>
            <Input value={selectedProject.customer.name} readOnly className="bg-muted" />
          </div>
        )}

        {/* 3. Card: Balance Pendiente */}
        {selectedProject && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Balance Pendiente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(selectedProject.balance, selectedProject.currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total del proyecto:{' '}
                {formatCurrency(selectedProject.totalAmount, selectedProject.currency)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 4. Monto del Pago */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto del Pago *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    setAmountError(null) // Clear error on change
                  }}
                  onBlur={() => {
                    field.onBlur()
                    handleAmountBlur()
                  }}
                  disabled={!selectedProject}
                />
              </FormControl>
              {amountError && <p className="text-sm font-medium text-destructive">{amountError}</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 5. Fecha */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha del Pago *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="input-like"
                      size="input"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? format(field.value, 'PPP', { locale: es })
                        : 'Seleccionar fecha'}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 6. Método de Pago */}
        <FormField
          control={form.control}
          name="paymentMethodId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método de Pago *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethods.map((method: any) => (
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

        {/* 7. Referencia (condicional) */}
        {selectedMethod && (
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia {selectedMethod.requiresReference && '*'}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: N° de transferencia, comprobante, etc."
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                {selectedMethod.requiresReference && (
                  <p className="text-xs text-muted-foreground">
                    Este método de pago requiere una referencia
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 8. Notas (opcional) */}
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
          <Button type="submit" disabled={isSubmitting || !selectedProject || !!amountError}>
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
