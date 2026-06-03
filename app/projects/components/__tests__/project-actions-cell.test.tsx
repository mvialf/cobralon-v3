import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ProjectActionsCell } from '../project-actions-cell'
import type { Project } from '../../types'

vi.mock('@/components/dialogs/projects/view-project-details-dialog', () => ({
  ViewProjectDetailsDialog: () => null,
}))

vi.mock('@/components/dialogs/projects/view-project-payments-dialog', () => ({
  ViewProjectPaymentsDialog: () => null,
}))

vi.mock('@/components/dialogs/projects/edit-project-dialog', () => ({
  EditProjectDialog: () => null,
}))

vi.mock('@/components/dialogs/projects/project-adjustment-dialog', () => ({
  ProjectAdjustmentDialog: () => null,
}))

vi.mock('@/components/dialogs/projects/project-financial-audit-dialog', () => ({
  ProjectFinancialAuditDialog: () => null,
}))

vi.mock('@/components/dialogs/confirm-delete-dialog', () => ({
  ConfirmDeleteDialog: () => null,
}))

vi.mock('@/components/dialogs/payments/payment-to-customer-dialog', () => ({
  PaymentToCustomerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="payment-to-customer-dialog" /> : null,
}))

vi.mock('@/components/dialogs/payments/payment-to-project-dialog', () => ({
  PaymentToProjectDialog: ({
    open,
    preselectedProjectId,
  }: {
    open: boolean
    preselectedProjectId?: string
  }) =>
    open ? (
      <div data-testid="payment-to-project-dialog" data-project-id={preselectedProjectId} />
    ) : null,
}))

const project: Project = {
  id: '00000000-0000-0000-0000-000000000101',
  projectNumber: 'P-001',
  projectName: 'Proyecto origen',
  date: '2026-01-01T00:00:00.000Z',
  projectStatus: {
    id: 'status-1',
    name: 'Activo',
    isFinal: false,
    color: { bgClass: 'bg-primary' },
  },
  totalAmount: 100000,
  totalPaid: 25000,
  balance: 75000,
  percentPaid: 25,
  customer: {
    id: '00000000-0000-0000-0000-000000000201',
    name: 'Cliente Test',
    phone: '+56912345678',
  },
}

describe('ProjectActionsCell', () => {
  it('abre el pago 1:1 a proyecto desde la accion Registrar pago', async () => {
    const user = userEvent.setup()

    render(<ProjectActionsCell project={project} />)

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    await user.click(screen.getByRole('menuitem', { name: /Registrar pago/i }))

    expect(screen.getByTestId('payment-to-project-dialog')).toHaveAttribute(
      'data-project-id',
      project.id
    )
    expect(screen.queryByTestId('payment-to-customer-dialog')).not.toBeInTheDocument()
  })
})
