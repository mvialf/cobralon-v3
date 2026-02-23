/**
 * Types for Project List API (Raw SQL Query)
 *
 * Tipos TypeScript para mantener type safety con $queryRaw
 */

import { Decimal } from '@prisma/client/runtime/library'
import { derivePaymentProgress } from '@/lib/business-logic/project-balance'

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
  total: Decimal
  balance: Decimal
  windowsCount: number
  squareMeters: Decimal
  description: string | null
  createdAt: Date
  updatedAt: Date
  currency: string
  totalAmount: Decimal | null

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
  total: number
  balance: number
  totalPaid: number
  percentPaid: number
  windowsCount: number
  squareMeters: number
  description: string | null
  createdAt: Date
  updatedAt: Date
  currency: string
  totalAmount: number | null
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
  const total = Number(row.total)
  const balance = Number(row.balance)
  const { totalPaid, percentPaid } = derivePaymentProgress(total, balance)

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
    total,
    balance,
    totalPaid,
    percentPaid,
    windowsCount: row.windowsCount,
    squareMeters: Number(row.squareMeters),
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    currency: row.currency,
    totalAmount: row.totalAmount ? Number(row.totalAmount) : null,
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
