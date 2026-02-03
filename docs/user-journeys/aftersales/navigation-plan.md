# Aftersales (Postventas) - Plan de Navegacion

## Resumen

| Campo | Valor |
|-------|-------|
| URL | `/aftersales` |
| Spec E2E | `tests/e2e/aftersales.spec.ts` |
| Page Object | `tests/e2e/page-objects/aftersales.page.ts` |
| Dialog | `tests/e2e/page-objects/dialogs/new-aftersale.dialog.ts` |

## Screenshots de Referencia

| # | Archivo | Descripcion |
|---|---------|-------------|
| 1 | [`01-tabla-postventas.png`](../reference/aftersales/01-tabla-postventas.png) | Tabla de postventas (vacia en screenshot, con columnas Proyecto, Fecha, Estado, Descripcion, Acciones) |
| 2 | [`02-dialog-nuevo-caso.png`](../reference/aftersales/02-dialog-nuevo-caso.png) | Dialog "Nuevo Caso de Postventa" con campos proyecto, estado, fecha, telefono, direccion, descripcion, tareas |

## Estructura de la Pagina

### Layout Principal
- **Sidebar** (izquierda): Navegacion global
- **Breadcrumb**: `Inicio > Postventas`
- **Header**: Titulo "Postventas" (h1) + boton "Nuevo Caso"
- **Toolbar**: Input de busqueda + boton "Columnas"
- **Tabla**: DataTable con datos de postventas
- **Paginacion**: Control de filas por pagina + navegacion de paginas

### Columnas de la Tabla
| Columna | Header (boton sorteable) | Contenido |
|---------|-------------------------|-----------|
| Proyecto | `button "Proyecto"` | Numero de proyecto (formato "P - XXXXX") |
| Fecha | `button "Fecha"` | Fecha de reporte (formato DD-MM-YYYY) |
| Estado | `button "Estado"` | Badge editable inline (EditableBadge) |
| Descripcion | texto estatico | Descripcion del problema |
| Acciones | texto estatico | Boton "Abrir menu" con dropdown |

### Paginacion
- Selector "Filas por pagina" (combobox, default: 50)
- Texto: "Pagina X de Y"
- Botones: Primera / Anterior / Siguiente / Ultima
- Botones disabled cuando no aplica

### Dialog "Nuevo Caso de Postventa"
| Campo | Tipo | Label | Estado inicial | Descripcion |
|-------|------|-------|----------------|-------------|
| Proyecto * | combobox | "Proyecto *" | activo | Placeholder: "Buscar proyecto..." (solo proyectos finalizados) |
| Estado * | combobox | "Estado *" | activo | Placeholder: "Seleccionar..." |
| Fecha de Reporte * | textbox (date) | "Fecha de Reporte *" | pre-llenado con fecha actual | Formato YYYY-MM-DD |
| Telefono * | textbox con prefijo | "Telefono*" | vacio | Prefijo fijo "+56", se autocompleta al seleccionar proyecto |
| Calle y numeracion * | textbox | "Calle y numeración *" | disabled | Se autocompleta al seleccionar proyecto |
| (numero) | textbox | (sin label visible) | disabled | Complemento de direccion |
| Region * | combobox | "Región *" | disabled | Placeholder: "Selecciona una región..." |
| Comuna * | combobox | "Comuna *" | disabled | Placeholder: "Primero selecciona una región" |
| Descripcion del Problema | textbox (textarea) | "Descripción del Problema" | activo | Campo opcional, max 1000 caracteres |
| Lista de Tareas | textbox + lista | "Lista de Tareas" | vacio | Placeholder: "Agregar nueva tarea...", boton "Agregar tarea" disabled |
| Cancelar | button | | | Cierra dialog |
| Crear Caso | button | | | Submit del formulario |
| Close | button (X) | | | Cierra dialog |

## Plan de Navegacion

### 1. Carga inicial
```
navigate -> /aftersales
waitFor  -> heading "Postventas" [level=1]
waitFor  -> textbox "Buscar por proyecto, cliente o descripción..." visible
waitFor  -> table visible
```

### 2. Verificar estructura de tabla
```
assert -> button "Proyecto" visible (columnheader sorteable)
assert -> button "Fecha" visible (columnheader sorteable)
assert -> button "Estado" visible (columnheader sorteable)
assert -> text "Descripción" visible (columnheader)
assert -> text "Acciones" visible (columnheader)
```

### 3. Abrir dialog "Nuevo Caso de Postventa"
```
click  -> button "Nuevo Caso"
waitFor -> dialog "Nuevo Caso de Postventa"
assert -> heading "Nuevo Caso de Postventa" [level=2]
assert -> paragraph "Registra un nuevo problema o incidencia en un proyecto finalizado"
assert -> combobox "Proyecto *" (placeholder: "Buscar proyecto...")
assert -> combobox "Estado *" (placeholder: "Seleccionar...")
assert -> textbox "Fecha de Reporte *" (valor: fecha actual)
assert -> textbox "Teléfono*" (con prefijo "+56")
assert -> textbox "Calle y numeración *" [disabled]
assert -> combobox "Región *" [disabled]
assert -> combobox "Comuna *" [disabled]
assert -> textbox "Descripción del Problema"
assert -> textbox "Nueva tarea para tasks" (placeholder: "Agregar nueva tarea...")
assert -> button "Cancelar"
assert -> button "Crear Caso"
assert -> button "Close" (X)
```

