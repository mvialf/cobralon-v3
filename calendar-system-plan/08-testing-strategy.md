# Testing Strategy - Calendar System

## Pirámide de Testing

```
         ┌──────────────┐
         │  E2E Tests   │  ← Playwright (críticos flows)
         │   (5-10)     │
         └──────────────┘
       ┌──────────────────┐
       │ Integration Tests│  ← API routes + DB
       │     (20-30)      │
       └──────────────────┘
    ┌──────────────────────┐
    │    Unit Tests        │  ← Utils, validations
    │      (40-60)         │
    └──────────────────────┘
```

**Objetivo total:** ~70-100 tests

---

## 1. Unit Tests (Fase 1)

### 1.1 Validations (Zod Schemas)

**Archivo:** `lib/validations/__tests__/calendar-validations.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  createProjectEventSchema,
  updateProjectEventSchema,
  calendarQuerySchema,
} from '../calendar-validations'

describe('createProjectEventSchema', () => {
  it('debe validar datos correctos', () => {
    const valid = {
      projectId: 'cm3abc123',
      scheduledDate: new Date('2025-11-15'),
      notes: 'Test notes',
    }

    const result = createProjectEventSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('debe rechazar projectId inválido', () => {
    const invalid = {
      projectId: 'invalid-id',
      scheduledDate: new Date(),
    }

    const result = createProjectEventSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual(['projectId'])
  })

  it('debe rechazar notas muy largas', () => {
    const invalid = {
      projectId: 'cm3abc123',
      scheduledDate: new Date(),
      notes: 'x'.repeat(1001), // >1000 chars
    }

    const result = createProjectEventSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('debe aceptar notas opcionales', () => {
    const valid = {
      projectId: 'cm3abc123',
      scheduledDate: new Date(),
      // notes omitido
    }

    const result = createProjectEventSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })
})

describe('calendarQuerySchema', () => {
  it('debe validar rango de fechas', () => {
    const valid = {
      start: '2025-11-01',
      end: '2025-11-30',
    }

    const result = calendarQuerySchema.safeParse(valid)
    expect(result.success).toBe(true)
    expect(result.data.start).toBeInstanceOf(Date)
  })

  it('debe rechazar fechas inválidas', () => {
    const invalid = {
      start: 'invalid-date',
      end: '2025-11-30',
    }

    const result = calendarQuerySchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
```

**Cobertura objetivo:** 100% de schemas Zod

---

### 1.2 Utils (Calendar Helpers)

**Archivo:** `lib/utils/__tests__/calendar-utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { getWeekDays, getMonthGrid, getEventsForDay, getVisibleDateRange } from '../calendar-utils'

describe('getWeekDays', () => {
  it('debe retornar 7 días empezando en lunes', () => {
    const date = new Date('2025-11-13') // Jueves
    const days = getWeekDays(date)

    expect(days).toHaveLength(7)
    expect(days[0].getDay()).toBe(1) // Lunes
    expect(days[6].getDay()).toBe(0) // Domingo
  })

  it('debe manejar cambio de año', () => {
    const date = new Date('2024-12-30') // Lunes
    const days = getWeekDays(date)

    expect(days[0].getFullYear()).toBe(2024)
    expect(days[6].getFullYear()).toBe(2025) // Domingo 5 Enero
  })
})

describe('getMonthGrid', () => {
  it('debe retornar grid de 6 semanas x 7 días', () => {
    const date = new Date('2025-11-15')
    const grid = getMonthGrid(date)

    expect(grid).toHaveLength(6) // 6 semanas
    expect(grid[0]).toHaveLength(7) // 7 días por semana
  })

  it('debe incluir días del mes anterior/siguiente', () => {
    const date = new Date('2025-11-01') // 1 Nov cae Sábado
    const grid = getMonthGrid(date)

    // Primera semana debe tener días de octubre
    expect(grid[0][0].getMonth()).toBe(9) // Octubre (0-indexed)
  })
})

describe('getEventsForDay', () => {
  it('debe filtrar eventos del día específico', () => {
    const events = [
      { data: { scheduledDate: new Date('2025-11-15') } },
      { data: { scheduledDate: new Date('2025-11-16') } },
      { data: { scheduledDate: new Date('2025-11-15') } },
    ]

    const filtered = getEventsForDay(events, new Date('2025-11-15'))
    expect(filtered).toHaveLength(2)
  })

  it('debe retornar array vacío si no hay eventos', () => {
    const events = []
    const filtered = getEventsForDay(events, new Date('2025-11-15'))
    expect(filtered).toHaveLength(0)
  })
})

describe('getVisibleDateRange', () => {
  it('debe calcular rango para week view', () => {
    const date = new Date('2025-11-13')
    const { start, end } = getVisibleDateRange(date, 'week')

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(7)
  })

  it('debe calcular rango para month view', () => {
    const date = new Date('2025-11-13')
    const { start, end } = getVisibleDateRange(date, 'month')

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBeGreaterThanOrEqual(28)
    expect(diffDays).toBeLessThanOrEqual(31)
  })
})
```

