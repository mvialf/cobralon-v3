'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { DataTable, createNormalizedFilter } from '@/components/data-table'
import { AftersaleDialog } from '@/components/dialogs/aftersales/aftersale-dialog'
import { createColumns } from './columns'
import type { Aftersale } from '@/lib/validations/aftersale-validations'
import type { EditableBadgeOption } from '@/components/ui/editable-badge'
import { useAftersales, useUpdateAftersale } from '@/hooks/queries/use-aftersales'

/**
 * Client Component para la página de Aftersales.
 *
 * IMPORTANTE: Los datos iniciales son pre-cargados en el Server Component padre
 * usando HydrationBoundary, por lo que NO hay "Cargando..." al iniciar.
 *
 * Query keys que deben coincidir con prefetch:
 * - ['aftersales'] → useAftersales()
 * - ['aftersale-statuses'] → inline query
 */
export function AftersalesPageClient() {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // React Query: Fetch aftersales con cache automático
  // NOTA: Datos ya pre-hidratados desde Server Component
  const { data, isLoading } = useAftersales()

  // Cargar statuses para el filtro
  // NOTA: Datos ya pre-hidratados desde Server Component
  const { data: statusesData } = useQuery({
    queryKey: ['aftersale-statuses'],
    queryFn: async () => {
      const response = await fetch('/api/aftersale-status')
      if (!response.ok) throw new Error('Error al cargar estados')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - statuses cambian raramente
  })

  // Mutation hook para actualizar estado de aftersale
  const updateAftersaleMutation = useUpdateAftersale()

  // Extraer data del hook (con fallbacks)
  const aftersales = data?.aftersales || []
  const statusList = statusesData?.aftersaleStatuses || []

  // Transformar statuses a formato EditableBadgeOption
  const statuses: EditableBadgeOption[] = statusList.map(
    (status: {
      id: string
      name: string
      color: { bgClass: string; textClass: string }
      isActive: boolean
    }) => ({
      id: status.id,
      label: status.name,
      color: { bgClass: status.color.bgClass },
    })
  )

  const handleAftersaleUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['aftersales'] })
  }

  const handleStatusChange = async (aftersaleId: string, newStatusId: string) => {
    await updateAftersaleMutation.mutateAsync({
      id: aftersaleId,
      aftersaleStatusId: newStatusId,
    })
  }

  const columns = createColumns({
    onAftersaleUpdated: handleAftersaleUpdated,
    statuses,
    updatingAftersaleId: updateAftersaleMutation.isPending
      ? updateAftersaleMutation.variables?.id
      : null,
  })

  // Función de filtrado global normalizada: busca ignorando acentos/tildes
  // en projectNumber, customer.name, projectName y description
  const globalFilterFn = createNormalizedFilter<Aftersale>((aftersale) => [
    aftersale.project.projectNumber,
    aftersale.project.customer.name,
    aftersale.project.projectName,
    aftersale.description,
  ])

  return (
    <AppLayout
      pageTitle="Postventas"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Postventas' }]}
      action={
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Caso
        </Button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando casos de postventa...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={aftersales}
            searchKey="search"
            searchPlaceholder="Buscar por proyecto, cliente o descripción..."
            enableGlobalFilter={true}
            globalFilterFn={globalFilterFn}
            meta={{
              handleStatusChange,
            }}
          />
        )}
      </div>

      {/* Create Dialog */}
      <AftersaleDialog
        mode="create"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['aftersales'] })
          setIsCreateDialogOpen(false)
        }}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </AppLayout>
  )
}
