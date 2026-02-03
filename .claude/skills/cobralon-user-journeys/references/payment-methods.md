# Payment Methods

| Campo | Valor |
|-------|-------|
| URL | `/settings/payments` |
| Spec | `tests/e2e/payment-methods.spec.ts` |
| Page Object | `tests/e2e/page-objects/payment-methods.page.ts` |

## Estructura de Página

### Layout
- Breadcrumb: `Panel Principal > Configuración`
- Header: h1 "Configuración"
- Sub-navegación izquierda: General, Importar Datos, Estados del Sistema, **Métodos de Pago** (activo)
- Card: título "Métodos de Pago" + descripción + botón "Nuevo Método"
- Tabla con drag & drop

### Columnas de la Tabla
| Columna | Header | Contenido |
|---------|--------|-----------|
| Drag handle | — | `svg.lucide-grip-vertical`, cursor-grab |
| Nombre | `columnheader "Nombre"` | Texto del método |
| Estado | `columnheader "Estado"` | Badge "Activo" (verde) o "Inactivo" (gris) |
| Acciones | `columnheader "Acciones"` | Toggle + Editar (pencil) + Eliminar (trash) |

### Dialog "Crear Nuevo Método de Pago"
| Campo | Tipo | Placeholder/Descripción |
|-------|------|------------------------|
| Nombre del método | textbox | "Ej: Transferencia Bancaria" |
| Icono (opcional) | textbox | "Ej: Banknote, CreditCard, Smartphone" — nombre Lucide React |
| Cuotas sin interés | checkbox | "¿Ofrece cuotas sin interés?" |
| Cancelar | button | — |
| Submit: "Crear Método" | button | — |

## Selectores Clave

| Elemento | Selector |
|----------|----------|
| Heading página | `getByRole('heading', { name: 'Configuración', level: 1 })` |
| Card title | `getByRole('heading', { name: 'Métodos de Pago' })` |
| Descripción | `getByText(/Configura los métodos de pago disponibles/i)` |
| Botón nuevo | `getByRole('button', { name: /Nuevo Método/i })` |
| Dialog heading | `dialog.getByRole('heading', { name: /Crear Nuevo Método/i })` |
| Nombre input | `dialog.getByLabel(/Nombre/i)` |
| Icono input | `dialog.getByLabel(/Icono/i)` |
| Cuotas checkbox | `dialog.getByRole('checkbox', { name: /cuotas/i })` |
| Cancelar | `dialog.getByRole('button', { name: /Cancelar/i })` |
| Submit | `dialog.getByRole('button', { name: /Crear Método/i })` |
| Filas | `page.locator('tbody tr')` |
| Toggle estado | `row.getByRole('button', { name: /Activar\|Desactivar/i })` |
| Editar | `row.locator('button').filter({ has: page.locator('svg.lucide-pencil') })` |
| Eliminar | `row.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })` |
| Drag handle | `page.locator('svg.lucide-grip-vertical')` |
| AlertDialog | `getByRole('alertdialog')` |

## Comportamientos UI

- **Drag & Drop**: filas arrastrables con GripVertical, cursor grab
- **Orden = default**: primer método activo es el predeterminado
- **Toggle inline**: "Activar"/"Desactivar" cambia estado vía API en tiempo real
- **Protección eliminación**: botón disabled con tooltip "No se puede eliminar (X pagos asociados)"
- **Edición pre-cargada**: dialog muestra nombre actual del método
- **AlertDialog eliminación**: "¿Estás seguro?" antes de eliminar
- **Sub-navegación settings**: secciones dentro de `/settings`
- **Cada fila es button**: `<button>` elements (para drag & drop)

## Edge Cases

- Tabla vacía: "No hay métodos de pago configurados"
- Método con pagos: no se puede eliminar (botón disabled + tooltip)
- Toggle revertir: test hace toggle y revierte para no afectar otros tests
- Drag & drop flaky: recomendado testear manualmente
- Nombre duplicado: comportamiento no documentado (posible error backend)
- Validación submit vacío: error "requerido/obligatorio"

## API Endpoints

- `GET /api/payment-methods` — lista de métodos
- `POST /api/payment-methods` — crear método
- `PUT /api/payment-methods/:id` — actualizar (nombre, estado, orden)
- `DELETE /api/payment-methods/:id` — eliminar método
- `DELETE /api/test/cleanup` — limpieza E2E
