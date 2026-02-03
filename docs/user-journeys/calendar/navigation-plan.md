# Calendar (Calendario) - Plan de Navegacion

## Resumen

| Campo | Valor |
|-------|-------|
| URL | `/calendar` |
| Spec E2E | `tests/e2e/calendar-event-edit.spec.ts` |
| Page Object | `tests/e2e/page-objects/calendar.page.ts` |

## Screenshots de Referencia

| # | Archivo | Descripcion |
|---|---------|-------------|
| 1 | [`01-vista-semanal.png`](../reference/calendar/01-vista-semanal.png) | Vista semanal del calendario con header, navegacion, selector de vista "Semana", dias Lun-Dom |

## Estructura de la Pagina

### Layout Principal
- **Sidebar** (izquierda): Navegacion global
- **Header**: Titulo "Calendario" (h1) + descripcion + boton "Nuevo Evento"
- **Descripcion**: "Gestión de eventos de proyectos, postventas y visitas"
- **Toolbar de navegacion**: Boton anterior + "Hoy" + boton siguiente + rango de fechas
- **Controles de vista**: Boton config (engranaje) + selector de vista (combobox "Semana")
- **Grilla semanal**: 7 columnas (Lun-Dom) con numeros de dia, celdas clickeables para eventos

### Header del Calendario
| Elemento | Tipo | Descripcion |
|----------|------|-------------|
| Titulo | heading [level=1] | "Calendario" |
| Descripcion | paragraph | "Gestión de eventos de proyectos, postventas y visitas" |
| Nuevo Evento | button | "Nuevo Evento" con icono + |

### Toolbar de Navegacion
| Elemento | Tipo | Descripcion |
|----------|------|-------------|
| Anterior | button (flecha izq) | Navega a semana anterior |
| Hoy | button "Hoy" | Vuelve a semana actual |
| Siguiente | button (flecha der) | Navega a semana siguiente |
| Rango | texto | Formato "D mes - D mes YYYY" (ej: "2 feb - 8 feb 2026") |

### Controles de Vista
| Elemento | Tipo | Descripcion |
|----------|------|-------------|
| Config | button (engranaje) | Configuracion del calendario |
| Selector vista | combobox | Opciones: Semana, Mes, Agenda |

### Grilla Semanal
| Dia | Header | Numero |
|-----|--------|--------|
| Lun | "Lun" | numero del dia |
| Mar | "Mar" | numero del dia (hoy resaltado con circulo) |
| Mie | "Mié" | numero del dia |
| Jue | "Jue" | numero del dia |
| Vie | "Vie" | numero del dia |
| Sab | "Sáb" | numero del dia |
| Dom | "Dom" | numero del dia |

### Tipos de Eventos
| Tipo | Formato texto | Color/Estilo |
|------|--------------|-------------|
| Proyecto | "P - {numero}" | Evento de proyecto |
| Visita | (pendiente documentar) | Evento de visita |
| Postventa | (pendiente documentar) | Evento de postventa |

### Dialog Editar Evento (Proyecto)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| Titulo | heading [level=2] | "Editar Evento" |
| Fecha | textbox | Label "Fecha" |
| Estado | combobox | Label "Estado", selector de estado del proyecto |
| Tags equipo | multi-select/checkboxes | Campo teamTagIds para asignar equipo |
| Cancelar | button | Cierra dialog sin guardar |

## Plan de Navegacion

### 1. Carga inicial
```
navigate -> /calendar
waitFor  -> heading "Calendario" [level=1]
waitFor  -> text "Lun" visible (dias de semana renderizados)
```

### 2. Verificar estructura del header
```
assert -> heading "Calendario" [level=1]
assert -> text "Gestión de eventos de proyectos, postventas y visitas"
assert -> button "Nuevo Evento" visible
```

### 3. Verificar toolbar de navegacion
```
assert -> button "Hoy" visible
assert -> text rango de fechas visible (ej: "2 feb - 8 feb 2026")
assert -> botones de navegacion anterior/siguiente visibles
```

### 4. Verificar selector de vista
```
assert -> combobox con texto "Semana" visible
```

### 5. Verificar grilla semanal
```
assert -> text "Lun" visible
assert -> text "Mar" visible
assert -> text "Mié" visible
assert -> text "Jue" visible
assert -> text "Vie" visible
assert -> text "Sáb" visible
assert -> text "Dom" visible
assert -> numeros de dia visibles (7 celdas)
```

### 6. Navegar entre semanas
```
# Obtener texto del rango actual
read   -> texto del rango de fechas (ej: "2 feb - 8 feb 2026")
click  -> boton siguiente (flecha derecha, sibling de "Hoy")
waitFor -> rango de fechas cambiado
assert -> texto del rango diferente al anterior
```

### 7. Cambiar vista del calendario
```
click  -> combobox "Semana"
waitFor -> opciones visibles
assert -> option "Mes" visible
assert -> option "Agenda" visible
click  -> option "Mes"
assert -> vista cambiada
```

### 8. Buscar evento de proyecto (si existe)
```
# Buscar boton con texto "P - XXXXX" (evento de proyecto)
locate -> button con texto matching /^P - \d+/
# Si existe:
hover  -> evento de proyecto
```

