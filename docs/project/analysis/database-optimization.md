# Database Optimization Guide - Cobralon Project

**Date:** 2025-10-22
**Target:** Neon PostgreSQL + Prisma ORM
**Objective:** Optimizar queries para escalabilidad desde el principio

---

## 📊 Executive Summary

### Problemas Identificados

| Issue                     | Severity  | Location                            | Impact                                  |
| ------------------------- | --------- | ----------------------------------- | --------------------------------------- |
| **N+1 Query Problem**     | 🔴 High   | `GET /api/projects` (línea 87-96)   | ~N queries extra por página             |
| **Client-side Filtering** | 🟡 Medium | `GET /api/projects` (línea 121-134) | Paginación incorrecta + desperdicio RAM |
| **Overfetching**          | 🟡 Medium | Todas las APIs                      | Traer campos no usados                  |
| **Missing Indexes**       | 🟠 Medium | Varias tablas                       | Scans completos en WHERE                |
| **No Query Strategy**     | 🟡 Medium | Todas las relaciones                | No usa `relationLoadStrategy: 'join'`   |

### Beneficios Esperados

- ⚡ **~70% reducción** en queries ejecutadas (N+1 → 2 queries)
- 🚀 **~50% menos datos** transferidos (select optimization)
- 📈 **10x mejor performance** con >1000 registros (indexes)
- 💰 **Ahorro en costos Neon** (menos CPU time, menos I/O)

---

## 🔴 CRITICAL: N+1 Problem en Projects API

### Problema Actual

**Archivo:** `app/api/projects/route.ts` (líneas 87-96)

```typescript
// ❌ PROBLEMA: Esto genera N+1 queries
paymentAllocations: {
  select: {
    allocatedAmount: true,
    payment: {        // ← Esto ejecuta 1 query POR CADA proyecto
      select: {
        status: true,
      },
    },
  },
}
```

**Queries ejecutadas:** 1 query principal + **N queries extras** (uno por proyecto)

```sql
-- Query 1: Traer proyectos
SELECT * FROM "Project" WHERE ...

-- Query 2-N: Para CADA proyecto, traer payments
SELECT * FROM "Payment" WHERE id IN (...)  -- Repetido N veces
```

### ✅ Solución: Use `relationLoadStrategy: 'join'`

```typescript
// ✅ OPTIMIZADO: Solo 1-2 queries totales
const [projects, _total] = await Promise.all([
  prisma.project.findMany({
    relationLoadStrategy: 'join', // ← AGREGAR ESTO
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      projectNumber: true,
      projectName: true,
      phone: true,
      street: true,
      apartment: true,
      comuna: true,
      region: true,
      date: true,
      total: true,
      currency: true,
      customerId: true,
      projectStatusId: true,
      createdAt: true,

      // Relaciones optimizadas
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      projectStatus: {
        select: {
          id: true,
          name: true,
          isFinal: true,
          color: {
            select: { bgClass: true },
          },
        },
      },
      paymentAllocations: {
        select: {
          allocatedAmount: true,
          payment: {
            select: { status: true },
          },
        },
      },
    },
  }),
  prisma.project.count({ where }),
])
```

**Resultado:**

- Antes: 1 + N queries (ej: 1 + 50 = 51 queries)
- Después: 1-2 queries totales (~96% reducción)

---

## 🟡 MEDIUM: Client-side Filtering Inefficiency

### Problema Actual

**Archivo:** `app/api/projects/route.ts` (líneas 121-134)

```typescript
// ❌ PROBLEMA: Filtra DESPUÉS de paginar
const filteredProjects = projectsWithCalculations.filter((project) => {
  const isFullyPaid = project.balance === 0
  const hasFinaleStatus = project.projectStatus?.isFinal ?? false

  if (projectState === 'Activo') {
    return !hasFinaleStatus || !isFullyPaid
  }
  // ...
})
```

**Issues:**

1. **Paginación rota:** El `total` viene de DB, pero filtras en memoria
2. **Desperdicio de recursos:** Traes N registros para descartar algunos
3. **Inconsistencia:** `page=2` puede tener 0 resultados si todos se filtraron

