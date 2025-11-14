# Estructura de Componentes - Calendar System

## Árbol de Archivos Completo

```
app/
└── calendar/
    └── page.tsx                                    # Página principal /calendar

components/
├── calendar/
│   ├── event-calendar.tsx                         # Orchestrator principal
│   ├── calendar-header.tsx                        # Header con navegación
│   ├── view-selector.tsx                          # Selector Week/Month/Agenda
│   │
│   ├── views/
│   │   ├── week-view.tsx                          # Vista semanal (default)
│   │   ├── month-view.tsx                         # Vista mensual
│   │   ├── agenda-view.tsx                        # Vista lista/agenda
│   │   └── calendar-day-cell.tsx                  # Celda de día reutilizable
│   │
│   └── dnd/
│       ├── draggable-event-card.tsx               # Wrapper draggable
│       └── droppable-day-cell.tsx                 # Wrapper droppable
│
├── summarys/
│   └── calendar/
│       ├── project-event-card-info.tsx            # Card info proyecto
│       ├── aftersale-event-card-info.tsx          # Card info postventa
│       └── visit-event-card-info.tsx              # Card info visita
│
├── dialogs/
│   └── calendar/
│       ├── create-event-type-dialog.tsx           # Selector tipo evento
│       ├── project-event-dialog.tsx               # Form proyecto
│       ├── aftersale-event-dialog.tsx             # Form postventa
│       ├── visit-event-dialog.tsx                 # Form visita
│       └── event-actions-dropdown.tsx             # Menu ver/editar/eliminar
│
└── forms/
    └── calendar/
        ├── project-event-form.tsx                 # Form proyecto
        ├── aftersale-event-form.tsx               # Form postventa
        └── visit-event-form.tsx                   # Form visita

hooks/
└── queries/
    ├── use-calendar-events.ts                     # Query eventos unificados
    ├── use-project-events.ts                      # CRUD project events
    ├── use-aftersale-events.ts                    # CRUD aftersale events
    └── use-visit-events.ts                        # CRUD visit events

lib/
├── types/
│   └── calendar.ts                                # Tipos TypeScript
├── validations/
│   └── calendar-validations.ts                    # Schemas Zod
└── utils/
    └── calendar-utils.ts                          # Helpers (formateo, etc.)

app/api/
├── calendar-events/
│   └── route.ts                                   # GET unified events
├── project-events/
│   ├── route.ts                                   # GET, POST
│   └── [id]/
│       └── route.ts                               # GET, PUT, DELETE
├── aftersale-events/
│   ├── route.ts
│   └── [id]/
│       └── route.ts
└── visit-events/
    ├── route.ts
    └── [id]/
        └── route.ts
```

---

## Componentes Principales - Props Detalladas

### 1. EventCalendar (Orchestrator)

**Ubicación:** `components/calendar/event-calendar.tsx`

```typescript
'use client'

interface EventCalendarProps {
  initialDate?: Date // Default: new Date()
  initialView?: 'week' | 'month' | 'agenda' // Default: 'week'
}

export function EventCalendar({ initialDate, initialView }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [currentView, setCurrentView] = useState(initialView || 'week')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createDialogDate, setCreateDialogDate] = useState<Date | null>(null)

  // Query events para el rango visible
  const { startDate, endDate } = getVisibleDateRange(currentDate, currentView)
  const { data: events, isLoading } = useCalendarEvents(startDate, endDate)

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col">
        <CalendarHeader
          currentDate={currentDate}
          currentView={currentView}
          onDateChange={setCurrentDate}
          onViewChange={setCurrentView}
        />

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {currentView === 'week' && <WeekView events={events} onDayClick={handleDayClick} />}
            {currentView === 'month' && <MonthView events={events} onDayClick={handleDayClick} />}
            {currentView === 'agenda' && <AgendaView events={events} />}
          </>
        )}

        <CreateEventTypeDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          selectedDate={createDialogDate}
        />
      </div>
    </DndContext>
  )
}
```