### 9. Editar evento via menu
```
# Hover sobre evento para mostrar menu
hover  -> button del evento
click  -> button del menu (MoreVertical icon) dentro del evento
waitFor -> menu visible
click  -> menuitem "Editar"
waitFor -> dialog "Editar Evento" visible
```

### 10. Verificar dialog de edicion
```
assert -> heading "Editar Evento" [level=2]
assert -> label "Fecha" con input visible
assert -> combobox "Estado" visible
# Campo teamTagIds (multi-select o checkboxes de equipo)
assert -> referencia a "equipo" o "tags" o "team" visible
```

### 11. Cerrar dialog de edicion
```
click  -> button "Cancelar"
waitFor -> dialog cerrado
```

### 12. Boton Nuevo Evento
```
click  -> button "Nuevo Evento"
waitFor -> dialog o popover visible
assert -> opciones de tipo de evento visibles (Proyecto, Visita, Postventa)
```

### 13. Click en dia para crear evento
```
click  -> numero de dia en la grilla
waitFor -> dialog o popover visible (puede no aparecer en todos los calendarios)
```

## Observaciones

### Selectores Clave
| Elemento | Selector Playwright |
|----------|-------------------|
| Heading | `getByRole('heading', { name: /calendario/i, level: 1 })` |
| Descripcion | `getByText(/Gestión de eventos de proyectos/i)` |
| Nuevo Evento | `getByRole('button', { name: /nuevo evento/i })` |
| Hoy | `getByRole('button', { name: 'Hoy' })` |
| Rango fechas | `page.locator('.text-xl.font-semibold.capitalize')` |
| Selector vista | `getByRole('combobox').filter({ hasText: /semana/i })` |
| Evento proyecto | `page.locator('button').filter({ hasText: /^P - \\d+/ }).first()` |
| Siguiente semana | `todayButton.locator('xpath=following-sibling::button[1]')` |
| Dialog | `getByRole('dialog')` |
| Dialog heading | Dialog -> `getByRole('heading', { name: /editar evento/i })` |
| Campo fecha | Dialog -> `getByLabel(/fecha/i)` |
| Campo estado | Dialog -> `getByRole('combobox', { name: /estado/i })` |
| Cancelar | Dialog -> `getByRole('button', { name: /cancelar/i })` |
| Vista Mes | `getByRole('option', { name: /mes/i })` |
| Vista Agenda | `getByRole('option', { name: /agenda/i })` |

### Comportamientos UI
- **Vista semanal por defecto**: El calendario abre en vista de semana
- **Dia actual resaltado**: El dia actual tiene un circulo de fondo (ej: "3" con circulo teal)
- **Rango de fechas**: Muestra formato "D mes - D mes YYYY" en capitalize
- **Navegacion semanal**: Botones anterior/siguiente mueven de a 1 semana
- **3 vistas**: Semana (default), Mes, Agenda via combobox
- **Eventos como botones**: Los eventos son botones clickeables con texto descriptivo
- **Menu en hover**: Al hacer hover sobre un evento, aparece boton de menu (MoreVertical)
- **Editar via menu**: Menu contextual con opcion "Editar" abre dialog
- **teamTagIds**: Campo de tags de equipo en el dialog de edicion
- **Nuevo Evento**: Abre selector de tipo (Proyecto, Visita, Postventa)
- **Click en dia**: Puede abrir selector de tipo para crear evento en ese dia
- **Sin breadcrumb**: El calendario no tiene breadcrumb, va directo al titulo

### Edge Cases
- Semana sin eventos: La grilla se muestra vacia (celdas vacias)
- Evento largo: Nombre truncado si es muy largo
- Cambio de mes: Navegacion puede cruzar entre meses
- test.skip si no hay eventos: El spec usa `test.skip` si no encuentra eventos de proyecto
- Vista mes: Layout cambia a grilla mensual
- Vista agenda: Layout cambia a lista de eventos

### API Endpoints
- `GET /api/calendar/events` - Eventos del calendario (filtrado por rango de fechas)
- `PUT /api/calendar/events/:id` - Actualizar evento (fecha, estado, teamTagIds)
- `POST /api/calendar/events` - Crear evento

## Mapping Navegacion - Test

| Paso | Test en spec | Descripcion |
|------|-------------|-------------|
| 1-5 | Implicito en beforeEach | navigate() espera heading + "Lun" |
| 8-11 | `debe mostrar el dialog de edicion con los campos del proyecto` | Buscar evento, editar via menu, verificar campos |
| 10 | `debe existir el campo de tags de equipo en el dialog de proyecto` | Campo teamTagIds en dialog |
| 12 | `debe poder abrir el boton Nuevo Evento` | Selector de tipo de evento |
| 6 | `debe poder navegar entre semanas` | Rango de fechas cambia |
| 7 | `debe poder cambiar la vista del calendario` | Opciones Mes/Agenda |
| 12 | `debe abrir el selector de tipo al hacer click en Nuevo Evento` | Dialog/popover con tipos |
| 13 | `debe poder hacer click en un dia para crear evento` | Interaccion con dia |
