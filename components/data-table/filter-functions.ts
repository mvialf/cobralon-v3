/**
 * Funciones de filtrado normalizadas para TanStack Table
 *
 * Proporciona funciones de filtrado que ignoran acentos/tildes,
 * permitiendo búsquedas como "jose" que encuentren "José".
 *
 * @example
 * // En DataTable, usar como globalFilterFn
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   enableGlobalFilter={true}
 *   globalFilterFn={normalizedGlobalFilter}
 * />
 */

import { FilterFn, Row } from '@tanstack/react-table'
import { normalizeForSearch } from '@/lib/utils/normalize'

// Usamos 'any' aquí intencionalmente para compatibilidad con TanStack Table
// Las funciones built-in de TanStack también usan este patrón
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Función de filtrado por columna que ignora acentos.
 *
 * Reemplaza el `includesString` por defecto de TanStack Table.
 * Busca si el valor de la celda contiene el término de búsqueda,
 * ignorando mayúsculas y acentos.
 *
 * @example
 * // En definición de columna
 * {
 *   accessorKey: 'name',
 *   filterFn: normalizedIncludesString,
 * }
 */
export const normalizedIncludesString: FilterFn<any> = (
  row: Row<any>,
  columnId: string,
  filterValue: string | string[]
): boolean => {
  if (!filterValue) return true

  const cellValue = row.getValue(columnId)

  if (cellValue == null) return false

  const cellString = String(cellValue)

  // Si filterValue es un array (filtro faceted), verificar si el valor está en el array
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true
    return filterValue.includes(cellString)
  }

  // Si es string (búsqueda por texto), usar lógica normalizada
  const normalizedCell = normalizeForSearch(cellString)
  const normalizedFilter = normalizeForSearch(filterValue)

  return normalizedCell.includes(normalizedFilter)
}

// Marcar la función como auto-removable cuando el filtro está vacío
normalizedIncludesString.autoRemove = (val: unknown) =>
  !val || val === '' || (Array.isArray(val) && val.length === 0)

/**
 * Función de filtrado global que busca en TODAS las columnas visibles.
 *
 * Ignora acentos y mayúsculas. Busca el término en cada columna
 * y retorna true si alguna columna contiene el término.
 *
 * @example
 * <DataTable
 *   enableGlobalFilter={true}
 *   globalFilterFn={normalizedGlobalFilter}
 * />
 */
export const normalizedGlobalFilter: FilterFn<any> = (
  row: Row<any>,
  columnId: string,
  filterValue: string
): boolean => {
  if (!filterValue) return true

  const normalizedFilter = normalizeForSearch(filterValue)

  // Obtener todas las columnas visibles y buscar en cada una
  const visibleCells = row.getVisibleCells()

  for (const cell of visibleCells) {
    const value = cell.getValue()

    if (value == null) continue

    // Manejar objetos anidados (ej: customer.name)
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

    if (normalizeForSearch(stringValue).includes(normalizedFilter)) {
      return true
    }
  }

  return false
}

normalizedGlobalFilter.autoRemove = (val: unknown) => !val || val === ''

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Crea una función de filtrado global personalizada que busca en campos específicos.
 *
 * Útil cuando quieres controlar exactamente qué campos se buscan,
 * especialmente con relaciones anidadas.
 *
 * @param getSearchableFields - Función que extrae los campos buscables de una fila
 * @returns FilterFn configurada para buscar en esos campos
 *
 * @example
 * // Crear filtro que busque en project.customer.name y description
 * const aftersaleFilter = createNormalizedFilter<Aftersale>((row) => [
 *   row.project.projectNumber,
 *   row.project.customer.name,
 *   row.description,
 * ])
 *
 * <DataTable globalFilterFn={aftersaleFilter} />
 */
export function createNormalizedFilter<TData>(
  getSearchableFields: (data: TData) => (string | null | undefined)[]
): FilterFn<TData> {
  const filterFn: FilterFn<TData> = (
    row: Row<TData>,
    _columnId: string,
    filterValue: string
  ): boolean => {
    if (!filterValue) return true

    const normalizedFilter = normalizeForSearch(filterValue)
    const fields = getSearchableFields(row.original)

    return fields.some((field) => {
      if (!field) return false
      return normalizeForSearch(field).includes(normalizedFilter)
    })
  }

  filterFn.autoRemove = (val: unknown) => !val || val === ''

  return filterFn
}
