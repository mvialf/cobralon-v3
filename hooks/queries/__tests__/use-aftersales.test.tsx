import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Hooks a testear
import {
  useAftersales,
  useAftersale,
  useCreateAftersale,
  useUpdateAftersale,
  useDeleteAftersale,
  type AftersalesResponse,
} from '../use-aftersales'

// Types necesarios
import type { Aftersale, CreateAftersalePayload } from '@/lib/validations/aftersale-validations'

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
// TEST GROUP 1: useAftersales() (Query lista sin paginación)
// ============================================================================

describe('useAftersales', () => {
  it('debe cargar lista de casos de postventa exitosamente', async () => {
    const mockResponse: AftersalesResponse = {
      aftersales: [
        {
          id: 'after-1',
          projectId: 'proj-1',
          aftersaleStatusId: 'status-1',
          contactPhone: '+56912345678',
          description: 'Descripción del caso',
          reportedAt: new Date('2025-01-15'),
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-15'),
          project: {
            id: 'proj-1',
            projectNumber: 'P 0001-2025',
            projectName: 'Proyecto Test',
            customer: {
              name: 'Cliente A',
            },
          },
          aftersaleStatus: {
            id: 'status-1',
            name: 'Abierto',
            color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-900' },
          },
          tasks: [
            {
              id: 'task-1',
              text: 'Tarea 1',
              completed: false,
            },
          ],
        },
      ],
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useAftersales(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.data?.aftersales).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith('/api/aftersales')
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al cargar casos de postventa' }),
    })

    const { result } = renderHook(() => useAftersales(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
    expect(result.current.error?.message).toContain('Error al cargar casos de postventa')
  })
})

// ============================================================================
// TEST GROUP 2: useAftersale(id) (Query single con enabled)
// ============================================================================

describe('useAftersale', () => {
  it('debe cargar caso de postventa por ID exitosamente', async () => {
    const mockAftersale: Aftersale = {
      id: 'after-1',
      projectId: 'proj-1',
      aftersaleStatusId: 'status-1',
      contactPhone: '+56912345678',
      description: 'Caso de postventa test',
      reportedAt: new Date('2025-01-15'),
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-15'),
      project: {
        id: 'proj-1',
        projectNumber: 'P 0001-2025',
        projectName: 'Proyecto Test',
        customer: {
          name: 'Cliente A',
        },
      },
      aftersaleStatus: {
        id: 'status-1',
        name: 'Abierto',
        color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-900' },
      },
      tasks: [],
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockAftersale,
    })

    const { result } = renderHook(() => useAftersale('after-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockAftersale)
    expect(global.fetch).toHaveBeenCalledWith('/api/aftersales/after-1')
  })

  it('NO debe ejecutar query si id es undefined', () => {
    global.fetch = vi.fn()

    const { result } = renderHook(() => useAftersale(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('debe manejar error 404 caso no encontrado', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Caso de postventa no encontrado' }),
    })

    const { result } = renderHook(() => useAftersale('after-999'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Caso de postventa no encontrado')
  })
})

// ============================================================================
// TEST GROUP 3: useCreateAftersale() (CRÍTICO - Validaciones de Negocio)
// ============================================================================

describe('useCreateAftersale', () => {
  it('debe crear caso de postventa exitosamente', async () => {
    const mockCreatedAftersale: Aftersale = {
      id: 'after-new',
      projectId: 'proj-1',
      aftersaleStatusId: 'status-1',
      contactPhone: '+56912345678',
      description: 'Nuevo caso',
      reportedAt: new Date('2025-01-20'),
      createdAt: new Date('2025-01-20'),
      updatedAt: new Date('2025-01-20'),
      project: {
        id: 'proj-1',
        projectNumber: 'P 0001-2025',
        projectName: 'Proyecto Test',
        customer: {
          name: 'Cliente A',
        },
      },
      aftersaleStatus: {
        id: 'status-1',
        name: 'Abierto',
        color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-900' },
      },
      tasks: [],
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aftersale: mockCreatedAftersale }),
    })

    const { result } = renderHook(() => useCreateAftersale(), { wrapper: createWrapper() })

    const aftersaleData: CreateAftersalePayload = {
      projectId: 'proj-1',
      aftersaleStatusId: 'status-1',
      contactPhone: '+56912345678',
      description: 'Nuevo caso',
      reportedAt: '2025-01-20',
    }

    const created = await result.current.mutateAsync(aftersaleData)

    expect(created).toEqual(mockCreatedAftersale)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/aftersales',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('debe RECHAZAR si proyecto NO está finalizado', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'El proyecto debe estar finalizado para crear postventa' }),
    })

    const { result } = renderHook(() => useCreateAftersale(), { wrapper: createWrapper() })

    const invalidData: CreateAftersalePayload = {
      projectId: 'proj-active', // Proyecto activo (no finalizado)
      aftersaleStatusId: 'status-1',
      contactPhone: '+56912345678',
      reportedAt: '2025-01-20',
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(
      'El proyecto debe estar finalizado'
    )
  })

  it('debe RECHAZAR si status NO está activo', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Status de postventa no está activo' }),
    })

    const { result } = renderHook(() => useCreateAftersale(), { wrapper: createWrapper() })

    const invalidData: CreateAftersalePayload = {
      projectId: 'proj-1',
      aftersaleStatusId: 'status-inactive', // Status inactivo
      contactPhone: '+56912345678',
      reportedAt: '2025-01-20',
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(
      'Status de postventa no está activo'
    )
  })

  it('debe RECHAZAR si teléfono NO es formato chileno', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Teléfono debe ser formato chileno (+56...)' }),
    })

    const { result } = renderHook(() => useCreateAftersale(), { wrapper: createWrapper() })

    const invalidData: CreateAftersalePayload = {
      projectId: 'proj-1',
      aftersaleStatusId: 'status-1',
      contactPhone: '+1234567890', // Teléfono NO chileno
      reportedAt: '2025-01-20',
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(
      'Teléfono debe ser formato chileno'
    )
  })

  it('debe ACEPTAR caso con tasks', async () => {
    const mockCreatedAftersale: Aftersale = {
      id: 'after-with-tasks',
      projectId: 'proj-1',
      aftersaleStatusId: 'status-1',
      contactPhone: '+56912345678',
      description: 'Caso con tareas',
      reportedAt: new Date('2025-01-20'),
      createdAt: new Date('2025-01-20'),
      updatedAt: new Date('2025-01-20'),
      project: {
        id: 'proj-1',
        projectNumber: 'P 0001-2025',
        projectName: null,
        customer: {
          name: 'Cliente A',
        },
      },
      aftersaleStatus: {
        id: 'status-1',
        name: 'Abierto',
        color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-900' },
      },
      tasks: [
        {
          id: 'task-1',
          text: 'Tarea 1',
          completed: false,
        },
      ],
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aftersale: mockCreatedAftersale }),
    })

    const { result } = renderHook(() => useCreateAftersale(), { wrapper: createWrapper() })

    const dataWithTasks: CreateAftersalePayload = {
      projectId: 'proj-1',
      aftersaleStatusId: 'status-1',
      contactPhone: '+56912345678',
      description: 'Caso con tareas',
      reportedAt: '2025-01-20',
      tasks: [
        {
          id: 'task-1',
          text: 'Tarea 1',
          completed: false,
        },
      ],
    }

    const created = await result.current.mutateAsync(dataWithTasks)
    expect(created.tasks).toHaveLength(1)
  })
})

