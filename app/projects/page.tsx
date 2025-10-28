'use client'

import { useState, useEffect, useCallback } from 'react'
import { Row } from '@tanstack/react-table'
import { AppLayout } from '@/components/layout/app-layout'
import { NewProjectDialog } from '@/components/dialogs/projects/new-project-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns, type Project } from './columns'
import { toast } from 'sonner'

interface ProjectStatus {
  id: string
  name: string
  color: {
    id: string
    bgClass: string
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [statuses, setStatuses] = useState<ProjectStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [projectState, setProjectState] = useState<'Activo' | 'Finalizado' | 'all'>('Activo') // Default: solo activos
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      // API combinada: proyectos + metadata en una sola llamada
      const response = await fetch(`/api/projects-with-metadata?projectState=${projectState}`)
      if (!response.ok) throw new Error('Error al cargar proyectos')

      const data = await response.json()
      setProjects(data.projects)
      setStatuses(data.metadata.projectStatuses)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectState])

  // Cargar proyectos y statuses desde la API combinada
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects]) // Refetch cuando cambia fetchProjects

  const handleProjectCreated = () => {
    // Recargar lista de proyectos después de crear uno nuevo
    fetchProjects()
  }

  const handleProjectDeleted = () => {
    // Recargar lista de proyectos después de eliminar uno
    fetchProjects()
  }

  const handleStatusChange = async (projectId: string, newStatusId: string) => {
    try {
      setUpdatingProjectId(projectId)

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectStatusId: newStatusId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar estado')
      }

      // Actualizar proyecto en el estado local para feedback inmediato
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId) {
            const newStatus = statuses.find((s) => s.id === newStatusId)
            return newStatus ? { ...p, projectStatus: newStatus } : p
          }
          return p
        })
      )

      toast.success('Estado actualizado correctamente')
    } catch (error) {
      console.error('Error al actualizar estado:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar estado')
    } finally {
      setUpdatingProjectId(null)
    }
  }

  const columns = createColumns({
    onProjectDeleted: handleProjectDeleted,
    statuses: statuses.map((s) => ({
      id: s.id,
      label: s.name,
      color: { bgClass: s.color.bgClass },
    })),
    updatingProjectId,
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
      pageDescription="Gestiona tus proyectos y su información"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Proyectos' }]}
      action={<NewProjectDialog onProjectCreated={handleProjectCreated} />}
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
                  // Si hay selección, usar el primer valor; si no, 'all'
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
