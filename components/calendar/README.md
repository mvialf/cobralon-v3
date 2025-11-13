# Calendar Components

Componentes UI del sistema de calendario unificado.

## Estructura

```
components/calendar/
├── event-calendar.tsx         # Orchestrator principal
├── calendar-header.tsx        # Navegación y date display
├── project-event-card.tsx     # Card para eventos de proyectos
├── views/
│   └── week-view.tsx         # Vista semanal (7 días)
└── README.md                 # Este archivo
```

## Componentes

### EventCalendar

**Path:** `components/calendar/event-calendar.tsx`

**Descripción:** Componente principal que orquesta todo el sistema de calendario.

**Responsabilidades:**
- Gestionar estado de fecha actual y vista
- Fetch eventos en rango visible con `useCalendarEvents()`
- Coordinar dialogs (create/edit/delete)
- Manejar navegación entre fechas

**Estado:**
```typescript
currentDate: Date              // Fecha actualmente visualizada
currentView: 'week' | 'month' | 'agenda'  // Vista actual (solo 'week' por ahora)
createDialogOpen: boolean      // Control dialog crear
editDialogOpen: boolean        // Control dialog editar
deleteDialogOpen: boolean      // Control dialog eliminar
selectedDate: Date | null      // Fecha seleccionada para crear
selectedEvent: CalendarEvent | null  // Evento seleccionado para editar
eventToDelete: CalendarEvent | null  // Evento a eliminar
```

**Uso:**
```tsx
import { EventCalendar } from '@/components/calendar/event-calendar'

<EventCalendar />
```

---

### CalendarHeader

**Path:** `components/calendar/calendar-header.tsx`

**Descripción:** Header con navegación y display de fecha actual.

**Props:**
```typescript
interface CalendarHeaderProps {
  currentDate: Date
  view: 'week' | 'month' | 'agenda'
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
}
```

**Features:**
- Botones Prev/Next con íconos ChevronLeft/Right
- Botón "Hoy" para volver a fecha actual
- Display de fecha formateada según vista (ej: "10 - 16 Nov 2025")
- Placeholder para ViewSelector (futuro)

**Uso:**
```tsx
<CalendarHeader
  currentDate={currentDate}
  view="week"
  onNavigate={handleNavigate}
/>
```

---

### WeekView

**Path:** `components/calendar/views/week-view.tsx`

**Descripción:** Vista semanal con grid de 7 días (Lun-Dom).

**Props:**
```typescript
interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onCreateEvent?: (date: Date) => void
  onEditEvent?: (event: CalendarEvent) => void
  onDeleteEvent?: (event: CalendarEvent) => void
}
```

**Features:**
- Header con días de la semana (Lun-Dom)
- Highlighting del día actual (bg-primary circular)
- Botón "Crear evento" por día (aparece en hover)
- Renderiza eventos usando `getEventsForDay()` y `ProjectEventCard`
- Grid responsive con `grid-cols-7`

**Cálculo de días:**
```typescript
const weekDays = getWeekDays(currentDate) // Lunes-Domingo
```

**Uso:**
```tsx
<WeekView
  currentDate={currentDate}
  events={data?.events || []}
  onCreateEvent={(date) => openCreateDialog(date)}
  onEditEvent={(event) => openEditDialog(event)}
  onDeleteEvent={(event) => openDeleteDialog(event)}
/>
```

---

### ProjectEventCard

**Path:** `components/calendar/project-event-card.tsx`

**Descripción:** Card visual para eventos de proyectos con dropdown menu.

**Props:**
```typescript
interface ProjectEventCardProps {
  event: ProjectEventWithRelations
  onEdit?: () => void
  onDelete?: () => void
}
```

**Display:**
- Border izquierdo azul (`hsl(var(--chart-1))`)
- Nombre del cliente (truncado 1 línea)
- Número de proyecto (`#XXXX`)
- Badge de status con color
- Notas (truncadas 2 líneas)

**Interactividad:**
- Dropdown menu (MoreVertical icon)
  - Aparece en hover (`opacity-0 group-hover:opacity-100`)
  - Opciones: Editar, Eliminar
