# Critical Flow (Flujo Cross-Page)

| Campo | Valor |
|-------|-------|
| URL | Múltiples: `/projects` → `/payments` → API `/api/projects/:id` |
| Spec | `tests/e2e/critical-flow.spec.ts` |
| Page Object | Usa `PaymentsPage` + `PaymentToProjectDialog` |
| Tipo | Flujo cross-page vía UI + verificación API |

## Datos de Test

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `projectTotal` | $5,000,000 CLP | Monto total del proyecto |
| `paymentAmount` | $2,000,000 CLP | Monto del pago |
| `expectedBalance` | $3,000,000 CLP | Balance esperado post-pago |
| `subtotal` | $4,201,681 CLP | Subtotal para llegar a $5M con IVA 19% |

## Prerequisitos (beforeAll vía API factory)

| Prerequisito | Método | Descripción |
|-------------|--------|-------------|
| `testCustomer` | `createTestCustomer(request)` | Cliente de test |
| `projectStatus` | `getFirstProjectStatus(request)` | Primer estado disponible |
| `paymentMethod` | `ensurePaymentMethod(request)` | Asegura método de pago existente |

## Fases del Flujo

### Fase 1: Crear Proyecto (`/projects`)

1. Navegar a `/projects`, waitFor heading "Proyectos"
2. Click "Nuevo Proyecto" → dialog
3. Seleccionar cliente (combobox, buscar nombre, click option, debounce 5s)
4. Llenar: nombre, teléfono, calle, estado, ventanas, m², subtotal ($4,201,681)
5. Click "Crear Proyecto" → capturar `projectId` del body de response POST
6. Extraer `projectNumber` de primera celda de la fila en tabla

### Fase 2: Registrar Pago (`/payments`)

1. Navegar a `/payments` vía `PaymentsPage.navigate()`
2. Click "Nuevo Pago" → "Pago a Proyecto" → dialog
3. Buscar proyecto por `projectNumber` en combobox
4. Llenar: monto ($2,000,000), método pago, referencia
5. Click "Registrar Pago" → waitFor dialog cerrado

### Fase 3: Verificar Balance (API)

```
GET /api/projects/{projectId}
assert → response.ok() === true
assert → response.body.balance === 3000000
```

### Fase 4: Verificación Visual (`/projects`)

1. Navegar a `/projects`
2. Verificar fila del proyecto visible en tabla

## Selectores Clave

| Elemento | Selector |
|----------|----------|
| Heading proyectos | `getByRole('heading', { name: /proyectos/i, level: 1 })` |
| Nuevo proyecto | `getByRole('button', { name: /nuevo proyecto/i })` |
| Cliente combobox | `dialog.getByRole('combobox', { name: /cliente/i })` |
| Nombre proyecto | `dialog.getByLabel(/nombre del proyecto/i)` |
| Teléfono | `dialog.getByLabel(/telefono/i)` |
| Calle | `dialog.getByLabel(/calle/i)` |
| Estado combobox | `dialog.getByRole('combobox', { name: /estado/i })` |
| Ventanas | `dialog.getByLabel(/ventanas/i)` |
| Metros cuadrados | `dialog.getByLabel(/metros cuadrados/i)` |
| Subtotal | `dialog.getByLabel(/subtotal/i)` |
| Crear proyecto | `dialog.getByRole('button', { name: /crear proyecto/i })` |
| Heading pagos | `getByRole('heading', { name: /pagos/i, level: 1 })` |
| Proyecto combobox (pago) | `dialog.getByRole('combobox', { name: /proyecto/i })` |
| Monto input | `dialog.getByLabel(/monto/i)` |
| Método pago combobox | `dialog.getByRole('combobox', { name: /método de pago/i })` |
| Referencia input | `dialog.getByLabel(/referencia/i)` |
| Registrar pago | `dialog.getByRole('button', { name: /registrar pago/i })` |

## Comportamientos UI

- **Cross-page**: navega entre `/projects` y `/payments`
- **Factory vía API**: prerequisitos creados en `beforeAll`, no en UI
- **Captura de ID**: `projectId` extraído del body POST, no de la UI
- **Número de proyecto**: extraído de primera celda de fila en tabla
- **Cálculo IVA**: subtotal $4,201,681 * 1.19 = ~$5,000,000
- **Verificación híbrida**: visual (tabla) + API (balance)
- **Balance calculado**: `totalAmount - sum(paymentAllocations)`

## Edge Cases

- Sin estados de proyecto: test falla con error explícito en beforeAll
- Método de pago: `ensurePaymentMethod` crea uno si no existe
- Timestamp en nombre: garantiza unicidad entre ejecuciones
- Combobox cliente: requiere debounce (timeout 5s)

## API Endpoints

- `POST /api/test/customers` — factory: crear cliente
- `GET /api/project-statuses` — estados de proyecto
- `GET /api/payment-methods` — listar métodos
- `POST /api/payment-methods` — crear método (si no existe)
- `POST /api/projects` — crear proyecto
- `GET /api/projects` — listar proyectos
- `POST /api/payments` — registrar pago
- `GET /api/projects/:id` — verificar balance
- `DELETE /api/test/cleanup` — limpieza E2E
