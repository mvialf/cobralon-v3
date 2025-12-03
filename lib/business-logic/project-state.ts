/**
 * Business logic for calculating project state
 *
 * Project State Classification:
 * - "Activo": Project is not finalized OR has pending balance
 * - "Finalizado": Project has final status AND balance is fully paid (0)
 */

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
  const isFullyPaid = balance === 0
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
