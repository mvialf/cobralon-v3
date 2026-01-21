'use client'

import { useState, useEffect, useMemo } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable } from '@/components/data-table'
import { createColumns, type Installment } from './columns'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useConfiguration } from '@/hooks/use-configuration'

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<Installment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { configuration } = useConfiguration()

  // Filtro de estado con "pending" por defecto
  const [statusFilter, setStatusFilter] = useState<string[]>(['pending'])

  const fetchInstallments = async () => {
    try {
      setIsLoading(true)

      // Fetch con límite alto para paginación client-side
      const response = await fetch('/api/installments?limit=1000')
      if (!response.ok) throw new Error('Error al cargar cuotas')

      const data = await response.json()
      setInstallments(data.installments)
    } catch (error) {
      console.error('Error fetching installments:', error)
      toast.error('Error al cargar cuotas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInstallments()
  }, [])

  const columns = useMemo(
    () =>
      createColumns({
        onInstallmentUpdated: fetchInstallments,
        locale: configuration.locale,
      }),
    [configuration.locale]
  )

  // Opciones para el filtro de estado
  const statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Pagado', value: 'paid' },
  ]

  // Filtrar cuotas según el estado seleccionado
  const filteredInstallments = useMemo(() => {
    if (statusFilter.length === 0 || statusFilter.length === 2) {
      // Sin filtro o ambos seleccionados = mostrar todos
      return installments
    }
    return installments.filter((i) => statusFilter.includes(i.status))
  }, [installments, statusFilter])

  return (
    <AppLayout
      pageTitle="Cuotas Comercio"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Pagos', href: '/payments' },
        { label: 'Cuotas Comercio' },
      ]}
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredInstallments}
          searchKey="associated"
          searchPlaceholder="Buscar por cliente..."
          filterableColumns={[
            {
              id: 'status',
              title: 'Estado',
              options: statusOptions,
              selectedValues: statusFilter,
              onFilterChange: setStatusFilter,
            },
          ]}
        />
      )}
    </AppLayout>
  )
}
