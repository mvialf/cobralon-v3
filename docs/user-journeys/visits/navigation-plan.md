# Visits (Visitas) - Plan de Navegacion

## Resumen

| Campo       | Valor                                                     |
| ----------- | --------------------------------------------------------- |
| URL         | `/visits`                                                 |
| Spec E2E    | `tests/e2e/visits.spec.ts`                                |
| Page Object | `tests/e2e/page-objects/visits.page.ts`                   |
| Dialog      | Inline helpers in `tests/e2e/page-objects/visits.page.ts` |

## Screenshots de Referencia

| #   | Archivo                                                                        | Descripcion                                                                                                      |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1   | [`01-tabla-visitas.png`](../reference/visits/01-tabla-visitas.png)             | Tabla de visitas con 2 registros, badges "Contactada", columnas Nombre, Fecha, Estado, Comuna, Acciones          |
| 2   | [`02-dialog-nueva-visita.png`](../reference/visits/02-dialog-nueva-visita.png) | Dialog "Nueva Visita" con campos nombre, telefono, direccion, region, comuna, estado, fecha, hora, observaciones |

## Estructura de la Pagina

### Layout Principal

- **Sidebar** (izquierda): Navegacion global
- **Breadcrumb**: `Inicio > Visitas`
- **Header**: Titulo "Visitas" (h1) + descripcion + boton "Nueva Visita"
- **Descripcion**: "Gestiona las visitas agendadas a clientes potenciales"
- **Toolbar**: Input de busqueda + filtro Estado + boton "Columnas"
- **Tabla**: DataTable con datos de visitas
- **Paginacion**: Control de filas por pagina + navegacion de paginas (server-side)

### Columnas de la Tabla

| Columna            | Header (boton sorteable)      | Contenido                                                       |
| ------------------ | ----------------------------- | --------------------------------------------------------------- |
| Nombre             | `button "Nombre"`             | Nombre del contacto + telefono (si existe, en linea secundaria) |
| Fecha de Solicitud | `button "Fecha de Solicitud"` | Formato DD-MM-YYYY                                              |
| Estado             | `button "Estado"`             | Badge editable inline (EditableBadge), ej: "Contactada"         |
| Comuna             | `button "Comuna"`             | Comuna + calle (en linea secundaria)                            |
| Acciones           | texto estatico                | Boton "Abrir menú para visita de {nombre}" con dropdown         |

### Paginacion (Server-Side)

- Selector "Filas por pagina" (combobox, default: 50)
- Texto: "Pagina X de Y"
- Botones: Primera / Anterior / Siguiente / Ultima
- Botones disabled cuando no aplica
- **Server-side**: Cambia parametros de URL, no filtro client-side

### Dialog "Nueva Visita"

| Campo                 | Tipo                | Label                   | Estado inicial               | Descripcion                                         |
| --------------------- | ------------------- | ----------------------- | ---------------------------- | --------------------------------------------------- |
| Nombre \*             | textbox             | "Nombre \*"             | activo (focus)               | Nombre del contacto                                 |
| Telefono              | textbox con prefijo | "Teléfono"              | vacio                        | Prefijo fijo "+56", opcional                        |
| Calle y numeracion \* | textbox             | "Calle y numeración \*" | activo                       | Direccion de la visita                              |
| (numero)              | textbox             | (sin label visible)     | activo                       | Complemento de direccion                            |
| Region \*             | combobox            | "Región \*"             | activo                       | Placeholder: "Selecciona una región..."             |
| Comuna \*             | combobox            | "Comuna \*"             | disabled                     | Placeholder: "Primero selecciona una región"        |
| Estado \*             | combobox            | "Estado \*"             | activo                       | Placeholder: "Seleccionar estado"                   |
| Fecha de Solicitud \* | textbox (date)      | "Fecha de Solicitud \*" | pre-llenado con fecha actual | Formato YYYY-MM-DD                                  |
| Hora Agendada         | textbox (time)      | "Hora Agendada"         | vacio                        | Formato HH:MM, opcional                             |
| Observaciones         | textbox (textarea)  | "Observaciones"         | vacio                        | Placeholder: "Notas adicionales sobre la visita..." |
| Cancelar              | button              |                         |                              | Cierra dialog                                       |
| Guardar Visita        | button              |                         |                              | Submit del formulario                               |
| Cerrar                | button (X)          |                         |                              | Cierra dialog                                       |

## Plan de Navegacion

### 1. Carga inicial

```
navigate -> /visits
waitFor  -> heading "Visitas" [level=1]
waitFor  -> text "Gestiona las visitas agendadas a clientes potenciales"
waitFor  -> table visible
```

### 2. Verificar estructura de pagina

