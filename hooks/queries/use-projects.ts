import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'
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
  uninstallTags: Array<{
    id: string
    uninstallTagId: string
    uninstallTag: {
      id: string
      name: string
      abbreviation: string
      color: {
        id: string
        bgClass: string
        textClass: string
      } | null
    }
  }>
}

/** Params para GET /api/projects */
export interface ProjectsQueryParams {
  page?: number
  limit?: number
  search?: string
  customerId?: string
  statusIds?: string[] // IDs de status o 'null' para sin estado
  projectState?: 'Activo' | 'Finalizado' | 'all'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** Facet item para filtros server-side */
export interface FacetItem {
  value: string
  count: number
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
  facets?: {
    projectStatus: FacetItem[]
    projectState: FacetItem[]
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
 * @param params - Filtros opcionales
 * @param params.page - Número de página (default: 1)
 * @param params.limit - Registros por página (default: 10, max: 100)
 * @param params.search - Búsqueda por número, cliente o nombre
 * @param params.customerId - Filtrar por cliente específico
 * @param params.projectState - Filtrar por estado (Activo/Finalizado/all)
 *
 * @returns Query con projects y paginación
 *
 * **OPTIMIZACIONES:**
 * - `placeholderData: keepPreviousData` → Smooth transitions entre páginas (mantiene datos anteriores mientras carga)
 * - Cache de 1 minuto → Balance entre frescura y performance
 * - Query keys por página → Cada página se cachea individualmente
 *
 * @example
 * ```tsx
 * const { data, isLoading, isPlaceholderData } = useProjects({
 *   page: 1,
 *   limit: 10,
 *   search: 'cliente',
 *   projectState: 'Activo'
 * })
 *
 * // Prefetch página siguiente para mejor UX
 * const queryClient = useQueryClient()
 * queryClient.prefetchQuery({
 *   queryKey: ['projects', { ...params, page: params.page + 1 }],
 *   queryFn: () => fetch('/api/projects?page=2&limit=10').then(r => r.json())
 * })
 * ```
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
      // statusIds se envía como string separado por comas
      if (params.statusIds && params.statusIds.length > 0) {
        searchParams.set('statusIds', params.statusIds.join(','))
      }
      if (params.projectState) searchParams.set('projectState', params.projectState)
      if (params.sortBy) searchParams.set('sortBy', params.sortBy)
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

      const response = await fetch(`/api/projects?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar proyectos')
      }

      return response.json()
    },
    placeholderData: keepPreviousData, // ← Mantener datos anteriores durante transición
    staleTime: 60 * 1000, // 1 minuto - datos cambian ocasionalmente
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
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
 *   onSuccess: () => toast.success('Proyecto creado')
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
        throw await createApiError(response, 'Error al crear proyecto')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-with-metadata'] })
      toast.success('Proyecto creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
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
        throw await createApiError(response, 'Error al actualizar proyecto')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]
          return key === 'projects' || key === 'projects-with-metadata'
        },
      })

      toast.success('Proyecto actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
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
        throw await createApiError(response, 'Error al eliminar proyecto')
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
    onError: (error, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['projects'], context.previousData)
      }
      handleMutationError(error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-with-metadata'] })
      toast.success('Proyecto eliminado exitosamente')
    },
  })
}

// ============================================================================
// MUTATION: UPDATE STATUS (especializado para cambio de estado)
// ============================================================================

// ============================================================================
// MUTATION: BULK DELETE (eliminar múltiples proyectos)
// ============================================================================

/**
 * Hook para eliminar múltiples proyectos en paralelo
 *
 * @example
 * const bulkDeleteMutation = useBulkDeleteProjects()
 * bulkDeleteMutation.mutate(['id1', 'id2', 'id3'])
 */
export function useBulkDeleteProjects() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<{ deleted: number; failed: number }> => {
      // Ejecutar deletes en paralelo
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error(`Error al eliminar proyecto ${id}`)
          }

          return id
        })
      )

      const deleted = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length

      return { deleted, failed }
    },
    onSuccess: ({ deleted, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-with-metadata'] })

      if (failed === 0) {
        toast.success(
          `${deleted} proyecto${deleted !== 1 ? 's' : ''} eliminado${deleted !== 1 ? 's' : ''} exitosamente`
        )
      } else {
        toast.warning(`${deleted} eliminado${deleted !== 1 ? 's' : ''}, ${failed} con error`)
      }
    },
    onError: (error) => {
      handleMutationError(error)
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
        throw await createApiError(response, 'Error al actualizar estado')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-with-metadata'] })
      toast.success('Estado actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}

/**
 * Hook especializado para actualizar solo la fecha de un proyecto
 * Usado por EditableDate en DataTable
 */
export function useUpdateProjectDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      date,
    }: {
      projectId: string
      date: Date | string
    }): Promise<Project> => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar fecha')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-with-metadata'] })
      toast.success('Fecha actualizada exitosamente')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}
