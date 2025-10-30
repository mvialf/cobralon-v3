import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Hooks a testear
import {
  usePayments,
  useSearchProjects,
  useCustomerProjects,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  type PaymentsResponse,
} from '../use-payments'

// Types necesarios
import type { CreatePaymentPayload } from '@/lib/validations/payment-validations'

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
// TEST GROUP 1: usePayments() (Query con paginación)
// ============================================================================

describe('usePayments', () => {
  it('debe cargar lista de pagos exitosamente', async () => {
    const mockResponse = {
      payments: [
        {
          id: 'pay-1',
          amount: 500000,
          currency: 'CLP',
          date: new Date('2025-01-15').toISOString(),
          reference: null,
          notes: null,
          type: 'Project',
          selectedInstallments: null,
          customerId: 'cust-1',
          paymentMethodId: 'pm-1',
          allocations: [{ id: 'alloc-1', projectId: 'proj-1', allocatedAmount: 500000 }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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

    const { result } = renderHook(() => usePayments({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.data?.payments).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments?page=1&limit=10')
    )
  })

  it('debe manejar filtros de query params', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    })

    renderHook(
      () =>
        usePayments({
          page: 2,
          limit: 20,
          customerId: 'cust-123',
          projectId: 'proj-456',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('limit=20')
    expect(calledUrl).toContain('customerId=cust-123')
    expect(calledUrl).toContain('projectId=proj-456')
    expect(calledUrl).toContain('startDate=2025-01-01')
    expect(calledUrl).toContain('endDate=2025-01-31')
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al cargar pagos' }),
    })

    const { result } = renderHook(() => usePayments(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
    expect(result.current.error?.message).toContain('Error al cargar pagos')
  })

  it('debe usar query key correcta sin params', () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    })

    // Query debe estar definida
    expect(result.current).toBeDefined()
  })
})

// ============================================================================
// TEST GROUP 2: useSearchProjects() (Query auxiliar con enabled)
// ============================================================================

describe('useSearchProjects', () => {
  it('debe ejecutar búsqueda cuando search >= 2 caracteres', async () => {
    const mockProjects = [
      {
        id: 'proj-1',
        projectNumber: 'P 0001-2025',
        projectName: 'Proyecto Test',
        totalAmount: 1000000,
        currency: 'CLP',
        balance: 500000,
        createdAt: new Date().toISOString(),
        customer: { id: 'cust-1', name: 'Cliente Test' },
      },
    ]

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockProjects,
    })

    const { result } = renderHook(() => useSearchProjects({ search: 'P 00', limit: 20 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockProjects)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/search-projects')
    )
  })

  it('NO debe ejecutar búsqueda cuando search < 2 caracteres', () => {
    global.fetch = vi.fn()

    const { result } = renderHook(() => useSearchProjects({ search: 'P' }), {
      wrapper: createWrapper(),
    })

    // Query disabled: NO debe hacer fetch (isPending puede ser true para queries disabled)
    expect(result.current.isFetching).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('NO debe ejecutar búsqueda cuando search es undefined', () => {
    global.fetch = vi.fn()

    const { result } = renderHook(() => useSearchProjects({ search: undefined }), {
      wrapper: createWrapper(),
    })

    // Query disabled: NO debe hacer fetch (isPending puede ser true para queries disabled)
    expect(result.current.isFetching).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('NO debe ejecutar búsqueda cuando search es string vacío', () => {
    global.fetch = vi.fn()

    const { result } = renderHook(() => useSearchProjects({ search: '' }), {
      wrapper: createWrapper(),
    })

    // Query disabled: NO debe hacer fetch (isPending puede ser true para queries disabled)
    expect(result.current.isFetching).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ============================================================================
// TEST GROUP 3: useCustomerProjects() (Query auxiliar con enabled)
// ============================================================================

describe('useCustomerProjects', () => {
  it('debe cargar proyectos de cliente exitosamente', async () => {
    const mockProjects = [
      {
        id: 'proj-1',
        projectNumber: 'P 0001-2025',
        projectName: null,
        totalAmount: 1000000,
        currency: 'CLP',
        balance: 600000,
        createdAt: new Date().toISOString(),
        customer: { id: 'cust-1', name: 'Cliente A' },
      },
      {
        id: 'proj-2',
        projectNumber: 'P 0002-2025',
        projectName: 'Proyecto B',
        totalAmount: 500000,
        currency: 'CLP',
        balance: 200000,
        createdAt: new Date().toISOString(),
        customer: { id: 'cust-1', name: 'Cliente A' },
      },
    ]

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockProjects,
    })

    const { result } = renderHook(() => useCustomerProjects('cust-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockProjects)
    expect(result.current.data).toHaveLength(2)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/customer-projects?customerId=cust-1')
    )
  })

  it('NO debe ejecutar query si customerId es undefined', () => {
    global.fetch = vi.fn()

    const { result } = renderHook(() => useCustomerProjects(undefined), {
      wrapper: createWrapper(),
    })

    // Query disabled: NO debe hacer fetch (isPending puede ser true para queries disabled)
    expect(result.current.isFetching).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Cliente no encontrado' }),
    })

    const { result } = renderHook(() => useCustomerProjects('cust-999'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toContain('Cliente no encontrado')
  })
})

// ============================================================================
// TEST GROUP 4: useCreatePayment() (CRÍTICO - Validaciones de Negocio)
// ============================================================================

describe('useCreatePayment', () => {
  // ========================================================================
  // VALIDACIÓN 1: Type "Project" debe tener exactamente 1 allocation
  // ========================================================================

  it('debe RECHAZAR pago Project con 0 allocations', async () => {
    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const invalidData: CreatePaymentPayload = {
      type: 'Project',
      customerId: 'cust-1',
      amount: 500000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [], // ❌ INVÁLIDO: 0 allocations
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(
      'Pago tipo Project debe tener exactamente 1 asignación'
    )
  })

  it('debe RECHAZAR pago Project con 2+ allocations', async () => {
    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const invalidData: CreatePaymentPayload = {
      type: 'Project',
      customerId: 'cust-1',
      amount: 500000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [
        { projectId: 'proj-1', allocatedAmount: 300000 },
        { projectId: 'proj-2', allocatedAmount: 200000 }, // ❌ INVÁLIDO: 2 allocations
      ],
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(
      'Pago tipo Project debe tener exactamente 1 asignación'
    )
  })

  it('debe ACEPTAR pago Project con 1 allocation', async () => {
    const mockPayment = {
      id: 'pay-1',
      amount: 500000,
      currency: 'CLP',
      date: new Date().toISOString(),
      reference: null,
      notes: null,
      type: 'Project',
      selectedInstallments: null,
      customerId: 'cust-1',
      paymentMethodId: 'pm-1',
      allocations: [{ id: 'alloc-1', projectId: 'proj-1', allocatedAmount: 500000 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPayment,
    })

    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const validData: CreatePaymentPayload = {
      type: 'Project',
      customerId: 'cust-1',
      amount: 500000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [{ projectId: 'proj-1', allocatedAmount: 500000 }], // ✅ VÁLIDO
    }

    const createdPayment = await result.current.mutateAsync(validData)

    expect(createdPayment).toEqual(mockPayment)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/payments',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  // ========================================================================
  // VALIDACIÓN 2: Type "Customer" debe tener al menos 1 allocation
  // ========================================================================

  it('debe RECHAZAR pago Customer con 0 allocations', async () => {
    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const invalidData: CreatePaymentPayload = {
      type: 'Customer',
      customerId: 'cust-1',
      amount: 500000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [], // ❌ INVÁLIDO: 0 allocations
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(
      'Pago tipo Customer debe tener al menos 1 asignación'
    )
  })

  it('debe ACEPTAR pago Customer con 1 allocation', async () => {
    const mockPayment = {
      id: 'pay-2',
      amount: 300000,
      currency: 'CLP',
      date: new Date().toISOString(),
      reference: null,
      notes: null,
      type: 'Customer',
      selectedInstallments: null,
      customerId: 'cust-1',
      paymentMethodId: 'pm-1',
      allocations: [{ id: 'alloc-1', projectId: 'proj-1', allocatedAmount: 300000 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPayment,
    })

    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const validData: CreatePaymentPayload = {
      type: 'Customer',
      customerId: 'cust-1',
      amount: 300000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [{ projectId: 'proj-1', allocatedAmount: 300000 }], // ✅ VÁLIDO
    }

    const createdPayment = await result.current.mutateAsync(validData)
    expect(createdPayment).toEqual(mockPayment)
  })

  it('debe ACEPTAR pago Customer con múltiples allocations', async () => {
    const mockPayment = {
      id: 'pay-3',
      amount: 700000,
      currency: 'CLP',
      date: new Date().toISOString(),
      reference: null,
      notes: null,
      type: 'Customer',
      selectedInstallments: null,
      customerId: 'cust-1',
      paymentMethodId: 'pm-1',
      allocations: [
        { id: 'alloc-1', projectId: 'proj-1', allocatedAmount: 400000 },
        { id: 'alloc-2', projectId: 'proj-2', allocatedAmount: 300000 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPayment,
    })

    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const validData: CreatePaymentPayload = {
      type: 'Customer',
      customerId: 'cust-1',
      amount: 700000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [
        { projectId: 'proj-1', allocatedAmount: 400000 },
        { projectId: 'proj-2', allocatedAmount: 300000 },
      ], // ✅ VÁLIDO
    }

    const createdPayment = await result.current.mutateAsync(validData)
    expect(createdPayment).toEqual(mockPayment)
  })

  // ========================================================================
  // VALIDACIÓN 3: Sum de allocations === amount (tolerancia 0.01)
  // ========================================================================

  it('debe RECHAZAR si allocations NO suman amount (diferencia > 0.01)', async () => {
    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const invalidData: CreatePaymentPayload = {
      type: 'Customer',
      customerId: 'cust-1',
      amount: 700000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [
        { projectId: 'proj-1', allocatedAmount: 400000 },
        { projectId: 'proj-2', allocatedAmount: 250000 }, // Suma = 650,000 (diferencia: 50,000 > 0.01)
      ],
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(/no suman el monto total/)
  })

  it('debe ACEPTAR si allocations suman amount (suma exacta)', async () => {
    const mockPayment = {
      id: 'pay-4',
      amount: 1000,
      currency: 'CLP',
      date: new Date().toISOString(),
      reference: null,
      notes: null,
      type: 'Customer',
      selectedInstallments: null,
      customerId: 'cust-1',
      paymentMethodId: 'pm-1',
      allocations: [
        { id: 'alloc-1', projectId: 'proj-1', allocatedAmount: 600 },
        { id: 'alloc-2', projectId: 'proj-2', allocatedAmount: 400 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPayment,
    })

    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const validData: CreatePaymentPayload = {
      type: 'Customer',
      customerId: 'cust-1',
      amount: 1000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [
        { projectId: 'proj-1', allocatedAmount: 600 },
        { projectId: 'proj-2', allocatedAmount: 400 }, // Suma = 1000 ✅
      ],
    }

    const createdPayment = await result.current.mutateAsync(validData)
    expect(createdPayment).toEqual(mockPayment)
  })

  it('debe ACEPTAR si diferencia <= tolerancia (0.01)', async () => {
    const mockPayment = {
      id: 'pay-5',
      amount: 1000,
      currency: 'CLP',
      date: new Date().toISOString(),
      reference: null,
      notes: null,
      type: 'Customer',
      selectedInstallments: null,
      customerId: 'cust-1',
      paymentMethodId: 'pm-1',
      allocations: [
        { id: 'alloc-1', projectId: 'proj-1', allocatedAmount: 600.005 },
        { id: 'alloc-2', projectId: 'proj-2', allocatedAmount: 399.995 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPayment,
    })

    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const validData: CreatePaymentPayload = {
      type: 'Customer',
      customerId: 'cust-1',
      amount: 1000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [
        { projectId: 'proj-1', allocatedAmount: 600.005 },
        { projectId: 'proj-2', allocatedAmount: 399.995 }, // Suma = 1000.00 (diferencia: 0)
      ],
    }

    const createdPayment = await result.current.mutateAsync(validData)
    expect(createdPayment).toEqual(mockPayment)
  })

  // ========================================================================
  // VALIDACIÓN 4: No projectIds duplicados
  // ========================================================================

  it('debe RECHAZAR si hay projectIds duplicados', async () => {
    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const invalidData: CreatePaymentPayload = {
      type: 'Customer',
      customerId: 'cust-1',
      amount: 1000000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [
        { projectId: 'proj-1', allocatedAmount: 600000 },
        { projectId: 'proj-1', allocatedAmount: 400000 }, // ❌ DUPLICADO
      ],
    }

    await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(
      'No puede asignar el mismo proyecto múltiples veces'
    )
  })

  it('debe ACEPTAR si todos los projectIds son únicos', async () => {
    const mockPayment = {
      id: 'pay-6',
      amount: 1000000,
      currency: 'CLP',
      date: new Date().toISOString(),
      reference: null,
      notes: null,
      type: 'Customer',
      selectedInstallments: null,
      customerId: 'cust-1',
      paymentMethodId: 'pm-1',
      allocations: [
        { id: 'alloc-1', projectId: 'proj-1', allocatedAmount: 400000 },
        { id: 'alloc-2', projectId: 'proj-2', allocatedAmount: 300000 },
        { id: 'alloc-3', projectId: 'proj-3', allocatedAmount: 300000 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPayment,
    })

    const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() })

    const validData: CreatePaymentPayload = {
      type: 'Customer',
      customerId: 'cust-1',
      amount: 1000000,
      currency: 'CLP',
      date: new Date(),
      paymentMethodId: 'pm-1',
      reference: null,
      notes: null,
      allocations: [
        { projectId: 'proj-1', allocatedAmount: 400000 },
        { projectId: 'proj-2', allocatedAmount: 300000 },
        { projectId: 'proj-3', allocatedAmount: 300000 }, // ✅ Todos únicos
      ],
    }

    const createdPayment = await result.current.mutateAsync(validData)
    expect(createdPayment).toEqual(mockPayment)
  })
})

// ============================================================================
// TEST GROUP 5: useUpdatePayment() (Mutation limitada)
// ============================================================================

describe('useUpdatePayment', () => {
  it('debe actualizar campos editables exitosamente', async () => {
    const mockUpdatedPayment = {
      id: 'pay-1',
      amount: 600000, // Actualizado
      currency: 'CLP',
      date: new Date('2025-02-01').toISOString(), // Actualizado
      reference: 'REF-123', // Actualizado
      notes: 'Notas actualizadas', // Actualizado
      type: 'Project',
      selectedInstallments: null,
      customerId: 'cust-1',
      paymentMethodId: 'pm-2', // Actualizado
      allocations: [{ id: 'alloc-1', projectId: 'proj-1', allocatedAmount: 600000 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdatedPayment,
    })

    const { result } = renderHook(() => useUpdatePayment(), { wrapper: createWrapper() })

    const updateData = {
      id: 'pay-1',
      amount: 600000,
      date: new Date('2025-02-01'),
      paymentMethodId: 'pm-2',
      reference: 'REF-123',
      notes: 'Notas actualizadas',
    }

    const updated = await result.current.mutateAsync(updateData)

    expect(updated).toEqual(mockUpdatedPayment)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/payments/pay-1',
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('debe manejar error 400 si payment tiene cuotas', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'No se puede editar un pago con cuotas configuradas' }),
    })

    const { result } = renderHook(() => useUpdatePayment(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync({
        id: 'pay-with-installments',
        reference: 'Nueva ref',
      })
    ).rejects.toThrow('No se puede editar un pago con cuotas configuradas')
  })

  it('debe manejar error genérico de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error interno del servidor' }),
    })

    const { result } = renderHook(() => useUpdatePayment(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync({
        id: 'pay-1',
        reference: 'Nueva ref',
      })
    ).rejects.toThrow()
  })
})

// ============================================================================
// TEST GROUP 6: useDeletePayment() (CRÍTICO - Optimistic Updates)
// ============================================================================

describe('useDeletePayment', () => {
  it('debe eliminar pago exitosamente', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
    })

    const { result } = renderHook(() => useDeletePayment(), { wrapper: createWrapper() })

    await result.current.mutateAsync('pay-1')

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/payments/pay-1',
      expect.objectContaining({
        method: 'DELETE',
      })
    )
  })

  it('debe hacer optimistic update (remover de cache inmediatamente)', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    // Pre-poblar cache con pagos
    const initialData = {
      payments: [
        {
          id: 'pay-1',
          amount: 500000,
          currency: 'CLP',
          date: new Date().toISOString(),
          reference: null,
          notes: null,
          type: 'Project',
          selectedInstallments: null,
          customerId: 'cust-1',
          paymentMethodId: 'pm-1',
          allocations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'pay-2',
          amount: 300000,
          currency: 'CLP',
          date: new Date().toISOString(),
          reference: null,
          notes: null,
          type: 'Customer',
          selectedInstallments: null,
          customerId: 'cust-1',
          paymentMethodId: 'pm-1',
          allocations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    }

    queryClient.setQueryData(['payments'], initialData)

    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise(
          (resolve) => setTimeout(() => resolve({ ok: true }), 100) // Delay para simular latencia
        )
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeletePayment(), { wrapper })

    // Trigger delete
    result.current.mutate('pay-1')

    // Inmediatamente después (optimistic update), debe estar removido
    await waitFor(() => {
      const cachedData = queryClient.getQueryData<PaymentsResponse>(['payments'])
      expect(cachedData?.payments).toHaveLength(1) // Solo pay-2
      expect(cachedData?.payments[0].id).toBe('pay-2')
      expect(cachedData?.pagination.total).toBe(1)
    })

    // Esperar a que complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('debe hacer rollback si delete falla', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    const initialData = {
      payments: [
        {
          id: 'pay-1',
          amount: 500000,
          currency: 'CLP',
          date: new Date().toISOString(),
          reference: null,
          notes: null,
          type: 'Project',
          selectedInstallments: null,
          customerId: 'cust-1',
          paymentMethodId: 'pm-1',
          allocations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    }

    queryClient.setQueryData(['payments'], initialData)

    // Mock fetch que falla
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'No se puede eliminar este pago' }),
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeletePayment(), { wrapper })

    await expect(result.current.mutateAsync('pay-1')).rejects.toThrow()

    // Después del rollback, el pago debe seguir en cache
    const cachedData = queryClient.getQueryData<PaymentsResponse>(['payments'])
    expect(cachedData?.payments).toHaveLength(1) // Rollback exitoso
    expect(cachedData?.payments[0].id).toBe('pay-1')
  })
})
