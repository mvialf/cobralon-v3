export { DataTable, type ServerFacet, type ServerFacets } from './data-table'
export { DataTableColumnHeader } from './data-table-column-header'
export { DataTableDropdown } from './data-table-dropdown'
export { DataTableFacetedFilter } from './data-table-faceted-filter'
export { DataTablePagination } from './data-table-pagination'
export { DataTableRowActions } from './data-table-row-actions'
export { DataTableToolbar } from './data-table-toolbar'
export { DataTableBulkActions, type BulkAction } from './data-table-bulk-actions'

// Columnas reutilizables
export { createSelectColumn } from './columns/select-column'

// Funciones de filtrado normalizadas (ignoran acentos/tildes)
export {
  normalizedGlobalFilter,
  normalizedIncludesString,
  createNormalizedFilter,
} from './filter-functions'
