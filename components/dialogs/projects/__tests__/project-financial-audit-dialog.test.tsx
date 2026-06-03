import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectFinancialAuditDialog } from '../project-financial-audit-dialog'

const projectId = '00000000-0000-0000-0000-000000000001'

function mockFetch() {
  global.fetch = vi.fn(async () => {
    return {
      ok: true,
      json: async () => ({
        project: {
          id: projectId,
          projectNumber: '1001',
          projectName: 'Proyecto auditado',
          totalAmount: 100000,
          currency: 'CLP',
          customer: { id: 'customer-1', name: 'Cliente Uno', phone: '+56911111111' },
        },
        financials: {
          projectId,
          allocatedTotal: 80000,
          appliedCashTotal: 80000,
          appliedCreditTotal: 10000,
          adjustmentTotal: 5000,
          settledTotal: 95000,
          rawBalance: 5000,
          balance: 5000,
          overpayment: 0,
          totalPaid: 95000,
          percentPaid: 95,
          hasDebt: true,
        },
        applications: [],
      }),
    } as Response
  })
}

describe('ProjectFinancialAuditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch()
  })

  it('carga auditoria financiera y muestra resumen autoritativo', async () => {
    render(
      <ProjectFinancialAuditDialog projectId={projectId} open onOpenChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${projectId}/financial-audit`)
    })

    expect(await screen.findByText('Auditoria financiera')).toBeInTheDocument()
    expect(screen.getByText('P-1001')).toBeInTheDocument()
    expect(screen.getByText('ProjectFinancials')).toBeInTheDocument()
    expect(screen.getByText('$95.000')).toBeInTheDocument()
    expect(screen.getAllByText('$5.000')).toHaveLength(2)
  })
})
