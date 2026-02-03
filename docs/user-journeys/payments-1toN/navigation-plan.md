# Payments 1:N (Pago a Proyecto) - Plan de Navegacion

## Resumen

| Campo | Valor |
|-------|-------|
| URL | `/payments` |
| Spec E2E | `tests/e2e/payments.spec.ts` |
| Page Object | `tests/e2e/page-objects/payments.page.ts` |
| Dialog | `tests/e2e/page-objects/dialogs/payment-to-project.dialog.ts` |

## Screenshots de Referencia

| # | Archivo | Descripcion |
|---|---------|-------------|
| 1 | [`01-tabla-pagos.png`](../reference/payments-1toN/01-tabla-pagos.png) | Tabla de pagos (misma que payments-1to1, URL compartida /payments) |
| 2 | [`02-dropdown-nuevo-pago.png`](../reference/payments-1toN/02-dropdown-nuevo-pago.png) | Dropdown "Nuevo Pago" con opciones "Pago a Proyecto" y "Pago a Cliente" |
| 3 | [`03-dialog-pago-proyecto.png`](../reference/payments-1toN/03-dialog-pago-proyecto.png) | Dialog "Registrar Pago a Proyecto" con campos iniciales (monto/fecha deshabilitados) |

## Estructura de la Pagina

### Layout Principal
Misma pagina que Payments 1:1 (`/payments`). Ver [payments-1to1/navigation-plan.md](../payments-1to1/navigation-plan.md) para estructura completa de tabla, filtros y paginacion.

### Dialog "Registrar Pago a Proyecto"
| Campo | Tipo | Estado inicial | Descripcion |
|-------|------|----------------|-------------|
| Proyecto * | combobox | activo | Placeholder: "Buscar proyecto..." con icono de busqueda |
| Monto del Pago * | textbox | disabled | Muestra "$ 0", se habilita al seleccionar proyecto |
| Fecha del Pago * | textbox | disabled | Muestra fecha actual (ej: "02/03/2026"), se habilita al seleccionar proyecto |
| Metodo de Pago * | combobox | pre-seleccionado | Auto-selecciona "Transferencia Bancaria" (primer metodo) |
| Referencia | textbox | oculto | Aparece despues de seleccionar metodo de pago |
| Notas (opcional) | textbox | activo | Placeholder: "Notas adicionales sobre el pago..." |
| Registrar Pago | button | disabled | Se habilita cuando proyecto y monto estan completos |
| Close | button | activo | Boton X para cerrar el dialog |

## Plan de Navegacion

### 1. Carga inicial
```
navigate -> /payments
waitFor  -> heading "Pagos" [level=1]
waitFor  -> textbox "Buscar por cliente/proyecto..."
waitFor  -> table visible (waitForGone "Cargando pagos...")
```

### 2. Verificar titulo y controles
```
assert -> text "Todos los Pagos" visible (CardTitle, NO es heading semantico)
assert -> button "Nuevo Pago" visible
assert -> table visible OR skeleton OR text "No hay pagos"
```

### 3. Abrir dropdown "Nuevo Pago"
```
click  -> button "Nuevo Pago"
waitFor -> menu "Nuevo Pago" visible
assert -> menuitem "Pago a Proyecto"
assert -> menuitem "Pago a Cliente"
```

**NOTA**: Los menuitems NO tienen sufijos "(1:1)" ni "(1:N)" en la UI real.
El spec usa regex `/pago a proyecto \(1:1\)/i` y `/pago a cliente \(1:N\)/i` que NO coinciden con la UI actual. El Page Object usa `/pago a proyecto/i` (regex sin sufijo).

### 4. Abrir dialog "Registrar Pago a Proyecto"
```
click  -> menuitem "Pago a Proyecto"
waitFor -> dialog "Registrar Pago a Proyecto"
assert -> heading "Registrar Pago a Proyecto" [level=2]
assert -> paragraph "Registre un pago que se asignará completamente a un proyecto específico."
assert -> combobox "Proyecto *" (placeholder: "Buscar proyecto...")
assert -> textbox "Monto del Pago *" [disabled] (muestra "$ 0")
assert -> textbox "Fecha del Pago *" [disabled] (muestra fecha actual)
assert -> combobox "Método de Pago *" (pre-seleccionado: "Transferencia Bancaria")
assert -> textbox "Notas (opcional)" (placeholder: "Notas adicionales sobre el pago...")
assert -> button "Registrar Pago" [disabled]
assert -> button "Close" (X para cerrar)
```

