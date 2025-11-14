# Fases de Implementación - Calendar System

## Roadmap General

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│  Fase 1    │→ │  Fase 2    │→ │  Fase 3    │→ │  Fase 4    │
│  Base de   │  │  UI +      │  │  Aftersales│  │  Polish +  │
│  Datos     │  │  Projects  │  │  + Visits  │  │  Mejoras   │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
  2-3 horas       4-6 horas      2-3 horas       2-3 horas

                TOTAL ESTIMADO: 10-15 horas
```

---

## Fase 1: Base de Datos y Validaciones ✅ COMPLETADA

**Objetivo:** Crear schemas de Prisma, migraciones y validaciones Zod.

**Tiempo estimado:** 2-3 horas | **Tiempo real:** ~2 horas

### Tareas

#### 1.1 Crear schemas Prisma

- [x] ✅ Agregar modelo `ProjectEvent` a `prisma/schema.prisma`
- [ ] ⏳ Agregar modelo `AftersaleEvent` (Fase 5)
- [ ] ⏳ Agregar modelo `VisitEvent` (Fase 5)
- [x] ✅ Actualizar modelo `Project` con relación `calendarEvents`
- [ ] ⏳ Actualizar modelo `Aftersale` con relación `calendarEvents` (Fase 5)
- [ ] ⏳ Actualizar modelo `Visit` con relación `calendarEvents` (Fase 5)

**Archivos:**

- `prisma/schema.prisma`

**Verificación:**

```bash
npm run db:generate  # Debe compilar sin errores
```

#### 1.2 Crear migración

- [ ] Ejecutar `npm run db:migrate`
- [ ] Nombre sugerido: `add_calendar_events`
- [ ] Verificar migraci ón aplicada en Neon console

**Verificación:**

```bash
npm run db:migrate -- --name add_calendar_events
# Verificar tablas creadas: project_events, aftersale_events, visit_events
```

#### 1.3 Crear tipos TypeScript

- [ ] Crear `lib/types/calendar.ts`
- [ ] Definir `CalendarEventType`
- [ ] Definir tipos con relaciones (`ProjectEventWithRelations`, etc.)
- [ ] Definir tipo unión `CalendarEvent`
- [ ] Definir tipos de Input (`CreateProjectEventInput`, etc.)

**Archivos:**

- `lib/types/calendar.ts`

#### 1.4 Crear validaciones Zod

- [ ] Crear `lib/validations/calendar-validations.ts`
- [ ] Schema `createProjectEventSchema`
- [ ] Schema `updateProjectEventSchema`
- [ ] Schema `createAftersaleEventSchema`
- [ ] Schema `updateAftersaleEventSchema`
- [ ] Schema `createVisitEventSchema`
- [ ] Schema `updateVisitEventSchema`
- [ ] Schema `calendarQuerySchema` (query params)

**Archivos:**

- `lib/validations/calendar-validations.ts`

#### 1.5 Testing de schemas

- [ ] Seed data opcional en `prisma/seed.ts`
- [ ] Crear 3-5 eventos de prueba para cada tipo

**Verificación:**

```bash
npm run db:seed
# Verificar eventos creados en Prisma Studio
npm run db:studio
```

**✅ Criterio de completitud Fase 1:**

- Migraciones aplicadas sin errores
- Tipos TypeScript generados correctamente
- Validaciones Zod pasan tests básicos

---

## Fase 2: API Routes y React Query Hooks

**Objetivo:** Implementar endpoints de API y hooks de React Query para ProjectEvents.

**Tiempo estimado:** 4-6 horas

### Tareas

#### 2.1 API: GET /api/calendar-events (unified)

- [ ] Crear `app/api/calendar-events/route.ts`
- [ ] Implementar `GET` handler
- [ ] Query params: `start`, `end`
- [ ] Validar con `calendarQuerySchema`
- [ ] Fetch en paralelo ProjectEvents + AftersaleEvents + VisitEvents
- [ ] Unificar y ordenar por fecha
- [ ] Retornar array tipado

**Archivos:**

- `app/api/calendar-events/route.ts`

**Testing manual:**

```bash
curl "http://localhost:3000/api/calendar-events?start=2025-11-01&end=2025-11-30"
```

#### 2.2 API: ProjectEvents CRUD

- [ ] Crear `app/api/project-events/route.ts`
  - [ ] `GET` - List all (opcional, no usado en UI)
  - [ ] `POST` - Create event
- [ ] Crear `app/api/project-events/[id]/route.ts`
  - [ ] `GET` - Get by ID
  - [ ] `PUT` - Update event + project fields
  - [ ] `PATCH` - Update only date (drag & drop)
  - [ ] `DELETE` - Delete event

**Archivos:**

- `app/api/project-events/route.ts`
- `app/api/project-events/[id]/route.ts`

**Validaciones implementadas:**

- ✅ Proyecto existe
- ✅ Proyecto NO finalizado (isFinal: false)
- ✅ NO duplicar evento en misma fecha
- ✅ Transacción para actualizar proyecto + evento

#### 2.3 React Query hooks: Calendar Events

- [ ] Crear `hooks/queries/use-calendar-events.ts`
- [ ] Hook `useCalendarEvents(startDate, endDate)`
- [ ] Configurar query key: `['calendar-events', start, end]`
- [ ] Configurar stale time: 5 minutos
- [ ] Manejo de loading y error states

**Archivos:**

- `hooks/queries/use-calendar-events.ts`

#### 2.4 React Query hooks: ProjectEvents CRUD

- [ ] Crear `hooks/queries/use-project-events.ts`
- [ ] Hook `useCreateProjectEvent()`
- [ ] Hook `useUpdateProjectEvent()`
- [ ] Hook `useUpdateProjectEventDate()` (drag & drop)
- [ ] Hook `useDeleteProjectEvent()`
- [ ] Configurar invalidations correctas

**Archivos:**

- `hooks/queries/use-project-events.ts`

**Optimistic updates:**

- ✅ `useUpdateProjectEventDate` usa optimistic update
- ✅ Rollback en caso de error

#### 2.5 Utils de calendario

- [ ] Crear `lib/utils/calendar-utils.ts`
- [ ] Función `getWeekDays(date: Date): Date[]`
- [ ] Función `getMonthGrid(date: Date): Date[][]`
- [ ] Función `getEventsForDay(events, date): CalendarEvent[]`
- [ ] Función `getVisibleDateRange(date, view): { start, end }`

**Archivos:**

- `lib/utils/calendar-utils.ts`

**✅ Criterio de completitud Fase 2:**

- Todos los endpoints ProjectEvents funcionan
- Hooks de React Query retornan data correcta
- Postman/curl tests pasan
- Utils cubren casos de uso principales

---

## Fase 3: UI - Components Base

**Objetivo:** Implementar componentes principales del calendario (solo Projects por ahora).

**Tiempo estimado:** 6-8 horas

### Tareas

#### 3.1 EventCalendar (Orchestrator)

- [ ] Crear `components/calendar/event-calendar.tsx`
- [ ] Estado: currentDate, currentView
- [ ] Integrar DndContext de @dnd-kit
- [ ] Implementar handleDragEnd
- [ ] Manejo de dialogs (create, edit, delete)

**Archivos:**

- `components/calendar/event-calendar.tsx`

#### 3.2 CalendarHeader

- [ ] Crear `components/calendar/calendar-header.tsx`
- [ ] Navegación: [<] [Hoy] [>]
- [ ] Display de fecha actual
- [ ] ViewSelector component

**Archivos:**

- `components/calendar/calendar-header.tsx`

#### 3.3 ViewSelector

- [ ] Crear `components/calendar/view-selector.tsx`
- [ ] Tabs o ToggleGroup: [Semana] [Mes] [Agenda]
- [ ] Callback onViewChange

**Archivos:**

- `components/calendar/view-selector.tsx`

#### 3.4 WeekView

- [ ] Crear `components/calendar/views/week-view.tsx`
- [ ] Grid 7 columnas (Lun-Dom)
- [ ] Header con nombres de días
- [ ] Usar DroppableDayCell

**Archivos:**

- `components/calendar/views/week-view.tsx`

#### 3.5 MonthView

- [ ] Crear `components/calendar/views/month-view.tsx`
- [ ] Grid 6x7 (6 semanas)
- [ ] Header con días de semana
- [ ] Días fuera del mes en gris

**Archivos:**

- `components/calendar/views/month-view.tsx`

#### 3.6 AgendaView

- [ ] Crear `components/calendar/views/agenda-view.tsx`
- [ ] Lista vertical agrupada por fecha
- [ ] Formato: "Lunes 15 de Noviembre"

**Archivos:**

- `components/calendar/views/agenda-view.tsx`

#### 3.7 DroppableDayCell

- [ ] Crear `components/calendar/dnd/droppable-day-cell.tsx`
- [ ] useDroppable hook
- [ ] Resaltado al hover
- [ ] Click en vacío → Crear evento

**Archivos:**

- `components/calendar/dnd/droppable-day-cell.tsx`

#### 3.8 DraggableEventCard

- [ ] Crear `components/calendar/dnd/draggable-event-card.tsx`
- [ ] useDraggable hook
- [ ] Opacity 0.5 al arrastrar
- [ ] Wrapper que renderiza card específico

**Archivos:**

- `components/calendar/dnd/draggable-event-card.tsx`

#### 3.9 ProjectEventCardInfo

- [ ] Crear `components/summarys/calendar/project-event-card-info.tsx`
- [ ] Reutilizar ProjectNameSummary
- [ ] Badge con estado del proyecto
- [ ] Borde izquierdo azul
- [ ] EventActionsDropdown en esquina

**Archivos:**

- `components/summarys/calendar/project-event-card-info.tsx`

#### 3.10 EventActionsDropdown

- [ ] Crear `components/dialogs/calendar/event-actions-dropdown.tsx`
- [ ] Botón MoreVertical
- [ ] Menu: [Ver] [Editar] [Eliminar]
- [ ] Condicional según tipo de evento

**Archivos:**

- `components/dialogs/calendar/event-actions-dropdown.tsx`

**✅ Criterio de completitud Fase 3:**

- WeekView renderiza correctamente
- MonthView muestra grid completo
- AgendaView lista eventos
- Drag & drop funciona (sin guardar aún)

---

## Fase 4: Dialogs y Forms

**Objetivo:** Implementar dialogs de creación y edición.

**Tiempo estimado:** 4-6 horas

### Tareas

#### 4.1 CreateEventTypeDialog

- [ ] Crear `components/dialogs/calendar/create-event-type-dialog.tsx`
- [ ] 3 botones grandes con iconos
- [ ] Callback onSelectType
- [ ] Pre-mostrar fecha seleccionada

**Archivos:**

- `components/dialogs/calendar/create-event-type-dialog.tsx`

#### 4.2 ProjectEventForm

- [ ] Crear `components/forms/calendar/project-event-form.tsx`
- [ ] React Hook Form + Zod
- [ ] Fields:
  - [ ] ProjectCombobox (buscar proyecto)
  - [ ] DatePicker (scheduledDate)
  - [ ] Campos readonly importados (customer, address)
  - [ ] Campos editables (phone, status, elements, m2, description)
  - [ ] Textarea notes
- [ ] Auto-llenar al seleccionar proyecto

**Archivos:**

- `components/forms/calendar/project-event-form.tsx`

#### 4.3 ProjectEventDialog

- [ ] Crear `components/dialogs/calendar/project-event-dialog.tsx`
- [ ] Wrapper de ProjectEventForm
- [ ] Props: mode ('create' | 'edit' | 'view')
- [ ] Readonly en modo 'view'
- [ ] Submit handler:
  - Create → useCreateProjectEvent
  - Edit → useUpdateProjectEvent

**Archivos:**

- `components/dialogs/calendar/project-event-dialog.tsx`

#### 4.4 ConfirmDeleteDialog integration

- [ ] Reutilizar `components/dialogs/confirm-delete-dialog.tsx` existente
- [ ] Personalizar mensaje para eventos
- [ ] Integrar con useDeleteProjectEvent

**Archivos:**

- (Ya existe, solo integrar)

#### 4.5 Página /calendar

- [ ] Crear `app/calendar/page.tsx`
- [ ] Wrapper con AppLayout
- [ ] Renderizar EventCalendar

**Archivos:**

- `app/calendar/page.tsx`

**Ejemplo:**

```typescript
import AppLayout from '@/components/layout/app-layout'
import { EventCalendar } from '@/components/calendar/event-calendar'