**Responsabilidades:**

- Gestión de estado global del calendario
- Coordinación entre vistas
- Manejo de drag & drop context
- Apertura de dialogs

---

### 2. CalendarHeader

**Ubicación:** `components/calendar/calendar-header.tsx`

```typescript
interface CalendarHeaderProps {
  currentDate: Date
  currentView: 'week' | 'month' | 'agenda'
  onDateChange: (date: Date) => void
  onViewChange: (view: 'week' | 'month' | 'agenda') => void
}

export function CalendarHeader({
  currentDate,
  currentView,
  onDateChange,
  onViewChange
}: CalendarHeaderProps) {
  const handlePrevious = () => {
    const newDate = subDays(currentDate, currentView === 'week' ? 7 : 30)
    onDateChange(newDate)
  }

  const handleNext = () => {
    const newDate = addDays(currentDate, currentView === 'week' ? 7 : 30)
    onDateChange(newDate)
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      {/* Navegación */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleToday}>
          Hoy
        </Button>
        <Button variant="outline" size="sm" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <h2 className="ml-4 text-lg font-semibold">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
      </div>

      {/* Selector de vista */}
      <ViewSelector currentView={currentView} onViewChange={onViewChange} />
    </div>
  )
}
```

---

### 3. WeekView (Vista Principal)

**Ubicación:** `components/calendar/views/week-view.tsx`

```typescript
interface WeekViewProps {
  events: CalendarEvent[]
  onDayClick: (date: Date) => void
}

export function WeekView({ events, onDayClick }: WeekViewProps) {
  const weekDays = getWeekDays(currentDate) // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]

  return (
    <div className="flex flex-1 flex-col">
      {/* Header con días de la semana */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="border-r p-2 text-center">
            <div className="text-sm font-medium">{format(day, 'EEE', { locale: es })}</div>
            <div className="text-2xl font-bold">{format(day, 'd')}</div>
          </div>
        ))}
      </div>

      {/* Grid de eventos */}
      <div className="grid flex-1 grid-cols-7">
        {weekDays.map((day) => (
          <DroppableDayCell
            key={day.toISOString()}
            date={day}
            events={getEventsForDay(events, day)}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  )
}
```

**Características:**

- Grid de 7 columnas (Lun-Dom)
- Altura dinámica según contenido
- Droppable cells para drag & drop
- Click en día vacío → Abrir dialog creación

---

### 4. MonthView

**Ubicación:** `components/calendar/views/month-view.tsx`

```typescript
interface MonthViewProps {
  events: CalendarEvent[]
  onDayClick: (date: Date) => void
}

export function MonthView({ events, onDayClick }: MonthViewProps) {
  const monthGrid = getMonthGrid(currentDate) // Array 6x7 (6 semanas)

  return (
    <div className="flex flex-1 flex-col">
      {/* Header días semana */}
      <div className="grid grid-cols-7 border-b">
        {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => (
          <div key={day} className="border-r p-2 text-center text-sm font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Grid 6x7 */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {monthGrid.map((day) => (
          <DroppableDayCell
            key={day.toISOString()}
            date={day}
            events={getEventsForDay(events, day)}
            onDayClick={onDayClick}
            isCurrentMonth={isSameMonth(day, currentDate)}
          />
        ))}
      </div>
    </div>
  )
}
```

**Características:**

- Grid 6 semanas x 7 días
- Mostrar días del mes anterior/siguiente (gris)
- Eventos como badges pequeños (altura fija)

---

### 5. AgendaView

**Ubicación:** `components/calendar/views/agenda-view.tsx`