### 5. Verificar campos deshabilitados sin proyecto
```
# Sin seleccionar proyecto:
assert -> textbox "Monto del Pago *" [disabled]
assert -> textbox "Fecha del Pago *" [disabled]
assert -> button "Registrar Pago" [disabled]
```

### 6. Seleccionar proyecto
```
click  -> combobox "Proyecto *"
type   -> numero de proyecto (ej: "19368")
waitFor -> options visibles ([role="option"])
click  -> primer option visible
waitFor -> textbox "Monto del Pago *" [enabled]
waitFor -> textbox "Fecha del Pago *" [enabled]
```

### 7. Llenar formulario completo
```
fill   -> textbox "Monto del Pago *" = "1000000"
select -> combobox "Método de Pago *" (ya pre-seleccionado, puede cambiar)
fill   -> textbox "Referencia" = "REF-E2E-001" (si visible despues de seleccionar metodo)
fill   -> textbox "Notas (opcional)" = "Pago de prueba E2E"
assert -> button "Registrar Pago" [enabled]
```

### 8. Enviar formulario
```
click  -> button "Registrar Pago"
waitFor -> response POST /api/payments
waitFor -> dialog cerrado
assert -> toast "pago registrado|éxito|exitoso" visible
```

### 9. Verificar pago en tabla
```
waitFor -> response GET /api/payments (refresh tabla)
assert -> texto de referencia visible en tabla (ej: "REF-E2E-001")
```

### 10. Cancelacion con Escape
```
click  -> button "Nuevo Pago" -> menuitem "Pago a Proyecto"
waitFor -> dialog visible
press  -> Escape
waitFor -> dialog cerrado
```

### 11. Busqueda de pagos
```
fill   -> textbox "Buscar por cliente/proyecto..." = "Test"
waitFor -> respuesta /api/payments (debounce)
assert -> tabla actualizada con resultados filtrados
```

### 12. Filtro por estado
```
click  -> button con nombre /estado/i (si visible)
click  -> checkbox "Activo" (dentro del popover)
press  -> Escape (cerrar popover)
waitFor -> respuesta /api/ (filtro aplicado)
```