// ============================================================================
// TEST GROUP 4: useUpdateAftersale() (Mutation)
// ============================================================================

describe('useUpdateAftersale', () => {
  it('debe actualizar caso de postventa exitosamente', async () => {
    const mockUpdatedAftersale: Aftersale = {
      id: 'after-1',
      projectId: 'proj-1',
      aftersaleStatusId: 'status-2', // Cambiado
      contactPhone: '+56912345678',
      description: 'Descripción actualizada', // Cambiado
      reportedAt: new Date('2025-01-15'),
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-20'),
      project: {
        id: 'proj-1',
        projectNumber: 'P 0001-2025',
        projectName: null,
        customer: {
          name: 'Cliente A',
        },
      },
      aftersaleStatus: {
        id: 'status-2',
        name: 'Resuelto',
        color: { bgClass: 'bg-green-500', textClass: 'text-green-900' },
      },
      tasks: [],
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aftersale: mockUpdatedAftersale }),
    })

    const { result } = renderHook(() => useUpdateAftersale(), { wrapper: createWrapper() })

    const updateData = {
      id: 'after-1',
      aftersaleStatusId: 'status-2',
      description: 'Descripción actualizada',
    }

    const updated = await result.current.mutateAsync(updateData)

    expect(updated).toEqual(mockUpdatedAftersale)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/aftersales/after-1',
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('debe permitir actualizar tasks', async () => {
    const mockUpdatedAftersale: Aftersale = {
      id: 'after-1',
      projectId: 'proj-1',
      aftersaleStatusId: 'status-1',
      contactPhone: '+56912345678',
      description: '',
      reportedAt: new Date('2025-01-15'),
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-20'),
      project: {
        id: 'proj-1',
        projectNumber: 'P 0001-2025',
        projectName: null,
        customer: {
          name: 'Cliente A',
        },
      },
      aftersaleStatus: {
        id: 'status-1',
        name: 'Abierto',
        color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-900' },
      },
      tasks: [
        {
          id: 'task-1',
          text: 'Nueva tarea',
          completed: false,
        },
      ],
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aftersale: mockUpdatedAftersale }),
    })

    const { result } = renderHook(() => useUpdateAftersale(), { wrapper: createWrapper() })

    const updateData = {
      id: 'after-1',
      tasks: [
        {
          id: 'task-1',
          text: 'Nueva tarea',
          completed: false,
        },
      ],
    }

    const updated = await result.current.mutateAsync(updateData)
    expect(updated.tasks).toHaveLength(1)
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al actualizar caso' }),
    })

    const { result } = renderHook(() => useUpdateAftersale(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync({ id: 'after-1', description: 'Test' })
    ).rejects.toThrow()
  })
})

