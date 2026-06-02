import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigurationProvider } from '@/lib/contexts/configuration-context'

import { PaymentToCustomerForm } from '../payment-to-customer-form'

vi.mock('@/hooks/queries/use-customers', () => ({
  useCustomer: vi.fn(() => ({
    data: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Cliente Test',
      email: 'cliente@example.com',
      phone: '+56912345678',
    },
    isLoading: false,
  })),
  useCustomers: vi.fn(() => ({
    data: { customers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    isLoading: false,
  })),
}))

const customerId = '00000000-0000-0000-0000-000000000001'
const oldestProjectId = '00000000-0000-0000-0000-000000000101'
const selectedProjectId = '00000000-0000-0000-0000-000000000202'

function renderForm(props?: Partial<React.ComponentProps<typeof PaymentToCustomerForm>>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigurationProvider>
        <PaymentToCustomerForm
          onSubmit={vi.fn()}
          preselectedCustomerId={customerId}
          {...props}
        />
      </ConfigurationProvider>
    </QueryClientProvider>
  )
}

function mockFetch() {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = input.toString()

    if (url.includes('/api/payments/customer-projects')) {
      return {
        ok: true,
        json: async () => [
          {
            id: oldestProjectId,
            projectNumber: 'P-001',
            projectName: 'Proyecto antiguo',
            totalAmount: 100000,
            balance: 100000,
            currency: 'CLP',
            createdAt: '2024-01-01T00:00:00.000Z',
            customer: { id: customerId, name: 'Cliente Test' },
          },
          {
            id: selectedProjectId,
            projectNumber: 'P-002',
            projectName: 'Proyecto origen',
            totalAmount: 150000,
            balance: 150000,
            currency: 'CLP',
            createdAt: '2024-02-01T00:00:00.000Z',
            customer: { id: customerId, name: 'Cliente Test' },
          },
        ],
      } as Response
    }

    if (url.includes('/api/customers/') && url.includes('/credit')) {
      return {
        ok: true,
        json: async () => ({ creditBalance: 0 }),
      } as Response
    }

    if (url.includes('/api/payment-methods')) {
      return {
        ok: true,
        json: async () => ({
          paymentMethods: [
            {
              id: '00000000-0000-0000-0000-000000000301',
              name: 'Efectivo',
              active: true,
              hasInstallments: false,
              maxInstallments: null,
            },
          ],
        }),
      } as Response
    }

    throw new Error(`Unhandled fetch: ${url}`)
  })
}

describe('PaymentToCustomerForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch()
  })

  it('debe preservar el proyecto origen como allocation inicial en modo manual', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    renderForm({ onSubmit, preselectedProjectId: selectedProjectId })

    await screen.findByText('P-001')
    await screen.findByText('P-002')

    expect(screen.getByRole('checkbox', { name: 'Auto' })).not.toBeChecked()

    const amountInputs = screen.getAllByRole('textbox')
    await user.clear(amountInputs[0])
    await user.type(amountInputs[0], '50000')

    const selectedProjectRow = screen.getByText('P-002').closest('tr')
    expect(selectedProjectRow).not.toBeNull()

    await waitFor(() => {
      const rowInputs = within(selectedProjectRow as HTMLTableRowElement).getAllByRole('textbox')
      expect(rowInputs[0]).toHaveValue('$ 50.000')
    })
  })
})
