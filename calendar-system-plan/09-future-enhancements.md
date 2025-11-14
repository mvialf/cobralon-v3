# Features Futuras - Calendar System

Este documento captura features que NO están en el MVP (Fase 1-6) pero están diseñadas para ser agregadas fácilmente.

---

## Fase 2: Gestión Avanzada de Eventos

### 1. Hora Estimada (Mañana/Tarde)

**Objetivo:** Agregar hora aproximada sin time slots complejos.

**Implementación:**

```prisma
model ProjectEvent {
  // ... campos existentes
  estimatedTime TimeOfDay? // ENUM: MORNING, AFTERNOON, EVENING
}

enum TimeOfDay {
  MORNING   // 08:00-12:00
  AFTERNOON // 12:00-18:00
  EVENING   // 18:00-20:00
}
```

**UI:**

- Dropdown en form: [Mañana ▼]
- Badge en card: "☀️ Mañana"
- Filtro opcional en vista

**Estimación:** 2-3 horas

---

### 2. Técnico Asignado

**Objetivo:** Asignar técnico responsable del evento.

**Implementación:**

```prisma
model Technician {
  id    String @id @default(cuid())
  name  String
  phone String
  events ProjectEvent[]
}

model ProjectEvent {
  // ... campos existentes
  technicianId String?
  technician   Technician? @relation(fields: [technicianId])
}
```

**UI:**

- Combobox "Técnico asignado" en form
- Avatar en card
- Filtro por técnico en calendario

**Estimación:** 4-6 horas

---

### 3. Resultados del Evento

**Objetivo:** Trackear progreso (ej: "5/10 elementos instalados").

**Implementación:**

```prisma
model ProjectEvent {
  // ... campos existentes
  elementsCompleted Int? // Cuántos elementos se instalaron ese día
  workCompleted     Boolean @default(false)
  issues            String? @db.Text // Problemas encontrados
}
```

**UI:**

- Progress bar: "5/10 elementos (50%)"
- Checkbox "Trabajo completado"
- Textarea "Problemas encontrados"

**Estimación:** 3-4 horas

---

## Fase 3: Filtros y Búsqueda

### 4. Filtro por Tipo de Evento

**Objetivo:** Mostrar solo Projects, solo Aftersales, o combinaciones.

**Implementación:**

```typescript
// Estado en EventCalendar
const [filters, setFilters] = useState({
  types: ['project', 'aftersale', 'visit'], // Todos por defecto
  statuses: [], // Filtro por estados
  technicians: [], // Filtro por técnicos
})

// Aplicar filtros
const filteredEvents = events.filter(
  (e) =>
    filters.types.includes(e.type) &&
    (filters.statuses.length === 0 || filters.statuses.includes(e.data.statusId))
)
```

**UI:**

- Multi-select: [☑ Proyectos] [☑ Postventas] [☑ Visitas]
- Badge con count: "Proyectos (23)"

**Estimación:** 2-3 horas

---

### 5. Barra de Búsqueda

**Objetivo:** Buscar eventos por cliente, proyecto, notas.

**Implementación:**

```typescript
const [searchQuery, setSearchQuery] = useState('')

const searchedEvents = filteredEvents.filter((e) => {
  const searchableText = [e.type === 'project' && e.data.project.customer.name, e.data.notes]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(searchQuery.toLowerCase())
})
```

**UI:**

- Input con icon Search
- Highlight de resultados

**Estimación:** 2-3 horas

---

## Fase 4: Notificaciones y Recordatorios

### 6. Recordatorios Automáticos

**Objetivo:** Enviar notificaciones 1 día antes del evento.

**Implementación:**

```typescript
// Cron job diario (Vercel Cron o similar)
export async function sendReminders() {
  const tomorrow = addDays(new Date(), 1)

  const events = await prisma.projectEvent.findMany({
    where: {
      scheduledDate: startOfDay(tomorrow),
      reminderSent: false,
    },
    include: {
      project: { include: { customer: true } },
      technician: true,
    },
  })

  for (const event of events) {
    await sendEmail({
      to: event.technician.email,
      subject: 'Recordatorio: Instalación mañana',
      body: `...`,
    })

    await prisma.projectEvent.update({
      where: { id: event.id },
      data: { reminderSent: true },
    })
  }
}
```

**Requisitos:**

- Servicio de email (Resend, SendGrid)
- Cron job scheduler

**Estimación:** 6-8 horas

---

### 7. Notificaciones In-App

**Objetivo:** Bell icon con notificaciones no leídas.

**Implementación:**

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  eventId   String
  type      NotificationType // REMINDER, ASSIGNMENT, CHANGE
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

**UI:**

- Bell icon en header con badge (count no leídas)
- Dropdown con lista de notificaciones
- Click → Navega al evento

**Estimación:** 8-10 horas

---

## Fase 5: Calendario Colaborativo

### 8. Comentarios en Eventos