- Hover effect (`hover:shadow-md`)

**Uso:**
```tsx
<ProjectEventCard
  event={event.data}
  onEdit={() => handleEdit(event)}
  onDelete={() => handleDelete(event)}
/>
```

---

## Forms & Dialogs

Ubicados en carpetas separadas:

- **Form:** `components/forms/calendar/project-event-form.tsx`
- **Dialog:** `components/dialogs/calendar/project-event-dialog.tsx`

Ver documentación en cada carpeta.

---

## Hooks Relacionados

### useCalendarEvents

**Path:** `hooks/queries/use-calendar-events.ts`

**Uso:**
```typescript
const { data, isLoading } = useCalendarEvents({ start, end })
// data?.events: CalendarEvent[]
```

**Cache:** 5 minutos (staleTime)

### useProjectEvents

**Path:** `hooks/queries/use-project-events.ts`

**Mutations disponibles:**
```typescript
const createMutation = useCreateProjectEvent()
const updateMutation = useUpdateProjectEvent()
const deleteMutation = useDeleteProjectEvent()
```

**Toast automático:** ✅ Incluido en cada mutation

---

## Utils Relacionados

### calendar-utils.ts

**Path:** `lib/utils/calendar-utils.ts`

**Funciones clave:**
```typescript
getWeekDays(date: Date): Date[]
getVisibleDateRange(date: Date, view: 'week'): { start, end }
formatDateDisplay(date: Date, view: 'week'): string
navigateDate(date: Date, direction: 'prev' | 'next', view: 'week'): Date
getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[]
```

**Constantes:**
```typescript
DAYS_OF_WEEK = ['Lunes', 'Martes', ..., 'Domingo']
DAYS_OF_WEEK_SHORT = ['Lun', 'Mar', ..., 'Dom']
```

---

## Tipos

### CalendarEvent (Discriminated Union)

```typescript
type CalendarEvent = {
  type: 'project'
  data: ProjectEventWithRelations
}

type ProjectEventWithRelations = ProjectEvent & {
  project: Project & {
    customer: Customer
    projectStatus: (ProjectStatus & { color: BadgeColor }) | null
  }
}
```

**Ubicación:** `lib/types/calendar.ts`

---

## Flujo de Datos

```
1. Usuario navega → EventCalendar actualiza currentDate
2. EventCalendar calcula rango visible → getVisibleDateRange()
3. useCalendarEvents fetch eventos → GET /api/calendar-events?start=X&end=Y
4. WeekView recibe eventos → renderiza ProjectEventCard por día
5. Usuario click "Crear evento" → EventCalendar abre ProjectEventDialog
6. Usuario submit form → useCreateProjectEvent mutation
7. Mutation success → invalidateQueries(['calendar-events'])
8. useCalendarEvents refetch automático → UI actualizada
```

---

## Próximas Mejoras

### Iteración 2
- [ ] Drag & Drop (mover eventos entre días)
- [ ] MonthView component
- [ ] AgendaView component
- [ ] ViewSelector en CalendarHeader

### Iteración 3
- [ ] AftersaleEventCard component
- [ ] VisitEventCard component
- [ ] Filtros por tipo de evento
- [ ] Legend de colores

---

## Testing

### Manual Testing
1. Navegar entre semanas (Prev/Next/Today)
2. Crear evento desde día vacío
3. Editar evento existente
4. Eliminar evento (verificar confirmación)
5. Verificar highlighting día actual
6. Verificar hover states

### Unit Tests (Pendiente)
```typescript
// event-calendar.test.tsx
describe('EventCalendar', () => {
  it('debe renderizar WeekView por defecto')
  it('debe actualizar currentDate al navegar')
  it('debe abrir dialog al crear evento')
})
```

---

## Referencias

- **Documentación completa:** [docs/project/features/calendar-system.md](../../docs/project/features/calendar-system.md)
- **API Routes:** [app/api/calendar-events/](../../app/api/calendar-events/)
- **Implementation Log:** [docs/project/implementation/2025-current.md](../../docs/project/implementation/2025-current.md)

---

**Última actualización:** 2025-11-13
