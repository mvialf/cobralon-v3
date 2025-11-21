'use client'

import * as React from 'react'
import { Control } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'

import type { ProjectWithBalance } from '@/lib/validations/payment-validations'
import { formatCurrency } from '@/lib/format'
import { useDebounce } from '@/hooks/use-debounce'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Combobox } from '@/components/ui/combobox'
import { Card, CardContent } from '@/components/ui/card'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'

interface ProjectSearchFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  preselectedProjectId?: string
  onProjectSelect?: (project: ProjectWithBalance | null) => void
  /**
   * Si es true, solo muestra proyectos con projectState.isFinal = true
   * Útil para casos de postventa
   * @deprecated Usar filterMode en su lugar
   */
  filterByFinalState?: boolean
  /**
   * Modo de filtrado de proyectos:
   * - 'with-balance': Proyectos con balance > 0 (para pagos)
   * - 'finished': Proyectos finalizados (isFinal = true, para postventas)
   * - 'active': Proyectos NO finalizados (isFinal = false, para calendario)
   * Default: 'with-balance' (mantiene compatibilidad)
   */
  filterMode?: 'with-balance' | 'finished' | 'active'
  /**
   * Si es true, muestra cards de balance pendiente y total del proyecto
   * Default: true (para mantener compatibilidad con formularios existentes)
   */
  showFinancialCards?: boolean
}

/**
 * Componente reutilizable para búsqueda y selección de proyecto
 * Incluye:
 * - Combobox de búsqueda server-side (si NO hay preselectedProjectId)
 * - ProjectNameSummary read-only (si hay preselectedProjectId)
 * - Cards de balance pendiente y total del proyecto
 *
 * Maneja internamente:
 * - Query de proyecto pre-seleccionado
 * - Query de búsqueda de proyectos (server-side search)
 * - Debounce de búsqueda
 * - Estado de proyecto seleccionado
 *
 * Usado en PaymentToProjectForm para simplificar la lógica de selección de proyecto.
 */
