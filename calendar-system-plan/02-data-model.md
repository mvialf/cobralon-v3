# Modelo de Datos - Calendar System

## Schemas de Prisma

### ProjectEvent

Eventos de calendario vinculados a proyectos existentes.

```prisma
model ProjectEvent {
  id            String   @id @default(cuid())

  // Relación al proyecto
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Fecha del evento (solo fecha, sin hora)
  scheduledDate DateTime @db.Date

  // Notas específicas del evento
  notes         String?  @db.Text

  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Índices para performance
  @@index([projectId])
  @@index([scheduledDate])

  // Constraint: No duplicar eventos del mismo proyecto en el mismo día
  @@unique([projectId, scheduledDate])

  @@map("project_events")
}
```

**Campos clave:**

- `scheduledDate`: Tipo `@db.Date` (solo fecha, sin hora)
- `notes`: Campo opcional para observaciones del evento específico
- **Unique constraint**: Previene múltiples eventos del mismo proyecto en un día

---

### AftersaleEvent

Eventos de calendario vinculados a postventas existentes.

```prisma
model AftersaleEvent {
  id            String    @id @default(cuid())

  // Relación a postventa
  aftersaleId   String
  aftersale     Aftersale @relation(fields: [aftersaleId], references: [id], onDelete: Cascade)

  // Fecha del evento
  scheduledDate DateTime  @db.Date

  // Notas específicas
  notes         String?   @db.Text

  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Índices
  @@index([aftersaleId])
  @@index([scheduledDate])

  // Constraint
  @@unique([aftersaleId, scheduledDate])

  @@map("aftersale_events")
}
```

---

### VisitEvent

Eventos de calendario vinculados a visitas existentes.

```prisma
model VisitEvent {
  id            String   @id @default(cuid())

  // Relación a visita
  visitId       String
  visit         Visit    @relation(fields: [visitId], references: [id], onDelete: Cascade)

  // Fecha del evento
  scheduledDate DateTime @db.Date

  // Notas específicas
  notes         String?  @db.Text

  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Índices
  @@index([visitId])
  @@index([scheduledDate])

  // Constraint
  @@unique([visitId, scheduledDate])

  @@map("visit_events")
}
```

---

## Relaciones Inversas (Agregar a modelos existentes)

Actualizar modelos existentes para incluir relaciones a eventos:

```prisma
model Project {
  // ... campos existentes

  // Relación a eventos de calendario
  calendarEvents ProjectEvent[]
}

model Aftersale {
  // ... campos existentes

  // Relación a eventos de calendario
  calendarEvents AftersaleEvent[]
}

model Visit {
  // ... campos existentes

  // Relación a eventos de calendario
  calendarEvents VisitEvent[]
}
```

---

## Migración Prisma

### Comando de migración

```bash
# Generar migración
npm run db:migrate

# Nombre sugerido: "add_calendar_events"
```

### SQL generado (preview)

```sql
-- CreateTable
CREATE TABLE "project_events" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aftersale_events" (
    "id" TEXT NOT NULL,
    "aftersaleId" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aftersale_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_events" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_events_projectId_idx" ON "project_events"("projectId");
CREATE INDEX "project_events_scheduledDate_idx" ON "project_events"("scheduledDate");
CREATE UNIQUE INDEX "project_events_projectId_scheduledDate_key" ON "project_events"("projectId", "scheduledDate");

-- CreateIndex (similar para aftersale_events y visit_events)
-- ...

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (similar para aftersale_events y visit_events)
-- ...
```

---

## Tipos TypeScript (Prisma Generated)

Después de `npm run db:generate`, Prisma genera:

```typescript
// node_modules/.prisma/client

export type ProjectEvent = {
  id: string
  projectId: string
  scheduledDate: Date
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type AftersaleEvent = {
  id: string
  aftersaleId: string
  scheduledDate: Date
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type VisitEvent = {
  id: string
  visitId: string
  scheduledDate: Date
  notes: string | null
  createdAt: Date
  updatedAt: Date
}
```

---

## Tipos Extendidos (para UI)

Crear tipos custom en `lib/types/calendar.ts`:

