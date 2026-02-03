# Calendar (Calendario)

| Campo | Valor |
|-------|-------|
| URL | `/calendar` |
| Spec | `tests/e2e/calendar-event-edit.spec.ts` |
| Page Object | `tests/e2e/page-objects/calendar.page.ts` |

## Estructura de Página

### Layout
- Sin breadcrumb
- Header: h1 "Calendario" + descripción "Gestión de eventos de proyectos, postventas y visitas" + botón "Nuevo Evento"
- Toolbar navegación: anterior + "Hoy" + siguiente + rango fechas
- Controles vista: config (engranaje) + combobox vista ("Semana")
- Grilla semanal: 7 columnas Lun-Dom con números de día

### Toolbar de Navegación
| Elemento | Tipo | Descripción |
|----------|------|-------------|
| Anterior | button (flecha izq) | Semana anterior |
| Hoy | button "Hoy" | Semana actual |
| Siguiente | button (flecha der) | Semana siguiente |
| Rango | texto | "D mes - D mes YYYY" (ej: "2 feb - 8 feb 2026") |

### Vistas del Calendario
| Vista | Descripción |
|-------|-------------|
| Semana (default) | Grilla 7 columnas Lun-Dom |
| Mes | Grilla mensual |
| Agenda | Lista de eventos |

### Tipos de Eventos
| Tipo | Formato |
|------|---------|
| Proyecto | "P - {número}" |
| Visita | (pendiente documentar) |
| Postventa | (pendiente documentar) |

### Dialog "Editar Evento" (Proyecto)
| Campo | Tipo |
|-------|------|
| Fecha | textbox |
| Estado | combobox |
| Tags equipo | multi-select/checkboxes (teamTagIds) |
| Cancelar | button |

## Selectores Clave

| Elemento | Selector |
|----------|----------|
| Heading | `getByRole('heading', { name: /calendario/i, level: 1 })` |
| Descripción | `getByText(/Gestión de eventos de proyectos/i)` |
| Nuevo Evento | `getByRole('button', { name: /nuevo evento/i })` |
| Hoy | `getByRole('button', { name: 'Hoy' })` |
| Rango fechas | `page.locator('.text-xl.font-semibold.capitalize')` |
| Selector vista | `getByRole('combobox').filter({ hasText: /semana/i })` |
| Evento proyecto | `page.locator('button').filter({ hasText: /^P - \\d+/ }).first()` |
| Siguiente semana | `todayButton.locator('xpath=following-sibling::button[1]')` |
| Dialog heading | `dialog.getByRole('heading', { name: /editar evento/i })` |
| Campo fecha | `dialog.getByLabel(/fecha/i)` |
| Campo estado | `dialog.getByRole('combobox', { name: /estado/i })` |
| Cancelar | `dialog.getByRole('button', { name: /cancelar/i })` |
| Vista Mes | `getByRole('option', { name: /mes/i })` |
| Vista Agenda | `getByRole('option', { name: /agenda/i })` |

## Comportamientos UI

- **Vista semanal por defecto**: abre en vista de semana
- **Día actual resaltado**: círculo de fondo en el día actual
- **Rango de fechas**: formato "D mes - D mes YYYY" en capitalize
- **Navegación semanal**: botones anterior/siguiente mueven 1 semana
- **3 vistas**: Semana, Mes, Agenda vía combobox
- **Eventos como botones**: clickeables con texto descriptivo
- **Menu en hover**: al hover sobre evento aparece botón MoreVertical
- **Editar vía menú**: menú contextual → "Editar" → dialog
- **teamTagIds**: campo de tags de equipo en dialog de edición
- **Nuevo Evento**: abre selector de tipo (Proyecto, Visita, Postventa)
- **Click en día**: puede abrir selector para crear evento en ese día

## Edge Cases

- Semana sin eventos: grilla vacía
- Evento largo: nombre truncado
- Cambio de mes: navegación cruza entre meses
- `test.skip` si no hay eventos: spec usa skip si no encuentra eventos de proyecto
- Vista mes: layout cambia a grilla mensual
- Vista agenda: layout cambia a lista

## API Endpoints

- `GET /api/calendar/events` — eventos (filtrado por rango de fechas)
- `PUT /api/calendar/events/:id` — actualizar (fecha, estado, teamTagIds)
- `POST /api/calendar/events` — crear evento
