/**
 * Types for API Routes
 *
 * Este archivo contiene tipos TypeScript para las API routes del proyecto.
 */

import { Prisma } from '@prisma/client'

/**
 * Allocation input para crear pagos
 */
export interface AllocationInput {
  projectId: string
  allocatedAmount: number
}

/**
 * Tipo para filtros de Prisma Payment
 */
export type PaymentWhereInput = Prisma.PaymentWhereInput

/**
 * Tipo para filtros de Prisma Project
 */
export type ProjectWhereInput = Prisma.ProjectWhereInput

/**
 * Tipo para actualizaciones de Prisma Project
 */
export type ProjectUpdateInput = Prisma.ProjectUpdateInput