### ✅ Solución A: Move Balance Calculation to DB (Recommended)

**Agregar campo calculado en Prisma:**

```prisma
// prisma/schema.prisma
model Project {
  // ... campos existentes

  // Campo calculado (requiere migration)
  balance Decimal? @db.Decimal(12, 2)

  @@index([projectStatusId, balance]) // Índice compuesto para filtrado
}
```

**Actualizar balance con trigger o job:**

```typescript
// lib/update-project-balance.ts
export async function updateProjectBalance(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      paymentAllocations: {
        include: { payment: { select: { status: true } } },
      },
    },
  })

  if (!project) return

  const { totalPaid } = calculateProjectBalance({
    totalAmount: Number(project.total),
    allocations: project.paymentAllocations.map((a) => ({
      allocatedAmount: Number(a.allocatedAmount),
      payment: { status: a.payment.status },
    })),
  })

  const balance = Number(project.total) - totalPaid

  await prisma.project.update({
    where: { id: projectId },
    data: { balance: new Decimal(balance) },
  })
}
```

**Query optimizado:**

```typescript
// Ahora puedes filtrar en DB
const where: ProjectWhereInput = {}

if (projectState === 'Activo') {
  where.OR = [
    { projectStatus: { isFinal: false } },
    { balance: { gt: 0 } }, // Balance > 0
  ]
} else if (projectState === 'Finalizado') {
  where.AND = [
    { projectStatus: { isFinal: true } },
    { balance: { lte: 0 } }, // Balance <= 0
  ]
}

const [projects, total] = await Promise.all([
  prisma.project.findMany({ where, ... }),
  prisma.project.count({ where }),
])
```

### ✅ Solución B: Fetch More + Filter (Sin Migration)

Si no puedes agregar campo `balance` ahora:

```typescript
// Fetch 2x más registros para compensar filtrado
const fetchLimit = limit * 2

const projects = await prisma.project.findMany({
  where,
  skip,
  take: fetchLimit, // ← Traer más
  // ...
})

// Filtrar y limitar a lo pedido
const filtered = projectsWithCalculations.filter(/* lógica de filtrado */).slice(0, limit) // ← Tomar solo lo necesario

return {
  projects: filtered,
  pagination: {
    page,
    limit,
    total: filtered.length, // ⚠️ Total aproximado
    hasMore: filtered.length === limit, // Indicador de más páginas
  },
}
```

**Trade-off:** Trae más datos, pero evita paginación rota.

---

## 🟠 Select Optimization: Stop Overfetching

### Problema: `include` trae TODOS los campos

```typescript
// ❌ ANTES: Trae ~30 campos (algunos no usados)
include: {
  customer: true, // Trae id, name, email, phone, createdAt, updatedAt
}
```

### ✅ Solución: Use `select` explícito

```typescript
// ✅ DESPUÉS: Solo 3 campos necesarios
customer: {
  select: {
    id: true,
    name: true,
    phone: true,
    // email, createdAt, updatedAt omitidos
  },
}
```

### Aplicar en TODAS las APIs

**Customers API (`/api/customers/route.ts`):**

```typescript
// Actualmente OK, pero puede mejorar:
const customers = await prisma.customer.findMany({
  where,
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' },
  select: {
    id: true,
    name: true,
    phone: true,
    email: true,
    createdAt: true,
    // updatedAt omitido si no se usa en UI
  },
})
```

**Payments API (`/api/payments/route.ts`):**

Ya está bien optimizado (líneas 71-107) ✅

**Projects API (`/api/projects/[id]/route.ts`):**

