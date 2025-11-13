'use client'

import { Row } from '@tanstack/react-table'
import { AppLayout } from '@/components/layout/app-layout'
import { NewVisitDialog } from '@/components/dialogs/visits/new-visit-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns, type Visit } from './columns'
import { useVisits, useUpdateVisit } from '@/hooks/queries/use-visits'
import { useQuery } from '@tanstack/react-query'

export default function VisitsPage() {
  // React Query hook para cargar visitas
  const { data, isLoading } = useVisits({ limit: 100 })

  // Cargar visit statuses para el filtro
  const { data: visitStatuses } = useQuery({
    queryKey: ['visit-statuses'],
    queryFn: async () => {
      const response = await fetch('/api/visit-statuses')
      if (!response.ok) throw new Error('Error al cargar estados')
      return response.json()
    },
  })

  // Mutation hook para actualizar estado de visita
  const updateVisitMutation = useUpdateVisit()

  // Extraer data del hook (con fallbacks)
  const visits = data?.data || []
  const statuses = visitStatuses || []

  // Mutation hook maneja loading state, errores y auto-invalidación
  const handleStatusChange = async (visitId: string, newStatusId: string) => {
    await updateVisitMutation.mutateAsync({
      id: visitId,
      visitStatusId: newStatusId,
    })
  }

  const columns = createColumns({
    statuses: statuses.map((s: any) => ({
      id: s.id,
      label: s.name,
      color: { bgClass: s.color.bgClass, textClass: s.color.textClass },
    })),
    updatingVisitId: updateVisitMutation.isPending ? updateVisitMutation.variables?.id : null,
  })

  // Función de filtrado global: busca en nombre, teléfono, dirección y comuna
  const globalFilterFn = (row: Row<Visit>, _columnId: string, filterValue: string) => {
    const visit = row.original
    const searchValue = filterValue.toLowerCase()

    // Buscar en nombre
    if (visit.name.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en teléfono
    if (visit.phone && visit.phone.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en calle
    if (visit.street.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en comuna
    if (visit.comuna.toLowerCase().includes(searchValue)) {
      return true
    }

    return false
  }

  // Formatear opciones para el filtro de status
  const statusFilterOptions = (statuses || []).map((status: any) => ({
    label: status.name,
    value: status.id,
    bgClass: status.color.bgClass,
  }))

  return (
    <AppLayout
      pageTitle="Visitas"
      pageDescription="Gestiona las visitas agendadas a clientes potenciales"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Visitas' }]}
      action={<NewVisitDialog />}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando visitas...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={visits}
            searchKey="search"
            searchPlaceholder="Buscar por nombre, teléfono, dirección o comuna..."
            enableGlobalFilter={true}
            globalFilterFn={globalFilterFn}
            filterableColumns={[
              {
                id: 'visitStatus',
                title: 'Estado',
                options: statusFilterOptions,
              },
            ]}
            meta={{
              handleStatusChange,
            }}
          />
        )}
      </div>
    </AppLayout>
  )
}