### 4. Validacion de formulario (submit vacio)
```
click  -> button "Crear Caso"
assert -> texto "debe seleccionar un proyecto válido"
assert -> texto "el teléfono es requerido"
```

### 5. Validacion de telefono chileno
```
fill   -> textbox "Teléfono*" = "123456789"
click  -> button "Crear Caso"
assert -> texto "formato inválido|teléfono.*válido"
```

### 6. Validacion de descripcion maxima
```
fill   -> textbox "Descripción del Problema" = "A" * 1001
click  -> button "Crear Caso"
assert -> texto "la descripción no puede exceder 1000 caracteres"
```

### 7. Seleccionar proyecto (autocompleta campos)
```
click  -> combobox "Proyecto *"
type   -> "15" (minimo 2 caracteres para buscar)
waitFor -> options visibles ([role="option"])
click  -> primer option
waitFor -> textbox "Teléfono*" no vacio (autocomplete desde proyecto)
waitFor -> textbox "Calle y numeración *" [enabled] (autocomplete)
waitFor -> combobox "Región *" [enabled]
waitFor -> combobox "Comuna *" [enabled]
```

### 8. Crear caso exitosamente
```
fill   -> textbox "Descripción del Problema" = "E2E Test Aftersale {timestamp}"
click  -> button "Crear Caso"
waitFor -> response POST /api/aftersales
waitFor -> dialog cerrado
```

### 9. Agregar tareas (TodoListField)
```
fill   -> textbox "Nueva tarea para tasks" = "Revisar instalación"
press  -> Enter (o click button "Agregar tarea")
assert -> texto "Revisar instalación" visible en lista
fill   -> textbox "Nueva tarea para tasks" = "Reparar daño"
press  -> Enter
assert -> texto "Reparar daño" visible en lista
```

### 10. Busqueda de casos
```
fill   -> textbox "Buscar por proyecto, cliente o descripción..." = termino
waitFor -> respuesta /api/ (debounce)
assert -> tabla actualizada
```

### 11. Busqueda sin resultados
```
fill   -> textbox "Buscar por proyecto, cliente o descripción..." = "ZZZZZ_NO_EXISTE_999"
waitFor -> respuesta /api/
assert -> texto "No se encontraron resultados."
```

### 12. Dropdown de acciones por caso
```
click  -> button "Abrir menu" de primera fila
waitFor -> menu visible
assert -> menuitem "Editar"
assert -> menuitem "Ver detalle"
assert -> menuitem "Eliminar"
```

### 13. Editar caso existente
```
click  -> menuitem "Editar"
waitFor -> dialog "Editar Caso de Postventa"
assert -> heading "Editar Caso de Postventa" [level=2]
assert -> textbox "Descripción del Problema" con valor pre-cargado
fill   -> textbox "Descripción del Problema" = "Descripcion editada E2E {timestamp}"
click  -> button "Guardar Cambios"
waitFor -> dialog cerrado
assert -> texto "Descripcion editada E2E {timestamp}" visible en tabla
```

### 14. Eliminar caso con confirmacion
```
click  -> button "Abrir menu" de primera fila
click  -> menuitem "Eliminar"
waitFor -> alertdialog visible
assert -> texto "¿Estás seguro?"
assert -> texto "Esta acción no se puede deshacer"
assert -> button "Cancelar"
assert -> button "Eliminar"
```

### 15. Cancelar eliminacion
```
click  -> button "Cancelar" (en alertdialog)
waitFor -> alertdialog cerrado
```

### 16. Cambiar estado inline (EditableBadge)
```
click  -> badge de estado en primera fila ([data-editable-badge])
waitFor -> options de estado visibles ([role="option"])
click  -> segundo option (cambiar estado)
waitFor -> respuesta /api/aftersales (mutation)
```

### 17. Auto-completar telefono del proyecto
```
# En dialog nuevo caso:
click  -> combobox "Proyecto *"
type   -> "15"
waitFor -> options visibles
click  -> primer option
waitFor -> textbox "Teléfono*" con valor no vacio
assert -> valor empieza con "9" (formato chileno sin prefijo)
```

### 18. Cerrar dialog
```
click  -> button "Nuevo Caso"
waitFor -> dialog visible
click  -> button "Close" (X)
waitFor -> dialog cerrado
```

## Observaciones

