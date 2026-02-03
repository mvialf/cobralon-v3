# Payments 1:1 (Pago a Cliente) - Plan de Navegacion

## Resumen

| Campo | Valor |
|-------|-------|
| URL | `/payments` |
| Spec E2E | `tests/e2e/payment-to-customer.spec.ts` |
| Page Object | `tests/e2e/page-objects/payments.page.ts` |
| Dialog | `tests/e2e/page-objects/dialogs/payment-to-customer.dialog.ts` |

## Screenshots de Referencia

| # | Archivo | Descripcion |
|---|---------|-------------|
| 1 | [`01-tabla-pagos.png`](../reference/payments-1to1/01-tabla-pagos.png) | Tabla de pagos con filtros facetados, tipos Proyecto/Cliente, paginacion |
| 2 | [`02-dropdown-nuevo-pago.png`](../reference/payments-1to1/02-dropdown-nuevo-pago.png) | Dropdown "Nuevo Pago" con opciones "Pago a Proyecto" y "Pago a Cliente" |
| 3 | [`03-dialog-pago-cliente-inicial.png`](../reference/payments-1to1/03-dialog-pago-cliente-inicial.png) | Dialog "Registrar Pago a Cliente" con campos iniciales (monto deshabilitado) |
| 4 | [`04-dropdown-acciones-pago.png`](../reference/payments-1to1/04-dropdown-acciones-pago.png) | Dropdown de acciones: "Ver detalles" y "Eliminar pago" |

## Estructura de la Pagina

### Layout Principal
- **Sidebar** (izquierda): Navegacion con links a todas las secciones
- **Breadcrumb**: `Inicio > Pagos`
- **Header**: Titulo "Pagos" (h1) + boton "Nuevo Pago" (con dropdown)
- **Toolbar**: Input de busqueda + filtros facetados + boton "Columnas"
- **Tabla**: DataTable con datos de pagos
- **Paginacion**: Control de filas por pagina + navegacion de paginas

### Columnas de la Tabla
| Columna | Header (boton sorteable) | Contenido |
|---------|-------------------------|-----------|
| Seleccionar | checkbox "Seleccionar todo" | checkbox "Seleccionar fila" por fila |
| Cliente/Proyecto | `button "Cliente/Proyecto"` | Nombre cliente o `"P - {num} - {nombre}"` |
| N Proyecto | `button "N° Proyecto"` | Numero o badge `"X proyectos"` (para tipo Cliente) |
| Tipo | `button "Tipo"` | Badge: "Proyecto" (verde) o "Cliente" (azul) |
| Metodo | `button "Método"` | Transferencia Bancaria, Tarjeta de Credito, Efectivo |
| Monto | `button "Monto"` | Formato `$X.XXX.XXX` |
| Fecha | `button "Fecha"` | Date picker inline `"Cambiar fecha: DD-MM-YYYY"` |
| Acciones | (sin header) | Boton "Abrir menu" con dropdown |

### Filtros Facetados
| Filtro | Tipo | Descripcion |
|--------|------|-------------|
| Busqueda | textbox | Placeholder: "Buscar por cliente/proyecto..." |
| N Proyecto | button (facet) | Filtro por numero de proyecto |
| Tipo | button (facet) | Filtro por tipo: Proyecto / Cliente |
| Metodo de Pago | button (facet) | Filtro por metodo de pago |

### Paginacion
- Selector "Filas por pagina" (combobox, default: 50)
- Texto: "Pagina X de Y" (actualmente 7 paginas)
- Botones: Primera / Anterior / Siguiente / Ultima
- Botones disabled cuando no aplica

## Plan de Navegacion

### 1. Carga inicial
```
navigate -> /payments
waitFor  -> heading "Pagos" [level=1]
waitFor  -> textbox "Buscar por cliente/proyecto..."
waitFor  -> table visible (waitForGone "Cargando pagos...")
```

### 2. Verificar estructura de tabla
```
assert -> checkbox "Seleccionar todo" visible
assert -> button "Cliente/Proyecto" visible (columnheader)
assert -> button "N° Proyecto" visible (columnheader)
assert -> button "Tipo" visible (columnheader)
assert -> button "Método" visible (columnheader)
assert -> button "Monto" visible (columnheader)
assert -> button "Fecha" visible (columnheader)
assert -> filas de datos visibles en tbody
```

### 3. Verificar filtros facetados
```
assert -> textbox "Buscar por cliente/proyecto..." visible
assert -> button "N° Proyecto" visible (facet)
assert -> button "Tipo" visible (facet)
assert -> button "Método de Pago" visible (facet)
assert -> button "Columnas" visible
```

### 4. Abrir dropdown "Nuevo Pago"
```
click  -> button "Nuevo Pago"
waitFor -> menu "Nuevo Pago" visible
assert -> menuitem "Pago a Proyecto"
assert -> menuitem "Pago a Cliente"
```