```typescript
import type { ProjectEvent, AftersaleEvent, VisitEvent } from '@prisma/client'
import type { Project, Aftersale, Visit } from '@prisma/client'

// Tipo unificado para eventos en UI
export type CalendarEventType = 'project' | 'aftersale' | 'visit'

// ProjectEvent con relaciones
export type ProjectEventWithRelations = ProjectEvent & {
  project: Project & {
    customer: Customer
    projectStatus: ProjectStatus
  }
}

// AftersaleEvent con relaciones
export type AftersaleEventWithRelations = AftersaleEvent & {
  aftersale: Aftersale & {
    project: Project & {
      customer: Customer
    }
    aftersaleStatus: AftersaleStatus
  }
}

// VisitEvent con relaciones
export type VisitEventWithRelations = VisitEvent & {
  visit: Visit & {
    visitStatus: VisitStatus
  }
}

// Tipo discriminado unión para eventos
export type CalendarEvent =
  | { type: 'project'; data: ProjectEventWithRelations }
  | { type: 'aftersale'; data: AftersaleEventWithRelations }
  | { type: 'visit'; data: VisitEventWithRelations }

// Tipo para crear evento
export interface CreateProjectEventInput {
  projectId: string
  scheduledDate: Date
  notes?: string
}

export interface CreateAftersaleEventInput {
  aftersaleId: string
  scheduledDate: Date
  notes?: string
}

export interface CreateVisitEventInput {
  visitId: string
  scheduledDate: Date
  notes?: string
}

// Tipo para actualizar evento
export interface UpdateProjectEventInput {
  scheduledDate?: Date
  notes?: string
}

// Similar para Aftersale y Visit
```

---

## Validaciones Zod

Crear schemas en `lib/validations/calendar-validations.ts`:

```typescript
import { z } from 'zod'

// Schema base para eventos
const baseEventSchema = z.object({
  scheduledDate: z.coerce.date({
    required_error: 'La fecha es requerida',
    invalid_type_error: 'Fecha inválida',
  }),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional().nullable(),
})

// ProjectEvent schemas
export const createProjectEventSchema = baseEventSchema.extend({
  projectId: z.string().cuid('ID de proyecto inválido'),
})

export const updateProjectEventSchema = baseEventSchema.partial()

// AftersaleEvent schemas
export const createAftersaleEventSchema = baseEventSchema.extend({
  aftersaleId: z.string().cuid('ID de postventa inválido'),
})

export const updateAftersaleEventSchema = baseEventSchema.partial()

// VisitEvent schemas
export const createVisitEventSchema = baseEventSchema.extend({
  visitId: z.string().cuid('ID de visita inválido'),
})

export const updateVisitEventSchema = baseEventSchema.partial()

// Schema para query params (fecha de rango)
export const calendarQuerySchema = z.object({
  start: z.coerce.date({
    required_error: 'Fecha de inicio es requerida',
  }),
  end: z.coerce.date({
    required_error: 'Fecha de fin es requerida',
  }),
})

// Types inferidos
export type CreateProjectEventInput = z.infer<typeof createProjectEventSchema>
export type UpdateProjectEventInput = z.infer<typeof updateProjectEventSchema>
export type CreateAftersaleEventInput = z.infer<typeof createAftersaleEventSchema>
export type UpdateAftersaleEventInput = z.infer<typeof updateAftersaleEventSchema>
export type CreateVisitEventInput = z.infer<typeof createVisitEventSchema>
export type UpdateVisitEventInput = z.infer<typeof updateVisitEventSchema>
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>
```

---

## Queries Optimizadas (Ejemplos)

### Fetch eventos en rango de fechas