export default function CalendarPage() {
  return (
    <AppLayout pageTitle="Calendario" pageDescription="Gestión de eventos">
      <EventCalendar />
    </AppLayout>
  )
}
```

#### 4.6 Agregar a Sidebar

- [ ] Editar `components/layout/app-sidebar.tsx`
- [ ] Agregar item "Calendario" con icon Calendar

**Archivos:**

- `components/layout/app-sidebar.tsx`

**✅ Criterio de completitud Fase 4:**

- Crear evento funciona end-to-end
- Editar evento funciona
- Eliminar evento funciona
- Drag & drop guarda cambios
- Página /calendar accesible desde sidebar

---

## Fase 5: Aftersales y Visits

**Objetivo:** Duplicar lógica de Projects para Aftersales y Visits.

**Tiempo estimado:** 2-3 horas

### Tareas

#### 5.1 API: AftersaleEvents

- [ ] Copiar estructura de ProjectEvents
- [ ] `app/api/aftersale-events/route.ts`
- [ ] `app/api/aftersale-events/[id]/route.ts`
- [ ] Adaptar validaciones (aftersaleStatus.isFinal)

**Archivos:**

- `app/api/aftersale-events/route.ts`
- `app/api/aftersale-events/[id]/route.ts`

#### 5.2 API: VisitEvents

- [ ] Copiar estructura de ProjectEvents
- [ ] `app/api/visit-events/route.ts`
- [ ] `app/api/visit-events/[id]/route.ts`
- [ ] Adaptar validaciones (visitStatus.isFinal)

**Archivos:**

- `app/api/visit-events/route.ts`
- `app/api/visit-events/[id]/route.ts`

#### 5.3 Hooks: AftersaleEvents

- [ ] Crear `hooks/queries/use-aftersale-events.ts`
- [ ] Copiar estructura de use-project-events
- [ ] Adaptar query keys y endpoints

**Archivos:**

- `hooks/queries/use-aftersale-events.ts`

#### 5.4 Hooks: VisitEvents

- [ ] Crear `hooks/queries/use-visit-events.ts`
- [ ] Copiar estructura de use-project-events

**Archivos:**

- `hooks/queries/use-visit-events.ts`

#### 5.5 UI: AftersaleEventCardInfo

- [ ] Crear `components/summarys/calendar/aftersale-event-card-info.tsx`
- [ ] Borde naranja
- [ ] Badge con aftersaleStatus

**Archivos:**

- `components/summarys/calendar/aftersale-event-card-info.tsx`

#### 5.6 UI: VisitEventCardInfo

- [ ] Crear `components/summarys/calendar/visit-event-card-info.tsx`
- [ ] Borde verde
- [ ] Mostrar visit.name
- [ ] Badge con visitStatus

**Archivos:**

- `components/summarys/calendar/visit-event-card-info.tsx`

#### 5.7 Forms: AftersaleEventForm

- [ ] Crear `components/forms/calendar/aftersale-event-form.tsx`
- [ ] AftersaleCombobox
- [ ] Campos editables específicos

**Archivos:**

- `components/forms/calendar/aftersale-event-form.tsx`

#### 5.8 Forms: VisitEventForm

- [ ] Crear `components/forms/calendar/visit-event-form.tsx`
- [ ] VisitCombobox (si existe)
- [ ] Campos específicos de Visit

**Archivos:**

- `components/forms/calendar/visit-event-form.tsx`

#### 5.9 Dialogs: AftersaleEventDialog + VisitEventDialog

- [ ] Crear `components/dialogs/calendar/aftersale-event-dialog.tsx`
- [ ] Crear `components/dialogs/calendar/visit-event-dialog.tsx`
- [ ] Integrar forms

**Archivos:**

- `components/dialogs/calendar/aftersale-event-dialog.tsx`
- `components/dialogs/calendar/visit-event-dialog.tsx`

#### 5.10 Integrar en CreateEventTypeDialog

- [ ] Actualizar para abrir dialog correcto según tipo
- [ ] Manejar 3 estados (project/aftersale/visit)

**✅ Criterio de completitud Fase 5:**

- Los 3 tipos de eventos funcionan
- Crear/Editar/Eliminar para cada tipo
- Colores diferenciados (azul/naranja/verde)

---

## Fase 6: Polish y Mejoras

**Objetivo:** Refinamientos de UX, testing y documentación.

**Tiempo estimado:** 2-3 horas

### Tareas

#### 6.1 Loading States

- [ ] Skeleton para EventCards
- [ ] Loading spinner en vistas
- [ ] Loading state en forms

#### 6.2 Error Boundaries

- [ ] Error boundary en EventCalendar
- [ ] Fallback UI amigable

#### 6.3 Responsive Design

- [ ] Mobile: sidebar drawer
- [ ] Mobile: WeekView scroll horizontal
- [ ] Mobile: MonthView compacto

#### 6.4 Toasts Consistentes

- [ ] Success: "Evento creado"
- [ ] Success: "Evento actualizado"
- [ ] Success: "Evento eliminado"
- [ ] Error: Mensajes descriptivos

#### 6.5 Testing Manual

- [ ] Crear evento de cada tipo
- [ ] Editar evento
- [ ] Drag & drop
- [ ] Eliminar evento
- [ ] Navegar vistas
- [ ] Error cases (duplicado, etc.)

#### 6.6 Documentación Interna

- [ ] Actualizar README del proyecto
- [ ] Agregar a docs/project/implementation/2025-current.md

**✅ Criterio de completitud Fase 6:**

- UX pulida y consistente
- No hay bugs críticos
- Responsive en mobile
- Documentación actualizada

---

## Orden de Ejecución Recomendado

```
1. Fase 1 (Base de Datos) → PRIMERO (bloqueante)
     ↓
