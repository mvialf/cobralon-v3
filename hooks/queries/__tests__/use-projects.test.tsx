import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Hooks a testear
import {
  useProjects,
  useProjectsWithMetadata,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useUpdateProjectStatus,
  type ProjectsResponse,
  type CreateProjectData,
} from '../use-projects'

// Types necesarios
import type { Project } from '@/app/projects/columns'

// ============================================================================
// HELPERS Y SETUP
// ============================================================================

/**
 * Helper para wrappear hooks con QueryClientProvider
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // No retry en tests
      mutations: { retry: false },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestQueryClientWrapper'

  return Wrapper
}

/**
 * Reset mocks antes de cada test
 */
beforeEach(() => {
  vi.clearAllMocks()
  // Mock de fetch global (será sobrescrito en cada test)
  global.fetch = vi.fn()
})

// ============================================================================
// TEST GROUP 1: useProjects() (Query con paginación)
// ============================================================================

describe('useProjects', () => {
  it('debe cargar lista de proyectos exitosamente', async () => {
    const mockResponse: ProjectsResponse = {
      projects: [
        {
          id: 'proj-1',
          projectNumber: 'P 0001-2025',
          projectName: 'Proyecto Test',
          totalAmount: 1000000,
          currency: 'CLP',
          balance: 500000,
          createdAt: new Date('2025-01-15'),
          customer: { id: 'cust-1', name: 'Cliente A' },
          projectStatus: {
            id: 'status-1',
            name: 'Activo',
            color: { id: 'color-1', bgClass: 'bg-green-500' },
          },
          projectState: 'Activo',
          date: new Date('2025-01-01'),
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useProjects({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.data?.projects).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects?page=1&limit=10')
    )
  })

  it('debe manejar filtros de query params', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        projects: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    })

    renderHook(
      () =>
        useProjects({
          page: 2,
          limit: 20,
          search: 'P 00',
          customerId: 'cust-123',
          projectState: 'Finalizado',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('limit=20')
    expect(calledUrl).toContain('search=P')
    expect(calledUrl).toContain('00')
    expect(calledUrl).toContain('customerId=cust-123')
    expect(calledUrl).toContain('projectState=Finalizado')
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al cargar proyectos' }),
    })

    const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
    expect(result.current.error?.message).toContain('Error al cargar proyectos')
  })
})

// ============================================================================
// TEST GROUP 2: useProjectsWithMetadata() (Query con metadata)
// ============================================================================

describe('useProjectsWithMetadata', () => {
  it('debe cargar proyectos + metadata exitosamente', async () => {
    const mockResponse = {
      projects: [
        {
          id: 'proj-1',
          projectNumber: 'P 0001-2025',
          projectName: null,
          totalAmount: 1000000,
          currency: 'CLP',
          balance: 600000,
          createdAt: new Date('2025-01-15'),
          customer: { id: 'cust-1', name: 'Cliente A' },
          projectStatus: {
            id: 'status-1',
            name: 'Activo',
            color: { id: 'color-1', bgClass: 'bg-green-500' },
          },
          projectState: 'Activo',
          date: new Date('2025-01-01'),
        },
      ],
      metadata: {
        projectStatuses: [
          { id: 'status-1', name: 'Activo', color: { id: 'color-1', bgClass: 'bg-green-500' } },
          { id: 'status-2', name: 'Finalizado', color: { id: 'color-2', bgClass: 'bg-blue-500' } },
        ],
      },
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useProjectsWithMetadata(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.data?.projects).toHaveLength(1)
    expect(result.current.data?.metadata.projectStatuses).toHaveLength(2)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects-with-metadata')
    )
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al cargar metadata' }),
    })

    const { result } = renderHook(() => useProjectsWithMetadata(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Error al cargar metadata')
  })
})

// ============================================================================
// TEST GROUP 3: useProject(id) (Query single con enabled)
// ============================================================================

describe('useProject', () => {
  it('debe cargar proyecto por ID exitosamente', async () => {
    const mockProject = {
      id: 'proj-1',
      projectNumber: 'P 0001-2025',
      projectName: 'Proyecto Test',
      totalAmount: 1000000,
      currency: 'CLP',
      balance: 500000,
      phone: '+56912345678',
      street: 'Calle Falsa 123',
      apartment: 'Depto 4B',
      comuna: 'Santiago',
      region: 'Metropolitana',
      subtotal: 840000,
      taxRate: 19,
      windowsCount: 5,
      squareMeters: 120,
      description: 'Descripción del proyecto',
      createdAt: new Date('2025-01-15'),
      customer: { id: 'cust-1', name: 'Cliente A' },
      projectStatus: {
        id: 'status-1',
        name: 'Activo',
        color: { id: 'color-1', bgClass: 'bg-green-500' },
      },
      projectState: 'Activo',
      date: new Date('2025-01-01'),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockProject,
    })

    const { result } = renderHook(() => useProject('proj-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockProject)
    expect(global.fetch).toHaveBeenCalledWith('/api/projects/proj-1')
  })

  it('NO debe ejecutar query si id es undefined', () => {
    global.fetch = vi.fn()

    const { result } = renderHook(() => useProject(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('debe manejar error 404 proyecto no encontrado', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Proyecto no encontrado' }),
    })

    const { result } = renderHook(() => useProject('proj-999'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Proyecto no encontrado')
  })
})

// ============================================================================
// TEST GROUP 4: useCreateProject() (Mutation)
// ============================================================================

describe('useCreateProject', () => {
  it('debe crear proyecto exitosamente', async () => {
    const mockCreatedProject: Project = {
      id: 'proj-new',
      projectNumber: 'P 0099-2025',
      projectName: 'Proyecto Nuevo',
      totalAmount: 2000000,
      currency: 'CLP',
      balance: 2000000,
      createdAt: new Date('2025-01-20'),
      customer: { id: 'cust-1', name: 'Cliente A' },
      projectStatus: {
        id: 'status-1',
        name: 'Activo',
        color: { id: 'color-1', bgClass: 'bg-green-500' },
      },
      projectState: 'Activo',
      date: new Date('2025-01-20'),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreatedProject,
    })

    const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() })

    const projectData: CreateProjectData = {
      customerId: 'cust-1',
      projectNumber: 'P 0099-2025',
      projectName: 'Proyecto Nuevo',
      phone: '+56912345678',
      street: 'Calle Nueva 456',
      apartment: undefined,
      comuna: 'Santiago',
      region: 'Metropolitana',
      date: new Date('2025-01-20'),
      subtotal: 1680000,
      taxRate: 19,
      total: 2000000,
      totalAmount: 2000000,
      currency: 'CLP',
      windowsCount: 10,
      squareMeters: 200,
      description: 'Proyecto de prueba',
    }

    const created = await result.current.mutateAsync(projectData)

    expect(created).toEqual(mockCreatedProject)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('debe manejar error de validación', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Número de proyecto duplicado' }),
    })

    const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() })

    const invalidData: CreateProjectData = {
      customerId: 'cust-1',
      projectNumber: 'P 0001-2025', // Duplicado
      phone: '+56912345678',
      street: 'Calle Test',
      comuna: 'Santiago',
      region: 'Metropolitana',
      date: new Date(),
      subtotal: 1000000,
      taxRate: 19,
      total: 1190000,
      totalAmount: 1190000,
      currency: 'CLP',
      windowsCount: 5,
      squareMeters: 100,
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(
      'Número de proyecto duplicado'
    )
  })
})