### Selectores Clave
| Elemento | Selector Playwright |
|----------|-------------------|
| Heading | `getByRole('heading', { name: 'Postventas', level: 1 })` |
| Boton nuevo | `getByRole('button', { name: /nuevo caso/i })` |
| Busqueda | `getByPlaceholder(/buscar por proyecto, cliente o descripción/i)` |
| Dialog | `getByRole('dialog')` |
| Dialog heading | Dialog -> `getByRole('heading', { name: /nuevo caso de postventa/i })` |
| Proyecto combobox | Dialog -> `getByRole('combobox').first()` |
| Estado combobox | Dialog -> `getByLabel(/estado/i)` |
| Fecha input | Dialog -> `getByLabel(/fecha de reporte/i)` |
| Telefono input | Dialog -> `getByLabel(/teléfono/i)` |
| Calle input | Dialog -> `getByLabel(/calle y numeración/i)` |
| Region combobox | Dialog -> `getByRole('combobox', { name: /región/i })` |
| Comuna combobox | Dialog -> `getByRole('combobox', { name: /comuna/i })` |
| Descripcion input | Dialog -> `getByLabel(/descripción del problema/i)` |
| Tarea input | Dialog -> `getByPlaceholder(/agregar nueva tarea/i)` |
| Cancelar | Dialog -> `getByRole('button', { name: /cancelar/i })` |
| Crear Caso | Dialog -> `getByRole('button', { name: /crear caso/i })` |
| Close | Dialog -> `getByRole('button', { name: 'Close' })` |
| Acciones | Fila -> `getByRole('button').first()` (primer boton de la fila) |
| Menuitems | `getByRole('menuitem', { name: /texto/i })` |
| Primera fila | `page.locator('table tbody tr').first()` |
| AlertDialog | `getByRole('alertdialog')` |
| Columnas btn | `getByRole('button', { name: /columnas/i })` |

### Comportamientos UI
- **Solo proyectos finalizados**: El combobox de proyecto filtra solo proyectos con `projectStatus.isFinal === true`
- **Autocompletado cascada**: Al seleccionar proyecto se autocompletan: telefono, calle, region, comuna
- **Campos disabled hasta proyecto**: Direccion, region y comuna disabled hasta seleccionar proyecto
- **Prefijo +56**: El campo telefono tiene prefijo fijo "+56" no editable
- **EditableBadge inline**: El estado en la tabla es clickeable para cambiar directamente
- **TodoListField**: Lista de tareas con input + Enter para agregar, muestra mensaje "No hay tareas" cuando vacia
- **Busqueda con debounce**: Input busca por proyecto, cliente o descripcion
- **Columnas sorteables**: Proyecto, Fecha, Estado tienen botones de ordenamiento
- **AlertDialog eliminacion**: Confirmacion con "¿Estás seguro?" y "Esta acción no se puede deshacer"

### Edge Cases
- Tabla vacia: Muestra "No se encontraron resultados."
- Proyecto sin direccion: Campos de direccion quedan vacios pero habilitados
- Descripcion vacia: Campo opcional, se puede crear caso sin descripcion
- Descripcion > 1000 chars: Error de validacion
- Telefono autocompleted: Formato sin prefijo (ej: "912345678"), prefijo "+56" es visual
- Tareas opcionales: Lista de tareas es completamente opcional
- Solo proyectos finalizados: No aparecen proyectos en estado no-final

### API Endpoints
- `GET /api/aftersales` - Lista de casos (con busqueda)
- `POST /api/aftersales` - Crear caso
- `PUT /api/aftersales/:id` - Actualizar caso (edicion y cambio de estado)
- `DELETE /api/aftersales/:id` - Eliminar caso
- `DELETE /api/test/cleanup` - Limpieza de datos E2E

## Mapping Navegacion - Test

| Paso | Test en spec | Descripcion |
|------|-------------|-------------|
| 1-2 | `debe cargar la página de postventas correctamente` | Verifica heading, boton, busqueda, contenido |
| 2 | `debe mostrar columnas correctas en la tabla` | Verifica headers de columnas |
| 3 | `debe abrir el dialog de nuevo caso` | Verifica dialog con campos y botones |
| 4 | `debe validar campos obligatorios del formulario` | Submit vacio, mensajes error |
| 5 | `debe validar formato de teléfono chileno` | Telefono invalido |
| 6 | `debe validar descripción máxima de 1000 caracteres` | Descripcion larga |
| 7-8 | `debe crear un caso de postventa completo exitosamente` | Flujo completo creacion |
| 8 | `debe crear un caso sin descripción (campo opcional)` | Creacion sin descripcion |
| 9 | `debe permitir agregar tareas a la lista de tareas` | TodoListField |
| 10-11 | `debe realizar búsqueda de casos correctamente` | Busqueda con y sin resultados |
| 12 | `debe mostrar dropdown de acciones por caso` | Verifica menuitems |
| 13 | `debe editar un caso de postventa existente` | Edicion con dialog |
| 14-15 | `debe eliminar un caso de postventa con confirmación` | Eliminar + confirmar |
| 15 | `debe cancelar eliminación de caso` | Cancelar alertdialog |
| 16 | `debe cambiar estado de caso inline (EditableBadge)` | Cambio estado directo |
| 17 | `debe auto-completar teléfono del proyecto seleccionado` | Autocomplete telefono |
| 17 | `debe mostrar AddressProjectSummary cuando se selecciona proyecto` | Autocomplete direccion |
