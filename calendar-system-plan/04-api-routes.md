# API Routes - Calendar System

## Endpoints Overview

| Endpoint | Method | Descripción |
|----------|--------|-------------|
| `/api/calendar-events` | GET | Fetch eventos unificados (Project + Aftersale + Visit) |
| `/api/project-events` | GET, POST | List y crear project events |
| `/api/project-events/[id]` | GET, PUT, PATCH, DELETE | CRUD individual project event |
| `/api/aftersale-events` | GET, POST | List y crear aftersale events |
| `/api/aftersale-events/[id]` | GET, PUT, PATCH, DELETE | CRUD individual aftersale event |
| `/api/visit-events` | GET, POST | List y crear visit events |
| `/api/visit-events/[id]` | GET, PUT, PATCH, DELETE | CRUD individual visit event |

---

## 1. GET /api/calendar-events

**Propósito:** Fetch eventos unificados de los 3 tipos en un rango de fechas.

### Query Params

```typescript
{
  start: string // ISO date: "2025-11-01"
  end: string   // ISO date: "2025-11-30"
}
```

### Response

```typescript
{
  success: true,
  data: Array<
    | { type: 'project'; data: ProjectEventWithRelations }
    | { type: 'aftersale'; data: AftersaleEventWithRelations }
    | { type: 'visit'; data: VisitEventWithRelations }
  >
}
```

### Implementación

**Ubicación:** `app/api/calendar-events/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calendarQuerySchema } from '@/lib/validations/calendar-validations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    // Validar query params
    const validation = calendarQuerySchema.safeParse({ start, end })
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { start: startDate, end: endDate } = validation.data

    // Fetch en paralelo los 3 tipos de eventos
    const [projectEvents, aftersaleEvents, visitEvents] = await Promise.all([
      // ProjectEvents
      prisma.projectEvent.findMany({
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          project: {
            include: {
              customer: true,
              projectStatus: true
            }
          }
        },
        orderBy: { scheduledDate: 'asc' }
      }),

      // AftersaleEvents
      prisma.aftersaleEvent.findMany({
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          aftersale: {
            include: {
              project: {
                include: {
                  customer: true
                }
              },
              aftersaleStatus: true
            }
          }
        },
        orderBy: { scheduledDate: 'asc' }
      }),

      // VisitEvents
      prisma.visitEvent.findMany({
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          visit: {
            include: {
              visitStatus: true
            }
          }
        },
        orderBy: { scheduledDate: 'asc' }
      })
    ])

    // Unificar y ordenar por fecha
    const allEvents = [
      ...projectEvents.map((e) => ({ type: 'project' as const, data: e })),
      ...aftersaleEvents.map((e) => ({ type: 'aftersale' as const, data: e })),
      ...visitEvents.map((e) => ({ type: 'visit' as const, data: e }))
    ].sort((a, b) => a.data.scheduledDate.getTime() - b.data.scheduledDate.getTime())

    return NextResponse.json({
      success: true,
      data: allEvents
    })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Error al cargar eventos' },
      { status: 500 }
    )
  }
}
```

---

## 2. POST /api/project-events

**Propósito:** Crear nuevo event de proyecto.

### Request Body

```typescript
{
  projectId: string      // cuid del proyecto
  scheduledDate: string  // ISO date: "2025-11-15"
  notes?: string         // Opcional
}
```

### Response Success

```typescript
{
  success: true,
  data: ProjectEventWithRelations
}
```

### Response Error (Duplicado)

```typescript
{
  error: "Ya existe un evento para este proyecto en esta fecha"
}
// Status: 400
```

### Implementación

**Ubicación:** `app/api/project-events/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProjectEventSchema } from '@/lib/validations/calendar-validations'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar con Zod
    const validation = createProjectEventSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { projectId, scheduledDate, notes } = validation.data

    // Validar que el proyecto existe y no está finalizado
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { projectStatus: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    if (project.projectStatus.isFinal) {
      return NextResponse.json(
        { error: 'No se pueden crear eventos para proyectos finalizados' },
        { status: 400 }
      )
    }

    // Validar que no exista evento duplicado
    const existingEvent = await prisma.projectEvent.findUnique({
      where: {
        projectId_scheduledDate: {
          projectId,
          scheduledDate
        }
      }
    })

    if (existingEvent) {
      return NextResponse.json(
        { error: 'Ya existe un evento para este proyecto en esta fecha' },
        { status: 400 }
      )
    }

    // Crear evento
    const event = await prisma.projectEvent.create({
      data: {
        projectId,
        scheduledDate,
        notes
      },
      include: {
        project: {
          include: {
            customer: true,
            projectStatus: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: event
    })
  } catch (error) {
    console.error('Error creating project event:', error)
    return NextResponse.json(
      { error: 'Error al crear evento' },
      { status: 500 }
    )
  }
}
```

---

## 3. GET /api/project-events/[id]

**Propósito:** Obtener un event específico por ID.

### Response

```typescript
{
  success: true,
  data: ProjectEventWithRelations
}
```

### Implementación

**Ubicación:** `app/api/project-events/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.projectEvent.findUnique({
      where: { id: params.id },
      include: {
        project: {
          include: {
            customer: true,
            projectStatus: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: event
    })
  } catch (error) {
    console.error('Error fetching project event:', error)
    return NextResponse.json(
      { error: 'Error al cargar evento' },
      { status: 500 }
    )
  }
}
```

---

## 4. PUT /api/project-events/[id]

**Propósito:** Actualizar evento completo (incluyendo datos del proyecto vinculado).

### Request Body

