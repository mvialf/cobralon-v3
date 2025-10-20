'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown } from 'lucide-react'

import { projectSchema, type ProjectFormData } from '@/lib/validations/project-validations'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/ui/phone-input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { PercentageInput } from '@/components/ui/percentage-input'
import { FormGrid } from '@/components/ui/form-grid'
import { StatusBadge } from '@/components/ui/status-badge'
import { AddressFields } from '@/components/forms/address-fields'
import { useConfiguration } from '@/hooks/use-configuration'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void | Promise<void>
  isSubmitting?: boolean
  defaultValues?: Partial<ProjectFormData>
}

interface Customer {
  id: string
  name: string
  phone: string
}

interface ProjectStatus {
  id: string
  name: string
  color: {
    bgClass: string
  }
}

export function ProjectForm({ onSubmit, isSubmitting, defaultValues }: ProjectFormProps) {
  const { configuration } = useConfiguration()

  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = React.useState(true)
  const [openCustomerCombobox, setOpenCustomerCombobox] = React.useState(false)

  const [projectStatuses, setProjectStatuses] = React.useState<ProjectStatus[]>([])
  const [loadingStatuses, setLoadingStatuses] = React.useState(true)
  const [openStatusCombobox, setOpenStatusCombobox] = React.useState(false)

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      customerId: '',
      projectNumber: '',
      projectName: '',
      phone: '',
      street: '',
      apartment: '',
      comuna: '',
      region: configuration.region || '',
      projectStatusId: '',
      date: new Date(),
      subtotal: 0,
      taxRate: 19,
      totalAmount: 0,
      currency: configuration.currency || 'CLP',
      windowsCount: 0,
      squareMeters: 0,
      description: '',
      ...defaultValues,
    },
  })

  // Cargar lista de customers al montar
  React.useEffect(() => {
    async function loadCustomers() {
      try {
        const response = await fetch('/api/customers/list')
        if (!response.ok) throw new Error('Error al cargar clientes')
        const data = await response.json()
        setCustomers(data.customers || [])
      } catch (error) {
        console.error('Error al cargar clientes:', error)
      } finally {
        setLoadingCustomers(false)
      }
    }

    loadCustomers()
  }, [])

  // Cargar lista de project statuses al montar
  React.useEffect(() => {
    async function loadStatuses() {
      try {
        const response = await fetch('/api/project-status')
        if (!response.ok) throw new Error('Error al cargar estados')
        const data = await response.json()
        setProjectStatuses(data.projectStatuses || [])
      } catch (error) {
        console.error('Error al cargar estados:', error)
      } finally {
        setLoadingStatuses(false)
      }
    }

    loadStatuses()
  }, [])

  // Watch subtotal y taxRate para calcular total
  const subtotal = form.watch('subtotal')
  const taxRate = form.watch('taxRate')

  // Calcular total automáticamente
  const total = React.useMemo(() => {
    if (!subtotal) return 0
    const tax = subtotal * ((taxRate || 0) / 100)
    return subtotal + tax
  }, [subtotal, taxRate])

  // Cuando se selecciona un customer, autocompletar phone
  const handleCustomerSelect = (customerId: string) => {
    const selectedCustomer = customers.find((c) => c.id === customerId)
    if (selectedCustomer) {
      form.setValue('customerId', selectedCustomer.id)
      // Autocompletar phone (pero usuario puede editarlo después)
      form.setValue('phone', selectedCustomer.phone)
    }
    setOpenCustomerCombobox(false)
  }

  const selectedCustomer = customers.find((c) => c.id === form.watch('customerId'))
  const selectedStatus = projectStatuses.find((s) => s.id === form.watch('projectStatusId'))

  // Wrapper del onSubmit para calcular totalAmount automáticamente
  const handleFormSubmit = (data: ProjectFormData) => {
    // Calcular totalAmount basado en subtotal y taxRate
    const calculatedTotal = data.subtotal + data.subtotal * ((data.taxRate || 0) / 100)

    // Agregar totalAmount calculado al data
    const dataWithTotal = {
      ...data,
      totalAmount: calculatedTotal,
    }

    // Llamar al onSubmit original
    return onSubmit(dataWithTotal)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormGrid columns="3-1">
          {/* Cliente - Combobox */}
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Cliente *</FormLabel>
                <Popover
                  open={openCustomerCombobox}
                  onOpenChange={setOpenCustomerCombobox}
                  modal={true}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="input-like"
                        size="input"
                        role="combobox"
                        className={cn('w-full', !field.value && 'text-muted-foreground')}
                        disabled={loadingCustomers}
                      >
                        {loadingCustomers
                          ? 'Cargando...'
                          : field.value
                            ? selectedCustomer?.name
                            : 'Seleccionar cliente'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron clientes</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => handleCustomerSelect(customer.id)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  customer.id === field.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{customer.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.phone}
                                </span>
                              </div>
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

          {/* Número de Proyecto */}
          <FormField
            control={form.control}
            name="projectNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proyecto *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="PROJ-001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormGrid>

        <FormGrid columns="2-1">
          {/* Glosa */}
          <FormField
            control={form.control}
            name="projectName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Glosa</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Descripción breve del proyecto" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Teléfono */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono *</FormLabel>
                <FormControl>
                  <PhoneInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormGrid>

        <FormGrid columns={2}>
          {/* Estado - Combobox */}
          <FormField
            control={form.control}
            name="projectStatusId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Estado</FormLabel>
                <Popover
                  open={openStatusCombobox}
                  onOpenChange={setOpenStatusCombobox}
                  modal={true}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="input-like"
                        size="input"
                        role="combobox"
                        className={cn(
                          'w-full justify-start',
                          !field.value && 'text-muted-foreground'
                        )}
                        disabled={loadingStatuses}
                      >
                        {loadingStatuses ? (
                          'Cargando...'
                        ) : field.value && selectedStatus ? (
                          <StatusBadge
                            bgClass={selectedStatus.color.bgClass}
                            label={selectedStatus.name}
                            className="mr-2"
                          />
                        ) : (
                          'Seleccionar estado'
                        )}
                        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar estado..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron estados</CommandEmpty>
                        <CommandGroup>
                          {projectStatuses.map((status) => (
                            <CommandItem
                              key={status.id}
                              value={status.name}
                              onSelect={() => {
                                form.setValue('projectStatusId', status.id)
                                setOpenStatusCombobox(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  status.id === field.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <StatusBadge bgClass={status.color.bgClass} label={status.name} />
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

          {/* Fecha de Ingreso */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Ingreso *</FormLabel>
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
          <AddressFields control={form.control} defaultRegion={configuration.region} />
        </FormGrid>

        <FormGrid columns={3}>
          {/* Subtotal */}
          <FormField
            control={form.control}
            name="subtotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subtotal *</FormLabel>
                <FormControl>
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormDescription>
                  Moneda: {form.watch('currency') || configuration.currency || 'CLP'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Impuesto */}
          <FormField
            control={form.control}
            name="taxRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Impuesto</FormLabel>
                <FormControl>
                  <PercentageInput
                    value={field.value}
                    onValueChange={(value) => field.onChange(value || 0)}
                    placeholder="19.0"
                    decimalScale={1}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Total (calculado automáticamente, read-only) */}
          <FormItem>
            <FormLabel>Total</FormLabel>
            <FormControl>
              <CurrencyInput value={total} onChange={() => {}} disabled className="bg-muted" />
            </FormControl>
          </FormItem>
        </FormGrid>

        <FormGrid columns={2}>
          {/* Elementos */}
          <FormField
            control={form.control}
            name="windowsCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Elementos</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* m² */}
          <FormField
            control={form.control}
            name="squareMeters"
            render={({ field }) => (
              <FormItem>
                <FormLabel>m²</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormGrid>

        {/* Descripción */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Descripción detallada del proyecto" rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Proyecto'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