```typescript
interface AgendaViewProps {
  events: CalendarEvent[]
}

export function AgendaView({ events }: AgendaViewProps) {
  const groupedByDate = groupEventsByDate(events)

  return (
    <div className="flex-1 overflow-y-auto">
      {Object.entries(groupedByDate).map(([dateKey, dayEvents]) => (
        <div key={dateKey} className="border-b p-4">
          <h3 className="mb-2 text-sm font-semibold">
            {format(new Date(dateKey), "EEEE d 'de' MMMM", { locale: es })}
          </h3>

          <div className="space-y-2">
            {dayEvents.map((event) => (
              <div key={event.data.id} className="flex items-center gap-3">
                {event.type === 'project' && <ProjectEventCardInfo event={event.data} />}
                {event.type === 'aftersale' && <AftersaleEventCardInfo event={event.data} />}
                {event.type === 'visit' && <VisitEventCardInfo event={event.data} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Características:**

- Lista vertical agrupada por fecha
- Vista compacta de próximos eventos
- No soporta drag & drop (solo lectura)

---

### 6. DroppableDayCell

**Ubicación:** `components/calendar/dnd/droppable-day-cell.tsx`

```typescript
interface DroppableDayCellProps {
  date: Date
  events: CalendarEvent[]
  onDayClick: (date: Date) => void
  isCurrentMonth?: boolean
}