```typescript
{
  // Datos del evento (opcionales)
  scheduledDate?: string  // ISO date
  notes?: string

  // Datos del proyecto a actualizar (opcionales)
  updateProject?: {
    address?: string
    phone?: string
    projectStatusId?: string
    elements?: number
    m2?: number
    hasUninstallation?: boolean
    description?: string
  }
}
```

### Response

```typescript
{
  success: true,
  data: ProjectEventWithRelations
}
```

### Implementación

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateProjectEventSchema } from '@/lib/validations/calendar-validations'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Validar
    const validation = updateProjectEventSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { scheduledDate, notes, updateProject } = validation.data

    // Obtener evento actual
    const currentEvent = await prisma.projectEvent.findUnique({
      where: { id: params.id }
    })

    if (!currentEvent) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    // Usar transacción para actualizar evento + proyecto
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar evento
      const updatedEvent = await tx.projectEvent.update({
        where: { id: params.id },
        data: {
          ...(scheduledDate && { scheduledDate }),
          ...(notes !== undefined && { notes })
        }
      })

      // Actualizar proyecto si se proveen datos
      if (updateProject) {
        await tx.project.update({
          where: { id: currentEvent.projectId },
          data: updateProject
        })
      }

      // Retornar evento con relaciones actualizadas
      return tx.projectEvent.findUnique({
        where: { id: params.id },
        include: {
          project: {
            include: {
              customer: true,
              projectStatus: true
            }
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error updating project event:', error)
    return NextResponse.json(
      { error: 'Error al actualizar evento' },
      { status: 500 }
    )
  }
}
```

---

## 5. PATCH /api/project-events/[id]

**Propósito:** Actualizar solo fecha (para drag & drop).

### Request Body

```typescript
{
  scheduledDate: string  // ISO date: "2025-11-17"
}
```

### Response

```typescript
{
  success: true,
  data: ProjectEventWithRelations
}
```

### Implementación

```typescript
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { scheduledDate } = body

    if (!scheduledDate) {
      return NextResponse.json(
        { error: 'scheduledDate es requerido' },
        { status: 400 }
      )
    }

    // Validar formato fecha
    const date = new Date(scheduledDate)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Fecha inválida' },
        { status: 400 }
      )
    }

    // Actualizar solo fecha
    const event = await prisma.projectEvent.update({
      where: { id: params.id },
      data: { scheduledDate: date },
      include: {
        project: {
          include: {
            customer: true,
            projectStatus: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: event
    })
  } catch (error) {
    // Manejar error de unique constraint (ya existe evento en esa fecha)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un evento para este proyecto en esta fecha' },
        { status: 400 }
      )
    }

    console.error('Error updating event date:', error)
    return NextResponse.json(
      { error: 'Error al actualizar fecha' },
      { status: 500 }
    )
  }
}
```

---

## 6. DELETE /api/project-events/[id]

**Propósito:** Eliminar evento (NO elimina el proyecto).

### Response

```typescript
{
  success: true,
  message: "Evento eliminado correctamente"
}
```

### Implementación

```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.projectEvent.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Evento eliminado correctamente'
    })
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    console.error('Error deleting project event:', error)
    return NextResponse.json(
      { error: 'Error al eliminar evento' },
      { status: 500 }
    )
  }
}
```

---

## 7. Endpoints para Aftersales y Visits

Los endpoints para `AftersaleEvent` y `VisitEvent` son **idénticos** a los de `ProjectEvent`, solo cambian:

1. Ruta: `/api/aftersale-events` y `/api/visit-events`
2. Modelo Prisma: `prisma.aftersaleEvent` y `prisma.visitEvent`
3. Schema de validación: `createAftersaleEventSchema` y `createVisitEventSchema`
4. Relaciones: `aftersale` y `visit`

**Ejemplo estructura:**

```
app/api/
├── aftersale-events/
│   ├── route.ts (GET, POST)
│   └── [id]/
│       └── route.ts (GET, PUT, PATCH, DELETE)
│
└── visit-events/
    ├── route.ts (GET, POST)
    └── [id]/
        └── route.ts (GET, PUT, PATCH, DELETE)
```

---

## Manejo de Errores Consistente

Todos los endpoints siguen el mismo patrón de error:

### Error Response Format

```typescript
{
  error: string           // Mensaje user-friendly
  details?: object        // Detalles técnicos (solo en validación)
}
```

### Status Codes

| Code | Uso |
|------|-----|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) - opcional, usar 200 |
| 400 | Bad Request (validación falló, duplicado) |
| 404 | Not Found (recurso no existe) |
| 500 | Internal Server Error |

---

## Rate Limiting (Fase Futura)

Para prevenir abuse, considerar agregar rate limiting:

```typescript
// middleware.ts (futuro)
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s')
})

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for')
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Too Many Requests', { status: 429 })
  }
}
```

**Fase 1:** Sin rate limiting (no crítico para uso interno).

---

## Testing de API

Ver `08-testing-strategy.md` para tests de integración de API.

**Ejemplo básico:**

```typescript
// __tests__/api/project-events.test.ts
import { POST } from '@/app/api/project-events/route'

describe('POST /api/project-events', () => {
  it('should create event successfully', async () => {
    const request = new Request('http://localhost:3000/api/project-events', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'test-project-id',
        scheduledDate: '2025-11-15',
        notes: 'Test notes'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.projectId).toBe('test-project-id')
  })

  it('should reject duplicate event', async () => {
    // ... test de duplicado
  })
})
```

---

## Siguiente Paso

Revisar **[05-user-flows.md](05-user-flows.md)** para diagramas de flujos de usuario.
