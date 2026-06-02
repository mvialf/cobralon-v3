# Payment Methods - Plan de Navegacion

## Resumen

| Campo | Valor |
|-------|-------|
| URL | `/settings/payments` |
| Spec E2E | `tests/e2e/payment-methods.spec.ts` |
| Page Object | `tests/e2e/page-objects/payment-methods.page.ts` |

## Screenshots de Referencia

| # | Archivo | Descripcion |
|---|---------|-------------|
| 1 | [`01-tabla-metodos.png`](../reference/payment-methods/01-tabla-metodos.png) | Tabla de metodos con drag handles, badges Activo/Inactivo, acciones por fila |
| 2 | [`02-dialog-nuevo-metodo.png`](../reference/payment-methods/02-dialog-nuevo-metodo.png) | Dialog "Crear Nuevo Método de Pago" con campos nombre, icono, cuotas |

## Estructura de la Pagina

### Layout Principal
- **Sidebar** (izquierda): Navegacion global
- **Breadcrumb**: `Panel Principal > Configuración`
- **Header**: Titulo "Configuración" (h1)
- **Sub-navegacion** (izquierda del contenido): Secciones: General, Estados del Sistema, **Metodos de Pago** (activo), Razones de Ajuste
- **Card**: Titulo "Métodos de Pago" + descripcion + boton "Nuevo Método"
- **Tabla**: Lista de metodos con drag & drop

### Card Header
- **Titulo**: "Métodos de Pago" (heading de la card)
- **Descripcion**: "Configura los métodos de pago disponibles. Arrastra para cambiar el orden (el primer método activo será el predeterminado)."
- **Boton**: "Nuevo Método" (con icono +)

### Columnas de la Tabla
| Columna | Header | Contenido |
|---------|--------|-----------|
| Drag handle | (sin header) | Icono GripVertical (svg.lucide-grip-vertical), cursor-grab |
| Nombre | `columnheader "Nombre"` | Nombre del metodo (texto) |
| Estado | `columnheader "Estado"` | Badge: "Activo" (verde con icono) o "Inactivo" (gris con icono) |
| Acciones | `columnheader "Acciones"` | Boton toggle + Editar (pencil) + Eliminar (trash) |

### Datos Actuales (8 metodos)
| Nombre | Estado | Eliminar |
|--------|--------|----------|
| Transferencia Bancaria | Activo | Disabled (283 pagos) |
| Tarjeta de Debito | Activo | Habilitado |
| Tarjeta de Credito | Activo | Disabled (23 pagos) |
| WebPay | Activo | Habilitado |
| Cheque | Activo | Habilitado |
| Efectivo | Inactivo | Disabled (2 pagos) |
| Khipu | Inactivo | Habilitado |
| Mercado Pago | Inactivo | Habilitado |

### Acciones por Fila
| Accion | Elemento | Descripcion |
|--------|----------|-------------|
| Toggle | button "Desactivar" o "Activar" | Cambia estado activo/inactivo |
| Editar | button con icono pencil (svg.lucide-pencil) | Abre dialog de edicion |
| Eliminar | button con icono trash (svg.lucide-trash-2) | Disabled si tiene pagos asociados |

### Dialog "Crear Nuevo Método de Pago"
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| Nombre del metodo | textbox | Placeholder: "Ej: Transferencia Bancaria" |
| Icono (opcional) | textbox | Placeholder: "Ej: Banknote, CreditCard, Smartphone". Helper: "Nombre de icono de Lucide React" |
| Cuotas sin interes | checkbox | Label: "¿Ofrece cuotas sin interés?". Desc: "Permite que los clientes paguen en cuotas a través de este método" |
| Cancelar | button | Cierra dialog |
| Crear Metodo | button | Submit del formulario |
| Close | button | X para cerrar |

## Plan de Navegacion

### 1. Carga inicial
```
navigate -> /settings/payments
waitFor  -> heading "Configuración" [level=1]
waitFor  -> text "Métodos de Pago" visible (card title)
waitFor  -> table visible (waitForGone "Cargando...")
```

### 2. Verificar estructura de pagina
```
assert -> text "Configura los métodos de pago disponibles" visible
assert -> button "Nuevo Método" visible
assert -> navigation con links: General, Estados del Sistema, Métodos de Pago, Razones de Ajuste
```

