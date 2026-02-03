---
name: cobralon-user-journeys
description: |
  Documentación de la UI real de cada feature de Cobralon. Selectores Playwright
  verificados, estructura de páginas, comportamientos UI, edge cases y API endpoints.
  USAR CUANDO: escribir o modificar tests E2E, crear Page Objects, debuggear selectores,
  entender cómo funciona una página antes de modificarla.
  Complementa cobralon-e2e-playwright (que cubre HOW-TO de testing).
---

# Cobralon User Journeys

## Instrucciones

### Cuándo cargar una referencia

Antes de escribir o modificar código que interactúa con una página, **lee la referencia correspondiente**.
Cada referencia contiene los selectores Playwright verificados, la estructura real de la página,
comportamientos específicos y edge cases que debes considerar.

**Mapa de archivos** — usa la URL o feature para encontrar la referencia correcta:

| URL / Feature | Referencia a leer |
|---------------|-------------------|
| `/customer` o clientes | `references/customers.md` |
| `/payments` + dialog "Pago a Cliente" (FIFO/Manual) | `references/payments-1to1.md` |
| `/payments` + dialog "Pago a Proyecto" (pago simple) | `references/payments-1toN.md` |
| `/settings/payments` o métodos de pago | `references/payment-methods.md` |
| `/aftersales` o postventas | `references/aftersales.md` |
| `/payments/installments` o cuotas | `references/installments.md` |
| `/visits` o visitas | `references/visits.md` |
| `/calendar` o calendario | `references/calendar.md` |
| Flujo multi-página (proyecto→pago→balance) | `references/critical-flow.md` |

### Qué hacer con la referencia

1. **Escribir test E2E**: usa los selectores exactos de la tabla "Selectores Clave". No inventes selectores — los de la referencia están verificados contra la UI real.
2. **Crear/modificar Page Object**: la sección "Estructura de Página" tiene el layout, columnas y campos de dialog exactos.
3. **Debuggear selector que falla**: compara tu selector con el de la referencia. Revisa la sección "Edge Cases" para comportamientos inesperados.
4. **Entender una página antes de modificarla**: lee "Comportamientos UI" para saber cómo reacciona la UI (debounce, campos disabled, autocompletado, etc.).

### Qué NO cubre esta skill

- HOW-TO de testing (Page Objects, waiting strategies) → usa `cobralon-e2e-playwright`
- Auth setup, cleanup, factories → usa `cobralon-testing-strategy`
- Lógica financiera FIFO/créditos → usa `cobralon-financial-logic`

## Patrones UI Comunes

Antes de leer una referencia específica, estos patrones aplican a **todas** las páginas.
Úsalos como base y consulta la referencia solo para detalles específicos de la feature.

### Selectores estándar (reutilizar siempre)

| Elemento | Selector Playwright |
|----------|----------|
| Heading de página | `getByRole('heading', { name: '...', level: 1 })` |
| Dialog | `getByRole('dialog')` |
| Cerrar dialog (X) | `dialog.getByRole('button', { name: 'Close' })` |
| Acciones de fila | `row.getByRole('button', { name: 'Abrir menu' })` |
| Menuitem | `getByRole('menuitem', { name: /texto/i })` |
| Combobox | `getByRole('combobox', { name: /label/i })` |
| Opción de combobox | `getByRole('option', { name: /texto/i })` |
| Paginación siguiente | `getByRole('button', { name: 'Ir a la página siguiente' })` |
| AlertDialog | `getByRole('alertdialog')` |
| Toast éxito | `page.getByText(/éxito\|exitoso\|registrado/i)` |
| Tabla vacía | `getByText(/no se encontraron resultados/i)` |

### Componentes que se repiten

| Patrón | Dónde aparece | Qué saber |
|--------|--------------|-----------|
| DataTable + paginación | todas (9/9) | Default 50 filas, "Página X de Y", 4 botones navegación |
| Dialog creación/edición | 8/9 (no installments) | Heading h2, Close (X), Escape cierra |
| Búsqueda con debounce | 8/9 (no calendar) | ~500ms antes de request API |
| Combobox con búsqueda | 8/9 (no installments) | Mín 2 chars, opciones `[role="option"]` |
| EditableBadge inline | 4/9: customers, aftersales, visits, payments | Click badge → options → seleccionar |
| Dropdown acciones | 7/9 | `"Abrir menu"` → menuitems |
| Prefijo +56 teléfono | 5/9: customers, aftersales, visits, payments-1to1, critical-flow | Prefijo fijo no editable |
| AlertDialog confirmación | 3/9: payment-methods, aftersales | "¿Estás seguro?" + Cancelar/Confirmar |
| Combobox cascada | 2/9: aftersales, visits | Seleccionar proyecto/región autocompleta campos dependientes |

### Flujos reutilizables (pseudo-código)

**Abrir dialog:**
```
click → button "Nuevo ..."  →  waitFor → dialog  →  assert → heading h2
```

**Buscar en tabla:**
```
fill → search input  →  waitFor → response API (~500ms debounce)  →  assert → tabla actualizada
```

**Submit dialog:**
```
click → button submit  →  waitFor → dialog cerrado  →  assert → toast éxito
```

**Cambiar estado inline (EditableBadge):**
```
click → badge estado  →  waitFor → options  →  click → option  →  waitFor → response API
```

### Validaciones comunes

| Validación | Regex/Selector |
|------------|---------------|
| Teléfono chileno | `9XXXXXXXX` (9 dígitos empezando con 9) |
| Campo requerido | `/requerido\|obligatorio\|debe.*al menos/i` |
| Toast éxito | `/éxito\|exitoso\|registrado\|distribuido/i` |
| Tabla vacía | `/no se encontraron resultados/i` |
| Descripción max 1000 | `/no puede exceder 1000 caracteres/i` (aftersales) |