**Cobertura objetivo:** 95%+ de utils

---

## 2. Integration Tests (Fase 2)

### 2.1 API Routes Tests

**Setup:**

```typescript
// vitest.setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  // Seed test data
})

afterEach(async () => {
  // Clean up test data
  await prisma.projectEvent.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

#### GET /api/calendar-events

**Archivo:** `app/api/calendar-events/__tests__/route.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { GET } from '../route'

describe('GET /api/calendar-events', () => {
  beforeEach(async () => {
    // Crear datos de prueba
    await prisma.projectEvent.create({
      data: {
        projectId: 'test-project-1',
        scheduledDate: new Date('2025-11-15'),
        notes: 'Test event',
      },
    })
  })

  it('debe retornar eventos en rango', async () => {
    const request = new Request(
      'http://localhost:3000/api/calendar-events?start=2025-11-01&end=2025-11-30'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
  })

  it('debe retornar 400 si faltan parámetros', async () => {
    const request = new Request('http://localhost:3000/api/calendar-events')

    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('debe ordenar eventos por fecha', async () => {
    await prisma.projectEvent.create({
      data: {
        projectId: 'test-project-2',
        scheduledDate: new Date('2025-11-10'),
      },
    })

    const request = new Request(
      'http://localhost:3000/api/calendar-events?start=2025-11-01&end=2025-11-30'
    )

    const response = await GET(request)
    const data = await response.json()

    const dates = data.data.map((e) => e.data.scheduledDate)
    expect(dates[0]).toBeLessThan(dates[1])
  })
})
```

#### POST /api/project-events

**Archivo:** `app/api/project-events/__tests__/route.test.ts`

```typescript
describe('POST /api/project-events', () => {
  it('debe crear evento correctamente', async () => {
    const body = {
      projectId: 'existing-project-id',
      scheduledDate: '2025-11-15',
      notes: 'Test notes',
    }

    const request = new Request('http://localhost:3000/api/project-events', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.projectId).toBe(body.projectId)
  })

  it('debe rechazar evento duplicado', async () => {
    const body = {
      projectId: 'existing-project-id',
      scheduledDate: '2025-11-15',
    }

    // Crear primer evento
    await POST(
      new Request('http://localhost:3000/api/project-events', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )

    // Intentar duplicar
    const response = await POST(
      new Request('http://localhost:3000/api/project-events', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Ya existe un evento')
  })

  it('debe rechazar proyecto finalizado', async () => {
    const body = {
      projectId: 'completed-project-id', // Proyecto con isFinal: true
      scheduledDate: '2025-11-15',
    }

    const response = await POST(
      new Request('http://localhost:3000/api/project-events', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('finalizados')
  })

  it('debe validar datos con Zod', async () => {
    const invalid = {
      projectId: 'invalid',
      scheduledDate: 'not-a-date',
    }

    const request = new Request('http://localhost:3000/api/project-events', {
      method: 'POST',
      body: JSON.stringify(invalid),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

#### PUT /api/project-events/[id]

```typescript
describe('PUT /api/project-events/[id]', () => {
  it('debe actualizar evento y proyecto', async () => {
    const event = await prisma.projectEvent.create({...})

    const body = {
      notes: 'Updated notes',
      updateProject: {
        phone: '+56912345678',
        projectStatusId: 'new-status-id'
      }
    }

    const request = new Request(`http://localhost:3000/api/project-events/${event.id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })

    const response = await PUT(request, { params: { id: event.id } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.notes).toBe('Updated notes')

    // Verificar que proyecto fue actualizado
    const project = await prisma.project.findUnique({
      where: { id: event.projectId }
    })
    expect(project.phone).toBe('+56912345678')
  })

  it('debe retornar 404 si evento no existe', async () => {
    const request = new Request('http://localhost:3000/api/project-events/non-existent', {
      method: 'PUT',
      body: JSON.stringify({ notes: 'Test' })
    })

    const response = await PUT(request, { params: { id: 'non-existent' } })
    expect(response.status).toBe(404)
  })
})
```

#### DELETE /api/project-events/[id]

```typescript
describe('DELETE /api/project-events/[id]', () => {
  it('debe eliminar evento sin eliminar proyecto', async () => {
    const event = await prisma.projectEvent.create({...})
    const projectId = event.projectId

    const request = new Request(`http://localhost:3000/api/project-events/${event.id}`, {
      method: 'DELETE'
    })

    const response = await DELETE(request, { params: { id: event.id } })
    expect(response.status).toBe(200)

    // Verificar evento eliminado
    const deletedEvent = await prisma.projectEvent.findUnique({
      where: { id: event.id }
    })
    expect(deletedEvent).toBeNull()

    // Verificar proyecto aún existe
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })
    expect(project).not.toBeNull()
  })
})
```

**Cobertura objetivo:** 80%+ de API routes

---

## 3. Component Tests (Fase 3)

### 3.1 EventCard Components

**Archivo:** `components/summarys/calendar/__tests__/project-event-card-info.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import { ProjectEventCardInfo } from '../project-event-card-info'

describe('ProjectEventCardInfo', () => {
  const mockEvent = {
    id: 'event-1',
    scheduledDate: new Date('2025-11-15'),
    notes: 'Test notes',
    project: {
      id: 'project-1',
      customer: { name: 'Juan Pérez' },
      projectStatus: { name: 'Montaje', color: '#blue' }
    }
  }

  it('debe renderizar nombre del cliente', () => {
    render(<ProjectEventCardInfo event={mockEvent} />)
    expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument()
  })

  it('debe renderizar estado del proyecto', () => {
    render(<ProjectEventCardInfo event={mockEvent} />)
    expect(screen.getByText('Montaje')).toBeInTheDocument()
  })

  it('debe tener borde azul', () => {
    const { container } = render(<ProjectEventCardInfo event={mockEvent} />)
    const card = container.querySelector('.border-l-4')
    expect(card).toHaveClass('border-l-blue-500')
  })

  it('debe mostrar dropdown de acciones', () => {
    render(<ProjectEventCardInfo event={mockEvent} />)
    const dropdown = screen.getByRole('button')
    expect(dropdown).toBeInTheDocument()
  })
})
```

### 3.2 Calendar Views

**Archivo:** `components/calendar/views/__tests__/week-view.test.tsx`

```typescript
describe('WeekView', () => {
  it('debe renderizar 7 columnas', () => {
    const { container } = render(<WeekView events={[]} onDayClick={vi.fn()} />)
    const columns = container.querySelectorAll('.grid-cols-7 > div')
    expect(columns.length).toBeGreaterThanOrEqual(7)
  })

  it('debe llamar onDayClick al hacer click en día', async () => {
    const handleClick = vi.fn()
    render(<WeekView events={[]} onDayClick={handleClick} />)

    const day = screen.getByText('15') // Día 15
    await userEvent.click(day)

    expect(handleClick).toHaveBeenCalled()
  })

  it('debe agrupar eventos por día', () => {
    const events = [
      { data: { scheduledDate: new Date('2025-11-15'), ... } },
      { data: { scheduledDate: new Date('2025-11-15'), ... } }
    ]

    render(<WeekView events={events} onDayClick={vi.fn()} />)

    // Ambos eventos deben estar en el mismo día
    const day15 = screen.getByText('15').closest('div')
    const eventCards = day15.querySelectorAll('[data-event]')
    expect(eventCards).toHaveLength(2)
  })
})
```

**Cobertura objetivo:** 70%+ de componentes UI

---

## 4. E2E Tests (Fase 6 - Playwright)

### 4.1 Happy Path: Crear Evento

**Archivo:** `tests/e2e/calendar/create-event.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test('crear evento de proyecto exitosamente', async ({ page }) => {
  // Navegar a calendario
  await page.goto('/calendar')
  await expect(page.locator('h1')).toContainText('Calendario')

  // Click en día vacío (15 de Nov)
  await page.click('[data-day="2025-11-15"]')

  // Selector de tipo de evento abre
  await expect(page.locator('text=Crear evento')).toBeVisible()

  // Seleccionar "Proyecto"
  await page.click('button:has-text("Proyecto")')

  // Form abre
  await expect(page.locator('text=Nuevo evento de proyecto')).toBeVisible()

  // Buscar proyecto
  await page.fill('[name="projectId"]', 'Juan')
  await page.click('text=Proyecto 1550 - Juan Pérez')

  // Agregar notas
  await page.fill('[name="notes"]', 'Primera visita - 5/10 elementos')

  // Crear
  await page.click('button:has-text("Crear")')

  // Toast aparece
  await expect(page.locator('text=Evento creado')).toBeVisible()

  // Evento aparece en calendario
  await expect(page.locator('[data-day="2025-11-15"] >> text=Juan Pérez')).toBeVisible()
})
```

### 4.2 Drag & Drop

**Archivo:** `tests/e2e/calendar/drag-drop.spec.ts`

```typescript
test('reprogramar evento con drag and drop', async ({ page }) => {
  await page.goto('/calendar')

  // Evento existe en Lunes 13
  const eventCard = page.locator('[data-day="2025-11-13"] >> [data-event]').first()
  await expect(eventCard).toBeVisible()

  // Drag hacia Miércoles 15
  const targetDay = page.locator('[data-day="2025-11-15"]')
  await eventCard.dragTo(targetDay)

  // Evento ahora está en Miércoles 15
  await expect(page.locator('[data-day="2025-11-15"] >> [data-event]')).toBeVisible()

  // Evento NO está en Lunes 13
  await expect(page.locator('[data-day="2025-11-13"] >> [data-event]')).toHaveCount(0)
})
```

### 4.3 Error: Duplicado

```typescript
test('mostrar error al crear evento duplicado', async ({ page }) => {
  await page.goto('/calendar')

  // Crear primer evento
  // ... (mismo flujo que test anterior)

  // Intentar crear segundo evento mismo proyecto/día
  await page.click('[data-day="2025-11-15"]')
  await page.click('button:has-text("Proyecto")')
  await page.fill('[name="projectId"]', 'Juan')
  await page.click('text=Proyecto 1550 - Juan Pérez')
  await page.click('button:has-text("Crear")')

  // Toast de error aparece
  await expect(page.locator('text=Ya existe un evento')).toBeVisible()

  // Dialog permanece abierto
  await expect(page.locator('text=Nuevo evento de proyecto')).toBeVisible()
})
```

**Cobertura objetivo:** 5-10 flujos críticos

---

## 5. Testing Manual Checklist

### Pre-Release Checklist

- [ ] Crear evento de cada tipo (Project, Aftersale, Visit)
- [ ] Editar evento existente
- [ ] Cambiar estado desde evento
- [ ] Drag & drop evento a otro día
- [ ] Drag & drop falla con duplicado → Rollback funciona
- [ ] Eliminar evento
- [ ] Navegar entre vistas (Week, Month, Agenda)
- [ ] Navegar meses (Anterior/Siguiente/Hoy)
- [ ] Responsive en mobile
- [ ] Combobox filtra proyectos finalizados
- [ ] Loading states funcionan
- [ ] Error states muestran toasts

---

## 6. Coverage Goals

| Tipo              | Target         | Comando                              |
| ----------------- | -------------- | ------------------------------------ |
| Unit Tests        | 95%+           | `npm test:coverage`                  |
| Integration Tests | 80%+           | `npm test:coverage -- __tests__/api` |
| Component Tests   | 70%+           | `npm test:coverage -- components`    |
| E2E Tests         | Critical paths | `npm run test:e2e`                   |

---

## 7. CI/CD Integration (Futuro)

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - run: npm install
      - run: npm run db:generate
      - run: npm test -- --run
      - run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Siguiente Paso

Revisar **[09-future-enhancements.md](09-future-enhancements.md)** para features de fases futuras.
