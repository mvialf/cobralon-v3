# Critical Flow - Plan de Navegacion

## Resumen

| Campo | Valor |
|-------|-------|
| URL | Multiples: `/projects` -> `/payments` -> API `/api/projects/:id` |
| Spec E2E | `tests/e2e/critical-flow.spec.ts` |
| Page Object | Usa `PaymentsPage` + `PaymentToProjectDialog` |
| Tipo | Flujo cross-page via UI + verificacion API |

## Screenshots de Referencia

Este flujo no tiene screenshots dedicados porque reutiliza las paginas documentadas en otros user journeys:

| Paso | Referencia |
|------|-----------|
| Crear proyecto | Ver [payments-1toN/navigation-plan.md](../payments-1toN/navigation-plan.md) - Dialog de proyecto |
| Registrar pago | Ver [payments-1toN/navigation-plan.md](../payments-1toN/navigation-plan.md) - Dialog "Registrar Pago a Proyecto" |
| Verificar balance | Via API directa (`GET /api/projects/:id`) |

## Estructura del Flujo

### Datos de Test

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `projectTotal` | $5,000,000 CLP | Monto total del proyecto |
| `paymentAmount` | $2,000,000 CLP | Monto del pago |
| `expectedBalance` | $3,000,000 CLP | Balance esperado post-pago |
| `subtotal` | $4,201,681 CLP | Subtotal para llegar a $5M con IVA 19% |

### Prerequisitos (creados en beforeAll via API factory)

| Prerequisito | Metodo | Descripcion |
|-------------|--------|-------------|
| `testCustomer` | `createTestCustomer(request)` | Cliente de test con nombre, telefono, email |
| `projectStatus` | `getFirstProjectStatus(request)` | Primer estado de proyecto disponible |
| `paymentMethod` | `ensurePaymentMethod(request)` | Asegura que existe al menos un metodo de pago |

## Plan de Navegacion

### Fase 1: Crear Proyecto

#### 1.1 Navegar a Proyectos
```
navigate -> /projects
waitFor  -> heading "Proyectos" [level=1]
```

#### 1.2 Abrir dialog de nuevo proyecto
```
click  -> button "Nuevo Proyecto"
waitFor -> dialog visible
assert -> heading "Nuevo Proyecto" en dialog
```

#### 1.3 Seleccionar cliente (creado por factory)
```
click  -> combobox "Cliente" (en dialog)
type   -> nombre del testCustomer
waitFor -> options visibles (debounce 5s)
click  -> primer option
```

#### 1.4 Llenar formulario de proyecto
```
fill   -> label "Nombre del proyecto" = "Test E2E Critico - {timestamp}"
fill   -> label "Telefono" = "+56912345678"
fill   -> label "Calle" = "Avenida Test 123"
click  -> combobox "Estado"
waitFor -> options visibles
click  -> primer option (estado inicial)
fill   -> label "Ventanas" = "10"
fill   -> label "Metros cuadrados" = "50"
clear  -> label "Subtotal"
fill   -> label "Subtotal" = "4201681"
```

#### 1.5 Guardar proyecto
```
click  -> button "Crear Proyecto"
waitFor -> response POST /api/projects (captura body.id como projectId)
waitFor -> dialog cerrado (timeout: 10s)
waitFor -> response GET /api/projects (refresh tabla)
```

#### 1.6 Extraer numero de proyecto
```
locate -> tr con texto "Test E2E Critico - {timestamp}"
assert -> fila visible (timeout: 10s)
read   -> td primera celda -> projectNumber
```

### Fase 2: Registrar Pago

#### 2.1 Navegar a Pagos
```
navigate -> /payments (via PaymentsPage.navigate())
waitFor  -> heading "Pagos" [level=1]
```

#### 2.2 Abrir dialog de Pago a Proyecto
```
click  -> button "Nuevo Pago" (abre dropdown)
click  -> menuitem "Pago a Proyecto"
waitFor -> dialog "Registrar Pago a Proyecto"
assert -> heading "Registrar Pago a Proyecto" visible
```

#### 2.3 Llenar formulario de pago (via PaymentToProjectDialog)
```
click  -> combobox "Proyecto"
type   -> projectNumber (extraido en Fase 1)
waitFor -> options visibles (timeout: 5s)
click  -> primer option
fill   -> label "Monto" = "2000000"
click  -> combobox "Método de Pago"
waitFor -> options
click  -> primer option (Transferencia Bancaria)
fill   -> label "Referencia" = "REF-CRITICAL-{timestamp}"
```

#### 2.4 Enviar pago
```
click  -> button "Registrar Pago"
waitFor -> response POST /api/payments
waitFor -> dialog cerrado (timeout: 10s)
```

### Fase 3: Verificar Balance via API

#### 3.1 Consulta directa al API
```
GET /api/projects/{projectId}
assert -> response.ok() === true
assert -> response.body.balance === 3000000 ($5M - $2M = $3M)
```

