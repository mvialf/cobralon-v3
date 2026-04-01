import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Hooks a testear
import {
  useCustomers,
  useCustomersList,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  type CustomersResponse,
  type Customer,
} from '../use-customers'

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
// TEST GROUP 1: useCustomers() (Query con paginación)
// ============================================================================

describe('useCustomers', () => {
  it('debe cargar lista de clientes exitosamente', async () => {
    const mockResponse: CustomersResponse = {
      customers: [
        {
          id: 'cust-1',
          name: 'Cliente A',
          email: 'clientea@example.com',
          phone: '+56912345678',
          creditBalance: 0,
          totalProjects: 0,
          activeProjects: 0,
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-15'),
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

    const { result } = renderHook(() => useCustomers({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.data?.customers).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/customers?page=1&limit=10')
    )
  })

  it('debe manejar filtros de query params', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customers: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    })

    renderHook(
      () =>
        useCustomers({
          page: 2,
          limit: 20,
          search: 'Cliente',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('limit=20')
    expect(calledUrl).toContain('search=Cliente')
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al cargar clientes' }),
    })

    const { result } = renderHook(() => useCustomers(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
    expect(result.current.error?.message).toContain('Error al cargar clientes')
  })
})

// ============================================================================
// TEST GROUP 2: useCustomersList() (Query simple para combobox)
// ============================================================================

describe('useCustomersList', () => {
  it('debe cargar lista simple de clientes', async () => {
    const mockResponse = {
      customers: [
        { id: 'cust-1', name: 'Cliente A', phone: '+56912345678' },
        { id: 'cust-2', name: 'Cliente B', phone: '+56987654321' },
      ],
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useCustomersList(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.data?.customers).toHaveLength(2)
    expect(global.fetch).toHaveBeenCalledWith('/api/customers/list')
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al cargar lista' }),
    })

    const { result } = renderHook(() => useCustomersList(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Error al cargar lista')
  })
})

// ============================================================================
// TEST GROUP 3: useCustomer(id) (Query single con enabled)
// ============================================================================

describe('useCustomer', () => {
  it('debe cargar cliente por ID exitosamente', async () => {
    const mockCustomer: Customer = {
      id: 'cust-1',
      name: 'Cliente A',
      email: 'clientea@example.com',
      phone: '+56912345678',
      creditBalance: 0,
      totalProjects: 0,
      activeProjects: 0,
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-15'),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    const { result } = renderHook(() => useCustomer('cust-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCustomer)
    expect(global.fetch).toHaveBeenCalledWith('/api/customers/cust-1')
  })

  it('NO debe ejecutar query si id es undefined', () => {
    global.fetch = vi.fn()

    const { result } = renderHook(() => useCustomer(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('debe manejar error 404 cliente no encontrado', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Cliente no encontrado' }),
    })

    const { result } = renderHook(() => useCustomer('cust-999'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Cliente no encontrado')
  })
})

// ============================================================================
// TEST GROUP 4: useCreateCustomer() (Mutation con validación 409)
// ============================================================================

describe('useCreateCustomer', () => {
  it('debe crear cliente exitosamente', async () => {
    const mockCreatedCustomer: Customer = {
      id: 'cust-new',
      name: 'Cliente Nuevo',
      email: 'nuevo@example.com',
      phone: '+56900000000',
      creditBalance: 0,
      totalProjects: 0,
      activeProjects: 0,
      createdAt: new Date('2025-01-20'),
      updatedAt: new Date('2025-01-20'),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreatedCustomer,
    })

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() })

    const customerData = {
      name: 'Cliente Nuevo',
      phone: '+56900000000',
      email: 'nuevo@example.com',
    }

    const created = await result.current.mutateAsync(customerData)

    expect(created).toEqual(mockCreatedCustomer)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/customers',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('debe RECHAZAR si email está duplicado (409 Conflict)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Email ya registrado' }),
    })

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() })

    const duplicateData = {
      name: 'Cliente Duplicado',
      phone: '+56911111111',
      email: 'duplicado@example.com', // Email existente
    }

    await expect(result.current.mutateAsync(duplicateData)).rejects.toThrow('Email ya registrado')
  })

  it('debe ACEPTAR cliente sin email', async () => {
    const mockCreatedCustomer: Customer = {
      id: 'cust-no-email',
      name: 'Cliente Sin Email',
      email: null,
      phone: '+56922222222',
      creditBalance: 0,
      totalProjects: 0,
      activeProjects: 0,
      createdAt: new Date('2025-01-20'),
      updatedAt: new Date('2025-01-20'),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreatedCustomer,
    })

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() })

    const dataWithoutEmail = {
      name: 'Cliente Sin Email',
      phone: '+56922222222',
    }

    const created = await result.current.mutateAsync(dataWithoutEmail)
    expect(created).toEqual(mockCreatedCustomer)
  })

  it('debe manejar error de validación', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Nombre requerido' }),
    })

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() })

    const invalidData = {
      name: '', // Vacío (inválido)
      phone: '+56933333333',
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow('Nombre requerido')
  })
})

