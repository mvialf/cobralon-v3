/**
 * Helper functions for Projects DataTable columns
 *
 * Pure functions for transformations, sorting, and filtering
 */

import { type Row } from '@tanstack/react-table'
import { type EditableBadgeOption } from '@/components/ui/editable-badge'
import { type Project } from '../types'

/**
 * Transforma un projectStatus en formato EditableBadgeOption
 *
 * @param status - Project status object o null
 * @returns EditableBadgeOption o null si no hay status
 */
export function transformStatusToOption(
  status: Project['projectStatus']
): EditableBadgeOption | null {
  if (!status) return null

  return {
    id: status.id,
    label: status.name,
    color: status.color,
  }
}

/**
 * Función de sorting para columna de projectStatus por nombre
 *
 * @param rowA - Primera fila
 * @param rowB - Segunda fila
 * @returns Número negativo, 0, o positivo para sorting
 */
export function sortByStatusName(rowA: Row<Project>, rowB: Row<Project>): number {
  const statusA = rowA.original.projectStatus?.name || ''
  const statusB = rowB.original.projectStatus?.name || ''
  return statusA.localeCompare(statusB, 'es-CL')
}

/**
 * Función de filtro para columna de projectStatus
 *
 * Soporta filtrado por:
 * - "null": proyectos sin estado
 * - status.id: proyectos con ese estado específico
 *
 * @param row - Fila a filtrar
 * @param _id - Column ID (no usado)
 * @param filterValue - Array de valores de filtro
 * @returns true si la fila pasa el filtro
 */
export function filterByProjectStatus(
  row: Row<Project>,
  _id: string,
  filterValue: string[]
): boolean {
  const status = row.original.projectStatus

  // Si el filtro incluye "null", mostrar solo proyectos sin estado
  if (filterValue.includes('null') && !status) {
    return true
  }

  // Si hay status, verificar si su id está en los valores del filtro
  if (status && filterValue.includes(status.id)) {
    return true
  }

  return false
}
