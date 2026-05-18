import { type Table } from '@tanstack/react-table'

export { DataTable, type ServerFacet, type ServerFacets } from './data-table'
export { DataTableColumnHeader } from './data-table-column-header'
export { DataTableDropdown } from './data-table-dropdown'
export { type BulkAction } from './data-table-bulk-actions'

// Columnas reutilizables
export { createSelectColumn } from './columns/select-column'

// Funciones de filtrado normalizadas (ignoran acentos/tildes)
export { createNormalizedFilter } from './filter-functions'

/** Type-safe helper to extract table meta */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTableMeta<TMeta>(table: Table<any>): TMeta {
  return (table.options.meta || {}) as TMeta
}