// ============================================================================
// TEST GROUP 5: useUpdateCustomer() (Mutation)
// ============================================================================

describe('useUpdateCustomer', () => {
  it('debe actualizar cliente exitosamente', async () => {
    const mockUpdatedCustomer: Customer = {
      id: 'cust-1',
      name: 'Cliente Actualizado', // Cambiado
      email: 'actualizado@example.com', // Cambiado
      phone: '+56912345678',
      creditBalance: 0,
      totalProjects: 0,
      activeProjects: 0,
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-20'),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdatedCustomer,
    })

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() })

    const updateData = {
      id: 'cust-1',
      name: 'Cliente Actualizado',
      email: 'actualizado@example.com',
    }

    const updated = await result.current.mutateAsync(updateData)

    expect(updated).toEqual(mockUpdatedCustomer)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/customers/cust-1',
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('debe RECHAZAR si email duplicado (409)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Email ya usado por otro cliente' }),
    })

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync({
        id: 'cust-1',
        email: 'duplicado@example.com',
      })
    ).rejects.toThrow('Email ya usado por otro cliente')
  })

  it('debe permitir actualizar a email null (remover email)', async () => {
    const mockUpdatedCustomer: Customer = {
      id: 'cust-1',
      name: 'Cliente A',
      email: null, // Email removido
      phone: '+56912345678',
      creditBalance: 0,
      totalProjects: 0,
      activeProjects: 0,
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-20'),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdatedCustomer,
    })

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() })

    const updated = await result.current.mutateAsync({
      id: 'cust-1',
      email: null,
    })

    expect(updated.email).toBeNull()
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al actualizar cliente' }),
    })

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() })

    await expect(result.current.mutateAsync({ id: 'cust-1', name: 'Test' })).rejects.toThrow()
  })
})

// ============================================================================
// TEST GROUP 6: useDeleteCustomer() (CRÍTICO - Optimistic Updates)
// ============================================================================

describe('useDeleteCustomer', () => {
  it('debe eliminar cliente exitosamente', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
    })

    const { result } = renderHook(() => useDeleteCustomer(), { wrapper: createWrapper() })

    await result.current.mutateAsync('cust-1')

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/customers/cust-1',
      expect.objectContaining({
        method: 'DELETE',
      })
    )
  })

  it('debe hacer optimistic update (remover de cache inmediatamente)', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    // Pre-poblar cache con clientes
    const initialData: CustomersResponse = {
      customers: [
        {
          id: 'cust-1',
          name: 'Cliente A',
          email: 'a@example.com',
          phone: '+56911111111',
          creditBalance: 0,
          totalProjects: 0,
          activeProjects: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cust-2',
          name: 'Cliente B',
          email: 'b@example.com',
          phone: '+56922222222',
          creditBalance: 0,
          totalProjects: 0,
          activeProjects: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    }

    queryClient.setQueryData(['customers'], initialData)

    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise(
          (resolve) => setTimeout(() => resolve({ ok: true }), 100) // Delay para simular latencia
        )
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeleteCustomer(), { wrapper })

    // Trigger delete
    result.current.mutate('cust-1')

    // Inmediatamente después (optimistic update), debe estar removido
    await waitFor(() => {
      const cachedData = queryClient.getQueryData<CustomersResponse>(['customers'])
      expect(cachedData?.customers).toHaveLength(1) // Solo cust-2
      expect(cachedData?.customers[0].id).toBe('cust-2')
      expect(cachedData?.pagination.total).toBe(1)
    })

    // Esperar a que complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('debe hacer rollback si delete falla', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    const initialData: CustomersResponse = {
      customers: [
        {
          id: 'cust-1',
          name: 'Cliente A',
          email: 'a@example.com',
          phone: '+56911111111',
          creditBalance: 0,
          totalProjects: 0,
          activeProjects: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    }

    queryClient.setQueryData(['customers'], initialData)

    // Mock fetch que falla
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Cliente tiene proyectos asociados' }),
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeleteCustomer(), { wrapper })

    await expect(result.current.mutateAsync('cust-1')).rejects.toThrow()

    // Después del rollback, el cliente debe seguir en cache
    const cachedData = queryClient.getQueryData<CustomersResponse>(['customers'])
    expect(cachedData?.customers).toHaveLength(1) // Rollback exitoso
    expect(cachedData?.customers[0].id).toBe('cust-1')
  })
})
