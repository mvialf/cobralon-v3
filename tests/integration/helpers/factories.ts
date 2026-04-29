import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db'

/**
 * Factories mínimas para tests de integración.
 *
 * Cada factory crea sólo lo necesario para que los modelos relacionados sean
 * persistibles. Los tests pueden encadenarlas o sobrescribir campos vía overrides.
 */

let counter = 0
const nextId = () => ++counter

export async function createBadgeColor(overrides: Partial<{ name: string; key: string }> = {}) {
  const n = nextId()
  return prisma.badgeColor.create({
    data: {
      name: overrides.name ?? `Color ${n}`,
      key: overrides.key ?? `color-${n}`,
      bgClass: 'bg-gray-500',
    },
  })
}

export async function createProjectStatus(
  overrides: Partial<{ name: string; isFinal: boolean }> = {}
) {
  const color = await createBadgeColor()
  const n = nextId()
  return prisma.projectStatus.create({
    data: {
      name: overrides.name ?? `Estado ${n}`,
      colorId: color.id,
      isFinal: overrides.isFinal ?? false,
    },
  })
}

export async function createCustomer(overrides: Partial<{ name: string; phone: string }> = {}) {
  const n = nextId()
  return prisma.customer.create({
    data: {
      name: overrides.name ?? `Cliente ${n}`,
      phone: overrides.phone ?? `+5691111111${n}`,
    },
  })
}

export async function createPaymentMethod(
  overrides: Partial<{
    name: string
    hasInstallments: boolean
    commissionTiers: Array<{
      minInstallments: number | null
      maxInstallments: number | null
      percentageFee: number
      fixedFee: number
    }>
  }> = {}
) {
  const n = nextId()
  return prisma.paymentMethod.create({
    data: {
      name: overrides.name ?? `Método ${n}`,
      hasInstallments: overrides.hasInstallments ?? false,
      commissionTiers: overrides.commissionTiers
        ? {
            create: overrides.commissionTiers.map((t) => ({
              minInstallments: t.minInstallments,
              maxInstallments: t.maxInstallments,
              percentageFee: new Decimal(t.percentageFee),
              fixedFee: new Decimal(t.fixedFee),
            })),
          }
        : undefined,
    },
    include: { commissionTiers: true },
  })
}

export async function createProject(
  customerId: string,
  projectStatusId: string,
  overrides: Partial<{
    projectNumber: string
    subtotal: number
    taxRate: number
    totalAmount: number
    balance: number
    currency: string
  }> = {}
) {
  const n = nextId()
  const subtotal = overrides.subtotal ?? 100000
  const taxRate = overrides.taxRate ?? 19
  const totalAmount = overrides.totalAmount ?? subtotal * (1 + taxRate / 100)
  const balance = overrides.balance ?? totalAmount

  return prisma.project.create({
    data: {
      projectNumber: overrides.projectNumber ?? `T-${n}`,
      customerId,
      phone: '+56911111111',
      comuna: 'Santiago',
      region: 'Metropolitana',
      projectStatusId,
      subtotal: new Decimal(subtotal),
      taxRate: new Decimal(taxRate),
      totalAmount: new Decimal(totalAmount),
      balance: new Decimal(balance),
      currency: overrides.currency ?? 'CLP',
    },
  })
}

/**
 * Crea una `CreditTransaction` directa para sembrar saldo previo a un test.
 */
export async function seedCreditBalance(
  customerId: string,
  amount: number,
  type: 'OVERPAYMENT' | 'REFUND' | 'ADJUSTMENT' = 'ADJUSTMENT'
) {
  return prisma.creditTransaction.create({
    data: {
      customerId,
      amount: new Decimal(amount),
      type,
      description: 'Seed de test',
    },
  })
}
