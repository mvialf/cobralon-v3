/**
 * SQL Queries para listado de proyectos con paginación en base de datos
 *
 * Usa extensiones PostgreSQL:
 * - unaccent: Para búsqueda sin acentos
 * - pg_trgm: Para índices GIN de búsqueda
 *
 * Función normalize_text(text) debe existir en la DB:
 * CREATE OR REPLACE FUNCTION normalize_text(text) RETURNS text AS $$
 *   SELECT lower(public.unaccent($1))
 * $$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  ProjectListRawRow,
  ProjectCountRow,
  ProjectFacetRow,
  ProjectListFilters,
  ProjectListItem,
  transformRawToProjectListItem,
} from '@/types/project-list'

/**
 * Ejecuta query principal de proyectos con paginación en DB
 */
export async function queryProjectList(filters: ProjectListFilters): Promise<ProjectListItem[]> {
  const offset = (filters.page - 1) * filters.limit

  // Query dinámica con Prisma.sql template literals para SQL injection safety
  const rows = await prisma.$queryRaw<ProjectListRawRow[]>`
    SELECT
      p.id,
      p."projectNumber",
      p."projectName",
      p."customerId",
      p.phone,
      p.street,
      p.apartment,
      p.comuna,
      p.region,
      p."projectStatusId",
      p.date,
      p.subtotal,
      p."taxRate",
      p.total,
      p.balance,
      p."windowsCount",
      p."squareMeters",
      p.description,
      p."createdAt",
      p."updatedAt",
      p.currency,
      p."totalAmount",
      c.id as customer_id,
      c.name as customer_name,
      c.phone as customer_phone,
      ps.id as status_id,
      ps.name as status_name,
      ps."isFinal" as "status_isFinal",
      bc."bgClass" as "status_bgClass"
    FROM "Project" p
    INNER JOIN "Customer" c ON p."customerId" = c.id
    LEFT JOIN "ProjectStatus" ps ON p."projectStatusId" = ps.id
    LEFT JOIN "BadgeColor" bc ON ps."colorId" = bc.id
    WHERE 1=1
      ${filters.customerId ? Prisma.sql`AND p."customerId" = ${filters.customerId}` : Prisma.empty}
      ${filters.actualStatusIds.length > 0 && !filters.filterByNullStatus ? Prisma.sql`AND p."projectStatusId" = ANY(${filters.actualStatusIds}::uuid[])` : Prisma.empty}
      ${filters.filterByNullStatus && filters.actualStatusIds.length === 0 ? Prisma.sql`AND p."projectStatusId" IS NULL` : Prisma.empty}
      ${filters.filterByNullStatus && filters.actualStatusIds.length > 0 ? Prisma.sql`AND (p."projectStatusId" IS NULL OR p."projectStatusId" = ANY(${filters.actualStatusIds}::uuid[]))` : Prisma.empty}
      ${filters.projectState === 'Finalizado' ? Prisma.sql`AND (p.balance = 0 AND ps."isFinal" = true)` : Prisma.empty}
      ${filters.projectState === 'Activo' ? Prisma.sql`AND (p.balance > 0 OR ps."isFinal" IS NOT TRUE)` : Prisma.empty}
      ${
        filters.search
          ? Prisma.sql`AND (
        normalize_text(p."projectNumber") LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(c.name) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(ps.name, '')) LIKE normalize_text(${`%${filters.search}%`})
      )`
          : Prisma.empty
      }
    ORDER BY p."createdAt" DESC
    LIMIT ${filters.limit}
    OFFSET ${offset}
  `

  return rows.map(transformRawToProjectListItem)
}

/**
 * Cuenta total de proyectos que cumplen los filtros (para paginación)
 */
export async function countProjects(filters: ProjectListFilters): Promise<number> {
  const rows = await prisma.$queryRaw<ProjectCountRow[]>`
    SELECT COUNT(*)::bigint as count
    FROM "Project" p
    INNER JOIN "Customer" c ON p."customerId" = c.id
    LEFT JOIN "ProjectStatus" ps ON p."projectStatusId" = ps.id
    WHERE 1=1
      ${filters.customerId ? Prisma.sql`AND p."customerId" = ${filters.customerId}` : Prisma.empty}
      ${filters.actualStatusIds.length > 0 && !filters.filterByNullStatus ? Prisma.sql`AND p."projectStatusId" = ANY(${filters.actualStatusIds}::uuid[])` : Prisma.empty}
      ${filters.filterByNullStatus && filters.actualStatusIds.length === 0 ? Prisma.sql`AND p."projectStatusId" IS NULL` : Prisma.empty}
      ${filters.filterByNullStatus && filters.actualStatusIds.length > 0 ? Prisma.sql`AND (p."projectStatusId" IS NULL OR p."projectStatusId" = ANY(${filters.actualStatusIds}::uuid[]))` : Prisma.empty}
      ${filters.projectState === 'Finalizado' ? Prisma.sql`AND (p.balance = 0 AND ps."isFinal" = true)` : Prisma.empty}
      ${filters.projectState === 'Activo' ? Prisma.sql`AND (p.balance > 0 OR ps."isFinal" IS NOT TRUE)` : Prisma.empty}
      ${
        filters.search
          ? Prisma.sql`AND (
        normalize_text(p."projectNumber") LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(c.name) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(ps.name, '')) LIKE normalize_text(${`%${filters.search}%`})
      )`
          : Prisma.empty
      }
  `

  return Number(rows[0]?.count ?? 0)
}