```typescript
// En API route: GET /api/calendar-events?start=...&end=...

const projectEvents = await prisma.projectEvent.findMany({
  where: {
    scheduledDate: {
      gte: startDate,
      lte: endDate,
    },
  },
  include: {
    project: {
      include: {
        customer: true,
        projectStatus: true,
      },
    },
  },
  orderBy: {
    scheduledDate: 'asc',
  },
})

const aftersaleEvents = await prisma.aftersaleEvent.findMany({
  where: {
    scheduledDate: {
      gte: startDate,
      lte: endDate,
    },
  },
  include: {
    aftersale: {
      include: {
        project: {
          include: {
            customer: true,
          },
        },
        aftersaleStatus: true,
      },
    },
  },
  orderBy: {
    scheduledDate: 'asc',
  },
})

const visitEvents = await prisma.visitEvent.findMany({
  where: {
    scheduledDate: {
      gte: startDate,
      lte: endDate,
    },
  },
  include: {
    visit: {
      include: {
        visitStatus: true,
      },
    },
  },
  orderBy: {
    scheduledDate: 'asc',
  },
})

// Unificar en un solo array
const allEvents = [
  ...projectEvents.map((e) => ({ type: 'project', data: e })),
  ...aftersaleEvents.map((e) => ({ type: 'aftersale', data: e })),
  ...visitEvents.map((e) => ({ type: 'visit', data: e })),
].sort((a, b) => a.data.scheduledDate.getTime() - b.data.scheduledDate.getTime())
```

### Crear evento con validación de duplicados

```typescript
// POST /api/project-events

const existingEvent = await prisma.projectEvent.findUnique({
  where: {
    projectId_scheduledDate: {
      projectId: data.projectId,
      scheduledDate: data.scheduledDate,
    },
  },
})

if (existingEvent) {
  throw new Error('Ya existe un evento para este proyecto en esta fecha')
}

const event = await prisma.projectEvent.create({
  data: {
    projectId: data.projectId,
    scheduledDate: data.scheduledDate,
    notes: data.notes,
  },
  include: {
    project: {
      include: {
        customer: true,
        projectStatus: true,
      },
    },
  },
})
```

### Actualizar evento y entidad vinculada

```typescript
// PUT /api/project-events/[id]

// Transacción para actualizar evento + project
const result = await prisma.$transaction(async (tx) => {
  // Actualizar evento
  const event = await tx.projectEvent.update({
    where: { id: eventId },
    data: {
      scheduledDate: data.scheduledDate,
      notes: data.notes,
    },
  })

  // Actualizar campos del proyecto si se proveen
  if (data.updateProject) {
    await tx.project.update({
      where: { id: event.projectId },
      data: {
        address: data.updateProject.address,
        phone: data.updateProject.phone,
        projectStatusId: data.updateProject.statusId,
        // ... otros campos editables
      },
    })
  }

  // Retornar evento actualizado con relaciones
  return tx.projectEvent.findUnique({
    where: { id: eventId },
    include: {
      project: {
        include: {
          customer: true,
          projectStatus: true,
        },
      },
    },
  })
})
```

---

## Índices y Performance

### Índices creados

1. **projectId** en ProjectEvent → Join rápido con Project
2. **scheduledDate** en ProjectEvent → Query por rango de fechas
3. **Composite unique** (projectId + scheduledDate) → Previene duplicados

**Query plan estimado:**

- `WHERE scheduledDate BETWEEN '2025-11-01' AND '2025-11-30'` → Index Scan en scheduledDate (O(log n))
- `JOIN projects` → Index Scan en projectId (O(log n))

**Performance esperada:** <50ms para fetch de 1 mes de eventos (~100-200 eventos).

---

## Consideraciones de onDelete

```prisma
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
```

**onDelete: Cascade** significa:

- Si se elimina un Project → Automáticamente se eliminan sus ProjectEvents
- Previene eventos huérfanos
- **Trade-off:** Si se elimina Project por error, se pierden eventos (recuperable con backup)

**Alternativa:** `onDelete: Restrict` (previene eliminar Project si tiene eventos).

**Decisión:** Cascade (simplifica lógica, proyectos rara vez se eliminan).

---

## Seed Data (Opcional)

Para testing, agregar a `prisma/seed.ts`:

```typescript
// Crear eventos de prueba
const project1 = await prisma.project.findFirst()

if (project1) {
  await prisma.projectEvent.createMany({
    data: [
      {
        projectId: project1.id,
        scheduledDate: new Date('2025-11-15'),
        notes: 'Primera visita de instalación',
      },
      {
        projectId: project1.id,
        scheduledDate: new Date('2025-11-18'),
        notes: 'Continuación instalación',
      },
    ],
  })
}
```

---

## Siguiente Paso

Revisar **[03-component-structure.md](03-component-structure.md)** para arquitectura de componentes React.
