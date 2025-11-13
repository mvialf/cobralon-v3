# Flujos de Usuario - Calendar System

## 1. Flujo de Visualización Inicial

```
Usuario navega a /calendar
       ↓
EventCalendar component monta
       ↓
useCalendarEvents hook ejecuta query
  - Calcula rango visible (1 mes para Month, 1 semana para Week)
  - GET /api/calendar-events?start=2025-11-01&end=2025-11-30
       ↓
API retorna eventos unificados
       ↓
WeekView renderiza eventos por día
  - Agrupa eventos por fecha
  - Renderiza ProjectEventCardInfo, AftersaleEventCardInfo, VisitEventCardInfo
       ↓
Usuario ve calendario con eventos
```

**Tiempo esperado:** <1 segundo

**Loading state:** Skeleton cards mientras carga

---

## 2. Flujo de Creación de Evento

### 2.1 Usuario hace click en día vacío

```
Usuario hace click en celda de día vacío (ej: 15 de Nov)
       ↓
DroppableDayCell.onClick(date) dispara
       ↓
EventCalendar.handleDayClick(date) ejecuta:
  - setCreateDialogDate(date)
  - setIsCreateDialogOpen(true)
       ↓
CreateEventTypeDialog abre
  - Muestra 3 botones: [🏗️ Proyecto] [📦 Postventa] [👁️ Visita]
  - Título: "Crear evento para 15/11/2025"
       ↓
Usuario selecciona tipo (ej: Proyecto)
       ↓
CreateEventTypeDialog cierra
       ↓
ProjectEventDialog abre en modo "create"
  - Pre-llena scheduledDate con 15/11/2025
  - Muestra form vacío
```

### 2.2 Usuario llena formulario

```
ProjectEventDialog (modo create)
       ↓
Form contiene:
  - ProjectCombobox (buscar proyecto)
  - Campos editables (address, phone, status, etc.)
  - Textarea notes
       ↓
Usuario busca proyecto en combobox
  - Tipea "Juan" → Combobox filtra proyectos con "Juan"
  - Solo muestra proyectos NO finalizados (isFinal: false)
       ↓
Usuario selecciona "Proyecto 1550 - Juan Pérez"
       ↓
Form auto-llena campos desde project:
  - address ← project.address
  - phone ← project.phone
  - elements ← project.elements
  - m2 ← project.m2
  - status ← project.projectStatus
  - description ← project.description
       ↓
Usuario edita campos (ej: cambia status de "montaje" a "fabricación")
       ↓
Usuario agrega notas: "Primera visita - 5/10 elementos"
       ↓
Usuario hace click en "Crear"
```

### 2.3 Envío y validación

```
Form.onSubmit ejecuta
       ↓
React Hook Form valida con Zod schema
  - ✅ projectId: válido
  - ✅ scheduledDate: válido
  - ✅ notes: <1000 chars
       ↓
useCreateProjectEvent mutation ejecuta
       ↓
POST /api/project-events
  Body: {
    projectId: "cm...",
    scheduledDate: "2025-11-15",
    notes: "Primera visita - 5/10 elementos"
  }
       ↓
API valida:
  1. ✅ Proyecto existe
  2. ✅ Proyecto NO está finalizado
  3. ✅ NO hay evento duplicado en esa fecha
       ↓
API crea evento en DB
       ↓
API actualiza campos del proyecto:
  - project.projectStatusId = nuevo status
  - project.address = editado
  - etc.
       ↓
API retorna evento creado con relaciones
       ↓
React Query invalida cache ['calendar-events']
       ↓
EventCalendar refetch automático
       ↓
Nuevo evento aparece en calendario (15 de Nov)
       ↓
Toast: "Evento creado correctamente" (success)
       ↓
Dialog cierra
```

**Duración total:** ~3-5 segundos (depende de network)

---

## 3. Flujo de Visualización de Evento

```
Usuario hace click en evento existente
       ↓
EventCard.onClick dispara
       ↓
EventActionsDropdown abre
  - Opciones: [Ver] [Editar] [Eliminar]
       ↓
Usuario selecciona "Ver"
       ↓
ProjectEventDialog abre en modo "view" (readonly)
       ↓
Dialog muestra:
  - Todos los campos readonly (sin edición)
  - ProjectNameSummary con link
  - Estado actual del proyecto
  - Notas del evento
  - Fecha del evento
       ↓
Usuario revisa información
       ↓
Usuario cierra dialog (botón X o fuera)
```