export function ProjectSearchField({
  control,
  preselectedProjectId,
  onProjectSelect,
  filterByFinalState = false,
  filterMode,
  showFinancialCards = true,
}: ProjectSearchFieldProps) {
  // Resolver modo de filtrado (deprecado vs nuevo)
  const resolvedFilterMode: 'with-balance' | 'finished' | 'active' = filterMode
    ? filterMode
    : filterByFinalState
      ? 'finished'
      : 'with-balance'

  // State para búsqueda de proyectos
  const [searchTerm, setSearchTerm] = React.useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  // State para proyecto seleccionado
  const [selectedProject, setSelectedProject] = React.useState<ProjectWithBalance | null>(null)

  // Fetch proyecto pre-seleccionado (si viene el ID)
  const { data: preselectedProject, isLoading: loadingPreselected } = useQuery({
    queryKey: ['project-with-balance', preselectedProjectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${preselectedProjectId}?withBalance=true`)
      if (!res.ok) throw new Error('Error al cargar el proyecto')
      return res.json() as Promise<ProjectWithBalance>
    },
    enabled: !!preselectedProjectId,
  })

  // Fetch proyectos (server-side search) - solo si NO hay proyecto pre-seleccionado
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects-search', debouncedSearch, resolvedFilterMode],
    queryFn: async () => {
      // Seleccionar endpoint según modo de filtrado
      let endpoint: string
      switch (resolvedFilterMode) {
        case 'finished':
          endpoint = `/api/projects/search-finished?q=${debouncedSearch}&limit=20`
          break
        case 'active':
          endpoint = `/api/projects/search-active?q=${debouncedSearch}&limit=20`
          break
        case 'with-balance':
        default:
          endpoint = `/api/payments/search-projects?q=${debouncedSearch}&limit=20`
          break
      }

      const res = await fetch(endpoint)
      if (!res.ok) throw new Error('Error al buscar proyectos')
      return res.json() as Promise<ProjectWithBalance[]>
    },
    enabled: !preselectedProjectId && debouncedSearch.length >= 2,
  })

  // Cuando cambia el proyecto seleccionado o llega el proyecto pre-seleccionado
  React.useEffect(() => {
    // Si hay proyecto pre-seleccionado y ya se cargó
    if (preselectedProjectId && preselectedProject) {
      setSelectedProject(preselectedProject)
      onProjectSelect?.(preselectedProject)
    }

    // Si no, buscar en los resultados de búsqueda según el projectId del form
    // Nota: esto se maneja con un watch en el componente padre
  }, [preselectedProjectId, preselectedProject, onProjectSelect])

  // Callback cuando se selecciona un proyecto del Combobox
  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      onProjectSelect?.(project)
    } else {
      setSelectedProject(null)
      onProjectSelect?.(null)
    }
  }

  return (
    <>
      {/* 1. Proyecto: Mostrar ProjectNameSummary si está pre-seleccionado, sino Combobox */}
      {preselectedProjectId ? (
        // Proyecto pre-seleccionado (no editable)
        <div className="space-y-2">
          <FormLabel>Proyecto</FormLabel>
          {loadingPreselected ? (
            <div className="text-sm text-muted-foreground">Cargando proyecto...</div>
          ) : selectedProject ? (
            <div className="rounded-lg border bg-muted/50 p-3">
              <ProjectNameSummary
                projectId={selectedProject.id}
                projectNumber={selectedProject.projectNumber}
                customerName={selectedProject.customer.name}
                projectName={selectedProject.projectName}
              />
            </div>
          ) : (
            <div className="text-sm text-destructive">Error al cargar el proyecto</div>
          )}
        </div>
      ) : (
        // Combobox normal (búsqueda de proyectos)
        <FormField
          control={control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proyecto *</FormLabel>
              <FormControl>
                <Combobox<ProjectWithBalance>
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    handleProjectChange(value)
                  }}
                  options={projects}
                  getOptionValue={(p) => p.id}
                  getOptionLabel={(p) => `${p.projectNumber} - ${p.customer.name}`}
                  renderOption={(project) => (
                    <div className="space-y-0.5">
                      <div className="text-sm text-muted-foreground">
                        Proyecto #{project.projectNumber}
                      </div>
                      <div className="font-medium">
                        {project.customer.name}
                        {project.projectName && ` - ${project.projectName}`}
                      </div>
                    </div>
                  )}
                  placeholder="Buscar proyecto..."
                  searchPlaceholder="Escribe número, nombre o cliente..."
                  emptyMessage={
                    debouncedSearch.length < 2
                      ? 'Escribe al menos 2 caracteres para buscar'
                      : resolvedFilterMode === 'finished'
                        ? 'No se encontraron proyectos finalizados'
                        : resolvedFilterMode === 'active'
                          ? 'No se encontraron proyectos activos'
                          : 'No se encontraron proyectos con balance pendiente'
                  }
                  loading={loadingProjects}
                  loadingText="Buscando proyectos..."
                  contentWidth="400px"
                  onSearchChange={setSearchTerm}
                  disableFiltering={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* 2. Cards: Balance Pendiente - Solo mostrar si showFinancialCards es true */}
      {selectedProject && showFinancialCards && (
        <div className="flex justify-center gap-4">
          <Card className="p-2">
            <CardContent className="flex flex-col ">
              <p className="text-sm text-center text-muted-foreground">Saldo pendiente</p>
              <p className="text-lg text-center font-semibold">
                {formatCurrency(selectedProject.balance, selectedProject.currency)}
              </p>
            </CardContent>
          </Card>
          <Card className="p-2">
            <CardContent className="flex flex-col">
              <p className="text-sm text-center text-muted-foreground">Total del proyecto</p>
              <p className="text-lg text-center font-semibold">
                {formatCurrency(selectedProject.totalAmount, selectedProject.currency)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
