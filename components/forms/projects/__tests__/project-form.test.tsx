import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ConfigurationProvider } from '@/lib/contexts/configuration-context'

import { ProjectForm } from '../project-form'

vi.mock('@/hooks/queries/use-customers', () => ({
  useCustomersList: vi.fn(() => ({
    data: { customers: [] },
    isLoading: false,
  })),
  useCreateCustomer: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/hooks/queries/use-project-statuses', () => ({
  useProjectStatuses: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  getInitialProjectStatus: vi.fn(),
}))

vi.mock('@/components/forms/fields/uninstall-tags-fields', () => ({
  UninstallTagsFields: () => null,
}))

vi.mock('@/components/ui/date-field', () => ({
  DateField: () => null,
}))

describe('ProjectForm', () => {
  it('debe preservar taxRate 0 al cargar valores de edición', () => {
    render(
      <ConfigurationProvider>
        <ProjectForm onSubmit={vi.fn()} defaultValues={{ taxRate: 0 }} />
      </ConfigurationProvider>
    )

    expect(screen.getByRole('textbox', { name: 'Impuesto' })).toHaveValue('0.0%')
  })
})
