import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

function mockFetch(options: { creditBalance?: number } = {}) {
  const { creditBalance = 0 } = options

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
        json: async () => ({ creditBalance }),
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

async function waitForPaymentMethod() {
  await waitFor(() => {
    expect(screen.getByRole('combobox', { name: /Método de Pago/i })).toHaveTextContent('Efectivo')
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

  it('debe rechazar el submit cuando las allocations no suman el monto total', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    renderForm({ onSubmit, preselectedProjectId: oldestProjectId })

    await screen.findByText('P-001')
    await waitForPaymentMethod()

    const amountInput = screen.getAllByRole('textbox')[0]
    await user.clear(amountInput)
    await user.type(amountInput, '100000')

    const firstRow = screen.getByText('P-001').closest('tr') as HTMLTableRowElement
    const [allocatedInput] = Array.from(firstRow.querySelectorAll('input[type="text"]'))
    await waitFor(() => expect(allocatedInput).toHaveValue('$ 100.000'))
    await user.clear(allocatedInput)
    await user.type(allocatedInput, '30000')

    fireEvent.submit(document.querySelector('form') as HTMLFormElement)

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it('debe rechazar el submit cuando el crédito aplicado excede el crédito disponible', async () => {
    mockFetch({ creditBalance: 20000 })

    const onSubmit = vi.fn()
    const user = userEvent.setup()

    renderForm({ onSubmit, preselectedProjectId: oldestProjectId })

    await screen.findByText('P-001')
    await waitForPaymentMethod()

    const amountInput = screen.getAllByRole('textbox')[0]
    await user.clear(amountInput)
    await user.type(amountInput, '80000')

    const firstRow = screen.getByText('P-001').closest('tr') as HTMLTableRowElement
    const [allocatedInput, creditInput] = Array.from(firstRow.querySelectorAll('input[type="text"]'))
    await waitFor(() => expect(allocatedInput).toHaveValue('$ 80.000'))

    await user.clear(creditInput)
    await user.type(creditInput, '30000')

    fireEvent.submit(document.querySelector('form') as HTMLFormElement)

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it('debe rechazar el submit cuando el crédito supera el balance restante del proyecto', async () => {
    mockFetch({ creditBalance: 200000 })

    const onSubmit = vi.fn()
    const user = userEvent.setup()

    renderForm({ onSubmit, preselectedProjectId: oldestProjectId })

    await screen.findByText('P-001')
    await waitForPaymentMethod()

    const amountInput = screen.getAllByRole('textbox')[0]
    await user.clear(amountInput)
    await user.type(amountInput, '100000')

    const firstRow = screen.getByText('P-001').closest('tr') as HTMLTableRowElement
    const [allocatedInput, creditInput] = Array.from(firstRow.querySelectorAll('input[type="text"]'))
    await waitFor(() => expect(allocatedInput).toHaveValue('$ 100.000'))

    await user.clear(creditInput)
    await user.type(creditInput, '110000')

    fireEvent.submit(document.querySelector('form') as HTMLFormElement)

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it('debe ejecutar onSubmit cuando el formulario es válido', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    renderForm({ onSubmit, preselectedProjectId: oldestProjectId })

    await screen.findByText('P-001')
    await waitForPaymentMethod()

    const amountInput = screen.getAllByRole('textbox')[0]
    await user.clear(amountInput)
    await user.type(amountInput, '100000')

    const firstRow = screen.getByText('P-001').closest('tr') as HTMLTableRowElement
    const [allocatedInput] = Array.from(firstRow.querySelectorAll('input[type="text"]'))
    await waitFor(() => expect(allocatedInput).toHaveValue('$ 100.000'))

    fireEvent.submit(document.querySelector('form') as HTMLFormElement)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce()
    })
  })
})
