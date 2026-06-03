import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProjectFinancialAuditTable } from '../project-financial-audit-table'

const application = {
  id: 'app-1',
  sourceType: 'CASH' as const,
  amount: 80000,
  createdAt: '2026-06-02T00:00:00.000Z',
  paymentId: 'payment-1',
  paymentAllocationId: 'allocation-1',
  creditTransactionId: null,
  projectAdjustmentId: null,
  payment: {
    id: 'payment-1',
    date: '2026-06-02T00:00:00.000Z',
    amount: 80000,
    type: 'Project',
    reference: 'REF-1',
    paymentMethod: { id: 'method-1', name: 'Efectivo', icon: null },
  },
  paymentAllocation: { id: 'allocation-1', allocatedAmount: 80000 },
  creditTransaction: null,
  projectAdjustment: null,
}

describe('ProjectFinancialAuditTable', () => {
  it('muestra aplicaciones financieras con origen, detalle y monto', () => {
    render(<ProjectFinancialAuditTable applications={[application]} currency="CLP" />)

    expect(screen.getByText('Efectivo')).toBeInTheDocument()
    expect(screen.getByText('Efectivo / REF-1')).toBeInTheDocument()
    expect(screen.getByText('$80.000')).toBeInTheDocument()
    expect(screen.getByText('allocation-1')).toBeInTheDocument()
  })

  it('muestra estado vacio cuando no hay aplicaciones', () => {
    render(<ProjectFinancialAuditTable applications={[]} currency="CLP" />)

    expect(
      screen.getByText('No hay aplicaciones registradas para este proyecto.')
    ).toBeInTheDocument()
  })

  it('prioriza detalle de ledger para aplicaciones de credito aunque exista pago asociado', () => {
    render(
      <ProjectFinancialAuditTable
        applications={[
          {
            ...application,
            id: 'app-credit',
            sourceType: 'CUSTOMER_CREDIT',
            amount: 10000,
            paymentAllocationId: null,
            creditTransactionId: 'credit-1',
            payment: {
              ...application.payment,
              paymentMethod: { id: 'method-1', name: 'Transferencia', icon: null },
            },
            creditTransaction: {
              id: 'credit-1',
              amount: -10000,
              type: 'APPLIED',
              description: 'Credito aplicado al proyecto',
              metadata: {},
            },
          },
        ]}
        currency="CLP"
      />
    )

    expect(screen.getByText('Credito cliente')).toBeInTheDocument()
    expect(screen.getByText('Credito aplicado al proyecto')).toBeInTheDocument()
    expect(screen.queryByText('Transferencia / REF-1')).not.toBeInTheDocument()
  })
})