### Fase 4: Verificacion Visual

#### 4.1 Navegar a Proyectos
```
navigate -> /projects
waitFor  -> heading "Proyectos" [level=1]
waitFor  -> response GET /api/projects (status: 200)
```

#### 4.2 Verificar proyecto en tabla
```
locate -> tr con texto "Test E2E Critico - {timestamp}"
assert -> fila visible (timeout: 10s)
```

## Observaciones

### Selectores Clave

| Elemento | Selector Playwright |
|----------|-------------------|
| Heading proyectos | `getByRole('heading', { name: /proyectos/i, level: 1 })` |
| Nuevo proyecto | `getByRole('button', { name: /nuevo proyecto/i })` |
| Dialog | `getByRole('dialog')` |
| Cliente combobox | Dialog -> `getByRole('combobox', { name: /cliente/i })` |
| Nombre proyecto | Dialog -> `getByLabel(/nombre del proyecto/i)` |
| Telefono | Dialog -> `getByLabel(/telefono/i)` |
| Calle | Dialog -> `getByLabel(/calle/i)` |
| Estado combobox | Dialog -> `getByRole('combobox', { name: /estado/i })` |
| Ventanas | Dialog -> `getByLabel(/ventanas/i)` |
| Metros cuadrados | Dialog -> `getByLabel(/metros cuadrados/i)` |
| Subtotal | Dialog -> `getByLabel(/subtotal/i)` |
| Crear proyecto | Dialog -> `getByRole('button', { name: /crear proyecto/i })` |
| Heading pagos | `getByRole('heading', { name: /pagos/i, level: 1 })` |
| Nuevo pago | `getByRole('button', { name: /nuevo pago/i })` |
| Pago a proyecto | `getByRole('menuitem', { name: /pago a proyecto/i })` |
| Proyecto combobox (pago) | Dialog -> `getByRole('combobox', { name: /proyecto/i })` |
| Monto input | Dialog -> `getByLabel(/monto/i)` |
| Metodo pago combobox | Dialog -> `getByRole('combobox', { name: /método de pago/i })` |
| Referencia input | Dialog -> `getByLabel(/referencia/i)` |
| Registrar pago | Dialog -> `getByRole('button', { name: /registrar pago/i })` |

### Comportamientos UI
- **Flujo cross-page**: El test navega entre `/projects` y `/payments`, dos paginas independientes
- **Factory via API**: Los prerequisitos (cliente, estado, metodo de pago) se crean via API en `beforeAll`
- **Captura de ID**: El ID del proyecto se extrae del body de la respuesta POST, no de la UI
- **Numero de proyecto**: Se extrae de la primera celda de la fila en la tabla de proyectos
- **Calculo IVA**: Subtotal $4,201,681 * 1.19 = ~$5,000,000 (total con IVA)
- **Verificacion hibrida**: Combina verificacion visual (tabla) con verificacion via API (balance)
- **Balance calculado**: `totalAmount - sum(paymentAllocations)` = $5,000,000 - $2,000,000 = $3,000,000

### Edge Cases
- Si no hay estados de proyecto disponibles, el test falla con error explicito en beforeAll
- El metodo de pago se asegura via `ensurePaymentMethod` (crea uno si no existe)
- El timestamp en el nombre del proyecto garantiza unicidad entre ejecuciones
- El combobox de cliente requiere debounce (timeout 5s para opciones)

### API Endpoints
- `POST /api/test/customers` - Factory: crear cliente de test
- `GET /api/project-statuses` - Obtener estados de proyecto
- `GET /api/payment-methods` - Listar metodos de pago
- `POST /api/payment-methods` - Crear metodo de pago (si no existe)
- `POST /api/projects` - Crear proyecto
- `GET /api/projects` - Listar proyectos (refresh tabla)
- `POST /api/payments` - Registrar pago
- `GET /api/projects/:id` - Verificar balance del proyecto
- `DELETE /api/test/cleanup` - Limpieza de pagos E2E
- `DELETE /api/test/cleanup` - Limpieza de proyectos E2E

## Mapping Navegacion - Test

| Paso | Test en spec | Descripcion |
|------|-------------|-------------|
| beforeAll | Factory setup | Crea cliente, obtiene estado, asegura metodo de pago |
| 1.1-1.6 | `flujo completo: crear proyecto -> registrar pago -> verificar balance via API` (Fase 1) | Crea proyecto con $5M total |
| 2.1-2.4 | `flujo completo: crear proyecto -> registrar pago -> verificar balance via API` (Fase 2) | Registra pago de $2M |
| 3.1 | `flujo completo: crear proyecto -> registrar pago -> verificar balance via API` (Fase 3) | Verifica balance = $3M via API |
| 4.1-4.2 | `flujo completo: crear proyecto -> registrar pago -> verificar balance via API` (Fase 4) | Verifica proyecto visible en tabla |
| afterAll | Cleanup | Elimina pagos y proyectos E2E |