**Objetivo:** Thread de comentarios por evento (colaboración equipo).

**Implementación:**

```prisma
model EventComment {
  id        String   @id @default(cuid())
  eventId   String
  event     ProjectEvent @relation(fields: [eventId])
  userId    String
  user      User     @relation(fields: [userId])
  content   String   @db.Text
  createdAt DateTime @default(now())

  @@index([eventId])
}
```

**UI:**

- Tab "Comentarios" en event dialog
- Lista de comentarios con avatars
- Input para nuevo comentario

**Estimación:** 6-8 horas

---

### 9. Permisos y Roles

**Objetivo:** Admin, Técnico, Solo Lectura.

**Implementación:**

```prisma
model User {
  id    String @id
  role  Role   // ADMIN, TECHNICIAN, VIEWER

  canCreate   Boolean // Derivado de role
  canEdit     Boolean
  canDelete   Boolean
}

enum Role {
  ADMIN      // Full access
  TECHNICIAN // Create/edit own events
  VIEWER     // Read-only
}
```

**Middleware:**

```typescript
export async function middleware(request: Request) {
  const user = await auth()

  if (request.url.includes('/api/project-events') && request.method === 'DELETE') {
    if (user.role !== 'ADMIN') {
      return new Response('Forbidden', { status: 403 })
    }
  }
}
```

**Estimación:** 10-15 horas

---

## Fase 6: Análisis y Reportes

### 10. Dashboard de Métricas

**Objetivo:** Vista de analytics (eventos por mes, técnico más activo, etc.).

**Implementación:**

```typescript
// API route: /api/calendar-analytics
export async function GET() {
  const [totalEvents, eventsByType, eventsByMonth] = await Promise.all([
    prisma.projectEvent.count(),

    prisma.$queryRaw`
      SELECT type, COUNT(*) as count
      FROM (
        SELECT 'project' as type FROM project_events
        UNION ALL
        SELECT 'aftersale' FROM aftersale_events
        UNION ALL
        SELECT 'visit' FROM visit_events
      )
      GROUP BY type
    `,

    prisma.projectEvent.groupBy({
      by: ['scheduledDate'],
      _count: true,
      orderBy: { scheduledDate: 'asc' },
    }),
  ])

  return NextResponse.json({ totalEvents, eventsByType, eventsByMonth })
}
```

**UI:**

- Nueva página `/calendar/analytics`
- Charts con Recharts:
  - Bar chart: Eventos por mes
  - Pie chart: Distribución por tipo
  - Line chart: Tendencia temporal

**Estimación:** 8-12 horas

---

### 11. Export a PDF/Excel

**Objetivo:** Exportar eventos de un rango como reporte.

**Implementación:**

```typescript
import { jsPDF } from 'jspdf'

async function exportToPDF(events: CalendarEvent[]) {
  const doc = new jsPDF()

  doc.text('Reporte de Eventos', 10, 10)

  events.forEach((event, index) => {
    const y = 20 + index * 10
    doc.text(`${format(event.data.scheduledDate, 'dd/MM')} - ${event.title}`, 10, y)
  })

  doc.save('eventos.pdf')
}
```

**UI:**

- Botón "Exportar" en header
- Dialog: Seleccionar rango + formato (PDF/Excel)

**Estimación:** 6-8 horas

---

## Fase 7: Integraciones

### 12. Sincronización con Google Calendar

**Objetivo:** Crear eventos en Google Calendar automáticamente.

**Implementación:**

```typescript
import { google } from 'googleapis'

async function syncToGoogleCalendar(event: ProjectEvent) {
  const auth = await getGoogleAuth()
  const calendar = google.calendar({ version: 'v3', auth })

  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: `Instalación - ${event.project.customer.name}`,
      start: { date: format(event.scheduledDate, 'yyyy-MM-dd') },
      end: { date: format(event.scheduledDate, 'yyyy-MM-dd') },
      description: event.notes,
    },
  })
}
```

**Requisitos:**

- OAuth2 con Google
- Webhook para sync bidireccional

**Estimación:** 15-20 horas

---

### 13. WhatsApp Notifications

**Objetivo:** Enviar recordatorios por WhatsApp (Twilio).

**Implementación:**

```typescript
import twilio from 'twilio'

async function sendWhatsAppReminder(event: ProjectEvent) {
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)

  await client.messages.create({
    from: 'whatsapp:+14155238886',
    to: `whatsapp:${event.project.phone}`,
    body: `Recordatorio: Instalación programada para mañana ${format(event.scheduledDate, 'dd/MM')}`,
  })
}
```

**Estimación:** 4-6 horas

---

## Fase 8: UX Avanzada

### 14. Eventos Recurrentes

**Objetivo:** Crear serie de eventos (ej: "todos los lunes durante 1 mes").

**Implementación:**

