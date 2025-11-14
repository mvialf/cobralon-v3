# Arquitectura del Sistema de Calendario

## Visión High-Level

El sistema de calendario es una **capa de visualización y gestión temporal** sobre las entidades existentes (Projects, Aftersales, Visits). No duplica datos, sino que crea referencias temporales (eventos) que permiten programar y trackear trabajo en el tiempo.

---

## Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    /calendar (Página)                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │          EventCalendar (Orchestrator)                 │ │
│  │                                                       │ │
│  │  - Gestiona estado global (fecha actual, vista)      │ │
│  │  - Coordina vistas (Week/Month/Agenda)               │ │
│  │  - Maneja drag & drop                                │ │
│  │  - Controla dialogs (crear/editar/eliminar)          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────┬────────────┬────────────┐                  │
│  │ WeekView   │ MonthView  │ AgendaView │                  │
│  │ (default)  │            │            │                  │
│  └────────────┴────────────┴────────────┘                  │
│          ↓           ↓           ↓                          │
│  ┌──────────────────────────────────────┐                  │
│  │   EventCard Components               │                  │
│  │  - ProjectEventCardInfo              │                  │
│  │  - AftersaleEventCardInfo            │                  │
│  │  - VisitEventCardInfo                │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos

### 1. Lectura (Fetch Events)

```
User opens /calendar
       ↓
EventCalendar component mounts
       ↓
useQuery → GET /api/calendar-events?start=...&end=...
       ↓
API fetches ProjectEvents + AftersaleEvents + VisitEvents
       ↓
API populates relations (project, aftersale, visit)
       ↓
API returns unified array:
  [
    { type: 'project', event: {...}, entity: Project },
    { type: 'aftersale', event: {...}, entity: Aftersale },
    { type: 'visit', event: {...}, entity: Visit }
  ]
       ↓
EventCalendar renders in selected view
```

### 2. Creación (Create Event)

```
User clicks empty day in calendar
       ↓
Dialog opens with 3 buttons:
  [🏗️ Proyecto] [📦 Postventa] [👁️ Visita]
       ↓
User selects type → Opens specific form dialog
       ↓
Form shows:
  - Combobox to search & select existing entity
  - Editable fields (address, phone, etc.)
  - Status dropdown
  - Notes textarea
       ↓
User selects entity + fills data
       ↓
onSubmit → useMutation → POST /api/project-events (or aftersale/visit)
       ↓
API validates + creates event in DB
       ↓
API updates entity fields if changed (address, phone, status, etc.)
       ↓
QueryClient invalidates cache → Refetch events
       ↓
Calendar updates, new event appears
```

### 3. Edición (Edit Event)

```
User clicks event card
       ↓
Dropdown menu opens: [Ver] [Editar] [Eliminar]
       ↓
User clicks "Editar"
       ↓
Same form dialog opens, pre-filled with event data
       ↓
User changes status / address / phone / notes
       ↓
onSubmit → useMutation → PUT /api/project-events/[id]
       ↓
API updates ProjectEvent + updates Project fields
       ↓
QueryClient invalidates → Refetch
       ↓
Calendar shows updated data
```

### 4. Drag & Drop (Reschedule)

```
User drags event card from Monday → Wednesday
       ↓
@dnd-kit handles drag state
       ↓
onDragEnd callback fires
       ↓
useMutation → PATCH /api/project-events/[id]
  Body: { scheduledDate: "2025-11-15" }
       ↓
API updates ProjectEvent.scheduledDate
       ↓
QueryClient invalidates → Refetch
       ↓
Event appears in new day (auto-update, no confirmation)
```

### 5. Eliminación (Delete Event)

```
User clicks event → Dropdown → "Eliminar"
       ↓
ConfirmDeleteDialog opens
  "¿Eliminar evento del 13 de Nov?"
       ↓
User confirms
       ↓
useMutation → DELETE /api/project-events/[id]
       ↓
API deletes event (NOT the project, only the calendar event)
       ↓
QueryClient invalidates → Refetch
       ↓
Event disappears from calendar
```

---

## Arquitectura de Capas