// ============================================================================
// TEST GROUP 5: useUpdateProject() (Mutation)
// ============================================================================

describe('useUpdateProject', () => {
  it('debe actualizar proyecto exitosamente', async () => {
    const mockUpdatedProject: Project = {
      id: 'proj-1',
      projectNumber: 'P 0001-2025',
      projectName: 'Proyecto Actualizado', // Cambiado
      totalAmount: 1500000, // Cambiado
      currency: 'CLP',
      balance: 700000,
      createdAt: new Date('2025-01-15'),
      customer: { id: 'cust-1', name: 'Cliente A' },
      projectStatus: {
        id: 'status-1',
        name: 'Activo',
        color: { id: 'color-1', bgClass: 'bg-green-500' },
      },
      projectState: 'Activo',
      date: new Date('2025-01-01'),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdatedProject,
    })

    const { result } = renderHook(() => useUpdateProject(), { wrapper: createWrapper() })

    const updateData = {
      id: 'proj-1',
      projectName: 'Proyecto Actualizado',
      totalAmount: 1500000,
    }

    const updated = await result.current.mutateAsync(updateData)

    expect(updated).toEqual(mockUpdatedProject)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects/proj-1',
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al actualizar proyecto' }),
    })

    const { result } = renderHook(() => useUpdateProject(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync({ id: 'proj-1', projectName: 'Test' })
    ).rejects.toThrow()
  })
})

// ============================================================================
// TEST GROUP 6: useDeleteProject() (CRÍTICO - Optimistic Updates)
// ============================================================================