```
assert -> text "Inicio" visible (breadcrumb)
assert -> text "Visitas" visible (breadcrumb)
assert -> button "Nueva Visita" visible
assert -> textbox "Buscar por nombre, teléfono, dirección o comuna..." visible
assert -> button "Estado" visible (filtro)
```

### 3. Verificar columnas de tabla

```
assert -> columnheader con button "Nombre" visible
assert -> columnheader con button "Fecha de Solicitud" visible
assert -> columnheader con button "Estado" visible
assert -> columnheader con button "Comuna" visible
assert -> columnheader "Acciones" visible
```

### 4. Verificar datos en tabla

```
assert -> filas de datos visibles en tbody
assert -> badge de estado visible en columna Estado (ej: "Contactada")
assert -> texto de comuna con calle en linea secundaria
```

### 5. Abrir dialog "Nueva Visita"

```
click  -> button "Nueva Visita"
waitFor -> dialog "Nueva Visita"
assert -> heading "Nueva Visita" [level=2]
assert -> textbox "Nombre *" visible (con focus)
assert -> textbox "Teléfono" visible (con prefijo "+56")
assert -> textbox "Calle y numeración *" visible
assert -> combobox "Región *" visible
assert -> combobox "Comuna *" [disabled]
assert -> combobox "Estado *" visible
assert -> textbox "Fecha de Solicitud *" con valor fecha actual
assert -> textbox "Hora Agendada" visible
assert -> textbox "Observaciones" visible (placeholder: "Notas adicionales sobre la visita...")
assert -> button "Cancelar"
assert -> button "Guardar Visita"
assert -> button "Cerrar" (X)
```

### 6. Cerrar dialog con Escape

```
press  -> Escape
waitFor -> dialog cerrado
```

### 7. Busqueda con debounce

```
fill   -> textbox "Buscar por nombre, teléfono, dirección o comuna..." = "juanita"
waitFor -> respuesta /api/visits (debounce)
assert -> tabla actualizada con resultados filtrados
```

### 8. Resetear paginacion al buscar

```
# Si hay suficientes datos, navegar a pagina 2 primero
click  -> button "Siguiente" (si enabled)
fill   -> textbox busqueda = "a"
waitFor -> respuesta /api/visits
assert -> tabla visible con resultados
```

### 9. Filtro por estado

```
click  -> button "Estado"
waitFor -> opciones visibles
assert -> options de estado (cargadas dinamicamente desde VisitStatus)
press  -> Escape (cerrar)
```

### 10. Cambio de estado inline (EditableBadge)

```
click  -> button "Cambiar Contactada. Click para ver opciones." (badge en primera fila)
waitFor -> opciones de estado visibles ([role="option"])
# Cancelar:
press  -> Escape
```

### 11. Dropdown de acciones por visita

```
click  -> button "Abrir menú para visita de {nombre}" de primera fila
waitFor -> menu visible
# Opciones disponibles en el menu
```

### 12. Navegar al detalle de visita

```
# Buscar link o boton de detalle en primera fila
click  -> link en primera fila (navega a /visits/[id])
waitFor -> URL match /visits/[a-zA-Z0-9-]+/
assert -> URL contiene "/visits/"
```

### 13. Verificar SSR (carga rapida)

```
navigate -> /visits
assert -> table visible (timeout: 3000ms, rapido gracias a SSR)
```

### 14. Paginacion server-side

```
assert -> controles de paginacion visibles
# Si hay suficientes datos:
click  -> button "Siguiente"
assert -> tabla visible con nuevos datos
click  -> button "Anterior"
assert -> tabla actualizada
```

### 15. Responsive mobile

```
setViewportSize -> { width: 375, height: 667 }
navigate -> /visits
assert -> heading "Visitas" visible
assert -> contenido principal visible
```

## Observaciones

### Selectores Clave

| Elemento        | Selector Playwright                                                          |
| --------------- | ---------------------------------------------------------------------------- |
| Heading         | `getByRole('heading', { name: 'Visitas' })`                                  |
| Descripcion     | `getByText(/Gestiona las visitas agendadas/i)`                               |
| Boton nuevo     | `getByRole('button', { name: /Nueva Visita/i })`                             |
| Busqueda        | `getByPlaceholder(/Buscar por nombre, teléfono, dirección o comuna.../i)`    |
| Filtro estado   | `getByRole('button', { name: /Estado/i })`                                   |
| Dialog          | `getByRole('dialog')`                                                        |
| Dialog heading  | Dialog -> `getByRole('heading', { name: /Nueva Visita/i })`                  |
| Nombre input    | Dialog -> `getByLabel(/Nombre/i)`                                            |
| Telefono input  | Dialog -> `getByLabel(/Teléfono/i)`                                          |
| Calle input     | Dialog -> `getByLabel(/Calle y numeración/i)`                                |
| Region combobox | Dialog -> `getByRole('combobox', { name: /Región/i })`                       |
| Comuna combobox | Dialog -> `getByRole('combobox', { name: /Comuna/i })`                       |
| Estado combobox | Dialog -> `getByRole('combobox', { name: /Estado/i })`                       |
| Fecha input     | Dialog -> `getByLabel(/Fecha de Solicitud/i)`                                |
| Hora input      | Dialog -> `getByLabel(/Hora Agendada/i)`                                     |
| Observaciones   | Dialog -> `getByLabel(/Observaciones/i)`                                     |
| Cancelar        | Dialog -> `getByRole('button', { name: /Cancelar/i })`                       |
| Guardar         | Dialog -> `getByRole('button', { name: /Guardar Visita/i })`                 |
| Cerrar          | Dialog -> `getByRole('button', { name: 'Cerrar' })`                          |
| Badge estado    | Fila -> `getByRole('button', { name: /Cambiar.*Click para ver opciones/i })` |
| Acciones        | Fila -> `getByRole('button', { name: /Abrir menú para visita de/i })`        |
| Paginacion next | `getByRole('button', { name: /Siguiente/i })`                                |

