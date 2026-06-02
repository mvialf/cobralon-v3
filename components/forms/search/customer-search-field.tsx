'use client'

import * as React from 'react'
import { Control } from 'react-hook-form'

import { useDebounce } from '@/hooks/use-debounce'
import { useCustomer, useCustomers, type Customer } from '@/hooks/queries/use-customers'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Combobox } from '@/components/ui/combobox'
import { CustomerNameSummary } from '@/components/summarys/customer-name-summary'

interface CustomerSearchFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  preselectedCustomerId?: string
  withPendingBalance?: boolean
  onCustomerSelect?: (customer: Customer | null) => void
}

/**
 * Componente reutilizable para búsqueda y selección de cliente
 * Incluye:
 * - Combobox de búsqueda server-side (si NO hay preselectedCustomerId)
 * - CustomerNameSummary read-only (si hay preselectedCustomerId)
 *
 * Maneja internamente:
 * - Query de cliente pre-seleccionado
 * - Query de búsqueda de clientes (server-side search)
 * - Debounce de búsqueda
 * - Estado de cliente seleccionado
 *
 * Usado en PaymentToCustomerForm para simplificar la lógica de selección de cliente.
 */
export function CustomerSearchField({
  control,
  preselectedCustomerId,
  withPendingBalance = false,
  onCustomerSelect,
}: CustomerSearchFieldProps) {
  // State para búsqueda de clientes
  const [customerSearch, setCustomerSearch] = React.useState('')
  const debouncedCustomerSearch = useDebounce(customerSearch, 300)

  // State para cliente seleccionado
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)

  // Ref para trackear si ya notificamos al padre sobre el cliente preseleccionado
  // Evita loop infinito cuando onCustomerSelect no es estable
  const hasNotifiedPreselectedRef = React.useRef(false)

  // Fetch cliente pre-seleccionado (si viene el ID) - usando hook centralizado
  const { data: preselectedCustomer, isLoading: loadingPreselected } =
    useCustomer(preselectedCustomerId)

  // Fetch clientes (server-side search) - solo si NO hay cliente pre-seleccionado
  const { data: customersResponse, isLoading: loadingCustomers } = useCustomers({
    search: debouncedCustomerSearch,
    limit: 20,
    withPendingBalance,
  })

  // Extraer customers del response (puede ser undefined si query no está enabled)
  const customersData = customersResponse?.customers

  // Cuando llega el cliente pre-seleccionado por primera vez
  // Usamos ref para evitar múltiples notificaciones aunque onCustomerSelect cambie
  React.useEffect(() => {
    if (preselectedCustomerId && preselectedCustomer && !hasNotifiedPreselectedRef.current) {
      hasNotifiedPreselectedRef.current = true
      setSelectedCustomer(preselectedCustomer)
      onCustomerSelect?.(preselectedCustomer)
    }
  }, [preselectedCustomerId, preselectedCustomer, onCustomerSelect])

  // Callback cuando se selecciona un cliente del Combobox
  const handleCustomerChange = (customerId: string) => {
    const customer = customersData?.find((c: Customer) => c.id === customerId)
    if (customer) {
      setSelectedCustomer(customer)
      onCustomerSelect?.(customer)
    } else {
      setSelectedCustomer(null)
      onCustomerSelect?.(null)
    }
  }

  return (
    <>
      {/* 1. Cliente: Mostrar CustomerNameSummary si está pre-seleccionado, sino Combobox */}
      {preselectedCustomerId ? (
        // Cliente pre-seleccionado (no editable)
        <div className="space-y-2">
          <FormLabel>Cliente</FormLabel>
          {loadingPreselected ? (
            <div className="text-sm text-muted-foreground">Cargando cliente...</div>
          ) : selectedCustomer ? (
            <div className="rounded-lg border bg-muted/50 p-3">
              <CustomerNameSummary
                name={selectedCustomer.name}
                phone={selectedCustomer.phone!}
                email={selectedCustomer.email || undefined}
              />
            </div>
          ) : (
            <div className="text-sm text-destructive">Error al cargar el cliente</div>
          )}
        </div>
      ) : (
        // Combobox normal (búsqueda de clientes)
        <FormField
          control={control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente *</FormLabel>
              <FormControl>
                <Combobox<Customer>
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    handleCustomerChange(value)
                  }}
                  options={customersData || []}
                  getOptionValue={(c) => c.id}
                  getOptionLabel={(c) => c.name}
                  placeholder="Buscar cliente..."
                  searchPlaceholder="Escribe nombre, email o teléfono..."
                  emptyMessage={
                    debouncedCustomerSearch.length < 2
                      ? 'Escribe al menos 2 caracteres para buscar'
                      : withPendingBalance
                        ? 'No se encontraron clientes con saldo pendiente'
                        : 'No se encontraron clientes'
                  }
                  loading={loadingCustomers}
                  loadingText="Buscando clientes..."
                  contentWidth="400px"
                  onSearchChange={setCustomerSearch}
                  disableFiltering={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}
