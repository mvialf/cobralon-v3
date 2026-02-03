# Visits (Visitas)

| Campo | Valor |
|-------|-------|
| URL | `/visits` |
| Spec | `tests/e2e/visits.spec.ts` |
| Page Object | `tests/e2e/page-objects/visits.page.ts` |
| Dialog | `tests/e2e/page-objects/dialogs/new-visit.dialog.ts` |

## Estructura de Página

### Layout
- Breadcrumb: `Inicio > Visitas`
- Header: h1 "Visitas" + descripción "Gestiona las visitas agendadas a clientes potenciales" + botón "Nueva Visita"
- Toolbar: búsqueda `"Buscar por nombre, teléfono, dirección o comuna..."` + filtro Estado + "Columnas"
- DataTable + paginación server-side (default 50 filas)

### Columnas de la Tabla
| Columna | Header | Contenido |
|---------|--------|-----------|
| Nombre | `button "Nombre"` | Nombre + teléfono (línea secundaria si existe) |
| Fecha de Solicitud | `button "Fecha de Solicitud"` | DD-MM-YYYY |
| Estado | `button "Estado"` | EditableBadge inline (ej: "Contactada") |
| Comuna | `button "Comuna"` | Comuna + calle (línea secundaria) |
| Acciones | texto estático | `button "Abrir menú para visita de {nombre}"` |

### Dialog "Nueva Visita"
| Campo | Tipo | Estado inicial |
|-------|------|----------------|
| Nombre * | textbox | activo (focus) |
| Teléfono | textbox + prefijo "+56" | vacío, **opcional** |
| Calle y numeración * | textbox | activo |
| (número) | textbox | activo |
| Región * | combobox | "Selecciona una región..." |
| Comuna * | combobox | **disabled**, "Primero selecciona una región" |
| Estado * | combobox | "Seleccionar estado" |
| Fecha de Solicitud * | textbox date | pre-llenado fecha actual |
| Hora Agendada | textbox time | vacío, **opcional** |
| Observaciones | textarea | "Notas adicionales sobre la visita..." |
| Cancelar | button | — |
| Submit: "Guardar Visita" | button | — |

## Selectores Clave

| Elemento | Selector |
|----------|----------|
| Heading | `getByRole('heading', { name: 'Visitas' })` |
| Descripción | `getByText(/Gestiona las visitas agendadas/i)` |
| Botón nuevo | `getByRole('button', { name: /Nueva Visita/i })` |
| Búsqueda | `getByPlaceholder(/Buscar por nombre, teléfono, dirección o comuna.../i)` |
| Filtro estado | `getByRole('button', { name: /Estado/i })` |
| Dialog heading | `dialog.getByRole('heading', { name: /Nueva Visita/i })` |
| Nombre input | `dialog.getByLabel(/Nombre/i)` |
| Teléfono input | `dialog.getByLabel(/Teléfono/i)` |
| Calle input | `dialog.getByLabel(/Calle y numeración/i)` |
| Región combobox | `dialog.getByRole('combobox', { name: /Región/i })` |
| Comuna combobox | `dialog.getByRole('combobox', { name: /Comuna/i })` |
| Estado combobox | `dialog.getByRole('combobox', { name: /Estado/i })` |
| Fecha input | `dialog.getByLabel(/Fecha de Solicitud/i)` |
| Hora input | `dialog.getByLabel(/Hora Agendada/i)` |
| Observaciones | `dialog.getByLabel(/Observaciones/i)` |
| Submit | `dialog.getByRole('button', { name: /Guardar Visita/i })` |
| Cerrar | `dialog.getByRole('button', { name: 'Cerrar' })` |
| Badge estado | `row.getByRole('button', { name: /Cambiar.*Click para ver opciones/i })` |
| Acciones fila | `row.getByRole('button', { name: /Abrir menú para visita de/i })` |
| Paginación next | `getByRole('button', { name: /Siguiente/i })` |

## Comportamientos UI

- **SSR pre-carga**: datos pre-cargados con Server-Side Rendering, tabla aparece rápido
- **Paginación server-side**: cambia parámetros de URL, recarga del servidor
- **Búsqueda con debounce**: ~500ms antes de request
- **Prefijo +56**: campo teléfono con prefijo fijo (teléfono es **opcional**)
- **Comuna disabled**: se habilita al seleccionar región
- **Fecha pre-llenada**: fecha actual
- **Hora opcional**: campo de hora agendada opcional
- **EditableBadge inline**: estado clickeable en tabla
- **Acciones con nombre**: aria-label incluye nombre de la visita
- **Link a detalle**: visitas tienen link a `/visits/[id]`
- **Columna compuesta Nombre**: nombre + teléfono en línea secundaria
- **Columna compuesta Comuna**: comuna + calle en línea secundaria
- **Estado dinámico**: opciones cargadas desde VisitStatus en DB

## Edge Cases

- Tabla vacía: "No hay visitas" o "Sin resultados"
- Visita sin teléfono: solo nombre en la celda
- Búsqueda resetea paginación: vuelve a página 1
- Prefetch siguiente página: carga rápida al navegar
- Responsive: viewport mobile 375x667

## API Endpoints

- `GET /api/visits` — lista (búsqueda, filtros, paginación server-side)
- `POST /api/visits` — crear visita
- `PUT /api/visits/:id` — actualizar (estado inline)
- `GET /api/visits/:id` — detalle de visita
