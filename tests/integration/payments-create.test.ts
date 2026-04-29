import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { POST } from '@/app/api/payments/route'
import { prisma } from '@/lib/db'
import { getCustomerCreditBalance } from '@/lib/business-logic/credit-management'
import { createRequest, callHandler } from '@/lib/test-utils/api-test-helpers'
import { resetDb } from './helpers/reset-db'
import {
  createCustomer,
  createPaymentMethod,
  createProject,
  createProjectStatus,
  seedCreditBalance,
} from './helpers/factories'

const PAYMENTS_URL = 'http://localhost:3000/api/payments'

async function postPayment(body: Record<string, unknown>) {
  const req = createRequest(PAYMENTS_URL, 'POST', body)
  return callHandler(POST, req)
}

describe('POST /api/payments — integración con DB real', () => {
  // Estado compartido por test (recreado en beforeEach)
  let customerId: string
  let projectId: string
  let paymentMethodId: string
  let projectStatusId: string

  beforeAll(async () => {
    // Conectar antes de operar (setup.ts también lo hace, redundante seguro)
    await prisma.$connect()
  })

  beforeEach(async () => {
    await resetDb()

    const status = await createProjectStatus({ name: 'Pendiente' })
    projectStatusId = status.id

    const customer = await createCustomer({ name: 'Test Customer' })
    customerId = customer.id

    const project = await createProject(customer.id, status.id, {
      projectNumber: 'INT-001',
      subtotal: 100000,
      taxRate: 0,
      totalAmount: 100000,
      balance: 100000,
      currency: 'CLP',
    })
    projectId = project.id

    const method = await createPaymentMethod({ name: 'Efectivo' })
    paymentMethodId = method.id
  })

  it('pago normal: baja el balance del proyecto y crea allocation', async () => {
    const res = await postPayment({
      type: 'Project',
      customerId,
      amount: 50000,
      currency: 'CLP',
      date: '2026-04-29',
      paymentMethodId,
      allocations: [{ projectId, allocatedAmount: 50000 }],
    })

    expect(res.status).toBe(201)

    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } })
    expect(Number(project.balance)).toBe(50000)

    const allocations = await prisma.paymentAllocation.findMany({ where: { projectId } })
    expect(allocations).toHaveLength(1)
    expect(Number(allocations[0].allocatedAmount)).toBe(50000)
  })

  it('sobrepago: genera CreditTransaction tipo OVERPAYMENT y deja balance en 0', async () => {
    const res = await postPayment({
      type: 'Project',
      customerId,
      amount: 130000,
      currency: 'CLP',
      date: '2026-04-29',
      paymentMethodId,
      allocations: [{ projectId, allocatedAmount: 130000 }],
    })

    expect(res.status).toBe(201)

    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } })
    expect(Number(project.balance)).toBe(0)

    const overpaymentTxs = await prisma.creditTransaction.findMany({
      where: { customerId, type: 'OVERPAYMENT' },
    })
    expect(overpaymentTxs).toHaveLength(1)
    expect(Number(overpaymentTxs[0].amount)).toBe(30000)

    const balance = await getCustomerCreditBalance(customerId)
    expect(balance).toBe(30000)
  })

  it('pago con crédito aplicado: descuenta crédito vía CreditTransaction APPLIED', async () => {
    await seedCreditBalance(customerId, 40000, 'OVERPAYMENT')

    const res = await postPayment({
      type: 'Project',
      customerId,
      amount: 30000,
      currency: 'CLP',
      date: '2026-04-29',
      paymentMethodId,
      creditApplied: 30000,
      allocations: [{ projectId, allocatedAmount: 30000 }],
    })

    expect(res.status).toBe(201)

    const balanceFinal = await getCustomerCreditBalance(customerId)
    expect(balanceFinal).toBe(10000)

    const appliedTxs = await prisma.creditTransaction.findMany({
      where: { customerId, type: 'APPLIED' },
    })
    expect(appliedTxs).toHaveLength(1)
    expect(Number(appliedTxs[0].amount)).toBe(-30000)
  })

  it('CRÍTICO: pagos concurrentes con crédito NO duplican consumo (race condition)', async () => {
    // Cliente con $10.000 de crédito. Dos pagos simultáneos intentan aplicar $8.000 cada uno.
    // Sin lock, ambos pueden leer el mismo saldo y ambos pasar — terminando en saldo negativo.
    // Con SELECT FOR UPDATE (Acción 2), uno debe fallar limpiamente.
    await seedCreditBalance(customerId, 10000, 'OVERPAYMENT')

    // Necesitamos 2 proyectos distintos: cada pago "Project" sólo puede tener 1 allocation,
    // y dos pagos sobre el MISMO proyecto en paralelo también compiten por el balance.
    // Usar 2 proyectos aísla el conflicto al recurso compartido (creditBalance).
    const project2 = await createProject(customerId, projectStatusId, {
      projectNumber: 'INT-002',
      subtotal: 100000,
      taxRate: 0,
      totalAmount: 100000,
      balance: 100000,
    })

    const payment = (pid: string) => ({
      type: 'Project',
      customerId,
      amount: 8000,
      currency: 'CLP',
      date: '2026-04-29',
      paymentMethodId,
      creditApplied: 8000,
      allocations: [{ projectId: pid, allocatedAmount: 8000 }],
    })

    const results = await Promise.allSettled([
      postPayment(payment(projectId)),
      postPayment(payment(project2.id)),
    ])

    const statuses = await Promise.all(
      results.map(async (r) => {
        if (r.status === 'fulfilled') return r.value.status
        return 'rejected'
      })
    )

    const successes = statuses.filter((s) => s === 201).length
    const failures = statuses.filter((s) => s !== 201).length

    expect(successes).toBe(1)
    expect(failures).toBe(1)

    // Invariante de negocio: el saldo nunca puede ser negativo.
    const balanceFinal = await getCustomerCreditBalance(customerId)
    expect(balanceFinal).toBeGreaterThanOrEqual(0)
    expect(balanceFinal).toBe(2000) // $10.000 - $8.000 aplicados (uno solo)
  })
})