2. Fase 2 (API Routes) → SEGUNDO (bloqueante)
     ↓
3. Fase 3 (UI Base) + Fase 4 (Dialogs) → PARALELO (Projects only)
     ↓
4. Testing manual de Projects → VALIDACIÓN
     ↓
5. Fase 5 (Aftersales + Visits) → REPLICACIÓN
     ↓
6. Fase 6 (Polish) → FINAL
```

**Justificación:**

- Fases 1-2 son bloqueantes (sin DB/API no hay UI)
- Fases 3-4 pueden ir en paralelo (UI + Forms)
- Fase 5 es replicación rápida (copy-paste adaptado)
- Fase 6 es refinamiento (puede hacerse incremental)

---

## Estimación Total

| Fase                   | Horas           | Días (4h/día) |
| ---------------------- | --------------- | ------------- |
| 1. Base de Datos       | 2-3             | 0.5-0.75      |
| 2. API + Hooks         | 4-6             | 1-1.5         |
| 3. UI Base             | 6-8             | 1.5-2         |
| 4. Dialogs             | 4-6             | 1-1.5         |
| 5. Aftersales + Visits | 2-3             | 0.5-0.75      |
| 6. Polish              | 2-3             | 0.5-0.75      |
| **TOTAL**              | **20-29 horas** | **5-7 días**  |

**Asumiendo:**

- Desarrollador familiar con stack (Next.js, Prisma, React Query)
- Sin interrupciones mayores
- Testing manual incluido

---

## Siguiente Paso

Revisar **[07-technical-decisions.md](07-technical-decisions.md)** para justificaciones de decisiones técnicas.
