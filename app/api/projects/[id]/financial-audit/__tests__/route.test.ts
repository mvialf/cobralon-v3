import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { BusinessError } from '@/lib/api-handler'
import { getProjectFinancialAudit } from '@/lib/use-cases/projects/get-project-financial-audit'

import { GET } from '../route'

vi.mock('@/lib/use-cases/projects/get-project-financial-audit', () => ({
  getProjectFinancialAudit: vi.fn(),
}))

vi.mock('@/lib/logger-middleware', () => ({
  withLogging: (handler: Function) => {
    return async (
      request: NextRequest,
      context?: { params: Promise<Record<string, string>> }
    ) => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
      }
      return handler(request, mockLogger, context || { params: Promise.resolve({}) })
    }
  },
}))

const validProjectId = '00000000-0000-0000-0000-000000000001'

function createRequest() {
  return new NextRequest(
    `http://localhost:3000/api/projects/${validProjectId}/financial-audit`,
    { method: 'GET' }
  )
}

function callGET(id = validProjectId) {
  return GET(createRequest(), { params: Promise.resolve({ id }) })
}

describe('GET /api/projects/[id]/financial-audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza UUID invalido', async () => {
    const response = await callGET('bad-id')
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
    expect(getProjectFinancialAudit).not.toHaveBeenCalled()
  })

  it('retorna auditoria financiera del use-case', async () => {
    vi.mocked(getProjectFinancialAudit).mockResolvedValue({
      project: {
        id: validProjectId,
        projectNumber: '1001',
        projectName: null,
        totalAmount: 100000,
        currency: 'CLP',
        customer: { id: 'customer-1', name: 'Cliente Uno', phone: '+56911111111' },
      },
      financials: {
        projectId: validProjectId,
        allocatedTotal: 100000,
        appliedCashTotal: 100000,
        appliedCreditTotal: 0,
        adjustmentTotal: 0,
        settledTotal: 100000,
        rawBalance: 0,
        balance: 0,
        overpayment: 0,
        totalPaid: 100000,
        percentPaid: 100,
        hasDebt: false,
      },
      applications: [],
    })

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.project.projectNumber).toBe('1001')
    expect(data.financials.balance).toBe(0)
    expect(getProjectFinancialAudit).toHaveBeenCalledWith(validProjectId)
  })

  it('traduce BusinessError del use-case', async () => {
    vi.mocked(getProjectFinancialAudit).mockRejectedValue(
      new BusinessError('Proyecto no encontrado', 404)
    )

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Proyecto no encontrado')
  })
})