```prisma
model EventSeries {
  id         String   @id @default(cuid())
  frequency  Frequency // DAILY, WEEKLY, MONTHLY
  interval   Int      // Cada X días/semanas/meses
  endDate    DateTime
  events     ProjectEvent[]
}

model ProjectEvent {
  // ... campos existentes
  seriesId   String?
  series     EventSeries? @relation(fields: [seriesId])
}
```

**UI:**

- Checkbox "Evento recurrente"
- Form: Frecuencia, intervalo, hasta cuándo
- Al editar: "Editar este evento o todos los de la serie?"

**Estimación:** 12-15 horas

---

### 15. Drag & Drop Multi-Evento

**Objetivo:** Seleccionar múltiples eventos y moverlos en bloque.

**Implementación:**

```typescript
const [selectedEvents, setSelectedEvents] = useState<string[]>([])

function handleMultiDrag(newDate: Date) {
  selectedEvents.forEach((eventId) => {
    updateEventDate(eventId, newDate)
  })
}
```

**UI:**

- Ctrl+Click para seleccionar múltiples
- Visual feedback (border azul)
- Drag del grupo

**Estimación:** 8-10 horas

---

### 16. Vista Kanban

**Objetivo:** Vista de tipo tablero con columnas por estado.

**Implementación:**

```typescript
// Columnas: Pendiente | En Progreso | Completado
const columns = [
  { status: 'pending', events: events.filter((e) => e.status === 'pending') },
  { status: 'inprogress', events: events.filter((e) => e.status === 'inprogress') },
  { status: 'completed', events: events.filter((e) => e.status === 'completed') },
]
```

**UI:**

- 3-4 columnas verticales
- Drag & drop entre columnas (cambia estado)
- Similar a Trello

**Estimación:** 10-12 horas

---

## Fase 9: Performance y Escalabilidad

### 17. Virtual Scrolling (Large Datasets)

**Objetivo:** Manejar 1000+ eventos sin lag.

**Implementación:**

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function AgendaView({ events }) {
  const parentRef = useRef()

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map(virtualRow => (
        <EventRow key={virtualRow.index} event={events[virtualRow.index]} />
      ))}
    </div>
  )
}
```

**Estimación:** 4-6 horas

---

### 18. Infinite Scroll

**Objetivo:** Cargar meses bajo demanda (no fetch 1 año completo).

**Implementación:**

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['calendar-events'],
  queryFn: ({ pageParam = 0 }) => {
    const start = addMonths(new Date(), pageParam)
    const end = addMonths(start, 1)
    return fetchEvents(start, end)
  },
  getNextPageParam: (lastPage, pages) => pages.length,
})

// Trigger en scroll
useEffect(() => {
  if (scrollBottom && hasNextPage) {
    fetchNextPage()
  }
}, [scrollBottom])
```

**Estimación:** 6-8 horas

---

## Fase 10: Mobile App (Opcional)

### 19. PWA (Progressive Web App)

**Objetivo:** App instalable en móviles.

**Implementación:**

- Agregar `manifest.json`
- Service Worker para offline
- Push notifications

**Estimación:** 15-20 horas

---

### 20. React Native App

**Objetivo:** App nativa iOS/Android.

**Stack:**

- React Native
- Expo
- Replicar UI de web

**Estimación:** 80-120 horas (proyecto separado)

---

## Priorización Sugerida

### Short-term (1-2 meses)

1. ✅ Hora estimada (Mañana/Tarde)
2. ✅ Técnico asignado
3. ✅ Filtro por tipo
4. ✅ Resultados del evento

### Mid-term (3-6 meses)

5. ✅ Recordatorios automáticos
6. ✅ Comentarios en eventos
7. ✅ Dashboard de métricas
8. ✅ Export PDF

### Long-term (6-12 meses)

9. ✅ Google Calendar sync
10. ✅ WhatsApp notifications
11. ✅ Eventos recurrentes
12. ✅ Permisos y roles

---

## Estimación Total de Features Futuras

| Categoría              | Horas             | Complejidad              |
| ---------------------- | ----------------- | ------------------------ |
| Gestión Avanzada (1-3) | 10-15             | Baja                     |
| Filtros (4-5)          | 5-7               | Baja                     |
| Notificaciones (6-7)   | 15-20             | Media                    |
| Colaborativo (8-9)     | 16-23             | Media-Alta               |
| Análisis (10-11)       | 14-20             | Media                    |
| Integraciones (12-13)  | 20-26             | Alta                     |
| UX Avanzada (14-16)    | 30-37             | Alta                     |
| Performance (17-18)    | 10-14             | Media                    |
| **TOTAL**              | **120-162 horas** | **~4-6 meses part-time** |

---

## Decisión de Scope

**Fase 1 (MVP):** Solo calendario funcional básico (20-29 horas)

**Fases futuras:** Agregar features según demanda real del usuario.

**Principio:** "Build what you need, when you need it" (evitar over-engineering).

---

**Última actualización:** 2025-11-13
