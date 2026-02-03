# Customers - Plan de Navegación

## Resumen

| Campo | Valor |
|-------|-------|
| URL | `/customer` |
| Spec E2E | `tests/e2e/customers.spec.ts` |
| Page Object | `tests/e2e/page-objects/customers.page.ts` |
| Dialog | `tests/e2e/page-objects/dialogs/new-customer.dialog.ts` |

## Screenshots de Referencia

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | [`01-tabla-inicial.png`](../reference/customers/01-tabla-inicial.png) | Tabla de clientes con sidebar, búsqueda y paginación |
| 2 | [`02-dialog-nuevo-cliente.png`](../reference/customers/02-dialog-nuevo-cliente.png) | Dialog "Nuevo Cliente" con campos Nombre, Teléfono (+56), Correo |
| 3 | [`03-dropdown-acciones-con-credito.png`](../reference/customers/03-dropdown-acciones-con-credito.png) | Dropdown de acciones con opción "Devolver crédito $259.750" |

## Estructura de la Página

### Layout Principal
- **Sidebar** (izquierda): Navegación con links a todas las secciones
- **Breadcrumb**: `Inicio > Clientes`
- **Header**: Título "Clientes" (h1) + botón "Nuevo Cliente"
- **Toolbar**: Input de búsqueda + botón "Columnas"
- **Tabla**: DataTable con datos de clientes
- **Paginación**: Control de filas por página + navegación de páginas

### Columnas de la Tabla
| Columna | Header (botón sorteable) | Contenido |
|---------|-------------------------|-----------|
| Nombre | `button "Nombre"` | Nombre completo del cliente |
| Teléfono | `button "Teléfono"` | Formato `+56XXXXXXXXX` |
| Correo | `button "Correo"` | Email (puede estar vacío) |
| Crédito | `button "Crédito"` | Badge con icono + `"Crédito: $X"` |
| Acciones | (sin header) | Botón "Abrir menu" con dropdown |

### Paginación
- Selector "Filas por página" (combobox, default: 50)
- Texto: "Página X de Y" (actualmente 3 páginas)
- Botones: Primera / Anterior / Siguiente / Última
- Botones disabled cuando no aplica (ej: Primera/Anterior en página 1)

## Plan de Navegación

### 1. Carga inicial
```
navigate → /customer
waitFor  → heading "Clientes" [level=1]
waitFor  → textbox "Buscar cliente..." (confirma que datos cargaron)
waitFor  → table visible
```

### 2. Verificar estructura de tabla
```
assert → button "Nombre" visible (columnheader)
assert → button "Teléfono" visible (columnheader)
assert → button "Correo" visible (columnheader)
assert → button "Crédito" visible (columnheader)
assert → filas de datos visibles en tbody
```

### 3. Abrir dialog "Nuevo Cliente"
```
click  → button "Nuevo Cliente"
waitFor → dialog "Nuevo Cliente"
assert → heading "Nuevo Cliente" [level=2]
assert → paragraph "Ingresa los datos del nuevo cliente..."
assert → textbox "Nombre" (placeholder: "Juan Perez")
assert → textbox "Teléfono" (con prefijo "+56" fijo)
assert → textbox "Correo" (placeholder: "correo@ejemplo.com")
assert → button "Crear Cliente"
assert → button "Close" (X para cerrar)
```

### 4. Validación de formulario (submit vacío)
```
click  → button "Crear Cliente"
assert → texto "el nombre debe tener al menos 2 caracteres"
assert → texto "el teléfono es requerido"
```

### 5. Validación de teléfono chileno
```
fill   → textbox "Nombre" = "Test Cliente"
fill   → textbox "Teléfono" = "123456789"
click  → button "Crear Cliente"
assert → texto "formato inválido.*teléfono chileno válido"
```

### 6. Crear cliente exitosamente
```
fill   → textbox "Nombre" = "E2E Test Customer {timestamp}"
fill   → textbox "Teléfono" = "912345678"
fill   → textbox "Correo" = "e2e-test-{timestamp}@example.com"
click  → button "Crear Cliente"
waitFor → dialog cerrado
```

### 7. Buscar cliente creado
```
fill   → textbox "Buscar cliente..." = nombre del cliente
waitFor → respuesta de /api/customers (debounce)
assert → cell con nombre del cliente visible
assert → cell con teléfono normalizado "+56912345678"
assert → cell con email visible
```

### 8. Búsqueda sin resultados
```
fill   → textbox "Buscar cliente..." = "ZZZZZ_NO_EXISTE_999"
waitFor → respuesta de /api/customers
assert → texto "no se encontraron resultados"
```

