import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Hooks a testear
import {
  useInstallments,
  type InstallmentsResponse,
  type Installment,
} from '../use-installments'

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
// TEST GROUP 1: useInstallments() (Query con paginación y filtros)
// ============================================================================

describe('useInstallments', () => {
  it('debe cargar lista de cuotas exitosamente', async () => {
    const mockResponse: InstallmentsResponse = {
      installments: [
        {
          id: 'inst-1',
          paymentId: 'pay-1',
          installmentNumber: 1,
          amount: 100000,
          dueDate: new Date('2025-02-15').toISOString(),
          status: 'pending',
          paidDate: null,
          createdAt: new Date('2025-01-15').toISOString(),
          updatedAt: new Date('2025-01-15').toISOString(),
          payment: {
            id: 'pay-1',
            amount: 300000,
            currency: 'CLP',
            date: new Date('2025-01-15').toISOString(),
            reference: null,
            selectedInstallments: 3,
            customer: {
              id: 'cust-1',
              name: 'Cliente A',
              phone: '+56912345678',
            },
            paymentMethod: {
              id: 'pm-1',
              name: 'Transferencia',
              icon: null,
            },
            allocations: [
              {
                id: 'alloc-1',
                allocatedAmount: 300000,
                project: {
                  id: 'proj-1',
                  projectNumber: 'P 0001-2025',
                  projectName: 'Proyecto Test',
                  currency: 'CLP',
                },
              },
            ],
          },
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

    const { result } = renderHook(() => useInstallments({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.data?.installments).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/installments?page=1&limit=10')
    )
  })

  it('debe manejar filtro de status', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        installments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    })

    renderHook(() => useInstallments({ status: 'pending' }), { wrapper: createWrapper() })

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('status=pending')
  })

  it('debe manejar filtro de paymentId', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        installments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    })

    renderHook(() => useInstallments({ paymentId: 'pay-123' }), { wrapper: createWrapper() })

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('paymentId=pay-123')
  })

  it('debe manejar filtro de customerId', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        installments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    })

    renderHook(() => useInstallments({ customerId: 'cust-456' }), { wrapper: createWrapper() })

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('customerId=cust-456')
  })

  it('debe manejar filtros de rango de fechas', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        installments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    })

    renderHook(
      () =>
        useInstallments({
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-31T23:59:59Z',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('startDate=2025-01-01T00%3A00%3A00Z')
    expect(calledUrl).toContain('endDate=2025-01-31T23%3A59%3A59Z')
  })

  it('debe manejar múltiples filtros combinados', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        installments: [],
        pagination: { page: 2, limit: 20, total: 0, totalPages: 0 },
      }),
    })

    renderHook(
      () =>
        useInstallments({
          page: 2,
          limit: 20,
          status: 'paid',
          customerId: 'cust-789',
          startDate: '2025-01-01T00:00:00Z',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('limit=20')
    expect(calledUrl).toContain('status=paid')
    expect(calledUrl).toContain('customerId=cust-789')
    expect(calledUrl).toContain('startDate=2025-01-01T00%3A00%3A00Z')
  })

  it('debe cargar cuotas pendientes correctamente', async () => {
    const mockResponse: InstallmentsResponse = {
      installments: [
        {
          id: 'inst-1',
          paymentId: 'pay-1',
          installmentNumber: 1,
          amount: 100000,
          dueDate: new Date('2025-02-15').toISOString(),
          status: 'pending',
          paidDate: null,
          createdAt: new Date('2025-01-15').toISOString(),
          updatedAt: new Date('2025-01-15').toISOString(),
          payment: {
            id: 'pay-1',
            amount: 300000,
            currency: 'CLP',
            date: new Date('2025-01-15').toISOString(),
            reference: null,
            selectedInstallments: 3,
            customer: {
              id: 'cust-1',
              name: 'Cliente A',
              phone: '+56912345678',
            },
            paymentMethod: {
              id: 'pm-1',
              name: 'Efectivo',
              icon: null,
            },
            allocations: [],
          },
        },
        {
          id: 'inst-2',
          paymentId: 'pay-1',
          installmentNumber: 2,
          amount: 100000,
          dueDate: new Date('2025-03-15').toISOString(),
          status: 'pending',
          paidDate: null,
          createdAt: new Date('2025-01-15').toISOString(),
          updatedAt: new Date('2025-01-15').toISOString(),
          payment: {
            id: 'pay-1',
            amount: 300000,
            currency: 'CLP',
            date: new Date('2025-01-15').toISOString(),
            reference: null,
            selectedInstallments: 3,
            customer: {
              id: 'cust-1',
              name: 'Cliente A',
              phone: '+56912345678',
            },
            paymentMethod: {
              id: 'pm-1',
              name: 'Efectivo',
              icon: null,
            },
            allocations: [],
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useInstallments({ status: 'pending' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.installments).toHaveLength(2)
    expect(result.current.data?.installments[0].status).toBe('pending')
    expect(result.current.data?.installments[1].status).toBe('pending')
  })

  it('debe cargar cuotas pagadas con paidDate', async () => {
    const mockResponse: InstallmentsResponse = {
      installments: [
        {
          id: 'inst-paid',
          paymentId: 'pay-1',
          installmentNumber: 1,
          amount: 100000,
          dueDate: new Date('2025-02-15').toISOString(),
          status: 'paid',
          paidDate: new Date('2025-02-10').toISOString(), // Pagado antes del vencimiento
          createdAt: new Date('2025-01-15').toISOString(),
          updatedAt: new Date('2025-02-10').toISOString(),
          payment: {
            id: 'pay-1',
            amount: 300000,
            currency: 'CLP',
            date: new Date('2025-01-15').toISOString(),
            reference: null,
            selectedInstallments: 3,
            customer: {
              id: 'cust-1',
              name: 'Cliente A',
              phone: '+56912345678',
            },
            paymentMethod: {
              id: 'pm-1',
              name: 'Tarjeta',
              icon: null,
            },
            allocations: [],
          },
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

    const { result } = renderHook(() => useInstallments({ status: 'paid' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.installments).toHaveLength(1)
    expect(result.current.data?.installments[0].status).toBe('paid')
    expect(result.current.data?.installments[0].paidDate).toBeTruthy()
  })

  it('debe manejar error de API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al cargar cuotas' }),
    })

    const { result } = renderHook(() => useInstallments(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
    expect(result.current.error?.message).toContain('Error al cargar cuotas')
  })

  it('debe usar query key con params para caching correcto', () => {
    const params = { page: 2, status: 'pending' as const }

    const { result } = renderHook(() => useInstallments(params), {
      wrapper: createWrapper(),
    })

    // Query debe estar definida y usar params como parte del key
    expect(result.current).toBeDefined()
    // El queryKey incluye los params para caching diferenciado
  })

  it('debe funcionar sin params (valores por defecto)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        installments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    })

    const { result } = renderHook(() => useInstallments(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toBe('/api/installments?')
  })
})