**Uso común:** Revisar detalles de eventos pasados sin editar.

---

## 4. Flujo de Edición de Evento

### 4.1 Abrir dialog de edición

```
Usuario hace click en evento
       ↓
EventActionsDropdown abre
       ↓
Usuario selecciona "Editar"
       ↓
ProjectEventDialog abre en modo "edit"
  - Campos pre-llenados con datos actuales
  - Todos los campos editables
```

### 4.2 Editar datos

```
Usuario edita campos:
  - Cambia estado de "montaje" → "completado"
  - Actualiza notas: "10/10 elementos instalados"
  - Modifica teléfono
       ↓
Usuario hace click en "Guardar"
       ↓
Form.onSubmit ejecuta
       ↓
Validación Zod
       ↓
useUpdateProjectEvent mutation ejecuta
       ↓
PUT /api/project-events/[id]
  Body: {
    scheduledDate: "2025-11-15", // Sin cambios
    notes: "10/10 elementos instalados",
    updateProject: {
      projectStatusId: "completado-id",
      phone: "nuevo-teléfono"
    }
  }
       ↓
API usa transacción:
  1. Actualiza ProjectEvent.notes
  2. Actualiza Project.projectStatusId y Project.phone
       ↓
API retorna evento actualizado
       ↓
React Query invalida cache
       ↓
Calendario refetch
       ↓
Evento muestra nuevo estado "Completado"
       ↓
Toast: "Evento actualizado" (success)
       ↓
Dialog cierra
```

**Nota:** Cambios en estado/campos se reflejan en TODOS los eventos del mismo proyecto (porque edita el Project directamente).

---

## 5. Flujo de Drag & Drop (Reprogramar)

### 5.1 Inicio del drag

```
Usuario hace mousedown en evento (ej: Lunes 13)
       ↓
DraggableEventCard.onDragStart ejecuta
       ↓
@dnd-kit/core gestiona drag state
  - activeId = event.id
  - Evento se vuelve semi-transparente (opacity: 0.5)
  - Cursor cambia a "grabbing"
```

### 5.2 Durante el drag

```
Usuario arrastra hacia otra celda
       ↓
DroppableDayCell detecta hover
  - isOver = true
  - Celda destino resalta con bg-accent
       ↓
Usuario sigue arrastrando
  - Otras celdas pierden resaltado
  - Solo celda bajo cursor resalta
```

### 5.3 Drop del evento

```
Usuario suelta mouse en celda destino (ej: Miércoles 15)
       ↓
DroppableDayCell.onDrop ejecuta
       ↓
EventCalendar.handleDragEnd(event) ejecuta:
  - Extrae event.active.id (id del evento)
  - Extrae event.over.data.date (nueva fecha)
       ↓
useUpdateProjectEventDate mutation ejecuta (optimistic update)
       ↓
Optimistic update:
  - QueryClient actualiza cache inmediatamente
  - Evento APARECE en nueva celda antes de respuesta server
       ↓
PATCH /api/project-events/[id]
  Body: { scheduledDate: "2025-11-15" }
       ↓
API actualiza ProjectEvent.scheduledDate
       ↓
API retorna evento actualizado
       ↓
Mutation success:
  - ✅ Cache ya actualizado (optimistic)
  - No hay refetch necesario
       ↓
Evento permanece en nueva posición
       ↓
NO hay toast (auto-guardado silencioso)
```

### 5.4 Manejo de error en drag

```
Si API retorna error (ej: ya existe evento en esa fecha)
       ↓
Mutation.onError ejecuta
       ↓
QueryClient rollback:
  - Restaura evento a posición original
  - Cache vuelve a estado previo
       ↓
Toast: "Error: Ya existe evento en esta fecha" (error)
       ↓
Evento vuelve a celda original
```

**Duración:** <500ms (parece instantáneo por optimistic update)

---

## 6. Flujo de Eliminación de Evento

```
Usuario hace click en evento
       ↓
EventActionsDropdown abre
       ↓
Usuario selecciona "Eliminar" (texto rojo)
       ↓
ConfirmDeleteDialog abre
  - Título: "Eliminar evento"
  - Mensaje: "¿Estás seguro de eliminar el evento del 15/11/2025?"
  - Botones: [Cancelar] [Eliminar]
       ↓
Usuario hace click en "Eliminar"
       ↓
useDeleteProjectEvent mutation ejecuta
       ↓
DELETE /api/project-events/[id]
       ↓
API elimina evento de DB (solo el evento, NO el proyecto)
       ↓
API retorna success
       ↓
React Query invalida cache
       ↓
Calendario refetch
       ↓
Evento desaparece del calendario
       ↓
Toast: "Evento eliminado" (success)
       ↓
Dialog cierra
```