### 3. Verificar tabla de metodos
```
assert -> columnheader "Nombre" visible
assert -> columnheader "Estado" visible
assert -> columnheader "Acciones" visible
assert -> filas de datos visibles en tbody
```

### 4. Verificar badges de estado
```
assert -> text "Activo" visible (badge verde)
assert -> text "Inactivo" visible (badge gris, si hay metodos inactivos)
```

### 5. Verificar drag handles
```
assert -> svg.lucide-grip-vertical por cada fila
assert -> cursor-grab en celda del grip
assert -> cantidad de grips == cantidad de filas
```

### 6. Verificar acciones por fila
```
# Primera fila (metodo activo):
assert -> button "Desactivar" visible
assert -> button con svg.lucide-pencil visible (editar)
assert -> button con svg.lucide-trash-2 visible (eliminar)
```

### 7. Verificar proteccion de eliminacion
```
# Metodo con pagos asociados (ej: "Transferencia Bancaria"):
assert -> button "No se puede eliminar (283 pagos asociados)" [disabled]
# Metodo sin pagos asociados:
assert -> button eliminar [enabled]
```

### 8. Abrir dialog "Crear Nuevo Método de Pago"
```
click  -> button "Nuevo Método"
waitFor -> dialog "Crear Nuevo Método de Pago"
assert -> heading "Crear Nuevo Método de Pago" [level=2]
assert -> paragraph "Agrega un nuevo método de pago para registrar tus transacciones"
assert -> textbox "Nombre del método" (placeholder: "Ej: Transferencia Bancaria")
assert -> textbox "Icono (opcional)" (placeholder: "Ej: Banknote, CreditCard, Smartphone")
assert -> checkbox "¿Ofrece cuotas sin interés?"
assert -> button "Cancelar"
assert -> button "Crear Método"
assert -> button "Close" (X)
```

### 9. Validar campo obligatorio
```
click  -> button "Crear Método" (sin llenar nombre)
assert -> texto "requerido|obligatorio" visible
```

### 10. Crear metodo exitosamente
```
fill   -> textbox "Nombre del método" = "E2E Test Method {timestamp}"
click  -> button "Crear Método"
waitFor -> dialog cerrado
assert -> text "E2E Test Method {timestamp}" visible en tabla
```

### 11. Cerrar dialog con Cancelar
```
click  -> button "Nuevo Método"
waitFor -> dialog visible
click  -> button "Cancelar"
waitFor -> dialog cerrado
```

### 12. Cerrar dialog con Escape
```
click  -> button "Nuevo Método"
waitFor -> dialog visible
press  -> Escape
waitFor -> dialog cerrado
```

### 13. Toggle estado activo/inactivo
```
# Obtener estado actual de primera fila
click  -> button "Desactivar" de primera fila
waitFor -> respuesta /api/payment-methods
assert -> estado cambiado a "Inactivo"
# Revertir:
click  -> button "Activar" de primera fila
waitFor -> respuesta /api/payment-methods
assert -> estado cambiado a "Activo"
```

### 14. Editar metodo
```
click  -> button con svg.lucide-pencil de una fila
waitFor -> dialog visible
assert -> textbox con nombre actual pre-cargado (inputValue.length > 0)
```

### 15. Eliminar metodo (confirmacion)
```
click  -> button con svg.lucide-trash-2 de una fila [enabled]
waitFor -> alertdialog visible
assert -> text "¿Estás seguro" visible
click  -> button "Cancelar"
waitFor -> alertdialog cerrado
```

## Observaciones

### Selectores Clave
| Elemento | Selector Playwright |
|----------|-------------------|
| Heading pagina | `getByRole('heading', { name: 'Configuración', level: 1 })` |
| Card title | `getByRole('heading', { name: 'Métodos de Pago' })` |
| Descripcion | `getByText(/Configura los métodos de pago disponibles/i)` |
| Boton nuevo | `getByRole('button', { name: /Nuevo Método/i })` |
| Dialog | `getByRole('dialog')` |
| Dialog heading | Dialog -> `getByRole('heading', { name: /Crear Nuevo Método/i })` |
| Nombre input | Dialog -> `getByLabel(/Nombre/i)` o `getByPlaceholder(/nombre/i)` |
| Icono input | Dialog -> `getByLabel(/Icono/i)` |
| Cuotas checkbox | Dialog -> `getByRole('checkbox', { name: /cuotas/i })` |
| Cancelar | Dialog -> `getByRole('button', { name: /Cancelar/i })` |
| Crear Metodo | Dialog -> `getByRole('button', { name: /Crear Método/i })` |
| Close | Dialog -> `getByRole('button', { name: 'Close' })` |
| Filas | `page.locator('tbody tr')` |
| Toggle activo | Fila -> `getByRole('button', { name: /Activar\|Desactivar/i })` |
| Editar | Fila -> `locator('button').filter({ has: page.locator('svg.lucide-pencil') })` |
| Eliminar | Fila -> `locator('button').filter({ has: page.locator('svg.lucide-trash-2') })` |
| Drag handle | `page.locator('svg.lucide-grip-vertical')` |
| AlertDialog | `getByRole('alertdialog')` |
| Nav Settings | `getByRole('navigation')` con links a secciones |

