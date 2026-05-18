/**
 * Business logic for calculating project state
 *
 * Project State Classification:
 * - "Activo": Project is not finalized OR has pending balance (> BALANCE_TOLERANCE)
 * - "Finalizado": Project has final status AND balance is within tolerance (≤ BALANCE_TOLERANCE)
 */

import { FINANCIAL } from '../constants/financial-constants'
import { greaterThanMoneyWithTolerance } from './money'

export type ProjectState = 'Activo' | 'Finalizado'

/**
 * Filter type for project state queries.
 * Includes valid ProjectState values plus 'all' for unfiltered queries.
 */
export type ProjectStateFilter = ProjectState | 'all'

/**
 * Calculate project state based on balance and status
 *
 * @param balance - Current project balance (total - totalPaid)
 * @param isFinal - Whether the project status is marked as final
 *
 * @returns Project state: "Activo" or "Finalizado"
 *
 * @example
 * // Project completed but with debt
 * calculateProjectState(500, true) // => "Activo"
 *
 * @example
 * // Project in progress but fully paid
 * calculateProjectState(0, false) // => "Activo"
 *
 * @example
 * // Project completed and fully paid
 * calculateProjectState(0, true) // => "Finalizado"
 */
export function calculateProjectState(
  balance: number,
  isFinal: boolean | undefined | null
): ProjectState {
  const isFullyPaid = !greaterThanMoneyWithTolerance(balance, 0, FINANCIAL.BALANCE_TOLERANCE)
  const hasFinalStatus = isFinal ?? false

  return isFullyPaid && hasFinalStatus ? 'Finalizado' : 'Activo'
}

/**
 * Check if project should be included when filtering by state
 *
 * @param projectBalance - Project balance
 * @param projectIsFinal - Whether project status is final
 * @param filterState - State to filter by (ProjectStateFilter: 'Activo' | 'Finalizado' | 'all')
 *
 * @returns true if project matches the filter
 */
export function matchesProjectState(
  projectBalance: number,
  projectIsFinal: boolean | undefined | null,
  filterState: ProjectStateFilter
): boolean {
  if (filterState === 'all') return true

  const projectState = calculateProjectState(projectBalance, projectIsFinal)
  return projectState === filterState
}

// ============================================================================
// Prisma Where Clause Helpers
// ============================================================================
// Estos helpers generan condiciones Prisma `where` reutilizables para filtrar
// proyectos por estado, garantizando consistencia en toda la aplicación.

/**
 * Tipo para las condiciones where de Prisma para proyectos
 * Compatible con ProjectWhereInput de Prisma
 */
export type ProjectStateWhereClause = {
  OR?: Array<{
    projectStatus?: { isFinal: boolean } | null
    balance?: { gt: number }
  }>
  AND?: Array<{
    projectStatus?: { isFinal: boolean }
    balance?: { equals?: number; lte?: number; gte?: number }
  }>
}

/**
 * Genera condición Prisma `where` para proyectos ACTIVOS
 *
 * Un proyecto está "Activo" si:
 * - projectStatus.isFinal = false, O
 * - projectStatus = null (sin estado asignado), O
 * - balance > 0 (tiene deuda pendiente, independiente del status)
 *
 * @returns Objeto where compatible con Prisma
 *
 * @example
 * ```ts
 * const activeProjects = await prisma.project.findMany({
 *   where: getActiveProjectsWhere(),
 * })
 * ```
 */
export function getActiveProjectsWhere(): ProjectStateWhereClause {
  return {
    OR: [
      { projectStatus: { isFinal: false } },
      { projectStatus: null },
      { balance: { gt: FINANCIAL.BALANCE_TOLERANCE } },
    ],
  }
}

/**
 * Genera condición Prisma `where` para proyectos FINALIZADOS
 *
 * Un proyecto está "Finalizado" si AMBAS condiciones se cumplen:
 * - projectStatus.isFinal = true, Y
 * - balance = 0 (sin deuda pendiente)
 *
 * @returns Objeto where compatible con Prisma
 *
 * @example
 * ```ts
 * const finishedProjects = await prisma.project.findMany({
 *   where: getFinishedProjectsWhere(),
 * })
 * ```
 */
export function getFinishedProjectsWhere(): ProjectStateWhereClause {
  return {
    AND: [{ projectStatus: { isFinal: true } }, { balance: { lte: FINANCIAL.BALANCE_TOLERANCE } }],
  }
}

/**
 * Genera condición Prisma `where` según el filtro de estado solicitado
 *
 * @param filterState - Estado a filtrar: 'Activo', 'Finalizado', o 'all'
 * @returns Objeto where compatible con Prisma, o undefined si filterState es 'all'
 *
 * @example
 * ```ts
 * const where = getProjectStateWhere('Activo')
 * const projects = await prisma.project.findMany({ where })
 * ```
 */
export function getProjectStateWhere(
  filterState: ProjectStateFilter
): ProjectStateWhereClause | undefined {
  switch (filterState) {
    case 'Activo':
      return getActiveProjectsWhere()
    case 'Finalizado':
      return getFinishedProjectsWhere()
    case 'all':
      return undefined
  }
}