export function DroppableDayCell({
  date,
  events,
  onDayClick,
  isCurrentMonth = true
}: DroppableDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${format(date, 'yyyy-MM-dd')}`,
    data: { date }
  })

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(date)}
      className={cn(
        'min-h-[100px] border-r border-b p-2',
        isOver && 'bg-accent',
        !isCurrentMonth && 'bg-muted/50 text-muted-foreground',
        'cursor-pointer hover:bg-accent/50'
      )}
    >
      <div className="mb-2 text-sm font-medium">{format(date, 'd')}</div>

      <div className="space-y-1">
        {events.map((event) => (
          <DraggableEventCard key={event.data.id} event={event} />
        ))}
      </div>
    </div>
  )
}
```

**Características:**

- Droppable zone para drag & drop
- Resalta al hover con evento
- Click en área vacía → Crear evento

---

### 7. DraggableEventCard

**Ubicación:** `components/calendar/dnd/draggable-event-card.tsx`

```typescript
interface DraggableEventCardProps {
  event: CalendarEvent
}

export function DraggableEventCard({ event }: DraggableEventCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.data.id,
    data: event
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1
      }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {event.type === 'project' && <ProjectEventCardInfo event={event.data} />}
      {event.type === 'aftersale' && <AftersaleEventCardInfo event={event.data} />}
      {event.type === 'visit' && <VisitEventCardInfo event={event.data} />}
    </div>
  )
}
```

---

### 8. ProjectEventCardInfo

**Ubicación:** `components/summarys/calendar/project-event-card-info.tsx`

```typescript
interface ProjectEventCardInfoProps {
  event: ProjectEventWithRelations
}

export function ProjectEventCardInfo({ event }: ProjectEventCardInfoProps) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-2">
        {/* ProjectNameSummary component reutilizable */}
        <ProjectNameSummary projectId={event.project.id} />

        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline">{event.project.projectStatus.name}</Badge>
        </div>
      </CardContent>

      {/* Dropdown actions */}
      <div className="absolute right-2 top-2">
        <EventActionsDropdown event={{ type: 'project', data: event }} />
      </div>
    </Card>
  )
}
```

**Características:**

- Borde izquierdo azul (identificador visual)
- Reutiliza `ProjectNameSummary` existente
- Muestra estado del proyecto
- Dropdown menu en esquina superior derecha

---

### 9. AftersaleEventCardInfo

**Ubicación:** `components/summarys/calendar/aftersale-event-card-info.tsx`

```typescript
interface AftersaleEventCardInfoProps {
  event: AftersaleEventWithRelations
}

export function AftersaleEventCardInfo({ event }: AftersaleEventCardInfoProps) {
  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardContent className="p-2">
        <ProjectNameSummary projectId={event.aftersale.project.id} />

        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline">{event.aftersale.aftersaleStatus.name}</Badge>
        </div>
      </CardContent>

      <div className="absolute right-2 top-2">
        <EventActionsDropdown event={{ type: 'aftersale', data: event }} />
      </div>
    </Card>
  )
}
```

**Características:**

- Borde izquierdo naranja
- Similar estructura a ProjectEventCardInfo

---

### 10. VisitEventCardInfo

**Ubicación:** `components/summarys/calendar/visit-event-card-info.tsx`

```typescript
interface VisitEventCardInfoProps {
  event: VisitEventWithRelations
}

export function VisitEventCardInfo({ event }: VisitEventCardInfoProps) {
  return (
    <Card className="border-l-4 border-l-green-500">
      <CardContent className="p-2">
        <div className="text-sm font-medium">{event.visit.name}</div>

        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline">{event.visit.visitStatus.name}</Badge>
        </div>
      </CardContent>

      <div className="absolute right-2 top-2">
        <EventActionsDropdown event={{ type: 'visit', data: event }} />
      </div>
    </Card>
  )
}
```

**Características:**

- Borde izquierdo verde
- Muestra `visit.name` en lugar de ProjectNameSummary

---

### 11. EventActionsDropdown

**Ubicación:** `components/dialogs/calendar/event-actions-dropdown.tsx`

```typescript
interface EventActionsDropdownProps {
  event: CalendarEvent
}

export function EventActionsDropdown({ event }: EventActionsDropdownProps) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsViewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs condicionalmente renderizados */}
      {event.type === 'project' && (
        <>
          <ProjectEventDialog
            open={isViewOpen || isEditOpen}
            onOpenChange={isViewOpen ? setIsViewOpen : setIsEditOpen}
            mode={isViewOpen ? 'view' : 'edit'}
            event={event.data}
          />
          <ConfirmDeleteDialog
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            onConfirm={() => deleteProjectEvent(event.data.id)}
            title="Eliminar evento"
            description={`¿Estás seguro de eliminar el evento del ${format(event.data.scheduledDate, 'dd/MM/yyyy')}?`}
          />
        </>
      )}

      {/* Similar para aftersale y visit */}
    </>
  )
}
```

---

### 12. CreateEventTypeDialog

**Ubicación:** `components/dialogs/calendar/create-event-type-dialog.tsx`

```typescript
interface CreateEventTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
}

export function CreateEventTypeDialog({ open, onOpenChange, selectedDate }: CreateEventTypeDialogProps) {
  const [selectedType, setSelectedType] = useState<'project' | 'aftersale' | 'visit' | null>(null)

  const handleSelectType = (type: 'project' | 'aftersale' | 'visit') => {
    setSelectedType(type)
    onOpenChange(false) // Cierra selector
    // Abre dialog específico (manejado por parent)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear evento para {format(selectedDate!, 'dd/MM/yyyy')}</DialogTitle>
          <DialogDescription>Selecciona el tipo de evento a crear</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Button
            variant="outline"
            className="h-20 justify-start gap-4"
            onClick={() => handleSelectType('project')}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              🏗️
            </div>
            <div className="text-left">
              <div className="font-semibold">Proyecto</div>
              <div className="text-sm text-muted-foreground">Instalación o montaje</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-20 justify-start gap-4"
            onClick={() => handleSelectType('aftersale')}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
              📦
            </div>
            <div className="text-left">
              <div className="font-semibold">Postventa</div>
              <div className="text-sm text-muted-foreground">Servicio post-instalación</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-20 justify-start gap-4"
            onClick={() => handleSelectType('visit')}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              👁️
            </div>
            <div className="text-left">
              <div className="font-semibold">Visita</div>
              <div className="text-sm text-muted-foreground">Visita técnica o inspección</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Siguiente Paso

Revisar **[04-api-routes.md](04-api-routes.md)** para endpoints de API completos.
