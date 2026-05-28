# Sistema de Calendario

**Estado:** vigente
**Ultima actualizacion:** 2026-05-28

## Vision

El calendario unifica agenda operativa para:

- proyectos;
- postventas;
- visitas.

Cada tipo mantiene su propia tabla para conservar relaciones y validaciones especificas, pero el frontend consume una union discriminada desde `GET /api/calendar-events`.

## Modelo

| Tipo | Modelo | API CRUD | Relacion principal |
| --- | --- | --- | --- |
| Proyecto | `ProjectEvent` | `/api/project-events` | `Project` |
| Postventa | `AftersaleEvent` | `/api/aftersale-events` | `Aftersale` |
| Visita | `VisitEvent` | `/api/visit-events` | `Visit` |

Campos comunes:

- `scheduledDate`: fecha sin hora.
- `order`: orden dentro del dia para drag and drop.
- `teamTags`: integrantes asignados.
- timestamps.

Campos especificos:

- `ProjectEvent.tasks`: checklist JSON para tareas del proyecto.
- `AftersaleEvent.notes`: notas del evento de postventa.
- `VisitEvent.notes`: notas del evento de visita.

## Endpoint agregado

`GET /api/calendar-events?start=YYYY-MM-DD&end=YYYY-MM-DD`

Retorna:

```ts
type CalendarEvent =
  | { type: 'project'; data: ProjectEventWithRelations }
  | { type: 'aftersale'; data: AftersaleEventWithRelations }
  | { type: 'visit'; data: VisitEventWithRelations }
```

El cliente renderiza segun `type` y no debe inferir el tipo por forma del objeto.

## Ordenamiento

`POST /api/calendar-events/reorder` actualiza el orden de eventos dentro de un dia. El orden se guarda por entidad mediante el campo `order`.

Reglas:

- El orden es relativo al dia.
- El drag and drop no debe cambiar la entidad asociada.
- Mover entre dias debe actualizar `scheduledDate` y recalcular orden.

## Validaciones de negocio

- No crear eventos duplicados para la misma entidad en la misma fecha.
- No agendar proyectos finalizados cuando la API especifica lo bloquee.
- Validar que postventas y visitas existan antes de crear eventos.
- Mantener `TeamTag` como asignacion M:N, no como texto plano.

## UI

Componentes principales:

- `app/calendar/page.tsx`
- `components/calendar/dynamic-event-card.tsx`
- `components/calendar/dynamic-event-dialog.tsx`
- `components/dialogs/calendar/project-event-dialog.tsx`
- `components/dialogs/calendar/aftersale-event-dialog.tsx`
- `components/dialogs/calendar/visit-event-dialog.tsx`

## Tests

Cobertura API existente:

- `app/api/project-events/__tests__/route.test.ts`
- `app/api/aftersale-events/__tests__/route.test.ts`
- `app/api/visit-events/__tests__/route.test.ts`

Para E2E, usar el skill `cobralon-e2e-playwright` y datos deterministas.
