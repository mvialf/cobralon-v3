# APIs Implementadas

Sistema completo de APIs REST implementadas con Next.js Route Handlers, logging estructurado (Pino) y validación backend (Zod).

---

## 📋 Resumen de APIs

| Entidad            | Endpoints | Paginación | Filtros                                  | Includes                                     |
| ------------------ | --------- | ---------- | ---------------------------------------- | -------------------------------------------- |
| **Customers**      | 4         | ✅         | search (name, email, phone)              | -                                            |
| **Projects**       | 4         | ✅         | customerId, statusId, dateRange          | customer, projectStatus, allocations         |
| **Payments**       | 6         | ✅         | customerId, projectId, dateRange         | customer, paymentMethod, allocations.project |
| **Installments**   | 1         | ✅         | status, paymentId, customerId, dateRange | payment.customer, payment.allocations        |
| **ProjectStatus**  | 4         | ❌         | -                                        | color                                        |
| **PaymentMethods** | 2         | ❌         | active                                   | -                                            |
| **BadgeColors**    | 1         | ❌         | -                                        | -                                            |
| **Cron**           | 1         | ❌         | -                                        | -                                            |

---

## 🎯 Arquitectura de APIs

### Patrón General

Todas las APIs siguen el mismo patrón:

```typescript
// app/api/[entity]/route.ts
import { withLogging } from '@/lib/logger-middleware'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const GET = withLogging(async (request, logger) => {
  // 1. Parsear query params
  const { searchParams } = new URL(request.url)

  // 2. Logging de inicio
  logger.info('Request started')

  // 3. Business logic
  const data = await prisma.entity.findMany({...})

  // 4. Logging de resultado
  logger.info({ count: data.length }, 'Request completed')

  // 5. Response
  return NextResponse.json(data)
})

export const POST = withLogging(async (request, logger) => {
  // 1. Parsear body
  const body = await request.json()

  // 2. Validación Zod
  const validatedData = entitySchema.parse(body)

  // 3. Create en DB
  const entity = await prisma.entity.create({
    data: validatedData
  })

  // 4. Log + Response
  logger.info({ entityId: entity.id }, 'Entity created')
  return NextResponse.json(entity, { status: 201 })
})
```

---

## 🔍 Features Comunes

### 1. Logging Estructurado (Pino)

Todas las APIs usan `withLogging()`:

```typescript
export const POST = withLogging(async (request, logger) => {
  const childLogger = logger.child({ customerId, amount })

  childLogger.info('Payment creation started')
  // ... business logic ...
  childLogger.info({ paymentId }, 'Payment created')
})
```

**Beneficios:**

- ✅ Request correlation automática (requestId UUID)
- ✅ Duration tracking (performance.now())
- ✅ Structured JSON logs (Vercel-compatible)

---

### 2. Validación Backend (Zod)

Todas las mutaciones validan con Zod:

```typescript
import { projectFormSchema } from '@/lib/validations/project-validations'

export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  try {
    const validatedData = projectFormSchema.parse(body)
    // ... create project ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ errors: error.errors }, 'Validation failed')
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    throw error
  }
})
```

---

### 3. Paginación Estándar

APIs de lectura soportan paginación:

```typescript
// Query params: ?page=1&limit=20
const page = parseInt(searchParams.get('page') || '1')
const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

const [data, total] = await Promise.all([
  prisma.entity.findMany({
    skip: (page - 1) * limit,
    take: limit,
  }),
  prisma.entity.count(),
])

return NextResponse.json({
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
})
```

---

### 4. Performance Optimization

#### relationLoadStrategy: 'join'

Previene problema N+1:

```typescript
const projects = await prisma.project.findMany({
  relationLoadStrategy: 'join', // ← Fix N+1
  include: {
    customer: true,
    projectStatus: { include: { color: true } },
    paymentAllocations: true,
  },
})
```

#### Índices Compuestos

```prisma
model Project {
  @@index([customerId, projectStatusId])
  @@index([projectStatusId, date])
}
```

---

## 📚 APIs Disponibles

### 1. [Customers API](customers-api.md)

```
GET    /api/customers           → Listar con paginación + search
POST   /api/customers           → Crear
GET    /api/customers/[id]      → Detalle
PUT    /api/customers/[id]      → Actualizar
DELETE /api/customers/[id]      → Eliminar (CASCADE a projects)
GET    /api/customers/list      → Lista simple (dropdowns)
```

**Filtros:** `search` (name, email, phone)

---

### 2. [Projects API](projects-api.md)

```
GET    /api/projects            → Listar con filtros + includes
POST   /api/projects            → Crear
GET    /api/projects/[id]       → Detalle con allocations
PUT    /api/projects/[id]       → Actualizar
DELETE /api/projects/[id]       → Eliminar
```

**Filtros:** `customerId`, `projectStatusId`, `startDate`, `endDate`

**Includes:** customer, projectStatus.color, paymentAllocations

---

### 3. [Payments API](payments-api.md)

```
GET    /api/payments            → Listar con filtros + includes
POST   /api/payments            → Crear con allocations + installments
GET    /api/payments/[id]       → Detalle completo
PUT    /api/payments/[id]       → Actualizar (limitado)
DELETE /api/payments/[id]       → Eliminar (CASCADE)

GET    /api/payments/search-projects  → Proyectos con balance > 0
GET    /api/payments/customer-projects → Proyectos de cliente
```

**Validaciones especiales:**

- ✅ `SUM(allocations) === amount`
- ✅ `type="Project"` → `allocations.length === 1`
- ✅ `type="Customer"` → `allocations.length >= 1`

---

### 4. [Installments API](installments-api.md)

```
GET    /api/installments        → Vista global con filtros
```

**Filtros:** `status`, `paymentId`, `customerId`, `startDate`, `endDate`

**Includes:** payment.customer, payment.allocations.project

---

### 5. [Cron API](cron-api.md)

```
POST   /api/cron/mark-installments-paid
```

**Autenticación:** Bearer token (CRON_SECRET)

**Lógica:** Marca cuotas vencidas como "paid" (batch update)

---

### 6. Project Status API

```
GET    /api/project-status      → Listar
POST   /api/project-status      → Crear
PUT    /api/project-status/[id] → Actualizar
DELETE /api/project-status/[id] → Eliminar (RESTRICT)
POST   /api/project-status/reorder → Drag & drop reordering
```

---

### 7. Payment Methods API

```
GET    /api/payment-methods     → Listar
POST   /api/payment-methods/[id]/toggle → Activar/Desactivar
```

---

## 🔐 Seguridad

### CORS

Por defecto, Next.js protege APIs de CORS.

### Authentication

Actualmente **no implementado**. Las APIs son públicas.

**Recomendación futura:**

```typescript
export const GET = withLogging(async (request, logger) => {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... business logic ...
})
```

---

## 🚀 Rate Limiting

Actualmente **no implementado**.

**Recomendación futura:** Vercel Edge Middleware con redis.

---

## Ver También

- [API Layer Architecture](../03-layers/api-layer.md) - Arquitectura general
- [Logging System](../04-logging/) - Sistema de logging estructurado
- [Business Logic](../03-layers/business-logic.md) - Validaciones Zod

**Última actualización:** 2025-10-30
