# Payments 1:N (Pago a Proyecto)

| Campo | Valor |
|-------|-------|
| URL | `/payments` (compartida con Payments 1:1) |
| Spec | `tests/e2e/payments.spec.ts` |
| Page Object | `tests/e2e/page-objects/payments.page.ts` |
| Dialog | `tests/e2e/page-objects/dialogs/payment-to-project.dialog.ts` |

## Estructura de Página

Misma página `/payments` que Payments 1:1. Ver [payments-1to1.md](payments-1to1.md) para tabla, filtros y paginación.

### Dialog "Registrar Pago a Proyecto"
| Campo | Tipo | Estado inicial |
|-------|------|----------------|
| Proyecto * | combobox | activo, placeholder "Buscar proyecto..." |
| Monto del Pago * | textbox | **disabled**, muestra "$ 0" |
| Fecha del Pago * | textbox | **disabled**, fecha actual DD/MM/YYYY |
| Método de Pago * | combobox | pre-seleccionado "Transferencia Bancaria" |
| Referencia | textbox | **oculto** hasta seleccionar método |
| Notas (opcional) | textbox | placeholder "Notas adicionales..." |
| Submit: "Registrar Pago" | button | **disabled** |

## Selectores Clave

| Elemento | Selector |
|----------|----------|
| Heading | `getByRole('heading', { name: 'Pagos', level: 1 })` |
| CardTitle | `getByText('Todos los Pagos', { exact: true })` (NO es heading) |
| Botón nuevo | `getByRole('button', { name: /nuevo pago/i })` |
| Pago a Proyecto | `getByRole('menuitem', { name: /pago a proyecto/i })` |
| Dialog heading | `dialog.getByRole('heading', { name: /pago a proyecto/i })` |
| Proyecto combobox | `dialog.getByRole('combobox', { name: /proyecto/i })` |
| Monto input | `dialog.getByLabel(/monto/i)` |
| Fecha input | `dialog.getByLabel(/fecha del pago/i)` |
| Método combobox | `dialog.getByRole('combobox', { name: /método de pago/i })` |
| Referencia input | `dialog.getByLabel(/referencia/i)` |
| Notas textarea | `dialog.getByLabel(/notas/i)` |
| Submit | `dialog.getByRole('button', { name: /registrar pago/i })` |
| Ver detalles | `getByRole('button', { name: /ver detalles/i })` |

## Comportamientos UI

- **URL compartida**: `/payments` es la misma para ambos tipos de pago
- **Menuitems sin sufijo**: UI muestra "Pago a Proyecto" y "Pago a Cliente" (sin "(1:1)" ni "(1:N)")
- **Campos deshabilitados**: monto y fecha disabled hasta seleccionar proyecto
- **Auto-selección método**: combobox pre-selecciona "Transferencia Bancaria"
- **Referencia condicional**: campo aparece después de seleccionar método de pago
- **Fecha pre-llenada**: fecha actual en formato "DD/MM/YYYY"
- **Monto formateado**: "$ 0" como placeholder con formato CLP
- **Submit disabled**: hasta completar proyecto + monto
- **Dialog detalles**: click "Ver detalles" abre dialog con info (cliente, proyecto, monto)
- **Escape**: una sola pulsación cierra el dialog (a diferencia del Pago a Cliente)

### Diferencias con Pago a Cliente (1:1)
| Aspecto | Pago a Proyecto | Pago a Cliente |
|---------|----------------|----------------|
| Selector | Proyecto combobox | Cliente combobox |
| Distribución | 1 proyecto = 100% | FIFO/Manual entre N proyectos |
| Tabs FIFO/Manual | No | Sí |
| Referencia | Sí | No |
| Complejidad | Simple | Compleja (allocations múltiples) |

## Edge Cases

- Proyecto sin saldo: puede registrar pago igualmente
- Método pre-seleccionado: no requiere interacción adicional
- Referencia vacía: campo opcional
- Monto $0: submit disabled
- "Todos los Pagos" no es heading: es CardTitle (text node, no `<h1>`/`<h2>`)
- Toast de éxito: regex `/pago registrado|éxito|exitoso/i`

## API Endpoints

- `GET /api/payments` — lista (búsqueda, filtros, paginación)
- `POST /api/payments` — crear pago a proyecto
- `GET /api/projects` — búsqueda de proyectos (combobox)
- `DELETE /api/test/cleanup` — limpieza E2E
