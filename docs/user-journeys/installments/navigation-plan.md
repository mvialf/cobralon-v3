# Installments (Cuotas Comercio) - Plan de Navegacion

## Resumen

| Campo | Valor |
|-------|-------|
| URL | `/payments/installments` |
| Spec E2E | `tests/e2e/installments.spec.ts` |
| Page Object | `tests/e2e/page-objects/installments.page.ts` |

## Screenshots de Referencia

| # | Archivo | Descripcion |
|---|---------|-------------|
| 1 | [`01-pagina-cuotas.png`](../reference/installments/01-pagina-cuotas.png) | Pagina completa con tabla de cuotas, filtro "Estado: Pendiente" pre-aplicado, 20 cuotas visibles |

## Estructura de la Pagina

### Layout Principal
- **Sidebar** (izquierda): Navegacion global (submenu "Pagos" expandido)
- **Breadcrumb**: `Inicio > Pagos > Cuotas Comercio`
- **Header**: Titulo "Cuotas Comercio" (h1)
- **Toolbar**: Input de busqueda + filtro Estado (con badge pre-aplicado "Pendiente") + boton "Columnas"
- **Tabla**: DataTable con cuotas de comercio
- **Paginacion**: Control de filas por pagina + navegacion de paginas

**Nota**: No hay stat cards visibles en la UI actual. El spec las menciona pero la pagina muestra directamente la tabla.

### Columnas de la Tabla
| Columna | Header (boton sorteable) | Contenido |
|---------|-------------------------|-----------|
| Cliente/Proyecto | `button "Cliente/Proyecto"` | Formato "P - XXXXX - Nombre Cliente" |
| Cuota | `button "Cuota"` | Formato "X / Y" (numero cuota / total cuotas) |
| Monto | `button "Monto"` | Formato "$XXX.XXX" (CLP) |
| Vencimiento | `button "Vencimiento"` | Formato DD-MM-YYYY |
| Estado | `button "Estado"` | Badge: "Pendiente" / "Pagado" |
| Fecha Pago | `button "Fecha Pago"` | Fecha de pago o "-" si no pagado |
| Metodo de Pago | `button "Método de Pago"` | Nombre del metodo (ej: "Tarjeta de Crédito") |
| (sin header) | | Boton "Abrir menu" con dropdown de acciones |

### Paginacion
- Selector "Filas por pagina" (combobox, default: 50)
- Texto: "Pagina X de Y"
- Botones: Primera / Anterior / Siguiente / Ultima
- Botones disabled cuando no aplica

### Filtro de Estado
- **Boton**: `button "Estado"` con icono + badge "Pendiente" pre-aplicado
- **Badge removible**: Boton "Quitar filtro Pendiente" (X) para remover filtro
- **Opciones**: Pendiente, Pagado (via popover con [role="option"])

## Plan de Navegacion

### 1. Carga inicial
```
navigate -> /payments/installments
waitFor  -> heading "Cuotas Comercio" [level=1]
waitFor  -> table visible
```

### 2. Verificar estructura de pagina
```
assert -> text "Inicio" visible (breadcrumb)
assert -> text "Pagos" visible (breadcrumb)
assert -> text "Cuotas Comercio" visible (breadcrumb)
assert -> heading "Cuotas Comercio" [level=1]
```

### 3. Verificar tabla de cuotas
```
assert -> columnheader con button "Cliente/Proyecto" visible
assert -> columnheader con button "Cuota" visible
assert -> columnheader con button "Monto" visible
assert -> columnheader con button "Vencimiento" visible
assert -> columnheader con button "Estado" visible
assert -> columnheader con button "Fecha Pago" visible
assert -> columnheader con button "Método de Pago" visible
assert -> filas de datos visibles en tbody
```

### 4. Verificar campo de busqueda
```
assert -> textbox "Buscar por cliente..." visible
```

### 5. Buscar cuotas por cliente
```
fill   -> textbox "Buscar por cliente..." = "Leonardo"
waitFor -> respuesta /api/ (debounce)
assert -> tabla actualizada con resultados filtrados
```

### 6. Verificar filtro de estado
```
assert -> button "Estado" visible (con badge "Pendiente")
```

### 7. Abrir opciones del filtro de estado
```
click  -> button "Estado"
waitFor -> opciones visibles
assert -> option "Pendiente" visible
assert -> option "Pagado" visible
```

### 8. Filtrar por estado Pendiente
```
click  -> option "Pendiente"
press  -> Escape (cerrar popover)
waitFor -> tabla actualizada
```