```
┌──────────────────────────────────────────────┐
│           Presentation Layer                 │
│  (React Components - Client Side)            │
│                                              │
│  EventCalendar, Views, Forms, Cards          │
└──────────────────────────────────────────────┘
              ↓ React Query (TanStack)
┌──────────────────────────────────────────────┐
│             API Layer                        │
│  (Next.js API Routes - Server Side)          │
│                                              │
│  /api/calendar-events (unified fetch)        │
│  /api/project-events                         │
│  /api/aftersale-events                       │
│  /api/visit-events                           │
└──────────────────────────────────────────────┘
              ↓ Prisma Client
┌──────────────────────────────────────────────┐
│            Data Layer                        │
│  (PostgreSQL via Neon)                       │
│                                              │
│  ProjectEvent, AftersaleEvent, VisitEvent    │
│  Project, Aftersale, Visit                   │
│  ProjectStatus, AftersaleStatus, VisitStatus │
└──────────────────────────────────────────────┘
```

---

## Gestión de Estado

### Server State (React Query)

```typescript
// Custom hooks
useCalendarEvents(startDate, endDate) // GET unified events
useCreateProjectEvent() // POST project event
useUpdateProjectEvent() // PUT project event
useDeleteProjectEvent()[ // DELETE project event
  // Similar para Aftersale y Visit

  // Query Keys
  ('calendar-events', startDate, endDate)
][('project-events', eventId)][('aftersale-events', eventId)][('visit-events', eventId)]
```

### Client State (React useState)

```typescript
// En EventCalendar component
const [currentDate, setCurrentDate] = useState(new Date())
const [currentView, setCurrentView] = useState<'week' | 'month' | 'agenda'>('week')
const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
```

### Drag & Drop State (@dnd-kit)

```typescript
// DndContext provider wraps EventCalendar
const [activeId, setActiveId] = useState<string | null>(null)

function handleDragStart(event) {
  setActiveId(event.active.id)
}

function handleDragEnd(event) {
  // Calcula nueva fecha basado en drop zone
  // Llama a mutation para actualizar
  setActiveId(null)
}
```

---

## Tipo de Eventos Unificados

Para simplificar el rendering en vistas, creamos un tipo unificado:

```typescript
type CalendarEventType = 'project' | 'aftersale' | 'visit'

interface UnifiedCalendarEvent {
  // Datos del evento
  id: string
  type: CalendarEventType
  scheduledDate: Date
  notes: string | null

  // Entidad relacionada (populated)
  entity: Project | Aftersale | Visit

  // Metadata para rendering
  color: string // Azul/Naranja/Verde según tipo
  title: string // Nombre del cliente o título
  status: string // Estado actual de la entidad
}
```

API `/api/calendar-events` retorna array de `UnifiedCalendarEvent[]`.

---

## Colores por Tipo

```typescript
const EVENT_TYPE_COLORS = {
  project: 'hsl(217, 91%, 60%)', // Azul (--chart-1)
  aftersale: 'hsl(25, 95%, 53%)', // Naranja (--chart-2)
  visit: 'hsl(142, 76%, 36%)', // Verde (--chart-3)
} as const
```

Aplicados como `borderLeftColor` en cards para identificación visual rápida.

---

## Filtrado de Entidades (Combobox)

Al crear evento, combobox solo muestra entidades **NO finalizadas**:

```typescript
// Filtro en queries
const projects = await prisma.project.findMany({
  where: {
    projectStatus: {
      isFinal: false, // Excluye "Completado"
    },
  },
  include: {
    customer: true,
    projectStatus: true,
  },
})
```

Mismo filtro para Aftersales (excluye "Completado") y Visits (excluye "Cancelada" y "Completada").

---

## Validaciones Clave

### 1. No duplicar eventos en mismo día

```typescript
// En API route POST /api/project-events
const existingEvent = await prisma.projectEvent.findFirst({
  where: {
    projectId: data.projectId,
    scheduledDate: data.scheduledDate,
  },
})

if (existingEvent) {
  return NextResponse.json(
    { error: 'Ya existe un evento para este proyecto en esta fecha' },
    { status: 400 }
  )
}
```