### 9. Dropdown de acciones (cliente SIN crédito)
```
click  → button "Abrir menu" de primera fila
waitFor → menu visible
assert → generic "Acciones" (label del grupo)
assert → menuitem "Copiar correo" [disabled si no tiene email]
assert → menuitem "Registrar pago"
assert → menuitem "Estado de cuenta"
assert → menuitem "Historial de crédito"
assert → separator
assert → menuitem "Editar"
assert → menuitem "Eliminar"
```

### 10. Dropdown de acciones (cliente CON crédito)
```
# Buscar cliente con creditBalance > 0 (ej: "Sra. Catalina Téllez", crédito $259.750)
click  → button "Abrir menu" de la fila
waitFor → menu visible
assert → todos los items anteriores +
assert → menuitem "Devolver crédito $XXX.XXX" (con badge del monto)
```

### 11. Paginación
```
assert → texto "Página 1 de 3"
click  → button "Ir a la página siguiente"
waitFor → respuesta /api/customers
assert → texto "Página 2 de 3"
assert → tabla visible con nuevos datos
```

### 12. Cerrar dialog (Escape o botón X)
```
click  → button "Nuevo Cliente"
waitFor → dialog visible
click  → button "Close"
waitFor → dialog cerrado
```

## Observaciones

### Selectores Clave
| Elemento | Selector Playwright |
|----------|-------------------|
| Heading | `getByRole('heading', { name: 'Clientes', level: 1 })` |
| Botón nuevo | `getByRole('button', { name: /nuevo cliente/i })` |
| Búsqueda | `getByPlaceholder(/buscar cliente.../i)` |
| Dialog | `getByRole('dialog')` |
| Nombre input | Dialog → `getByRole('textbox', { name: 'Nombre' })` |
| Teléfono input | Dialog → `getByRole('textbox', { name: 'Teléfono' })` |
| Correo input | Dialog → `getByRole('textbox', { name: 'Correo' })` |
| Submit | Dialog → `getByRole('button', { name: 'Crear Cliente' })` |
| Cerrar dialog | Dialog → `getByRole('button', { name: 'Close' })` |
| Acciones | Fila → `getByRole('button', { name: 'Abrir menu' })` |
| Menuitems | `getByRole('menuitem', { name: /texto/i })` |
| Paginación next | `getByRole('button', { name: 'Ir a la página siguiente' })` |

### Comportamientos UI
- **Búsqueda con debounce**: El input de búsqueda espera antes de hacer request al API
- **Prefijo +56**: El campo teléfono tiene un prefijo fijo "+56" no editable
- **Copiar correo disabled**: Si el cliente no tiene email, el menuitem está disabled
- **Devolver crédito condicional**: Solo aparece si `creditBalance > 0`, muestra el monto como badge
- **Columnas sorteables**: Todos los headers son botones que permiten ordenar
- **Filas por página**: Combobox con opciones (default 50)
- **Validación HTML5 email**: El campo email usa validación nativa del browser

### Edge Cases
- Clientes sin email: celda vacía, "Copiar correo" disabled en dropdown
- Clientes con crédito: Badge muestra monto formateado ($259.750), item extra en dropdown
- Email duplicado: Backend retorna 409 Conflict, dialog permanece abierto
- Teléfono inválido: Regex valida formato chileno (9XXXXXXXX)
- Nombre corto: Mínimo 2 caracteres
- Clientes duplicados en datos: Existen (ej: "Sra. Mónica Portales" aparece 2 veces)

### API Endpoints
- `GET /api/customers` - Lista de clientes (con búsqueda y paginación)
- `POST /api/customers` - Crear cliente
- `GET /api/health/warmup` - Health check (usado en beforeAll)

## Mapping Navegación - Test

| Paso | Test en spec | Descripción |
|------|-------------|-------------|
| 1-2 | `debe cargar la página de clientes correctamente` | Verifica heading, botón, search, tabla |
| 2 | `debe mostrar columnas correctas en la tabla` | Verifica headers de columnas |
| 3 | `debe abrir el dialog de nuevo cliente` | Verifica dialog con campos y botón |
| 4 | `debe validar campos obligatorios del formulario` | Submit vacío, mensajes de error |
| 5 | `debe validar formato de teléfono chileno` | Teléfono inválido |
| 5 | `debe validar formato de email si se proporciona` | Email inválido |
| 6 | `debe crear un cliente completo exitosamente` | Flujo completo de creación |
| 6 | `debe crear un cliente sin email (campo opcional)` | Creación sin email |
| 6 | `debe manejar error de email duplicado (409 Conflict)` | Error de duplicado |
| 7-8 | `debe realizar búsqueda de clientes correctamente` | Búsqueda con y sin resultados |
| 9-10 | `debe mostrar dropdown de acciones por cliente` | Verifica menuitems |
| 11 | `debe navegar entre páginas de la tabla (paginación)` | Paginación |
