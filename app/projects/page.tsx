'use client'

import { useState } from 'react'
import { Row } from '@tanstack/react-table'
import { AppLayout } from '@/components/layout/app-layout'
import { NewProjectDialog } from '@/components/dialogs/projects/new-project-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns, type Project } from './columns'
import { useProjectsWithMetadata, useUpdateProjectStatus } from '@/hooks/queries/use-projects'

export default function ProjectsPage() {
  const [projectState, setProjectState] = useState<'Activo' | 'Finalizado' | 'all'>('Activo')

  // ✅ React Query hook reemplaza todo el state management manual
  const { data, isLoading } = useProjectsWithMetadata({ projectState })

  // ✅ Mutation hook para actualizar estado de proyecto
  const updateStatusMutation = useUpdateProjectStatus()

  // Extraer data del hook (con fallbacks)
  const projects = data?.projects || []
  const statuses = data?.metadata.projectStatuses || []

  // ✅ Mutation hook maneja loading state, errores y auto-invalidación
  const handleStatusChange = async (projectId: string, newStatusId: string) => {
    await updateStatusMutation.mutateAsync({ projectId, statusId: newStatusId })
  }

  const columns = createColumns({
    // ✅ React Query auto-invalida queries, no necesitamos callbacks manuales
    statuses: statuses.map((s) => ({
      id: s.id,
      label: s.name,
      color: { bgClass: s.color.bgClass },
    })),
    // ✅ Mutation hook expone el projectId que está siendo actualizado
    updatingProjectId: updateStatusMutation.isPending
      ? updateStatusMutation.variables?.projectId
      : null,
  })

  // Función de filtrado global: busca en projectNumber, customer.name y projectName
  const globalFilterFn = (row: Row<Project>, _columnId: string, filterValue: string) => {
    const project = row.original as Project
    const searchValue = filterValue.toLowerCase()

    // Buscar en número de proyecto
    if (project.projectNumber.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en nombre del cliente
    if (project.customer.name.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en nombre del proyecto (si existe)
    if (project.projectName && project.projectName.toLowerCase().includes(searchValue)) {
      return true
    }

    return false
  }

  // Formatear opciones para el filtro de status
  const statusFilterOptions = [
    // Opción para "Sin estado"
    { label: 'Sin estado', value: 'null' },
    // Opciones de statuses disponibles con colores
    ...(statuses || []).map((status) => ({
      label: status.name,
      value: status.id,
      bgClass: status.color.bgClass,
    })),
  ]

  // Opciones para el filtro de Estado del Proyecto (Activo/Finalizado)
  const projectStateFilterOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'Activo' },
    { label: 'Finalizados', value: 'Finalizado' },
  ]

  return (
    <AppLayout
      pageTitle="Proyectos"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Proyectos' }]}
      action={<NewProjectDialog />}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando proyectos...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={projects}
            searchKey="search"
            searchPlaceholder="Buscar por número, cliente o nombre..."
            enableGlobalFilter={true}
            globalFilterFn={globalFilterFn}
            filterableColumns={[
              {
                id: 'projectStatus',
                title: 'Estado',
                options: statusFilterOptions,
              },
              {
                id: 'projectState',
                title: 'Estado Proyecto',
                options: projectStateFilterOptions,
                onFilterChange: (values) => {
                  const newState = values.length > 0 ? values[0] : 'all'
                  setProjectState(newState as 'Activo' | 'Finalizado' | 'all')
                },
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