### 2. Validar entidad existe y no está finalizada

```typescript
const project = await prisma.project.findUnique({
  where: { id: data.projectId },
  include: { projectStatus: true },
})

if (!project) {
  return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
}

if (project.projectStatus.isFinal) {
  return NextResponse.json(
    { error: 'No se pueden crear eventos para proyectos finalizados' },
    { status: 400 }
  )
}
```

---

## Drag & Drop - Arquitectura

Usamos `@dnd-kit/core` con estrategia simplificada (sin horas):

```typescript
// EventCard es draggable
import { useDraggable } from '@dnd-kit/core'

function DraggableEventCard({ event }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: event.id,
    data: event
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <EventCardContent />
    </div>
  )
}

// CalendarDay es droppable
import { useDroppable } from '@dnd-kit/core'

function DroppableCalendarDay({ date }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date.toISOString()}`,
    data: { date }
  })

  return (
    <div ref={setNodeRef} className={isOver ? 'bg-accent' : ''}>
      {/* Events for this day */}
    </div>
  )
}
```

**Simplificación:** Solo cambia fecha, no hora (no hay time slots).

---

## Permisos y Seguridad

**Fase 1:** Sin autenticación (todos pueden ver/editar todo).

**Fase Futura:**

- Middleware para verificar auth
- RLS (Row Level Security) en Prisma
- Permisos por rol (admin, técnico, solo lectura)

---

## Performance

### Optimizaciones implementadas

1. **Query limitado por rango**: Solo fetch eventos visibles

   ```typescript
   // GET /api/calendar-events?start=2025-11-01&end=2025-11-30
   ```

2. **React Query cache**: 5 minutos de stale time

   ```typescript
   queryClient.setQueryDefaults(['calendar-events'], {
     staleTime: 5 * 60 * 1000, // 5 min
   })
   ```

3. **Optimistic updates**: Drag & drop usa optimistic updates

   ```typescript
   useMutation({
     onMutate: async (newData) => {
       await queryClient.cancelQueries(['calendar-events'])
       const previous = queryClient.getQueryData(['calendar-events'])
       queryClient.setQueryData(['calendar-events'], optimisticData)
       return { previous }
     },
     onError: (err, newData, context) => {
       queryClient.setQueryData(['calendar-events'], context.previous)
     },
   })
   ```

4. **Índices en DB**: Ver `02-data-model.md`

---

## Navegación entre Módulos

### Desde Calendario → Entidad

Click en evento → Dropdown → "Ver" → Abre dialog con datos readonly.

**NO navega** a `/projects/[id]` (decisión de usuario confirmada).

### Desde Entidad → Calendario

**Fase 1:** No hay vínculo (eventos solo viven en `/calendar`).

**Fase Futura:** En `/projects/[id]` mostrar lista de eventos asociados.

---

## Diagramas de Componentes

### EventCalendar (Orchestrator)

```
EventCalendar
├── Header
│   ├── ViewSelector (Week/Month/Agenda)
│   ├── Navigation (Prev/Today/Next)
│   └── DateDisplay
│
├── CurrentView (switch basado en currentView)
│   ├── WeekView (default)
│   ├── MonthView
│   └── AgendaView
│
└── Dialogs
    ├── CreateEventTypeDialog (selector de tipo)
    ├── ProjectEventDialog (form)
    ├── AftersaleEventDialog (form)
    ├── VisitEventDialog (form)
    └── ConfirmDeleteDialog
```

---

## Tecnologías y Dependencias

| Tecnología      | Uso                     |
| --------------- | ----------------------- |
| Next.js 15      | Framework, API routes   |
| React 19        | UI components           |
| Prisma          | ORM, migrations         |
| TanStack Query  | Server state management |
| @dnd-kit        | Drag & drop             |
| date-fns        | Date manipulation       |
| Zod             | Validation schemas      |
| React Hook Form | Form management         |
| shadcn/ui       | UI components base      |

Todas ya instaladas ✅

---

## Siguiente Paso

Revisar **[02-data-model.md](02-data-model.md)** para schemas de Prisma completos.
