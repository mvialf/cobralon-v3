# Sistema de Calendario - Quick Start

> **TL;DR:** Sistema funcional para eventos de proyectos. Accede en `/calendar` desde el sidebar.

## ⚡ Quick Reference

### Crear Evento
```
1. Navega a /calendar
2. Hover sobre cualquier día → Botón "Crear evento"
3. Selecciona proyecto + fecha + notas
4. Submit
```

### Editar Evento
```
1. Click MoreVertical (⋮) en card → "Editar"
2. Modifica fecha o notas
3. Submit
```

### Eliminar Evento
```
1. Click MoreVertical (⋮) en card → "Eliminar"
2. Confirma en dialog
```

---

## 📁 Archivos Clave

### Backend
```
prisma/schema.prisma                      # Modelo ProjectEvent
app/api/calendar-events/route.ts          # GET unificado
app/api/project-events/route.ts           # POST
app/api/project-events/[id]/route.ts      # GET/PUT/DELETE
```

### Frontend
```
components/calendar/event-calendar.tsx    # Main orchestrator
components/calendar/views/week-view.tsx   # Vista semanal
components/calendar/project-event-card.tsx # Card component
components/forms/calendar/project-event-form.tsx
components/dialogs/calendar/project-event-dialog.tsx
```

### Utils & Hooks
```
lib/utils/calendar-utils.ts               # Date helpers
hooks/queries/use-calendar-events.ts      # Query
hooks/queries/use-project-events.ts       # Mutations
```

---

## 🔧 API Endpoints

### GET Calendar Events
```bash
GET /api/calendar-events?start=2025-11-10&end=2025-11-17

Response:
{
  "events": [
    {
      "type": "project",
      "data": { "id": "...", "projectId": "...", ... }
    }
  ]
}
```

### Create Event
```bash
POST /api/project-events
Body: {
  "projectId": "uuid",
  "scheduledDate": "2025-11-13",
  "notes": "Opcional"
}
```

### Update Event
```bash
PUT /api/project-events/[id]
Body: {
  "scheduledDate": "2025-11-14",
  "notes": "Actualizado"
}
```

### Delete Event
```bash
DELETE /api/project-events/[id]
Response: 204 No Content
```

---

## 🧩 Componentes

```
EventCalendar
├── CalendarHeader (navegación)
├── WeekView (7 días)
│   └── ProjectEventCard[]
│       └── Dropdown menu (Edit/Delete)
└── Dialogs
    ├── ProjectEventDialog (create/edit)
    └── AlertDialog (delete confirm)
```

---

## 📊 Estado Actual

### ✅ Implementado (Iteración 1)
- Vista semanal funcional
- CRUD completo con validaciones
- Navegación Prev/Next/Today
- Highlighting día actual
- Toast notifications
- Validación de duplicados
- React Query cache 5min

### ⏳ Pendiente (Futuras Iteraciones)
- Drag & Drop
- MonthView / AgendaView
- AftersaleEvents / VisitEvents
- Filtros por tipo

---

## 🐛 Troubleshooting

### Evento no aparece
- ✅ Verificar que fecha esté en rango visible (semana actual)
- ✅ Check console para errores de API
- ✅ Invalidar cache: DevTools → React Query → Invalidate ['calendar-events']

### No puedo crear evento duplicado
- ✅ **Esperado:** Constraint `(projectId, scheduledDate)` previene duplicados
- ✅ Solo 1 evento por proyecto por día
- ✅ Si necesitas 2 eventos, usa proyectos diferentes o días diferentes

### Fecha se guarda incorrecta
- ✅ Verificar timezone del browser
- ✅ DB usa `@db.Date` (sin hora)
- ✅ Conversión automática en API

---

## 📚 Documentación Completa

- **Técnica:** [calendar-system.md](./calendar-system.md)
- **Components:** [components/calendar/README.md](../../../components/calendar/README.md)
- **Implementation:** [2025-current.md](../implementation/2025-current.md)

---

## 🚀 Deploy Checklist

- [ ] `npm run typecheck` → Pass
- [ ] `npm run lint` → Sin errores críticos
- [ ] `npm run build` → Success
- [ ] DB migration applied (`npm run db:push`)
- [ ] Test manual en producción

---

**Última actualización:** 2025-11-13
