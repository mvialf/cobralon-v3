/**
 * Types para Visit List API (Raw SQL Query)
 *
 * Tipos TypeScript para mantener type safety con $queryRaw
 */

/**
 * Resultado raw de la query SQL para listado de visitas
 * Mapea exactamente las columnas seleccionadas en la query
 */
export interface VisitListRawRow {
  // Visit fields
  id: string
  name: string
  phone: string | null
  street: string | null
  apartment: string | null
  comuna: string
  region: string
  visitStatusId: string
  date: Date
  scheduledTime: string | null
  observations: string | null
  createdAt: Date
  updatedAt: Date

  // VisitStatus fields (from INNER JOIN)
  status_id: string
  status_name: string
  status_isInitial: boolean
  status_isFinal: boolean

  // BadgeColor fields (from LEFT JOIN)
  status_bgClass: string | null
  status_textClass: string | null
}

/**
 * Visita formateada para respuesta de API
 * Compatible con el tipo Visit de visit-validations.ts
 */
export interface VisitListItem {
  id: string
  name: string
  phone: string | null
  street: string | null
  apartment: string | null
  comuna: string
  region: string
  visitStatusId: string
  date: Date
  scheduledTime: string | null
  observations: string | null
  createdAt: Date
  updatedAt: Date
  visitStatus: {
    id: string
    name: string
    isInitial: boolean
    isFinal: boolean
    color: {
      bgClass: string
      textClass: string
    }
  }
}

/**
 * Resultado de COUNT para paginación
 */
export interface VisitCountRow {
  count: bigint
}

/**
 * Resultado de facets para filtros de estado
 */
export interface VisitFacetRow {
  value: string
  label: string
  count: bigint
}

/**
 * Parámetros de filtro para la query
 */
export interface VisitListFilters {
  page: number
  limit: number
  search: string
  visitStatusIds: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Transforma una fila raw a VisitListItem
 */
export function transformRawToVisitListItem(row: VisitListRawRow): VisitListItem {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    street: row.street,
    apartment: row.apartment,
    comuna: row.comuna,
    region: row.region,
    visitStatusId: row.visitStatusId,
    date: row.date,
    scheduledTime: row.scheduledTime,
    observations: row.observations,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    visitStatus: {
      id: row.status_id,
      name: row.status_name,
      isInitial: row.status_isInitial,
      isFinal: row.status_isFinal,
      color: {
        bgClass: row.status_bgClass ?? '',
        textClass: row.status_textClass ?? '',
      },
    },
  }
}