// ============================================================================
// TEST GROUP 5: useDeleteAftersale() (CRÍTICO - Optimistic Updates)
// ============================================================================

describe('useDeleteAftersale', () => {
  it('debe eliminar caso de postventa exitosamente', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
    })

    const { result } = renderHook(() => useDeleteAftersale(), { wrapper: createWrapper() })

    await result.current.mutateAsync('after-1')

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/aftersales/after-1',
      expect.objectContaining({
        method: 'DELETE',
      })
    )
  })

  it('debe hacer optimistic update (remover de cache inmediatamente)', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    // Pre-poblar cache con casos
    const initialData: AftersalesResponse = {
      aftersales: [
        {
          id: 'after-1',
          projectId: 'proj-1',
          aftersaleStatusId: 'status-1',
          contactPhone: '+56911111111',
          description: '',
          reportedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          project: {
            id: 'proj-1',
            projectNumber: 'P 0001-2025',
            projectName: null,
            customer: { name: 'Cliente A' },
          },
          aftersaleStatus: {
            id: 'status-1',
            name: 'Abierto',
            color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-900' },
          },
          tasks: [],
        },
        {
          id: 'after-2',
          projectId: 'proj-2',
          aftersaleStatusId: 'status-1',
          contactPhone: '+56922222222',
          description: '',
          reportedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          project: {
            id: 'proj-2',
            projectNumber: 'P 0002-2025',
            projectName: null,
            customer: { name: 'Cliente B' },
          },
          aftersaleStatus: {
            id: 'status-1',
            name: 'Abierto',
            color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-900' },
          },
          tasks: [],
        },
      ],
    }

    queryClient.setQueryData(['aftersales'], initialData)

    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise(
          (resolve) => setTimeout(() => resolve({ ok: true }), 100) // Delay para simular latencia
        )
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeleteAftersale(), { wrapper })

    // Trigger delete
    result.current.mutate('after-1')

    // Inmediatamente después (optimistic update), debe estar removido
    await waitFor(() => {
      const cachedData = queryClient.getQueryData<AftersalesResponse>(['aftersales'])
      expect(cachedData?.aftersales).toHaveLength(1) // Solo after-2
      expect(cachedData?.aftersales[0].id).toBe('after-2')
    })

    // Esperar a que complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('debe hacer rollback si delete falla', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    const initialData: AftersalesResponse = {
      aftersales: [
        {
          id: 'after-1',
          projectId: 'proj-1',
          aftersaleStatusId: 'status-1',
          contactPhone: '+56911111111',
          description: '',
          reportedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          project: {
            id: 'proj-1',
            projectNumber: 'P 0001-2025',
            projectName: null,
            customer: { name: 'Cliente A' },
          },
          aftersaleStatus: {
            id: 'status-1',
            name: 'Abierto',
            color: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-900' },
          },
          tasks: [],
        },
      ],
    }

    queryClient.setQueryData(['aftersales'], initialData)

    // Mock fetch que falla
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'No se puede eliminar este caso' }),
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeleteAftersale(), { wrapper })

    await expect(result.current.mutateAsync('after-1')).rejects.toThrow()

    // Después del rollback, el caso debe seguir en cache
    const cachedData = queryClient.getQueryData<AftersalesResponse>(['aftersales'])
    expect(cachedData?.aftersales).toHaveLength(1) // Rollback exitoso
    expect(cachedData?.aftersales[0].id).toBe('after-1')
  })
})