/**
 * Obtiene facets (conteos) para filtros de status
 * Se calculan sobre los proyectos filtrados por projectState y search
 */
export async function getStatusFacets(
  filters: Omit<
    ProjectListFilters,
    'statusIds' | 'filterByNullStatus' | 'actualStatusIds' | 'page' | 'limit'
  >
): Promise<{ value: string; count: number }[]> {
  const rows = await prisma.$queryRaw<ProjectFacetRow[]>`
    SELECT
      COALESCE(p."projectStatusId"::text, 'null') as value,
      COUNT(*)::bigint as count
    FROM "Project" p
    INNER JOIN "Customer" c ON p."customerId" = c.id
    LEFT JOIN "ProjectStatus" ps ON p."projectStatusId" = ps.id
    WHERE 1=1
      ${filters.customerId ? Prisma.sql`AND p."customerId" = ${filters.customerId}` : Prisma.empty}
      ${filters.projectState === 'Finalizado' ? Prisma.sql`AND (p.balance = 0 AND ps."isFinal" = true)` : Prisma.empty}
      ${filters.projectState === 'Activo' ? Prisma.sql`AND (p.balance > 0 OR ps."isFinal" IS NOT TRUE)` : Prisma.empty}
      ${
        filters.search
          ? Prisma.sql`AND (
        normalize_text(p."projectNumber") LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(c.name) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(ps.name, '')) LIKE normalize_text(${`%${filters.search}%`})
      )`
          : Prisma.empty
      }
    GROUP BY p."projectStatusId"
    ORDER BY count DESC
  `

  return rows.map((row) => ({
    value: row.value,
    count: Number(row.count),
  }))
}

/**
 * Obtiene facets (conteos) para filtro de projectState (Activo/Finalizado)
 * Se calculan sobre los proyectos filtrados por statusIds y search
 */
export async function getStateFacets(
  filters: Omit<ProjectListFilters, 'projectState' | 'page' | 'limit'>
): Promise<{ value: string; count: number }[]> {
  const rows = await prisma.$queryRaw<ProjectFacetRow[]>`
    SELECT
      CASE
        WHEN p.balance = 0 AND ps."isFinal" = true THEN 'Finalizado'
        ELSE 'Activo'
      END as value,
      COUNT(*)::bigint as count
    FROM "Project" p
    INNER JOIN "Customer" c ON p."customerId" = c.id
    LEFT JOIN "ProjectStatus" ps ON p."projectStatusId" = ps.id
    WHERE 1=1
      ${filters.customerId ? Prisma.sql`AND p."customerId" = ${filters.customerId}` : Prisma.empty}
      ${filters.actualStatusIds.length > 0 && !filters.filterByNullStatus ? Prisma.sql`AND p."projectStatusId" = ANY(${filters.actualStatusIds}::uuid[])` : Prisma.empty}
      ${filters.filterByNullStatus && filters.actualStatusIds.length === 0 ? Prisma.sql`AND p."projectStatusId" IS NULL` : Prisma.empty}
      ${filters.filterByNullStatus && filters.actualStatusIds.length > 0 ? Prisma.sql`AND (p."projectStatusId" IS NULL OR p."projectStatusId" = ANY(${filters.actualStatusIds}::uuid[]))` : Prisma.empty}
      ${
        filters.search
          ? Prisma.sql`AND (
        normalize_text(p."projectNumber") LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(c.name) LIKE normalize_text(${`%${filters.search}%`})
        OR normalize_text(COALESCE(ps.name, '')) LIKE normalize_text(${`%${filters.search}%`})
      )`
          : Prisma.empty
      }
    GROUP BY
      CASE
        WHEN p.balance = 0 AND ps."isFinal" = true THEN 'Finalizado'
        ELSE 'Activo'
      END
    ORDER BY count DESC
  `

  return rows.map((row) => ({
    value: row.value,
    count: Number(row.count),
  }))
}
