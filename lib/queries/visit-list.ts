/**
 * SQL Queries para listado de visitas con paginación en base de datos
 *
 * Usa extensiones PostgreSQL:
 * - unaccent: Para búsqueda sin acentos
 *
 * Función normalize_text(text) debe existir en la DB:
 * CREATE OR REPLACE FUNCTION normalize_text(text) RETURNS text AS $$
 *   SELECT lower(public.unaccent($1))
 * $$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  VisitListRawRow,
  VisitCountRow,
  VisitFacetRow,
  VisitListFilters,
  VisitListItem,
  transformRawToVisitListItem,
} from '@/types/visit-list'

/**
 * Whitelist de columnas permitidas para ORDER BY.
 * Mapea nombres de columna del frontend a fragmentos SQL seguros.
 */
const SORT_COLUMN_MAP: Record<string, Prisma.Sql> = {
  date: Prisma.sql`v.date`,
  createdAt: Prisma.sql`v."createdAt"`,
  name: Prisma.sql`v.name`,
  comuna: Prisma.sql`v.comuna`,
  visitStatus: Prisma.sql`vs.name`,
}

/**
 * Construye las condiciones WHERE compartidas entre queries
 */
function buildWhereConditions(filters: Pick<VisitListFilters, 'search' | 'visitStatusIds'>) {
  return Prisma.sql`
    WHERE 1=1
      ${
        filters.visitStatusIds.length > 0
          ? Prisma.sql`AND v."visitStatusId"::text = ANY(${filters.visitStatusIds})`
          : Prisma.empty
      }
      ${
        filters.search
          ? Prisma.sql`AND (
        normalize_text(v.name) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(v.phone, '')) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(v.street, '')) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(v.comuna) LIKE normalize_text(${`%${filters.search}%`})
      )`
          : Prisma.empty
      }
  `
}

/**
 * Ejecuta query principal de visitas con paginación en DB
 */
export async function queryVisitList(filters: VisitListFilters): Promise<VisitListItem[]> {
  const offset = (filters.page - 1) * filters.limit
  const where = buildWhereConditions(filters)

  const rows = await prisma.$queryRaw<VisitListRawRow[]>`
    SELECT
      v.id,
      v.name,
      v.phone,
      v.street,
      v.apartment,
      v.comuna,
      v.region,
      v."visitStatusId",
      v.date,
      v."scheduledTime",
      v.observations,
      v."createdAt",
      v."updatedAt",
      vs.id as status_id,
      vs.name as status_name,
      vs."isInitial" as "status_isInitial",
      vs."isFinal" as "status_isFinal",
      bc."bgClass" as "status_bgClass",
      bc."textClass" as "status_textClass"
    FROM "Visit" v
    INNER JOIN "VisitStatus" vs ON v."visitStatusId" = vs.id
    LEFT JOIN "BadgeColor" bc ON vs."colorId" = bc.id
    ${where}
    ORDER BY ${
      filters.sortBy && SORT_COLUMN_MAP[filters.sortBy]
        ? Prisma.sql`${SORT_COLUMN_MAP[filters.sortBy]} ${filters.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}`
        : Prisma.sql`v.date DESC`
    }
    LIMIT ${filters.limit}
    OFFSET ${offset}
  `

  return rows.map(transformRawToVisitListItem)
}

/**
 * Cuenta total de visitas que cumplen los filtros (para paginación)
 */
export async function countVisits(
  filters: Pick<VisitListFilters, 'search' | 'visitStatusIds'>
): Promise<number> {
  const where = buildWhereConditions(filters)

  const rows = await prisma.$queryRaw<VisitCountRow[]>`
    SELECT COUNT(*)::bigint as count
    FROM "Visit" v
    INNER JOIN "VisitStatus" vs ON v."visitStatusId" = vs.id
    ${where}
  `

  return Number(rows[0]?.count ?? 0)
}

/**
 * Obtiene facets (conteos) para filtros de estado de visita
 * Se calculan sobre las visitas filtradas por search, sin filtro de visitStatusIds
 */
export async function getVisitStatusFacets(
  filters: Pick<VisitListFilters, 'search'>
): Promise<{ value: string; label: string; count: number }[]> {
  const where = buildWhereConditions({ search: filters.search, visitStatusIds: [] })

  const rows = await prisma.$queryRaw<VisitFacetRow[]>`
    SELECT
      v."visitStatusId" as value,
      vs.name as label,
      COUNT(*)::bigint as count
    FROM "Visit" v
    INNER JOIN "VisitStatus" vs ON v."visitStatusId" = vs.id
    ${where}
    GROUP BY v."visitStatusId", vs.name
    ORDER BY count DESC
  `

  return rows.map((row) => ({
    value: row.value,
    label: row.label,
    count: Number(row.count),
  }))
}
