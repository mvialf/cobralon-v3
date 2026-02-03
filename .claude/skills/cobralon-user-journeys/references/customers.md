# Customers

| Campo | Valor |
|-------|-------|
| URL | `/customer` |
| Spec | `tests/e2e/customers.spec.ts` |
| Page Object | `tests/e2e/page-objects/customers.page.ts` |
| Dialog | `tests/e2e/page-objects/dialogs/new-customer.dialog.ts` |

## Estructura de Página

### Layout
- Breadcrumb: `Inicio > Clientes`
- Header: h1 "Clientes" + botón "Nuevo Cliente"
- Toolbar: búsqueda `"Buscar cliente..."` + botón "Columnas"
- DataTable + paginación (3 páginas, default 50 filas)

### Columnas de la Tabla
| Columna | Header | Contenido |
|---------|--------|-----------|
| Nombre | `button "Nombre"` | Nombre completo |
| Teléfono | `button "Teléfono"` | `+56XXXXXXXXX` |
| Correo | `button "Correo"` | Email (puede estar vacío) |
| Crédito | `button "Crédito"` | Badge `"Crédito: $X"` |
| Acciones | — | `button "Abrir menu"` |

### Dialog "Nuevo Cliente"
| Campo | Tipo | Placeholder |
|-------|------|-------------|
| Nombre | textbox | "Juan Perez" |
| Teléfono | textbox + prefijo "+56" | — |
| Correo | textbox | "correo@ejemplo.com" |
| Submit: "Crear Cliente" | button | — |

## Selectores Clave

| Elemento | Selector |
|----------|----------|
| Heading | `getByRole('heading', { name: 'Clientes', level: 1 })` |
| Botón nuevo | `getByRole('button', { name: /nuevo cliente/i })` |
| Búsqueda | `getByPlaceholder(/buscar cliente.../i)` |
| Dialog | `getByRole('dialog')` |
| Nombre input | `dialog.getByRole('textbox', { name: 'Nombre' })` |
| Teléfono input | `dialog.getByRole('textbox', { name: 'Teléfono' })` |
| Correo input | `dialog.getByRole('textbox', { name: 'Correo' })` |
| Submit | `dialog.getByRole('button', { name: 'Crear Cliente' })` |
| Close | `dialog.getByRole('button', { name: 'Close' })` |
| Acciones fila | `row.getByRole('button', { name: 'Abrir menu' })` |
| Menuitems | `getByRole('menuitem', { name: /texto/i })` |
| Paginación next | `getByRole('button', { name: 'Ir a la página siguiente' })` |

## Comportamientos UI

- **Búsqueda con debounce**: espera antes de request a `/api/customers`
- **Prefijo +56**: fijo, no editable en campo teléfono
- **Copiar correo disabled**: si el cliente no tiene email, menuitem disabled
- **Devolver crédito condicional**: solo aparece si `creditBalance > 0`, muestra monto como badge
- **Columnas sorteables**: todos los headers son botones de ordenamiento
- **Validación email**: HTML5 nativa del browser

## Dropdown de Acciones

### Cliente SIN crédito
- Copiar correo (disabled si no tiene email)
- Registrar pago
- Estado de cuenta
- Historial de crédito
- --- (separator)
- Editar
- Eliminar

### Cliente CON crédito
- Todo lo anterior +
- Devolver crédito $XXX.XXX (con badge del monto)

## Edge Cases

- Clientes sin email: celda vacía, "Copiar correo" disabled
- Clientes con crédito: badge formateado ($259.750), item extra en dropdown
- Email duplicado: backend retorna 409 Conflict, dialog permanece abierto
- Teléfono inválido: regex valida formato chileno (9XXXXXXXX)
- Nombre corto: mínimo 2 caracteres
- Clientes duplicados en datos (ej: "Sra. Mónica Portales" aparece 2 veces)

## API Endpoints

- `GET /api/customers` — lista (búsqueda + paginación)
- `POST /api/customers` — crear cliente
