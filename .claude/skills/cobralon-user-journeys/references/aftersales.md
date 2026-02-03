# Aftersales (Postventas)

| Campo | Valor |
|-------|-------|
| URL | `/aftersales` |
| Spec | `tests/e2e/aftersales.spec.ts` |
| Page Object | `tests/e2e/page-objects/aftersales.page.ts` |
| Dialog | `tests/e2e/page-objects/dialogs/new-aftersale.dialog.ts` |

## Estructura de Página

### Layout
- Breadcrumb: `Inicio > Postventas`
- Header: h1 "Postventas" + botón "Nuevo Caso"
- Toolbar: búsqueda `"Buscar por proyecto, cliente o descripción..."` + "Columnas"
- DataTable + paginación (default 50 filas)

### Columnas de la Tabla
| Columna | Header | Contenido |
|---------|--------|-----------|
| Proyecto | `button "Proyecto"` | Formato "P - XXXXX" |
| Fecha | `button "Fecha"` | DD-MM-YYYY |
| Estado | `button "Estado"` | EditableBadge inline |
| Descripción | texto estático | Texto del problema |
| Acciones | texto estático | `button "Abrir menu"` |

### Dialog "Nuevo Caso de Postventa"
| Campo | Tipo | Estado inicial |
|-------|------|----------------|
| Proyecto * | combobox | activo, "Buscar proyecto..." (solo finalizados) |
| Estado * | combobox | activo, "Seleccionar..." |
| Fecha de Reporte * | textbox date | pre-llenado fecha actual |
| Teléfono * | textbox + prefijo "+56" | vacío, se autocompleta al seleccionar proyecto |
| Calle y numeración * | textbox | **disabled**, se autocompleta |
| (número) | textbox | **disabled** |
| Región * | combobox | **disabled**, "Selecciona una región..." |
| Comuna * | combobox | **disabled**, "Primero selecciona una región" |
| Descripción del Problema | textarea | opcional, max 1000 chars |
| Lista de Tareas | textbox + lista | "Agregar nueva tarea...", Enter para agregar |
| Cancelar | button | — |
| Submit: "Crear Caso" | button | — |

## Selectores Clave

| Elemento | Selector |
|----------|----------|
| Heading | `getByRole('heading', { name: 'Postventas', level: 1 })` |
| Botón nuevo | `getByRole('button', { name: /nuevo caso/i })` |
| Búsqueda | `getByPlaceholder(/buscar por proyecto, cliente o descripción/i)` |
| Dialog heading | `dialog.getByRole('heading', { name: /nuevo caso de postventa/i })` |
| Proyecto combobox | `dialog.getByRole('combobox').first()` |
| Estado combobox | `dialog.getByLabel(/estado/i)` |
| Fecha input | `dialog.getByLabel(/fecha de reporte/i)` |
| Teléfono input | `dialog.getByLabel(/teléfono/i)` |
| Calle input | `dialog.getByLabel(/calle y numeración/i)` |
| Región combobox | `dialog.getByRole('combobox', { name: /región/i })` |
| Comuna combobox | `dialog.getByRole('combobox', { name: /comuna/i })` |
| Descripción input | `dialog.getByLabel(/descripción del problema/i)` |
| Tarea input | `dialog.getByPlaceholder(/agregar nueva tarea/i)` |
| Submit | `dialog.getByRole('button', { name: /crear caso/i })` |
| Primera fila | `page.locator('table tbody tr').first()` |
| AlertDialog | `getByRole('alertdialog')` |

## Comportamientos UI

- **Solo proyectos finalizados**: combobox filtra `projectStatus.isFinal === true`
- **Autocompletado cascada**: seleccionar proyecto autocompleta teléfono, calle, región, comuna
- **Campos disabled hasta proyecto**: dirección, región y comuna disabled
- **Prefijo +56**: campo teléfono con prefijo fijo no editable
- **EditableBadge inline**: estado en tabla clickeable para cambiar directo
- **TodoListField**: input + Enter para agregar tareas, "No hay tareas" cuando vacía
- **AlertDialog eliminación**: "¿Estás seguro?" + "Esta acción no se puede deshacer"
- **Edición pre-cargada**: dialog "Editar Caso de Postventa" con datos existentes

## Dropdown de Acciones
- Editar
- Ver detalle
- Eliminar

## Edge Cases

- Tabla vacía: "No se encontraron resultados."
- Proyecto sin dirección: campos habilitados pero vacíos
- Descripción vacía: campo opcional
- Descripción > 1000 chars: error validación
- Teléfono autocompleted: formato sin prefijo (ej: "912345678")
- Tareas opcionales: lista completamente opcional
- Solo proyectos finalizados: no aparecen proyectos no-final

## API Endpoints

- `GET /api/aftersales` — lista (búsqueda)
- `POST /api/aftersales` — crear caso
- `PUT /api/aftersales/:id` — actualizar (edición + cambio estado)
- `DELETE /api/aftersales/:id` — eliminar caso
- `DELETE /api/test/cleanup` — limpieza E2E