### 5. Abrir dialog "Registrar Pago a Cliente"
```
click  -> menuitem "Pago a Cliente"
waitFor -> dialog "Registrar Pago a Cliente"
assert -> heading "Registrar Pago a Cliente" [level=2]
assert -> paragraph "Registre un pago y distribúyalo entre múltiples proyectos del cliente (FIFO o manual)."
assert -> combobox "Cliente *" (placeholder: "Buscar cliente...")
assert -> textbox "Monto Total del Pago *" [disabled] (muestra "$ 0")
assert -> textbox "Fecha del Pago *" [disabled] (muestra fecha actual)
assert -> combobox "Método de Pago *"
assert -> textbox "Notas (opcional)" (placeholder: "Notas adicionales sobre el pago...")
assert -> button "Registrar Pago" [disabled]
assert -> button "Close" (X para cerrar)
```

### 6. Seleccionar cliente
```
click  -> combobox "Cliente *"
fill   -> buscar nombre del cliente
waitFor -> options visibles
click  -> option con nombre del cliente
waitFor -> texto "Cliente seleccionado" visible
assert -> textbox "Monto Total del Pago *" [enabled]
assert -> seccion "Distribución del Pago" visible (si tiene proyectos)
```

### 7. Distribucion FIFO (tab por defecto)
```
fill   -> textbox "Monto Total del Pago *" = "500000"
select -> combobox "Método de Pago *" (primer metodo disponible)
assert -> tab "FIFO" con data-state="active" (seleccionado por defecto)
click  -> button "Calcular FIFO"
waitFor -> tabla de allocations visible
assert -> columnheader "Proyecto" visible
assert -> columnheader "Balance" visible
assert -> columnheader "Monto Asignado" visible
assert -> validacion visual positiva (allocations correctas)
assert -> button "Registrar Pago" [enabled]
```

### 8. Distribucion Manual
```
click  -> tab "Manual"
assert -> tab "Manual" con data-state="active"
click  -> combobox de agregar proyecto
waitFor -> options de proyectos disponibles
click  -> primer proyecto
waitFor -> tabla de allocations visible
fill   -> input number del primer proyecto = "150000"
click  -> combobox de agregar proyecto (segundo)
click  -> segundo proyecto
fill   -> input number del segundo proyecto = "150000"
assert -> validacion "Diferencia" visible
assert -> button "Registrar Pago" [enabled] (si suma == monto total)
```

### 9. Validacion de allocations
```
# Modificar un monto para que NO coincida con el total
fill   -> primer input = "999999"
assert -> texto "Falta asignar" o "Sobrepasado" visible (rojo)
assert -> validacion visual negativa
assert -> button "Registrar Pago" [disabled]
```

### 10. Campos deshabilitados sin cliente
```
# Sin seleccionar cliente:
assert -> textbox "Monto Total del Pago *" [disabled]
assert -> button "Calcular FIFO" no visible
# Despues de seleccionar cliente:
assert -> textbox "Monto Total del Pago *" [enabled]
```

### 11. Enviar formulario
```
click  -> button "Registrar Pago"
waitFor -> dialog cerrado
assert -> toast "pago registrado|éxito|exitoso|distribuido" visible
```

### 12. Cancelacion con Escape
```
click  -> button "Nuevo Pago" -> menuitem "Pago a Cliente"
waitFor -> dialog visible
press  -> Escape (puede necesitar 2 veces si hay popovers)
waitFor -> dialog cerrado
```

### 13. Limpieza de datos al reabrir
```
# Abrir, seleccionar cliente, cerrar, reabrir
assert -> combobox "Cliente *" sin valor seleccionado
assert -> tabla de allocations no visible
```

### 14. Dropdown de acciones por pago
```
click  -> button "Abrir menu" de una fila
waitFor -> menu visible
assert -> generic "Acciones" (label del grupo)
assert -> menuitem "Ver detalles"
assert -> separator
assert -> menuitem "Eliminar pago"
```

### 15. Paginacion
```
assert -> texto "Página 1 de 7"
click  -> button "Ir a la página siguiente"
waitFor -> respuesta /api/payments
assert -> texto "Página 2 de 7"
assert -> tabla visible con nuevos datos
```

## Observaciones