describe('useDeleteProject', () => {
  it('debe eliminar proyecto exitosamente', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
    })

    const { result } = renderHook(() => useDeleteProject(), { wrapper: createWrapper() })

    await result.current.mutateAsync('proj-1')

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects/proj-1',
      expect.objectContaining({
        method: 'DELETE',
      })
    )
  })

  it('debe hacer optimistic update (remover de cache inmediatamente)', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    // Pre-poblar cache con proyectos
    const initialData: ProjectsResponse = {
      projects: [
        {
          id: 'proj-1',
          projectNumber: 'P 0001-2025',
          projectName: null,
          totalAmount: 1000000,
          currency: 'CLP',
          balance: 500000,
          createdAt: new Date(),
          customer: { id: 'cust-1', name: 'Cliente A' },
          projectStatus: {
            id: 'status-1',
            name: 'Activo',
            color: { id: 'color-1', bgClass: 'bg-green-500' },
          },
          projectState: 'Activo',
          date: new Date(),
        },
        {
          id: 'proj-2',
          projectNumber: 'P 0002-2025',
          projectName: 'Proyecto 2',
          totalAmount: 500000,
          currency: 'CLP',
          balance: 200000,
          createdAt: new Date(),
          customer: { id: 'cust-1', name: 'Cliente A' },
          projectStatus: {
            id: 'status-1',
            name: 'Activo',
            color: { id: 'color-1', bgClass: 'bg-green-500' },
          },
          projectState: 'Activo',
          date: new Date(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    }

    queryClient.setQueryData(['projects'], initialData)

    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise(
          (resolve) => setTimeout(() => resolve({ ok: true }), 100) // Delay para simular latencia
        )
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeleteProject(), { wrapper })

    // Trigger delete
    result.current.mutate('proj-1')

    // Inmediatamente después (optimistic update), debe estar removido
    await waitFor(() => {
      const cachedData = queryClient.getQueryData<ProjectsResponse>(['projects'])
      expect(cachedData?.projects).toHaveLength(1) // Solo proj-2
      expect(cachedData?.projects[0].id).toBe('proj-2')
      expect(cachedData?.pagination.total).toBe(1)
    })

    // Esperar a que complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('debe hacer rollback si delete falla', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    const initialData: ProjectsResponse = {
      projects: [
        {
          id: 'proj-1',
          projectNumber: 'P 0001-2025',
          projectName: null,
          totalAmount: 1000000,
          currency: 'CLP',
          balance: 500000,
          createdAt: new Date(),
          customer: { id: 'cust-1', name: 'Cliente A' },
          projectStatus: {
            id: 'status-1',
            name: 'Activo',
            color: { id: 'color-1', bgClass: 'bg-green-500' },
          },
          projectState: 'Activo',
          date: new Date(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    }

    queryClient.setQueryData(['projects'], initialData)

    // Mock fetch que falla
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'No se puede eliminar este proyecto' }),
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeleteProject(), { wrapper })

    await expect(result.current.mutateAsync('proj-1')).rejects.toThrow()

    // Después del rollback, el proyecto debe seguir en cache
    const cachedData = queryClient.getQueryData<ProjectsResponse>(['projects'])
    expect(cachedData?.projects).toHaveLength(1) // Rollback exitoso
    expect(cachedData?.projects[0].id).toBe('proj-1')
  })
})

// ============================================================================
// TEST GROUP 7: useUpdateProjectStatus() (Mutation especial)
// ============================================================================

describe('useUpdateProjectStatus', () => {
  it('debe actualizar status de proyecto exitosamente', async () => {
    const mockUpdatedProject: Project = {
      id: 'proj-1',
      projectNumber: 'P 0001-2025',
      projectName: null,
      totalAmount: 1000000,
      currency: 'CLP',
      balance: 500000,
      createdAt: new Date(),
      customer: { id: 'cust-1', name: 'Cliente A' },
      projectStatus: {
        id: 'status-2',
        name: 'Finalizado',
        color: { id: 'color-2', bgClass: 'bg-blue-500' },
      },
      projectState: 'Finalizado',
      date: new Date(),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdatedProject,
    })

    const { result } = renderHook(() => useUpdateProjectStatus(), { wrapper: createWrapper() })

    const updated = await result.current.mutateAsync({
      projectId: 'proj-1',
      statusId: 'status-2',
    })

    expect(updated).toEqual(mockUpdatedProject)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects/proj-1',
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Status no encontrado' }),
    })

    const { result } = renderHook(() => useUpdateProjectStatus(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync({ projectId: 'proj-1', statusId: 'status-999' })
    ).rejects.toThrow()
  })
})
