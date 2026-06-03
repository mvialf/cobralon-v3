import type { ProjectApplicationSourceType } from '@prisma/client'

import { BusinessError } from '@/lib/api-handler'
import { moneyToNumber } from '@/lib/business-logic/money'
import { getProjectFinancials } from '@/lib/business-logic/project-financials'
import type { ProjectFinancials } from '@/lib/business-logic/project-financials'
import { prisma } from '@/lib/db'
import type { PrismaTransaction } from '@/lib/db/types'

export type ProjectFinancialAuditApplication = {
  id: string
  sourceType: ProjectApplicationSourceType
  amount: number
  createdAt: Date
  paymentId: string | null
  paymentAllocationId: string | null
  creditTransactionId: string | null
  projectAdjustmentId: string | null
  payment: {
    id: string
    date: Date
    amount: number
    type: string
    reference: string | null
    paymentMethod: { id: string; name: string; icon: string | null } | null
  } | null
  paymentAllocation: {
    id: string
    allocatedAmount: number
  } | null
  creditTransaction: {
    id: string
    amount: number
    type: string
    description: string | null
    metadata: unknown
  } | null
  projectAdjustment: {
    id: string
    amount: number
    reason: string
    description: string | null
    appliedAt: Date
    adjustmentReason: { name: string; warningLevel: string } | null
  } | null
}

export type ProjectFinancialAudit = {
  project: {
    id: string
    projectNumber: string
    projectName: string | null
    totalAmount: number
    currency: string
    customer: { id: string; name: string; phone: string }
  }
  financials: ProjectFinancials
  applications: ProjectFinancialAuditApplication[]
}

export async function getProjectFinancialAudit(projectId: string): Promise<ProjectFinancialAudit> {
  return prisma.$transaction(async (tx: PrismaTransaction) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
        totalAmount: true,
        currency: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
    })

    if (!project) {
      throw new BusinessError('Proyecto no encontrado', 404)
    }

    const financials = await getProjectFinancials(projectId, tx)
    if (!financials) {
      throw new BusinessError('Datos financieros del proyecto no encontrados', 404)
    }

    const applications = await tx.projectApplication.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        payment: {
          select: {
            id: true,
            date: true,
            amount: true,
            type: true,
            reference: true,
            paymentMethod: { select: { id: true, name: true, icon: true } },
          },
        },
        paymentAllocation: { select: { id: true, allocatedAmount: true } },
        creditTransaction: {
          select: { id: true, amount: true, type: true, description: true, metadata: true },
        },
        projectAdjustment: {
          select: {
            id: true,
            amount: true,
            reason: true,
            description: true,
            appliedAt: true,
            adjustmentReason: { select: { name: true, warningLevel: true } },
          },
        },
      },
    })

    return {
      project: {
        ...project,
        totalAmount: moneyToNumber(project.totalAmount),
      },
      financials,
      applications: applications.map((application) => ({
        id: application.id,
        sourceType: application.sourceType,
        amount: moneyToNumber(application.amount),
        createdAt: application.createdAt,
        paymentId: application.paymentId,
        paymentAllocationId: application.paymentAllocationId,
        creditTransactionId: application.creditTransactionId,
        projectAdjustmentId: application.projectAdjustmentId,
        payment: application.payment
          ? {
              ...application.payment,
              amount: moneyToNumber(application.payment.amount),
            }
          : null,
        paymentAllocation: application.paymentAllocation
          ? {
              id: application.paymentAllocation.id,
              allocatedAmount: moneyToNumber(application.paymentAllocation.allocatedAmount),
            }
          : null,
        creditTransaction: application.creditTransaction
          ? {
              ...application.creditTransaction,
              amount: moneyToNumber(application.creditTransaction.amount),
            }
          : null,
        projectAdjustment: application.projectAdjustment
          ? {
              ...application.projectAdjustment,
              amount: moneyToNumber(application.projectAdjustment.amount),
            }
          : null,
      })),
    }
  })
}
