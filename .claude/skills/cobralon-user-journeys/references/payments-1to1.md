# Payments 1:1 (Pago a Cliente)

| Campo | Valor |
|-------|-------|
| URL | `/payments` (compartida con Payments 1:N) |
| Spec | `tests/e2e/payment-to-customer.spec.ts` |
| Page Object | `tests/e2e/page-objects/payments.page.ts` |
| Dialog | `tests/e2e/page-objects/dialogs/payment-to-customer.dialog.ts` |

## Estructura de Página

### Layout
- Breadcrumb: `Inicio > Pagos`
- Header: h1 "Pagos" + botón "Nuevo Pago" (con dropdown)
- Toolbar: búsqueda `"Buscar por cliente/proyecto..."` + filtros facetados + "Columnas"
- DataTable + paginación (7 páginas, default 50 filas)

### Columnas de la Tabla
| Columna | Header | Contenido |
|---------|--------|-----------|
| Seleccionar | checkbox "Seleccionar todo" | checkbox por fila |
| Cliente/Proyecto | `button "Cliente/Proyecto"` | Nombre cliente o `"P - {num} - {nombre}"` |
| N Proyecto | `button "N° Proyecto"` | Número o badge `"X proyectos"` (tipo Cliente) |
| Tipo | `button "Tipo"` | Badge: "Proyecto" (verde) o "Cliente" (azul) |
| Método | `button "Método"` | Nombre del método de pago |
| Monto | `button "Monto"` | `$X.XXX.XXX` |
| Fecha | `button "Fecha"` | Date picker inline `"Cambiar fecha: DD-MM-YYYY"` |
| Acciones | — | `button "Abrir menu"` |

### Filtros Facetados
| Filtro | Tipo |
|--------|------|
| N° Proyecto | button facet |
| Tipo | button facet (Proyecto / Cliente) |
| Método de Pago | button facet |

### Dialog "Registrar Pago a Cliente"
| Campo | Tipo | Estado inicial |
|-------|------|----------------|
| Cliente * | combobox | activo, placeholder "Buscar cliente..." |
| Monto Total del Pago * | textbox | **disabled** hasta seleccionar cliente |
| Fecha del Pago * | textbox | **disabled**, fecha actual |
| Método de Pago * | combobox | pre-seleccionado (primer método) |
| Notas (opcional) | textbox | placeholder "Notas adicionales..." |
| Submit: "Registrar Pago" | button | **disabled** |

### Distribución del Pago (aparece tras seleccionar cliente con proyectos)
- **Tab FIFO** (default): botón "Calcular FIFO" → tabla allocations (Proyecto, Balance, Monto Asignado)
- **Tab Manual**: combobox agregar proyecto + input numérico por proyecto

## Selectores Clave

| Elemento | Selector |
|----------|----------|
| Heading | `getByRole('heading', { name: 'Pagos', level: 1 })` |
| Botón nuevo | `getByRole('button', { name: /nuevo pago/i })` |
| Búsqueda | `getByPlaceholder(/buscar por cliente\/proyecto.../i)` |
| Menu nuevo pago | `getByRole('menu', { name: 'Nuevo Pago' })` |
| Pago a Cliente | `getByRole('menuitem', { name: /pago a cliente/i })` |
| Dialog | `getByRole('dialog')` |
| Cliente combobox | `dialog.getByRole('combobox', { name: /cliente/i })` |
| Monto input | `dialog.getByRole('textbox', { name: /monto total/i })` |
| Fecha input | `dialog.getByRole('textbox', { name: /fecha del pago/i })` |
| Método combobox | `dialog.getByRole('combobox', { name: /método de pago/i })` |
| Tab FIFO | `dialog.getByRole('tab', { name: /fifo/i })` |
| Tab Manual | `dialog.getByRole('tab', { name: /manual/i })` |
| Calcular FIFO | `dialog.getByRole('button', { name: /calcular fifo/i })` |
| Submit | `dialog.getByRole('button', { name: 'Registrar Pago' })` |
| Ver detalles | `getByRole('menuitem', { name: /ver detalles/i })` |
| Eliminar pago | `getByRole('menuitem', { name: /eliminar pago/i })` |

## Comportamientos UI

- **Dropdown Nuevo Pago**: menú con "Pago a Proyecto" y "Pago a Cliente" (sin sufijos 1:1/1:N)
- **Campos deshabilitados**: monto y fecha disabled hasta seleccionar cliente
- **FIFO por defecto**: tab FIFO con `data-state="active"` al abrir
- **Auto-selección método**: combobox selecciona primer método disponible
- **Validación suma**: submit disabled si `suma(allocations) != monto total`
- **Texto validación**: "Falta asignar" (rojo) o "Sobrepasado" cuando no coincide
- **Date picker inline**: cada fila tiene date picker para cambiar fecha en tabla
- **Badges tipo**: "Proyecto" (verde), "Cliente" (azul)
- **Escape cierra**: puede necesitar 2 Escape si hay combobox/popover abierto
- **Limpieza al cerrar**: formulario se resetea al cerrar y reabrir

## Edge Cases

- Cliente sin proyectos con saldo: muestra "no tiene proyectos con saldo pendiente"
- Monto mayor que deuda total: excedente genera crédito (lógica FIFO)
- Allocations parciales: tab Manual permite distribución personalizada
- Escape con popover abierto: primer Escape cierra popover, segundo cierra dialog
- Toast de éxito: regex `/pago registrado|éxito|exitoso|distribuido/i`

## API Endpoints

- `GET /api/payments` — lista (búsqueda, filtros, paginación)
- `POST /api/payments` — crear pago distribuido
- `GET /api/customers` — búsqueda de clientes (combobox)
- `DELETE /api/test/cleanup` — limpieza E2E
