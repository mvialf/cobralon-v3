'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { NewCustomerDialog } from '@/components/dialogs/customer/new-customer-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { columns, type Customer } from './columns'
import { type CustomerFormData } from '@/lib/validations/customer-validations'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Cargar clientes desde la API
  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/customers')
      if (!response.ok) throw new Error('Error al cargar clientes')

      const data = await response.json()
      setCustomers(data.customers)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomerCreated = async (data: CustomerFormData) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear cliente')
      }

      const newCustomer = await response.json()
      setCustomers((prev) => [newCustomer, ...prev])
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }

  return (
    <AppLayout
      pageTitle="Clientes"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Clientes' }]}
      action={<NewCustomerDialog onCustomerCreated={handleCustomerCreated} />}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando clientes...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={customers}
            searchKey="name"
            searchPlaceholder="Buscar cliente..."
          />
        )}
      </div>
    </AppLayout>
  )
}