```typescript
// GET /api/projects/[id] - Detalle completo
const project = await prisma.project.findUnique({
  relationLoadStrategy: 'join', // ← AGREGAR
  where: { id: params.id },
  select: {
    // Campos principales
    id: true,
    projectNumber: true,
    projectName: true,
    phone: true,
    street: true,
    apartment: true,
    comuna: true,
    region: true,
    date: true,
    subtotal: true,
    taxRate: true,
    total: true,
    totalAmount: true,
    currency: true,
    windowsCount: true,
    squareMeters: true,
    description: true,

    // Relaciones
    customer: {
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    },
    projectStatus: {
      select: {
        id: true,
        name: true,
        isFinal: true,
        color: { select: { bgClass: true } },
      },
    },
    paymentAllocations: {
      select: {
        id: true,
        allocatedAmount: true,
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            date: true,
            status: true,
            reference: true,
            paymentMethod: {
              select: { name: true, icon: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    },
  },
})
```

---

## 🔍 Database Indexes Optimization

### Índices Actuales (del schema.prisma)

```prisma
// Customer
@@index([name])
@@index([email])

// BadgeColor
@@index([order])
@@index([isActive])

// ProjectStatus
@@index([colorId])
@@index([order])
@@index([isActive])

// Project
@@index([customerId])
@@index([projectNumber])
@@index([projectStatusId])
@@index([date])

// PaymentMethod
@@index([active, order])

// Payment
@@index([customerId])
@@index([paymentMethodId])
@@index([status])
@@index([date])

// PaymentAllocation
@@index([paymentId])
@@index([projectId])
```

### 🚀 Índices Adicionales Recomendados

**1. Índice Compuesto para Búsqueda de Projects**

```prisma
model Project {
  // ...

  // Para query: WHERE customerId = ? AND projectState = ?
  @@index([customerId, projectStatusId, date(sort: Desc)])

  // Para búsqueda por texto
  @@index([projectNumber, projectName])
}
```

**2. Índice para Búsqueda de Customers**

```prisma
model Customer {
  // ...

  // Para búsqueda case-insensitive (usar extensión pg_trgm)
  @@index([name(ops: raw("gin_trgm_ops"))], type: Gin)
  @@index([phone])
}
```

**3. Índice para Payments por Rango de Fechas**

```prisma
model Payment {
  // ...

  // Para query: WHERE date >= ? AND date <= ?
  @@index([date, status, customerId])
}
```

**4. Índice para PaymentAllocations Lookups**

```prisma
model PaymentAllocation {
  // ...

  // Para query: WHERE projectId = ? AND payment.status = 'ACTIVE'
  @@index([projectId, paymentId])
}
```

### Migración de Índices

```bash
# 1. Agregar índices al schema.prisma
# 2. Generar migración
npm run db:migrate

# O con Neon MCP (si está configurado):
# Claude ejecutará: prepare_database_migration con el SQL
```

### SQL Directo (si prefieres no usar migrations)

```sql
-- Índices compuestos
CREATE INDEX idx_project_customer_status_date
  ON "Project"(customerId, projectStatusId, date DESC);

-- Índice para búsqueda de texto (requiere extensión)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_customer_name_trgm
  ON "Customer" USING gin(name gin_trgm_ops);

-- Índice para payments por fecha
CREATE INDEX idx_payment_date_status_customer
  ON "Payment"(date, status, customerId);

-- Índice para allocations lookups
CREATE INDEX idx_allocation_project_payment
  ON "PaymentAllocation"(projectId, paymentId);
```

---

## 📈 Scaling Strategy: What to Do When...

### When You Have 1,000 Projects

**Current setup is OK**, pero implementa:

- ✅ `relationLoadStrategy: 'join'`
- ✅ `select` optimization
- ✅ Índices compuestos

### When You Have 10,000 Projects

**Add:**

1. **Cursor-based Pagination** (más eficiente que offset)

```typescript
// cursor-pagination.ts
export async function getProjectsCursor(
  cursor: string | null,
  limit: number = 10,
  where: ProjectWhereInput = {}
) {
  const projects = await prisma.project.findMany({
    where,
    take: limit + 1, // +1 para saber si hay más
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      /* campos */
    },
  })

  const hasMore = projects.length > limit
  const results = hasMore ? projects.slice(0, -1) : projects
  const nextCursor = hasMore ? results[results.length - 1].id : null

  return { projects: results, nextCursor, hasMore }
}
```

2. **Materialized Views** para balances