### Comportamientos UI
- **Drag & Drop**: Filas arrastrables con GripVertical, cursor cambia a grab
- **Orden determina default**: El primer metodo activo es el predeterminado
- **Toggle inline**: Botones "Activar"/"Desactivar" cambian estado via API en tiempo real
- **Proteccion eliminacion**: Boton disabled con tooltip "No se puede eliminar (X pagos asociados)"
- **Edicion pre-cargada**: Al editar, el dialog muestra el nombre actual del metodo
- **Confirmacion eliminar**: AlertDialog con "¿Estás seguro?" antes de eliminar
- **Sub-navegacion settings**: Secciones de configuracion como sidebar dentro de /settings
- **Icono opcional**: Campo libre para nombre de icono Lucide React
- **Cuotas checkbox**: Feature de cuotas sin interes por metodo de pago
- **Cada fila es button**: Las filas de tbody son `<button>` elements (para drag & drop)

### Edge Cases
- Tabla vacia: Muestra "No hay métodos de pago configurados"
- Metodo con pagos: No se puede eliminar (boton disabled + tooltip)
- Toggle revertir: Test hace toggle y revierte para no afectar otros tests
- Drag & drop flaky: Recomendado testear manualmente
- Nombre duplicado: Comportamiento no documentado (posible error backend)
- Validacion submit vacio: Muestra error "requerido/obligatorio"

### API Endpoints
- `GET /api/payment-methods` - Lista de metodos de pago
- `POST /api/payment-methods` - Crear metodo
- `PUT /api/payment-methods/:id` - Actualizar metodo (nombre, estado, orden)
- `DELETE /api/payment-methods/:id` - Eliminar metodo
- `DELETE /api/test/cleanup` - Limpieza de datos E2E

## Mapping Navegacion - Test

| Paso | Test en spec | Descripcion |
|------|-------------|-------------|
| 1-2 | `debe cargar la pagina correctamente` | Verifica heading y descripcion |
| 2 | `debe mostrar boton de crear nuevo metodo` | Boton "Nuevo Método" visible |
| 3 | `debe mostrar la tabla de metodos` | Verifica headers de columnas |
| 3-4 | `debe mostrar metodos existentes o mensaje vacio` | Filas o mensaje vacio |
| 4 | `debe mostrar badges de estado (Activo/Inactivo)` | Badges por fila |
| 5 | `debe mostrar iconos de drag handle` | GripVertical por fila |
| 6 | `debe tener botones de accion por fila` | Toggle, editar, eliminar |
| 7 | `debe deshabilitar eliminar si tiene pagos asociados` | Boton disabled con title |
| 8 | `debe abrir dialog al hacer click en Nuevo Metodo` | Dialog con heading |
| 8 | `debe mostrar campo de nombre en el dialog` | Input nombre visible |
| 9 | `debe validar campo obligatorio` | Error al submit vacio |
| 10 | `flujo completo: crear metodo de pago` | Crear, verificar en tabla |
| 11 | `debe cerrar dialog con boton Cancelar` | Cancelar cierra dialog |
| 12 | `debe cerrar dialog con Escape` | Escape cierra dialog |
| 13 | `debe poder toggle estado activo/inactivo` | Toggle + revertir |
| 14 | `debe abrir dialog de edicion al hacer click en editar` | Editar con datos pre-cargados |
| 15 | `debe mostrar confirmacion al intentar eliminar` | AlertDialog + cancelar |
| 15 | `debe tener elementos arrastrables` | Drag handles + cursor-grab |