### 13. Ver detalles de pago
```
click  -> button "Ver detalles" (icono ojo) de una fila
waitFor -> heading "Detalles del Pago" visible
assert -> texto /cliente/i visible
assert -> texto /proyecto/i visible
assert -> texto /monto/i visible
click  -> button /cerrar/i
waitFor -> dialog cerrado
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
| CardTitle | `getByText('Todos los Pagos', { exact: true })` |
| Boton nuevo | `getByRole('button', { name: /nuevo pago/i })` |
| Busqueda | `getByPlaceholder(/buscar por cliente\/proyecto.../i)` |
| Menu nuevo pago | `getByRole('menu', { name: 'Nuevo Pago' })` |
| Pago a Proyecto | `getByRole('menuitem', { name: /pago a proyecto/i })` |
| Pago a Cliente | `getByRole('menuitem', { name: /pago a cliente/i })` |
| Dialog | `getByRole('dialog')` |
| Dialog heading | Dialog -> `getByRole('heading', { name: /pago a proyecto/i })` |
| Proyecto combobox | Dialog -> `getByRole('combobox', { name: /proyecto/i })` |
| Monto input | Dialog -> `getByLabel(/monto/i)` |
| Fecha input | Dialog -> `getByLabel(/fecha del pago/i)` |
| Metodo combobox | Dialog -> `getByRole('combobox', { name: /método de pago/i })` |
| Referencia input | Dialog -> `getByLabel(/referencia/i)` |
| Notas textarea | Dialog -> `getByLabel(/notas/i)` |
| Submit | Dialog -> `getByRole('button', { name: /registrar pago/i })` |
| Cerrar dialog | Dialog -> `getByRole('button', { name: 'Close' })` |
| Ver detalles | `getByRole('button', { name: /ver detalles/i })` |
| Acciones row | Fila -> `getByRole('button', { name: 'Abrir menu' })` |
| Eliminar pago | `getByRole('menuitem', { name: /eliminar pago/i })` |
| Paginacion next | `getByRole('button', { name: 'Ir a la página siguiente' })` |
| Filtro tipo | `getByRole('button', { name: /tipo/i })` |
| Filtro metodo | `getByRole('button', { name: /método de pago/i })` |
| Filtro proyecto | `getByRole('button', { name: /n° proyecto/i })` |

### Comportamientos UI
- **URL compartida**: `/payments` es compartida entre Pago a Proyecto y Pago a Cliente (mismo listado)
- **Dropdown Nuevo Pago**: Boton con menu que ofrece "Pago a Proyecto" y "Pago a Cliente"
- **Menuitems sin sufijo**: UI muestra "Pago a Proyecto" y "Pago a Cliente" (sin "(1:1)" ni "(1:N)")
- **Campos deshabilitados**: Monto y Fecha disabled hasta seleccionar un proyecto
- **Auto-seleccion metodo pago**: Combobox auto-selecciona "Transferencia Bancaria" (primer metodo)
- **Referencia condicional**: El campo Referencia puede aparecer despues de seleccionar metodo de pago
- **Fecha pre-llenada**: Muestra fecha actual en formato "DD/MM/YYYY" (ej: "02/03/2026")
- **Monto formateado**: Input muestra "$ 0" como placeholder con formato monetario chileno
- **Submit disabled**: Boton deshabilitado hasta completar proyecto + monto
- **Dialog de detalles**: Click en "Ver detalles" abre dialog con info del pago (cliente, proyecto, monto)
- **Escape cierra dialog**: Una sola pulsacion de Escape cierra el dialog (a diferencia del dialog de Pago a Cliente que puede necesitar 2)

### Diferencias con Pago a Cliente (1:1 dialog)
| Aspecto | Pago a Proyecto | Pago a Cliente |
|---------|----------------|----------------|
| Selector principal | Proyecto (combobox) | Cliente (combobox) |
| Distribucion | 1 proyecto = 100% del pago | FIFO/Manual entre N proyectos |
| Tabs FIFO/Manual | No aplica | Si (tabs de distribucion) |
| Calcular FIFO | No aplica | Boton "Calcular FIFO" |
| Referencia | Campo de referencia | No tiene |
| Complejidad | Simple (pago directo) | Compleja (allocations multiples) |

### Edge Cases
- Proyecto sin saldo pendiente: Puede registrar pago igualmente
- Metodo de pago pre-seleccionado: No requiere interaccion adicional
- Referencia vacia: Campo opcional, se puede omitir
- Monto $0: Submit disabled, requiere monto > 0
- Escape con combobox abierto: Primer Escape cierra combobox, segundo cierra dialog
- Toast de exito: Regex flexible `/pago registrado|éxito|exitoso/i`
- "Todos los Pagos" no es heading: Es un CardTitle (text node), no `<h1>` ni `<h2>`

### API Endpoints
- `GET /api/payments` - Lista de pagos (con busqueda, filtros y paginacion)
- `POST /api/payments` - Crear pago a proyecto
- `GET /api/projects` - Busqueda de proyectos (para combobox del dialog)
- `GET /api/health/warmup` - Health check (usado en beforeAll)
- `DELETE /api/test/cleanup` - Limpieza de datos E2E

## Mapping Navegacion - Test

| Paso | Test en spec | Descripcion |
|------|-------------|-------------|
| 1-2 | `debe cargar la pagina de pagos correctamente` | Verifica "Todos los Pagos", boton, tabla/skeleton |
| 3 | `debe abrir el dropdown de nuevo pago` | Verifica menuitems (NOTA: spec usa regex con sufijos que no coinciden con UI) |
| 4-5 | `debe abrir el dialog de pago a proyecto (1:1)` | Verifica dialog con campos y submit disabled |
| 5 | `debe validar campos obligatorios del formulario` | Submit disabled sin proyecto seleccionado |
| 6-9 | `flujo completo de creacion de pago` | Seleccionar proyecto, llenar, submit, verificar toast y tabla |
| 10 | `debe cancelar la creacion de pago` | Escape cierra dialog |
| 11 | `debe buscar pagos por cliente` | Busqueda en input, espera API |
| 12 | `debe filtrar pagos por estado` | Filtro facetado de estado |
| 13 | `debe abrir el dialog de detalles de un pago` | Click "Ver detalles", verificar info, cerrar |