**⚠️ Importante:** Solo se elimina el evento del calendario, el Project/Aftersale/Visit sigue existiendo.

---

## 7. Flujo de Navegación entre Vistas

```
Usuario está en WeekView
       ↓
Usuario hace click en selector de vista → "Mes"
       ↓
ViewSelector.onChange('month') ejecuta
       ↓
EventCalendar.setCurrentView('month')
       ↓
EventCalendar renderiza MonthView
       ↓
useCalendarEvents recalcula rango:
  - Antes: 1 semana (7 días)
  - Ahora: 1 mes completo
       ↓
Si rango cambió → Refetch automático
       ↓
MonthView renderiza con grid 6x7
  - Eventos como badges pequeños
  - Menos info por evento (solo nombre)
```

**Vistas disponibles:**
1. **Week** (default) - 7 columnas, altura dinámica
2. **Month** - Grid 6x7, badges compactos
3. **Agenda** - Lista vertical, no drag & drop

---

## 8. Flujo de Navegación Temporal

### 8.1 Botón "Anterior"

```
Usuario hace click en [<] (Anterior)
       ↓
CalendarHeader.handlePrevious() ejecuta
       ↓
currentView === 'week' → Resta 7 días
currentView === 'month' → Resta 30 días
       ↓
EventCalendar.setCurrentDate(newDate)
       ↓
useCalendarEvents recalcula rango
       ↓
API fetch con nuevo rango
       ↓
Vista actualiza con eventos del período anterior
```

### 8.2 Botón "Hoy"

```
Usuario hace click en [Hoy]
       ↓
CalendarHeader.handleToday() ejecuta
       ↓
EventCalendar.setCurrentDate(new Date())
       ↓
Vista salta a semana/mes actual
       ↓
Refetch si es necesario
```

### 8.3 Botón "Siguiente"

```
Usuario hace click en [>] (Siguiente)
       ↓
Similar a "Anterior" pero suma días
```

---

## 9. Flujo de Error Común: Duplicado

```
Usuario intenta crear evento
       ↓
Ya existe evento para ese proyecto en esa fecha
       ↓
POST /api/project-events retorna 400
  { error: "Ya existe un evento para este proyecto en esta fecha" }
       ↓
Mutation.onError ejecuta
       ↓
Toast aparece (error, duración: 5 seg):
  "Ya existe un evento para este proyecto en esta fecha"
       ↓
Dialog permanece abierto
       ↓
Usuario puede:
  - Cambiar fecha
  - Seleccionar otro proyecto
  - Cancelar
```

---

## 10. Flujo de Filtrado (Fase Futura)

**Nota:** No implementado en Fase 1, pero diseñado para facilidad.

```
Usuario hace click en filtro "Mostrar solo Proyectos"
       ↓
EventCalendar.setFilter({ types: ['project'] })
       ↓
WeekView filtra eventos:
  - events.filter(e => e.type === 'project')
       ↓
Solo muestra eventos azules (ProjectEventCardInfo)
       ↓
Usuario deshabilita filtro → Muestra todos nuevamente
```

---

## Edge Cases Manejados

### 1. Sin conexión

```
Usuario intenta crear evento → Network error
       ↓
Mutation.onError ejecuta
       ↓
Toast: "Error de conexión. Verifica tu internet."
       ↓
Evento NO se crea, dialog permanece abierto
```

### 2. Proyecto eliminado durante edición

```
Usuario abre evento de proyecto X
       ↓
Otro usuario elimina proyecto X
       ↓
Usuario intenta guardar cambios
       ↓
API retorna 404: "Proyecto no encontrado"
       ↓
Toast: "El proyecto ya no existe"
       ↓
Evento se elimina del calendario (orphaned)
```

### 3. Drag a fecha pasada

**Fase 1:** Permitido (sin validación).

**Fase Futura:** Validar y mostrar warning.

---

## Siguiente Paso

Revisar **[06-implementation-phases.md](06-implementation-phases.md)** para roadmap de desarrollo.
