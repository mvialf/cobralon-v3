# Installments (Cuotas Comercio)

| Campo | Valor |
|-------|-------|
| URL | `/payments/installments` |
| Spec | `tests/e2e/installments.spec.ts` |
| Page Object | `tests/e2e/page-objects/installments.page.ts` |

## Estructura de Página

### Layout
- Breadcrumb: `Inicio > Pagos > Cuotas Comercio`
- Header: h1 "Cuotas Comercio" (sin botón de creación — solo lectura)
- Toolbar: búsqueda `"Buscar por cliente..."` + filtro Estado (con badge "Pendiente" pre-aplicado) + "Columnas"
- DataTable + paginación (default 50 filas)

### Columnas de la Tabla
| Columna | Header | Contenido |
|---------|--------|-----------|
| Cliente/Proyecto | `button "Cliente/Proyecto"` | "P - XXXXX - Nombre Cliente" |
| Cuota | `button "Cuota"` | "X / Y" |
| Monto | `button "Monto"` | `$XXX.XXX` (CLP) |
| Vencimiento | `button "Vencimiento"` | DD-MM-YYYY |
| Estado | `button "Estado"` | Badge "Pendiente" / "Pagado" |
| Fecha Pago | `button "Fecha Pago"` | Fecha o "-" si no pagado |
| Método de Pago | `button "Método de Pago"` | Nombre del método |
| Acciones | — | `button "Abrir menu"` |

### Filtro de Estado
- Botón "Estado" con badge "Pendiente" pre-aplicado por defecto
- Badge removible: botón "Quitar filtro Pendiente" (X)
- Opciones: Pendiente, Pagado (vía popover con `[role="option"]`)

## Selectores Clave

| Elemento | Selector |
|----------|----------|
| Heading | `getByRole('heading', { name: 'Cuotas Comercio' })` |
| Búsqueda | `getByPlaceholder(/Buscar por cliente/i)` |
| Filtro estado | `getByRole('button', { name: /Estado/i })` |
| Tabla heading | `getByRole('heading', { name: 'Todas las Cuotas' })` |
| Columna Cliente | `getByRole('columnheader', { name: /Cliente\/Proyecto/i })` |
| Columna Cuota | `getByRole('columnheader', { name: /Cuota/i })` |
| Columna Monto | `getByRole('columnheader', { name: /Monto/i })` |
| Columna Vencimiento | `getByRole('columnheader', { name: /Vencimiento/i })` |
| Columna Estado | `getByRole('columnheader', { name: /Estado/i })` |
| Columna Fecha Pago | `getByRole('columnheader', { name: /Fecha Pago/i })` |
| Columna Método | `getByRole('columnheader', { name: /Método de Pago/i })` |
| Opciones filtro | `getByRole('option', { name: /Pendiente\|Pagado/i })` |
| Quitar filtro | `getByRole('button', { name: /Quitar filtro Pendiente/i })` |
| Acciones fila | `row.getByRole('button', { name: 'Abrir menu' })` |

## Comportamientos UI

- **Filtro pre-aplicado**: carga con "Estado: Pendiente" activo por defecto
- **Badge removible**: filtro activo con botón X para remover
- **Solo lectura**: no hay dialog de creación (cuotas se crean vía pagos fraccionados)
- **Columnas sorteables**: todos los headers con botones de ordenamiento
- **Formato moneda CLP**: `$XXX.XXX` con separador de miles
- **Formato cuota**: "X / Y" (número / total)
- **Fecha pago vacía**: muestra "-" si no está pagada
- **Dropdown simple**: acciones limitadas (ej: "Copiar ID")
- **Sin stat cards**: la página NO muestra cards de estadísticas (a pesar de lo que pueda indicar el spec)

## Edge Cases

- Tabla vacía: "No se encontraron resultados"
- Filtro Pendiente por defecto: al cargar solo muestra cuotas pendientes
- Cuotas vencidas: fecha anterior a hoy + estado "Pendiente"
- Búsqueda + filtro: combinación de búsqueda por cliente y filtro por estado
- Responsive mobile: contenido se adapta en viewport 375x667

## API Endpoints

- `GET /api/installments` — lista (búsqueda, filtros, paginación)
