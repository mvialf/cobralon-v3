'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { NewProjectDialog } from '@/components/dialogs/projects/new-project-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns, type Project } from './columns'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Cargar proyectos desde la API
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error('Error al cargar proyectos')

      const data = await response.json()
      setProjects(data.projects)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectCreated = () => {
    // Recargar lista de proyectos después de crear uno nuevo
    fetchProjects()
  }

  const handleProjectDeleted = () => {
    // Recargar lista de proyectos después de eliminar uno
    fetchProjects()
  }

  const columns = createColumns({ onProjectDeleted: handleProjectDeleted })

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
            searchKey="projectNumber"
            searchPlaceholder="Buscar proyecto..."
          />
        )}
      </div>
    </AppLayout>
  )
}