```sql
-- Crear view materializada
CREATE MATERIALIZED VIEW project_balances AS
SELECT
  p.id,
  p.total,
  COALESCE(SUM(pa.allocatedAmount) FILTER (WHERE pay.status = 'ACTIVE'), 0) as total_paid,
  p.total - COALESCE(SUM(pa.allocatedAmount) FILTER (WHERE pay.status = 'ACTIVE'), 0) as balance
FROM "Project" p
LEFT JOIN "PaymentAllocation" pa ON pa.projectId = p.id
LEFT JOIN "Payment" pay ON pay.id = pa.paymentId
GROUP BY p.id, p.total;

-- Índice en la view
CREATE INDEX idx_project_balances_balance ON project_balances(balance);

-- Refresh periódico (job o trigger)
REFRESH MATERIALIZED VIEW CONCURRENTLY project_balances;
```

### When You Have 100,000+ Projects

**Add:**

1. **Database Partitioning** por fecha
2. **Read Replicas** (Neon Pro tier)
3. **Prisma Accelerate** (caching layer)

```typescript
// prisma/client-with-accelerate.ts
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

export const prisma = new PrismaClient().$extends(withAccelerate())

// Queries con cache
const projects = await prisma.project.findMany({
  where,
  cacheStrategy: {
    ttl: 60, // 60 segundos
    swr: 120, // Stale-while-revalidate
  },
})
```

---

## 🎯 Implementation Checklist

### Phase 1: Quick Wins (1-2 horas)

- [ ] Agregar `relationLoadStrategy: 'join'` en Projects API
- [ ] Reemplazar `include: true` con `select` explícito (todas las APIs)
- [ ] Agregar índices compuestos básicos

**Expected Impact:** ~60% performance improvement

### Phase 2: Fix Pagination (2-4 horas)

- [ ] Decidir: ¿Agregar campo `balance` o fetch más datos?
- [ ] Si balance: Crear migration + update job
- [ ] Mover filtrado de `Activo/Finalizado` al WHERE clause
- [ ] Actualizar cálculo de paginación

**Expected Impact:** Paginación correcta + ~20% más rápido

### Phase 3: Advanced Indexes (1 hora)

- [ ] Agregar índice pg_trgm para búsqueda de texto
- [ ] Índices compuestos para queries frecuentes
- [ ] Analizar slow queries con `EXPLAIN ANALYZE`

**Expected Impact:** ~10x en búsquedas de texto

### Phase 4: Future Scaling (cuando sea necesario)

- [ ] Implementar cursor pagination
- [ ] Considerar materialized views
- [ ] Evaluar Prisma Accelerate ($30/mes)
- [ ] Configurar Neon Read Replicas

---

## 📊 Monitoring & Validation

### Queries to Test Performance

```typescript
// test-performance.ts
import { prisma } from '@/lib/db'

async function testQueries() {
  console.time('GET projects with joins')
  await prisma.project.findMany({
    relationLoadStrategy: 'join',
    take: 50,
    select: {
      /* optimized */
    },
  })
  console.timeEnd('GET projects with joins')

  console.time('GET projects without joins')
  await prisma.project.findMany({
    take: 50,
    include: { customer: true, projectStatus: true, paymentAllocations: true },
  })
  console.timeEnd('GET projects without joins')
}
```

### Neon Query Insights

```bash
# Usar Neon MCP para analizar queries lentas
# Claude ejecutará: list_slow_queries
```

```typescript
// O con SQL directo
const slowQueries = await prisma.$queryRaw`
  SELECT
    query,
    mean_exec_time,
    calls
  FROM pg_stat_statements
  WHERE mean_exec_time > 100 -- > 100ms
  ORDER BY mean_exec_time DESC
  LIMIT 10
`
```

---

## 🔗 References

- [Prisma Query Optimization Docs](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance)
- [Neon PostgreSQL Indexes Guide](https://neon.tech/docs/postgres/query-performance)
- [PostgreSQL pg_trgm Extension](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Prisma relationLoadStrategy](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries)

---

**Author:** Claude Code + Mauricio
**Last Updated:** 2025-10-22
**Status:** Ready for Implementation
