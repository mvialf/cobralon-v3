import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Project } from '@/app/projects/columns'

/**
 * Hooks de React Query para Projects
 *
 * Convenciones:
 * - Query keys: ['projects'] para list, ['projects', id] para single
 * - Mutations invalidan queries relacionadas automáticamente
 * - Delete usa optimistic updates para UX más rápida
 */

// ============================================================================
// TYPES
// ============================================================================

/** Proyecto completo con todos los campos (GET /api/projects/:id) */
export interface ProjectDetail extends Project {
  phone: string
  street: string
  apartment: string | null
  comuna: string
  region: string
  subtotal: number
  taxRate: number
  currency: string
  windowsCount: number
  squareMeters: number
  description: string | null
}

/** Params para GET /api/projects */
export interface ProjectsQueryParams {
  page?: number
  limit?: number
  search?: string
  customerId?: string
  projectState?: 'Activo' | 'Finalizado' | 'all'
}

/** Respuesta de GET /api/projects */
export interface ProjectsResponse {
  projects: Project[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/** Datos para POST /api/projects */
export interface CreateProjectData {
  customerId: string
  projectNumber: string
  projectName?: string
  phone: string
  street: string
  apartment?: string
  comuna: string
  region: string
  projectStatusId?: string
  date: string | Date
  subtotal: number
  taxRate: number
  total: number
  totalAmount: number
  currency: string
  windowsCount: number
  squareMeters: number
  description?: string
}

/** Datos para PUT /api/projects/[id] */
export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string
}

// ============================================================================
// QUERY: GET LIST WITH METADATA
// ============================================================================

/** Respuesta de GET /api/projects-with-metadata */
export interface ProjectsWithMetadataResponse {
  projects: Project[]
  metadata: {
    projectStatuses: Array<{
      id: string
      name: string
      color: {
        id: string
        bgClass: string
      }
    }>
  }
}

/**
 * Hook para obtener proyectos + metadata (statuses) en una sola llamada
 * Optimizado para reducir latencia de red
 *
 * @example
 * const { data, isLoading } = useProjectsWithMetadata({ projectState: 'Activo' })
 */
export function useProjectsWithMetadata(params: ProjectsQueryParams = {}) {
  return useQuery({
    queryKey: ['projects-with-metadata', params],
    queryFn: async (): Promise<ProjectsWithMetadataResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.search) searchParams.set('search', params.search)
      if (params.customerId) searchParams.set('customerId', params.customerId)
      if (params.projectState) searchParams.set('projectState', params.projectState)

      const response = await fetch(`/api/projects-with-metadata?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar proyectos')
      }

      return response.json()
    },
  })
}

// ============================================================================
// QUERY: GET LIST
// ============================================================================

/**
 * Hook para obtener lista de proyectos con paginación y filtros
 *
 * @example
 * const { data, isLoading, error } = useProjects({
 *   page: 1,
 *   limit: 10,
 *   search: 'cliente',
 *   projectState: 'Activo'
 * })
 */
export function useProjects(params: ProjectsQueryParams = {}) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async (): Promise<ProjectsResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.search) searchParams.set('search', params.search)
      if (params.customerId) searchParams.set('customerId', params.customerId)
      if (params.projectState) searchParams.set('projectState', params.projectState)

      const response = await fetch(`/api/projects?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar proyectos')
      }

      return response.json()
    },
  })
}

// ============================================================================
// QUERY: GET SINGLE
// ============================================================================

/**
 * Hook para obtener un proyecto específico por ID
 *
 * @example
 * const { data, isLoading, error } = useProject('abc-123-xyz')
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async (): Promise<ProjectDetail> => {
      if (!id) throw new Error('ID de proyecto requerido')

      const response = await fetch(`/api/projects/${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar proyecto')
      }

      return response.json()
    },
    enabled: !!id, // Solo ejecutar query si hay ID
  })
}

// ============================================================================
// MUTATION: CREATE
// ============================================================================

/**
 * Hook para crear un nuevo proyecto
 *
 * @example
 * const createMutation = useCreateProject()
 * createMutation.mutate(projectData, {
 *   onSuccess: () => console.log('Proyecto creado')
 * })
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProjectData): Promise<Project> => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear proyecto')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidar todas las queries de projects para refetch
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Proyecto creado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// MUTATION: UPDATE
// ============================================================================

/**
 * Hook para actualizar un proyecto existente
 *
 * @example
 * const updateMutation = useUpdateProject()
 * updateMutation.mutate({ id: 'abc-123', projectName: 'Nuevo nombre' })
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateProjectData): Promise<Project> => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar proyecto')
      }

      return response.json()
    },
    onSuccess: (updatedProject) => {
      // Invalidar lista de projects
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      // Invalidar el proyecto específico
      queryClient.invalidateQueries({ queryKey: ['projects', updatedProject.id] })
      toast.success('Proyecto actualizado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// MUTATION: DELETE (con Optimistic Update)
// ============================================================================

/**
 * Hook para eliminar un proyecto
 * Usa optimistic updates para UX más rápida
 *
 * @example
 * const deleteMutation = useDeleteProject()
 * deleteMutation.mutate('abc-123-xyz')
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar proyecto')
      }
    },
    // ✅ Optimistic update: remover del UI inmediatamente
    onMutate: async (id) => {
      // Cancel in-flight queries para evitar override
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      // Snapshot del estado anterior (para rollback si falla)
      const previousData = queryClient.getQueryData(['projects'])

      // Optimistic update: remover proyecto de todas las queries
      queryClient.setQueriesData<ProjectsResponse>({ queryKey: ['projects'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          projects: old.projects.filter((p) => p.id !== id),
          pagination: {
            ...old.pagination,
            total: old.pagination.total - 1,
          },
        }
      })

      return { previousData }
    },
    // ✅ Rollback en caso de error
    onError: (error: Error, id, context) => {
      // Restaurar estado anterior
      if (context?.previousData) {
        queryClient.setQueryData(['projects'], context.previousData)
      }
      toast.error(error.message)
    },
    // ✅ Refetch para asegurar consistencia
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Proyecto eliminado exitosamente')
    },
  })
}

// ============================================================================
// MUTATION: UPDATE STATUS (especializado para cambio de estado)
// ============================================================================

/**
 * Hook especializado para actualizar solo el estado de un proyecto
 * Usado por EditableBadge en DataTable
 *
 * @example
 * const updateStatusMutation = useUpdateProjectStatus()
 * updateStatusMutation.mutate({ projectId: 'abc', statusId: 'xyz' })
 */
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      statusId,
    }: {
      projectId: string
      statusId: string
    }): Promise<Project> => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectStatusId: statusId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar estado')
      }

      return response.json()
    },
    onSuccess: (updatedProject) => {
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', updatedProject.id] })
      toast.success('Estado actualizado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