### Selectores Clave
| Elemento | Selector Playwright |
|----------|-------------------|
| Heading | `getByRole('heading', { name: 'Pagos', level: 1 })` |
| Boton nuevo | `getByRole('button', { name: /nuevo pago/i })` |
| Busqueda | `getByPlaceholder(/buscar por cliente\/proyecto.../i)` |
| Menu nuevo pago | `getByRole('menu', { name: 'Nuevo Pago' })` |
| Pago a Proyecto | `getByRole('menuitem', { name: 'Pago a Proyecto' })` |
| Pago a Cliente | `getByRole('menuitem', { name: 'Pago a Cliente' })` |
| Dialog | `getByRole('dialog')` |
| Cliente combobox | Dialog -> `getByRole('combobox', { name: /cliente/i })` |
| Monto input | Dialog -> `getByRole('textbox', { name: /monto total/i })` |
| Fecha input | Dialog -> `getByRole('textbox', { name: /fecha del pago/i })` |
| Metodo combobox | Dialog -> `getByRole('combobox', { name: /método de pago/i })` |
| Notas textarea | Dialog -> `getByRole('textbox', { name: /notas/i })` |
| Submit | Dialog -> `getByRole('button', { name: 'Registrar Pago' })` |
| Cerrar dialog | Dialog -> `getByRole('button', { name: 'Close' })` |
| Tab FIFO | Dialog -> `getByRole('tab', { name: /fifo/i })` |
| Tab Manual | Dialog -> `getByRole('tab', { name: /manual/i })` |
| Calcular FIFO | Dialog -> `getByRole('button', { name: /calcular fifo/i })` |
| Allocation table | Dialog -> `getByRole('table')` |
| Acciones row | Fila -> `getByRole('button', { name: 'Abrir menu' })` |
| Ver detalles | `getByRole('menuitem', { name: /ver detalles/i })` |
| Eliminar pago | `getByRole('menuitem', { name: /eliminar pago/i })` |
| Paginacion next | `getByRole('button', { name: 'Ir a la página siguiente' })` |
| Filtro tipo | `getByRole('button', { name: /tipo/i })` |
| Filtro metodo | `getByRole('button', { name: /método de pago/i })` |
| Filtro proyecto | `getByRole('button', { name: /n° proyecto/i })` |

### Comportamientos UI
- **Dropdown Nuevo Pago**: Boton con menu que ofrece "Pago a Proyecto" (1:1) y "Pago a Cliente" (1:N)
- **Campos deshabilitados**: Monto y Fecha estan disabled hasta seleccionar un cliente
- **FIFO por defecto**: Al abrir el dialog, el tab FIFO esta seleccionado
- **Auto-seleccion metodo pago**: El combobox auto-selecciona el primer metodo (ej: Transferencia Bancaria)
- **Distribucion tabs**: FIFO (automatica) y Manual aparecen solo despues de seleccionar cliente con proyectos
- **Validacion suma**: Submit disabled si la suma de allocations != monto total
- **Texto validacion**: "Falta asignar" (rojo) cuando sobra, "Sobrepasado" cuando excede
- **Date picker inline**: Cada fila tiene date picker para cambiar fecha directamente en la tabla
- **Badges tipo**: "Proyecto" (verde) y "Cliente" (azul) como badges en la columna Tipo
- **N Proyecto para tipo Cliente**: Muestra badge "X proyectos" en vez de numero
- **Seleccion de filas**: Checkbox individual y "Seleccionar todo" en header
- **Escape cierra**: Puede necesitar 2 Escape si hay combobox/popover abierto dentro del dialog
- **Limpieza al cerrar**: Al cerrar y reabrir, el formulario se resetea completamente

### Edge Cases
- Cliente sin proyectos con saldo: Muestra "no tiene proyectos con saldo pendiente"
- Monto mayor que deuda total: Excedente genera credito (ver FIFO business logic)
- Allocations parciales: Tab Manual permite distribuir manualmente entre proyectos
- Escape con popover abierto: Primer Escape cierra popover, segundo cierra dialog
- Toast de exito: Regex flexible `/pago registrado|éxito|exitoso|distribuido/i`

### API Endpoints
- `GET /api/payments` - Lista de pagos (con busqueda, filtros y paginacion)
- `POST /api/payments` - Crear pago distribuido
- `GET /api/customers` - Busqueda de clientes (para combobox del dialog)
- `GET /api/health/warmup` - Health check (usado en beforeAll)
- `DELETE /api/test/cleanup` - Limpieza de datos E2E

## Mapping Navegacion - Test

| Paso | Test en spec | Descripcion |
|------|-------------|-------------|
| 1-3 | (beforeEach) | Navegacion a /payments via PaymentsPage.navigate() |
| 4-5 | `debe abrir el dialog de pago a cliente (1:N)` | Verifica dialog con campos y botones iniciales |
| 6 | `debe buscar y seleccionar un cliente` | Busca por nombre, verifica card y seccion distribucion |
| 7 | `flujo completo con distribución FIFO` | FIFO: seleccionar cliente, monto, metodo, calcular, verificar tabla, submit |
| 8 | `flujo completo con distribución manual` | Manual: tab manual, agregar proyectos, ingresar montos, validar, submit |
| 9 | `debe validar que la suma de allocations sea igual al monto total` | Modifica monto para invalidar, verifica error y submit disabled |
| 10 | `debe deshabilitar campos hasta seleccionar cliente` | Monto disabled sin cliente, enabled con cliente |
| 12 | `debe cancelar la creación con Escape` | Escape cierra dialog |
| 13 | `debe limpiar datos al cerrar y reabrir` | Reabrir limpia formulario |