### Comportamientos UI

- **SSR pre-carga**: Los datos se pre-cargan con Server-Side Rendering, la tabla aparece rapido
- **Paginacion server-side**: La paginacion cambia parametros de URL y recarga datos del servidor
- **Busqueda con debounce**: El input espera antes de hacer request (500ms tipico)
- **Prefijo +56**: Campo telefono tiene prefijo fijo "+56" no editable
- **Comuna disabled**: Se habilita al seleccionar region
- **Fecha pre-llenada**: Fecha de solicitud viene con fecha actual
- **Hora opcional**: Campo de hora agendada es opcional
- **EditableBadge inline**: El estado en la tabla es clickeable para cambiar directamente
- **Acciones con nombre**: El boton de acciones incluye el nombre de la visita en su aria-label
- **Link a detalle**: Las visitas tienen link a pagina de detalle `/visits/[id]`
- **Columna Comuna compuesta**: Muestra comuna en primera linea y calle en segunda linea
- **Columna Nombre compuesta**: Muestra nombre y telefono (si existe) en segunda linea

### Edge Cases

- Tabla vacia: Muestra "No hay visitas" o "Sin resultados"
- Visita sin telefono: Solo muestra nombre en la celda
- Busqueda resetea paginacion: Al buscar, vuelve a pagina 1
- Prefetch siguiente pagina: Carga rapida al navegar entre paginas
- Estado dinamico: Las opciones de estado se cargan desde VisitStatus en la DB
- Responsive: El contenido se adapta en viewport mobile

### API Endpoints

- `GET /api/visits` - Lista de visitas (con busqueda, filtros y paginacion server-side)
- `POST /api/visits` - Crear visita
- `PUT /api/visits/:id` - Actualizar visita (estado inline)
- `GET /api/visits/:id` - Detalle de visita

## Mapping Navegacion - Test

| Paso | Test en spec                                       | Descripcion                    |
| ---- | -------------------------------------------------- | ------------------------------ |
| 1    | `debe cargar la pagina correctamente`              | Verifica heading y descripcion |
| 2    | `debe mostrar breadcrumbs`                         | Breadcrumbs Inicio > Visitas   |
| 2    | `debe mostrar boton de nueva visita`               | Boton visible                  |
| 13   | `debe cargar sin mostrar loading gracias a SSR`    | Tabla visible rapido           |
| 3-4  | `debe mostrar la tabla con datos o mensaje vacio`  | Tabla o mensaje vacio          |
| 3    | `debe tener las columnas esperadas`                | Headers de columnas            |
| 4    | `debe tener campo de busqueda`                     | Input visible                  |
| 7    | `debe filtrar al escribir (con debounce)`          | Busqueda con API               |
| 8    | `debe resetear paginacion al buscar`               | Buscar desde pagina 2          |
| 9    | `debe tener filtro de estado`                      | Filtro visible                 |
| 9    | `debe mostrar opciones de estado al hacer click`   | Opciones del filtro            |
| 14   | `debe mostrar controles de paginacion`             | Controles visibles             |
| 14   | `debe poder navegar entre paginas`                 | Next/Previous                  |
| 5    | `debe abrir dialog al hacer click en Nueva Visita` | Dialog visible                 |
| 5    | `debe mostrar formulario de nueva visita`          | Campo fecha                    |
| 6    | `debe cerrar dialog con Escape`                    | Escape cierra                  |
| 10   | `debe poder cambiar estado desde la tabla`         | EditableBadge                  |
| 12   | `debe poder navegar al detalle de una visita`      | Link a /visits/[id]            |
| 15   | `debe funcionar en viewport mobile`                | Responsive 375x667             |
| 14   | `siguiente pagina deberia cargar rapido`           | Prefetch < 3s                  |