### 9. Quitar filtro activo
```
click  -> button "Quitar filtro Pendiente" (X en badge)
waitFor -> tabla actualizada (muestra todas las cuotas)
```

### 10. Dropdown de acciones por cuota
```
click  -> button "Abrir menu" de primera fila
waitFor -> menu visible
assert -> menuitem "Copiar ID" visible
```

### 11. Verificar responsive mobile
```
setViewportSize -> { width: 375, height: 667 }
navigate -> /payments/installments
assert -> heading "Cuotas Comercio" visible
```

## Observaciones

### Selectores Clave
| Elemento | Selector Playwright |
|----------|-------------------|
| Heading | `getByRole('heading', { name: 'Cuotas Comercio' })` |
| Busqueda | `getByPlaceholder(/Buscar por cliente/i)` |
| Filtro estado | `getByRole('button', { name: /Estado/i })` |
| Tabla heading | `getByRole('heading', { name: 'Todas las Cuotas' })` |
| Columna Cliente | `getByRole('columnheader', { name: /Cliente\/Proyecto/i })` |
| Columna Cuota | `getByRole('columnheader', { name: /Cuota/i })` |
| Columna Monto | `getByRole('columnheader', { name: /Monto/i })` |
| Columna Vencimiento | `getByRole('columnheader', { name: /Vencimiento/i })` |
| Columna Estado | `getByRole('columnheader', { name: /Estado/i })` |
| Columna Fecha Pago | `getByRole('columnheader', { name: /Fecha Pago/i })` |
| Columna Metodo | `getByRole('columnheader', { name: /Método de Pago/i })` |
| Acciones row | Fila -> `getByRole('button', { name: 'Abrir menu' })` |
| Opciones filtro | `getByRole('option', { name: /Pendiente\|Pagado/i })` |
| Quitar filtro | `getByRole('button', { name: /Quitar filtro Pendiente/i })` |
| Columnas btn | `getByRole('button', { name: /Columnas/i })` |
| Paginacion | Texto "Pagina X de Y" + botones de navegacion |

### Comportamientos UI
- **Filtro pre-aplicado**: La pagina carga con filtro "Estado: Pendiente" activo por defecto
- **Badge removible**: El filtro activo muestra un badge con boton X para removerlo
- **Sin stat cards**: A pesar de lo que indica el spec, la pagina NO muestra cards de estadisticas
- **Solo lectura**: No hay dialog de creacion de cuotas (se crean via pagos fraccionados)
- **Columnas sorteables**: Todas las columnas tienen botones de ordenamiento
- **Formato moneda CLP**: Montos en formato "$XXX.XXX" con separador de miles
- **Formato cuota**: "X / Y" donde X es numero de cuota e Y es total de cuotas
- **Metodo de pago**: Muestra el nombre del metodo de pago asociado al pago fraccionado
- **Fecha pago vacía**: Si la cuota no esta pagada, muestra "-"
- **Dropdown simple**: Acciones limitadas (ej: "Copiar ID")

### Edge Cases
- Tabla vacia: Muestra "No se encontraron resultados"
- Filtro Pendiente por defecto: Al cargar, solo muestra cuotas pendientes
- Cuotas vencidas: Cuotas con fecha anterior a hoy y estado "Pendiente"
- Responsive: Las cards (si existieran) se apilan en mobile
- Busqueda + filtro: Combinacion de busqueda por cliente y filtro por estado

### API Endpoints
- `GET /api/installments` - Lista de cuotas (con busqueda, filtros y paginacion)

## Mapping Navegacion - Test

| Paso | Test en spec | Descripcion |
|------|-------------|-------------|
| 1-2 | `debe cargar la pagina correctamente` | Verifica heading y breadcrumbs |
| 3 | `debe mostrar las columnas correctas` | Verifica headers de columnas |
| 4 | `debe tener campo de busqueda por cliente` | Busqueda visible |
| 5 | `debe filtrar cuotas al buscar` | Buscar y verificar tabla |
| 6-7 | `debe tener filtro por estado` | Filtro visible con opciones |
| 8 | `debe filtrar por estado Pendiente` | Seleccionar Pendiente |
| 7 | `debe mostrar opciones de filtro al hacer click` | Opciones Pendiente/Pagado |
| 10 | `debe mostrar dropdown de acciones si hay cuotas` | Menu con "Copiar ID" |
| 11 | `debe ser responsive en mobile` | Viewport 375x667 |
