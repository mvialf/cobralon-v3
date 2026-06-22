/**
 * Types for Project List API (Raw SQL Query)
 *
 * Tipos TypeScript para mantener type safety con $queryRaw
 */

import { Decimal } from '@prisma/client/runtime/library'
import { mapProjectFinancials } from '@/lib/business-logic/project-financials'

/**
 * Resultado raw de la query SQL para listado de proyectos
 * Mapea exactamente las columnas seleccionadas en la query
 */
export interface ProjectListRawRow {
  // Project fields
  id: string
  projectNumber: string
  projectName: string | null
  customerId: string
  phone: string
  street: string | null
  apartment: string | null
  comuna: string
  region: string
  projectStatusId: string | null
  date: Date
  subtotal: Decimal
  taxRate: Decimal
  balance: Decimal
  projectId: string
  allocatedTotal: Decimal
  appliedCashTotal: Decimal
  appliedCreditTotal: Decimal
  adjustmentTotal: Decimal
  settledTotal: Decimal
  rawBalance: Decimal
  overpayment: Decimal
  windowsCount: number
  squareMeters: Decimal
  description: string | null
  createdAt: Date
  updatedAt: Date
  currency: string
  totalAmount: Decimal
  flagStatus: string
  flaggedAt: Date | null

  // Customer fields (from JOIN)
  customer_id: string
  customer_name: string
  customer_phone: string

  // ProjectStatus fields (from LEFT JOIN)
  status_id: string | null
  status_name: string | null
  status_isFinal: boolean | null
  status_bgClass: string | null
}

/**
 * Proyecto formateado para respuesta de API
 * Estructura compatible con el frontend existente
 */
export interface ProjectListItem {
  id: string
  projectNumber: string
  projectName: string | null
  customerId: string
  phone: string
  street: string | null
  apartment: string | null
  comuna: string
  region: string
  projectStatusId: string | null
  date: Date
  subtotal: number
  taxRate: number
  balance: number
  totalPaid: number
  percentPaid: number
  windowsCount: number
  squareMeters: number
  description: string | null
  createdAt: Date
  updatedAt: Date
  currency: string
  totalAmount: number
  flagStatus: 'none' | 'flagged'
  flaggedAt: Date | null
  customer: {
    id: string
    name: string
    phone: string
  }
  projectStatus: {
    id: string
    name: string
    isFinal: boolean
    color: {
      bgClass: string
    }
  } | null
}

/**
 * Resultado de COUNT para paginación
 */
export interface ProjectCountRow {
  count: bigint
}

/**
 * Resultado de facets para filtros
 */
export interface ProjectFacetRow {
  value: string
  count: bigint
}

/**
 * Parámetros de filtro para la query
 */
export interface ProjectListFilters {
  page: number
  limit: number
  search: string
  customerId: string
  statusIds: string[]
  filterByNullStatus: boolean
  actualStatusIds: string[]
  projectState: 'Activo' | 'Finalizado' | 'all'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Transforma una fila raw a ProjectListItem
 */
export function transformRawToProjectListItem(row: ProjectListRawRow): ProjectListItem {
  const financials = mapProjectFinancials(row)
  const totalAmount = Number(row.totalAmount)

  return {
    id: row.id,
    projectNumber: row.projectNumber,
    projectName: row.projectName,
    customerId: row.customerId,
    phone: row.phone,
    street: row.street,
    apartment: row.apartment,
    comuna: row.comuna,
    region: row.region,
    projectStatusId: row.projectStatusId,
    date: row.date,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.taxRate),
    balance: financials.balance,
    totalPaid: financials.totalPaid,
    percentPaid: financials.percentPaid,
    windowsCount: row.windowsCount,
    squareMeters: Number(row.squareMeters),
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    currency: row.currency,
    totalAmount,
    flagStatus: row.flagStatus as 'none' | 'flagged',
    flaggedAt: row.flaggedAt,
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      phone: row.customer_phone,
    },
    projectStatus: row.status_id
      ? {
          id: row.status_id,
          name: row.status_name!,
          isFinal: row.status_isFinal!,
          color: {
            bgClass: row.status_bgClass!,
          },
        }
      : null,
  }
}
