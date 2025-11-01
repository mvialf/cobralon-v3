# API Layer

Capa de APIs REST construida con Next.js Route Handlers (App Router).

---

## Estructura

```
app/api/
├── customers/          → CRUD + search
│   ├── route.ts           (GET, POST)
│   ├── [id]/route.ts      (GET, PUT, DELETE)
│   └── list/route.ts      (GET simple list)
├── projects/           → CRUD + search
│   ├── route.ts           (GET, POST)
│   └── [id]/route.ts      (GET, PUT, DELETE)
├── payments/           → CRUD + allocation logic
│   ├── route.ts           (GET, POST)
│   ├── [id]/route.ts      (GET, PUT, DELETE, CANCEL)
│   ├── search-projects/   (GET projects con balance)
│   └── customer-projects/ (GET projects by customer)
├── installments/       → Vista global de cuotas
│   └── route.ts           (GET con filtros)
├── project-status/     → CRUD + reorder
│   ├── route.ts           (GET, POST)
│   ├── [id]/route.ts      (PUT, DELETE)
│   └── reorder/route.ts   (POST bulk update)
├── payment-methods/    → GET + toggle
│   └── [id]/toggle/       (POST activo/inactivo)
└── cron/
    └── mark-installments-paid/ (POST - Vercel Cron)
```

---

## Pattern: Route Handler con Logging

Todas las APIs usan el middleware `withLogging()`:

```typescript
// app/api/entity/route.ts
import { withLogging } from '@/lib/logger-middleware'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withLogging(async (request, logger) => {
  logger.info('GET request started')

  // Business logic aquí
  const data = await fetchData()

  logger.info({ count: data.length }, 'GET request completed')
  return NextResponse.json(data)
})
```

**Beneficios:**

- ✅ Request correlation automática (requestId)
- ✅ Duration tracking
- ✅ Logging estructurado con Pino
- ✅ Error handling centralizado

---

## Características Comunes

### 1. Validación Backend (Zod)

Todos los endpoints POST/PUT validan con Zod:

```typescript
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  // Validar con Zod schema
  const validation = schema.safeParse(body)

  if (!validation.success) {
    logger.warn({ errors: validation.error }, 'Validation failed')
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error },
      { status: 400 }
    )
  }

  // Continuar con data validada
  const validData = validation.data
  // ...
})
```

### 2. Paginación

APIs que retornan listas implementan paginación:

```typescript
// Query params: ?page=1&limit=10
const page = parseInt(searchParams.get('page') || '1')
const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
const skip = (page - 1) * limit

const [data, total] = await Promise.all([
  prisma.entity.findMany({ skip, take: limit }),
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

### 3. Filtros

Query params opcionales para filtrado:

```typescript
// ?customerId=abc&startDate=2025-01-01&endDate=2025-12-31
const where = {
  ...(customerId && { customerId }),
  ...(startDate &&
    endDate && {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
}

const data = await prisma.entity.findMany({ where })
```

### 4. Includes (Prisma)

Carga eager de relaciones:

```typescript
const project = await prisma.project.findUnique({
  where: { id },
  include: {
    customer: { select: { id: true, name: true } },
    projectStatus: {
      select: {
        id: true,
        name: true,
        color: { select: { bgClass: true, textClass: true } },
      },
    },
    paymentAllocations: {
      select: { allocatedAmount: true },
    },
  },
})
```

---

## Performance Optimization

### N+1 Fix

```typescript
// prisma/client.ts
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  relationLoadStrategy: 'join', // ✅ Resuelve N+1
})
```

### Índices Compuestos

```prisma
// prisma/schema.prisma
model Project {
  // ...
  @@index([customerId, projectStatusId])
  @@index([projectStatusId, date(sort: Desc)])
}
```

---

## Ver También

- [06. APIs Implementadas](../06-apis/) - Detalle de cada endpoint
- [Business Logic Layer](business-logic.md) - Validaciones y cálculos
- [04. Sistema de Logging](../04-logging/) - Logging estructurado

**Última actualización:** 2025-10-30
