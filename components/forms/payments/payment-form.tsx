'use client'

import * as React from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown, Calculator, Trash2 } from 'lucide-react'

import { paymentFormSchema, type PaymentFormData } from '@/lib/validations/payment-validations'
import { calculateFIFO, calculateProjectBalance } from '@/lib/payment-fifo'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import { FormGrid } from '@/components/ui/form-grid'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface PaymentFormProps {
  customerId: string
  customerName: string
  onSubmit: (data: PaymentFormData) => void | Promise<void>
  isSubmitting?: boolean
  defaultValues?: Partial<PaymentFormData>
}

interface PaymentMethod {
  id: string
  name: string
  requiresReference: boolean
  active: boolean
  icon?: string | null
}

interface ProjectWithBalance {
  id: string
  projectNumber: string
  projectName: string
  totalAmount: number
  currency: string
  createdAt: Date
  paymentAllocations: Array<{
    allocatedAmount: number
  }>
}

export function PaymentForm({
  customerId,
  customerName,
  onSubmit,
  isSubmitting,
  defaultValues,
}: PaymentFormProps) {
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([])
  const [loadingMethods, setLoadingMethods] = React.useState(true)
  const [openMethodCombobox, setOpenMethodCombobox] = React.useState(false)

  const [projects, setProjects] = React.useState<ProjectWithBalance[]>([])
  const [loadingProjects, setLoadingProjects] = React.useState(true)

  const [selectedTab, setSelectedTab] = React.useState<'simple' | 'distribute'>('simple')

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      customerId,
      amount: 0,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: '',
      reference: '',
      notes: '',
      allocations: [],
      ...defaultValues,
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'allocations',
  })

  // Cargar métodos de pago
  React.useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const response = await fetch('/api/payment-methods')
        if (!response.ok) throw new Error('Error al cargar métodos de pago')
        const data = await response.json()
        // Solo métodos activos
        setPaymentMethods((data.paymentMethods || []).filter((m: PaymentMethod) => m.active))
      } catch (error) {
        console.error('Error al cargar métodos de pago:', error)
      } finally {
        setLoadingMethods(false)
      }
    }

    loadPaymentMethods()
  }, [])

  // Cargar proyectos del cliente
  React.useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch(`/api/projects?customerId=${customerId}`)
        if (!response.ok) throw new Error('Error al cargar proyectos')
        const data = await response.json()
        setProjects(data.projects || [])
      } catch (error) {
        console.error('Error al cargar proyectos:', error)
      } finally {
        setLoadingProjects(false)
      }
    }

    loadProjects()
  }, [customerId])

  const selectedMethod = paymentMethods.find((m) => m.id === form.watch('paymentMethodId'))

  // Calcular balance de cada proyecto
  const projectsWithBalance = React.useMemo(() => {
    return projects.map((project) => {
      const balance = calculateProjectBalance({
        totalAmount: project.totalAmount,
        allocations: project.paymentAllocations,
      }).balance

      return {
        ...project,
        balance,
      }
    })
  }, [projects])

  // Auto-distribuir con FIFO
  const handleFIFODistribution = () => {
    const amount = form.watch('amount')
    if (!amount || amount <= 0) {
      form.setError('amount', { message: 'Ingresa un monto válido primero' })
      return
    }

    const fifoAllocations = calculateFIFO(amount, projectsWithBalance)

    // Limpiar allocations previas
    while (fields.length > 0) {
      remove(0)
    }

    // Agregar nuevas allocations
    fifoAllocations.forEach((allocation) => {
      append({
        projectId: allocation.projectId,
        allocatedAmount: allocation.allocatedAmount,
      })
    })
  }

  // Handler para tab Simple (1:1)
  const handleSimpleProjectSelect = (projectId: string) => {
    const amount = form.watch('amount')
    if (!amount || amount <= 0) {
      form.setError('amount', { message: 'Ingresa un monto válido primero' })
      return
    }

    // Limpiar y agregar solo 1 allocation
    while (fields.length > 0) {
      remove(0)
    }

    append({
      projectId,
      allocatedAmount: amount,
    })
  }

  // Calcular total asignado
  const totalAllocated = fields.reduce((sum, field) => {
    const amount = form.watch(`allocations.${fields.indexOf(field)}.allocatedAmount`)
    return sum + (amount || 0)
  }, 0)

  const amount = form.watch('amount')
  const difference = amount - totalAllocated

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Cliente (readonly) */}
        <FormItem>
          <FormLabel>Cliente</FormLabel>
          <FormControl>
            <Input value={customerName} disabled className="bg-muted" />
          </FormControl>
        </FormItem>

        <FormGrid columns={2}>
          {/* Monto */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto del Pago *</FormLabel>
                <FormControl>
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormDescription>Monto total del pago</FormDescription>
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

        <FormGrid columns={2}>
          {/* Método de Pago */}
          <FormField
            control={form.control}
            name="paymentMethodId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Método de Pago *</FormLabel>
                <Popover
                  open={openMethodCombobox}
                  onOpenChange={setOpenMethodCombobox}
                  modal={true}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="input-like"
                        size="input"
                        role="combobox"
                        className={cn('w-full', !field.value && 'text-muted-foreground')}
                        disabled={loadingMethods}
                      >
                        {loadingMethods
                          ? 'Cargando...'
                          : field.value
                            ? selectedMethod?.name
                            : 'Seleccionar método'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar método..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron métodos</CommandEmpty>
                        <CommandGroup>
                          {paymentMethods.map((method) => (
                            <CommandItem
                              key={method.id}
                              value={method.name}
                              onSelect={() => {
                                form.setValue('paymentMethodId', method.id)
                                setOpenMethodCombobox(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  method.id === field.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {method.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Referencia (si el método lo requiere) */}
          {selectedMethod?.requiresReference && (
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder="Número de referencia"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </FormGrid>

        {/* Tabs: Simple vs Distribuir */}
        <Tabs
          value={selectedTab}
          onValueChange={(v) => setSelectedTab(v as 'simple' | 'distribute')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">Pago Simple (1:1)</TabsTrigger>
            <TabsTrigger value="distribute">Distribuir (1:N)</TabsTrigger>
          </TabsList>

          {/* Tab Simple */}
          <TabsContent value="simple" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Asigna el pago completo a un solo proyecto
            </p>

            {loadingProjects ? (
              <p className="text-sm text-muted-foreground">Cargando proyectos...</p>
            ) : projectsWithBalance.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este cliente no tiene proyectos disponibles
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proyecto</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectsWithBalance.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">#{project.projectNumber}</p>
                            <p className="text-sm text-muted-foreground">{project.projectName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {new Intl.NumberFormat('es-CL', {
                            style: 'currency',
                            currency: project.currency,
                          }).format(project.balance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSimpleProjectSelect(project.id)}
                            disabled={project.balance <= 0}
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Mostrar proyecto seleccionado */}
            {fields.length > 0 && (
              <div className="rounded-md border bg-muted/50 p-4">
                <p className="text-sm font-medium">Proyecto seleccionado:</p>
                {fields.map((field, index) => {
                  const project = projectsWithBalance.find((p) => p.id === field.projectId)
                  return (
                    <div key={field.id} className="mt-2 flex items-center justify-between">
                      <span className="text-sm">
                        #{project?.projectNumber} - {project?.projectName}
                      </span>
                      <span className="font-mono text-sm">
                        {new Intl.NumberFormat('es-CL', {
                          style: 'currency',
                          currency: 'CLP',
                        }).format(form.watch(`allocations.${index}.allocatedAmount`))}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab Distribuir */}
          <TabsContent value="distribute" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Distribuye el pago entre múltiples proyectos
              </p>
              <Button type="button" variant="outline" size="sm" onClick={handleFIFODistribution}>
                <Calculator className="mr-2 h-4 w-4" />
                Calcular FIFO
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Usa el botón "Calcular FIFO" para distribuir automáticamente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead className="text-right">Monto Asignado</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const project = projectsWithBalance.find((p) => p.id === field.projectId)
                        return (
                          <TableRow key={field.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">#{project?.projectNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {project?.projectName}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {new Intl.NumberFormat('es-CL', {
                                style: 'currency',
                                currency: project?.currency || 'CLP',
                              }).format(project?.balance || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <FormField
                                control={form.control}
                                name={`allocations.${index}.allocatedAmount`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <CurrencyInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        className="w-32"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
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

                {/* Resumen de distribución */}
                <div className="rounded-md border bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Monto total del pago:</span>
                    <span className="font-mono font-medium">
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                      }).format(amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total asignado:</span>
                    <span className="font-mono font-medium">
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                      }).format(totalAllocated)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'flex justify-between text-sm font-medium',
                      difference === 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                    )}
                  >
                    <span>Diferencia:</span>
                    <span className="font-mono">
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                      }).format(difference)}
                    </span>
                  </div>
                  {difference !== 0 && (
                    <p className="text-xs text-destructive">
                      La suma de los montos asignados debe ser igual al monto total del pago
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Notas (opcional) */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ''}
                  placeholder="Notas adicionales"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botones */}
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting || fields.length === 0}>
            {isSubmitting ? 'Guardando...' : 'Registrar Pago'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
