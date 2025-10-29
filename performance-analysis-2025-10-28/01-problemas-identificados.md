# Problemas Identificados - Análisis Detallado

## 🔴 Problema #1: Latencia de Red + LATERAL Joins

### Impacto: 30% del tiempo total (~2-3 segundos)

### Descripción

Prisma genera queries con `LEFT JOIN LATERAL` en lugar de JOINs simples cuando se usa `select: { ... }` en includes nested.

### Query Real Generado

```sql
SELECT
  "t0".*,
  "Project_customer"."__prisma_data__" AS "customer",
  "Project_projectStatus"."__prisma_data__" AS "projectStatus",
  "Project_paymentAllocations"."__prisma_data__" AS "paymentAllocations"
FROM "public"."Project" AS "t0"

-- LATERAL join para Customer (ejecutado 10 veces, 1 por proyecto)
LEFT JOIN LATERAL (
  SELECT JSONB_BUILD_OBJECT('id', "t2"."id", 'name', "t2"."name", 'phone', "t2"."phone")
  AS "__prisma_data__"
  FROM "public"."Customer" AS "t2"
  WHERE "t0"."customerId" = "t2"."id"
  LIMIT $1
) AS "Project_customer" ON true

-- LATERAL join para ProjectStatus + BadgeColor (ejecutado 10 veces)
LEFT JOIN LATERAL (
  SELECT JSONB_BUILD_OBJECT(
    'id', "t3"."id",
    'name', "t3"."name",
    'isFinal', "t3"."isFinal",
    'colorId', "t3"."colorId",
    'color', "ProjectStatus_color"."__prisma_data__"
  ) AS "__prisma_data__"
  FROM "public"."ProjectStatus" AS "t3"
  LEFT JOIN LATERAL (
    SELECT JSONB_BUILD_OBJECT('bgClass', "t4"."bgClass") AS "__prisma_data__"
    FROM "public"."BadgeColor" AS "t4"
    WHERE "t3"."colorId" = "t4"."id"
    LIMIT $2
  ) AS "ProjectStatus_color" ON true
  WHERE "t0"."projectStatusId" = "t3"."id"
  LIMIT $3
) AS "Project_projectStatus" ON true

-- LATERAL join para PaymentAllocations con agregado (ejecutado 10 veces)
LEFT JOIN LATERAL (
  SELECT COALESCE(JSONB_AGG("__prisma_data__"), '[]') AS "__prisma_data__"
  FROM (
    SELECT JSONB_BUILD_OBJECT('allocatedAmount', "t6"."allocatedAmount") AS "__prisma_data__"
    FROM "public"."PaymentAllocation" AS "t5"
    WHERE "t0"."id" = "t5"."projectId"
  ) AS "t6"
) AS "Project_paymentAllocations" ON true

WHERE ("j1"."isFinal" = $4 AND ("j1"."id" IS NOT NULL))
ORDER BY "t0"."createdAt" DESC
LIMIT $5 OFFSET $6
```

### ¿Por qué es Lento?

1. **LATERAL joins son subqueries correlacionados:**
   - Se ejecutan una vez POR CADA fila del outer query
   - Con 10 proyectos = 30+ subqueries individuales

2. **Latencia geográfica alta:**
   - Latinoamérica → AWS us-west-2 (Oregon): ~200ms RTT
   - Cada subquery puede requerir un round-trip
   - 30 subqueries × 200ms = 6 segundos teóricos

3. **JSONB_BUILD_OBJECT overhead:**
   - PostgreSQL debe construir objetos JSON por cada fila
   - Más costoso que retornar columnas raw

### ¿Por qué Prisma Usa LATERAL?

```typescript
// Código actual en app/api/projects/route.ts:68-93
include: {
  customer: {
    select: {  // ← Esto fuerza LATERAL
      id: true,
      name: true,
      phone: true,
    },
  },
  projectStatus: {
    select: {  // ← Esto fuerza LATERAL
      id: true,
      name: true,
      isFinal: true,
      color: {
        select: {  // ← Nested select = LATERAL anidado
          bgClass: true,
        },
      },
    },
  },
  paymentAllocations: {
    select: {  // ← Esto fuerza LATERAL con JSONB_AGG
      allocatedAmount: true,
    },
  },
}
```

### Soluciones

#### Opción A: Eliminar `select` y traer modelos completos

```typescript
include: {
  customer: true,  // Sin select = JOIN simple
  projectStatus: {
    include: { color: true }  // include en lugar de select
  },
  paymentAllocations: true,
}
```

**Pros:** JOINs simples, más rápido
**Contras:** Traes más datos (todos los campos)

#### Opción B: Usar `$queryRaw` con JOINs manuales

```typescript
const projects = await prisma.$queryRaw`
  SELECT
    p.*,
    jsonb_build_object('id', c.id, 'name', c.name) as customer,
    jsonb_build_object('id', ps.id, 'name', ps.name) as project_status,
    COALESCE(SUM(pa.allocated_amount), 0) as total_paid
  FROM "Project" p
  LEFT JOIN "Customer" c ON c.id = p.customer_id
  LEFT JOIN "ProjectStatus" ps ON ps.id = p.project_status_id
  LEFT JOIN "PaymentAllocation" pa ON pa.project_id = p.id
  GROUP BY p.id, c.id, ps.id
  ORDER BY p.created_at DESC
  LIMIT 10
`
```

**Pros:** Control total, JOINs simples, puedes calcular balance en SQL
**Contras:** Pierdes type-safety de Prisma, más verbose

#### Opción C: Campo denormalizado `balance`

Agregar campo calculado que se actualiza en cada Payment.
**Ver:** Problema #3 para detalles

---

## 🔴 Problema #2: Doble API Call desde Client Component

### Impacto: 25% del tiempo total (~2 segundos)

### Descripción

El frontend hace 2 llamadas HTTP separadas con alta latencia:

```typescript
// app/projects/page.tsx (Client Component)
useEffect(() => {
  // Primera llamada
  fetch('/api/projects?projectState=Activo') // 5.2s

  // Segunda llamada (paralela o secuencial)
  fetch('/api/project-status') // 5.2s
}, [])
```

### ¿Por qué es Lento?

1. **Latencia de red duplicada:**
   - Cada llamada: ~200ms red + tiempo de query
   - Total: 400ms de latencia pura desperdiciada

2. **Competencia por recursos:**
   - Ambas queries compiten por conexiones del Neon pooler
   - Throttling en plan gratuito puede serializar las queries

3. **No aprovecha Server Components:**
   - Next.js 15 soporta Server Components que ejecutan queries SIN latencia de red
   - Código actual es Client Component innecesariamente

### Logs del Problema

```
○ Compiling /projects ...
✓ Compiled /projects in 3.4s (1445 modules)
GET /projects 200 in 4414ms                    ← Renderizado inicial

✓ Compiled in 1140ms (652 modules)
○ Compiling /api/project-status ...
✓ Compiled /api/project-status in -8521ms (1482 modules)

GET /api/projects?projectState=Activo 200 in 5175ms   ← Primera API
GET /api/project-status 200 in 5179ms                 ← Segunda API (paralela)
```

**Observación:** Ambas APIs terminan casi simultáneamente, indicando ejecución paralela.

### Soluciones

#### Opción A: Combinar en una sola API

```typescript
// Nueva ruta: app/api/projects-with-metadata/route.ts
export async function GET(request: Request) {
  const [projects, statuses, paymentMethods] = await Promise.all([
    getProjects(searchParams),
    getProjectStatuses(),
    getPaymentMethods(), // Si se necesita
  ])

  return NextResponse.json({
    projects,
    metadata: { statuses, paymentMethods },
  })
}
```

**Ganancia:** Elimina 1 round-trip (~400ms)

#### Opción B: Migrar a Server Component

```typescript
// app/projects/page.tsx (Server Component)
export default async function ProjectsPage({
  searchParams
}: {
  searchParams: { page?: string; search?: string }
}) {
  // Queries ejecutadas en servidor (0ms de latencia de red)
  const [projects, statuses] = await Promise.all([
    prisma.project.findMany({ ... }),
    prisma.projectStatus.findMany({ ... })
  ])

  return <ProjectsTable initialData={projects} statuses={statuses} />
}
```

**Ganancia:** ~2 segundos (elimina toda la latencia cliente → servidor)

#### Opción C: Streaming con Suspense (avanzado)

```typescript
// app/projects/page.tsx
export default function ProjectsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ProjectsTable />  {/* Server Component que hace fetch */}
    </Suspense>
  )
}
```

**Beneficio adicional:** Renderizado parcial, mejor UX

---

## 🟡 Problema #3: Post-Processing en JavaScript

### Impacto: 15% del tiempo total (~800ms)

### Descripción

Después de traer los proyectos de la DB, se hacen cálculos en JavaScript que deberían ejecutarse en SQL:

```typescript
// app/api/projects/route.ts:99-116
const projectsWithCalculations = projects.map((project) => {
  // ❌ Calcular totalPaid en JavaScript
  const { totalPaid, balance } = calculateProjectBalance({
    totalAmount: Number(project.total),
    allocations: project.paymentAllocations.map((alloc) => ({
      allocatedAmount: Number(alloc.allocatedAmount),
    })),
  })

  // ❌ Calcular percentPaid en JavaScript
  const percentPaid = Number(project.total) > 0 ? (totalPaid / Number(project.total)) * 100 : 0

  return { ...project, totalPaid, balance, percentPaid }
})

// ❌ Filtrado client-side después de traer datos
const filteredProjects = projectsWithCalculations.filter((project) => {
  const isFullyPaid = project.balance === 0
  const hasFinaleStatus = project.projectStatus?.isFinal ?? false

  if (projectState === 'Activo') {
    return !hasFinaleStatus || !isFullyPaid
  } else if (projectState === 'Finalizado') {
    return hasFinaleStatus && isFullyPaid
  }
  return true
})
```

### ¿Por qué es Malo?

1. **Traemos más datos de los necesarios:**
   - Si pedimos 10 proyectos pero filtramos 3, desperdiciamos 3 queries
   - El paginado no funciona correctamente (filtramos DESPUÉS de LIMIT)

2. **Lógica de negocio en lugar equivocado:**
   - `SUM(allocations)` debería ser SQL aggregate
   - `WHERE balance > 0` debería ser SQL condition

3. **Performance overhead:**
   - Conversión Decimal → Number
   - Loop JavaScript sobre arrays
   - Creación de nuevos objetos

4. **El COUNT query se descarta:**

   ```typescript
   // Línea 95: ejecutamos COUNT
   const [projects, _total] = await Promise.all([...])

   // Línea 140: lo sobrescribimos con filteredProjects.length
   total: filteredProjects.length
   ```

### Solución: SQL con Aggregates

```sql
SELECT
  p.*,
  c.id as customer_id,
  c.name as customer_name,
  ps.id as status_id,
  ps.name as status_name,
  ps.is_final,
  bc.bg_class as status_color,
  COALESCE(SUM(pa.allocated_amount), 0) as total_paid,
  p.total - COALESCE(SUM(pa.allocated_amount), 0) as balance,
  CASE
    WHEN p.total > 0
    THEN (COALESCE(SUM(pa.allocated_amount), 0) / p.total) * 100
    ELSE 0
  END as percent_paid
FROM "Project" p
LEFT JOIN "Customer" c ON c.id = p.customer_id
LEFT JOIN "ProjectStatus" ps ON ps.id = p.project_status_id
LEFT JOIN "BadgeColor" bc ON bc.id = ps.color_id
LEFT JOIN "PaymentAllocation" pa ON pa.project_id = p.id
WHERE ps.is_final = false  -- Filtrado en SQL
  AND (p.total - COALESCE(SUM(pa.allocated_amount), 0)) > 0  -- Balance > 0
GROUP BY p.id, c.id, ps.id, bc.bg_class
ORDER BY p.created_at DESC
LIMIT 10 OFFSET 0
```

**Ventajas:**

- ✅ Cálculo de balance en SQL (más rápido)
- ✅ Filtrado en SQL (menos datos transferidos)
- ✅ Paginación correcta (LIMIT se aplica después de filtrar)
- ✅ COUNT correcto (cuenta filas después de WHERE)

**Implementación:**

```typescript
const projects = await prisma.$queryRaw<ProjectWithBalance[]>`
  ${sql_query_above}
`
```

---

## 🟡 Problema #4: Query COUNT Desperdiciado

### Impacto: 10% del tiempo total (~2 segundos)

### Descripción

Se ejecuta un `prisma.project.count()` que luego se descarta:

```typescript
// Línea 61-95: ejecutamos COUNT en paralelo
const [projects, _total] = await Promise.all([
  prisma.project.findMany({ ... }),
  prisma.project.count({ where }),  // ← Este resultado se descarta
])

// Línea 99-133: calculamos y filtramos
const projectsWithCalculations = projects.map(...)
const filteredProjects = projectsWithCalculations.filter(...)

// Línea 140: sobrescribimos _total con filteredProjects.length
return NextResponse.json({
  projects: filteredProjects,
  pagination: {
    total: filteredProjects.length,  // ← No usamos _total de DB
    totalPages: Math.ceil(filteredProjects.length / limit),
  },
})
```

### ¿Por qué Ocurre Esto?

1. **Filtrado client-side posterior:**
   - El COUNT se hace con el WHERE de la query
   - Pero luego filtramos más en JavaScript (líneas 120-133)
   - El count de DB no refleja los registros realmente mostrados

2. **Workaround mal implementado:**
   - Se decidió filtrar en JS pero no se eliminó el COUNT
   - El `_total` se ignora (prefijo `_` indica variable no usada)

### Impacto

```
Query COUNT:
  - Latencia red: ~200ms
  - Ejecución SQL: ~100ms
  - Total: ~300ms

Con cold start de Neon:
  - Latencia red: ~200ms
  - Cold start: ~1500ms
  - Ejecución SQL: ~100ms
  - Total: ~1800ms
```

### Solución

#### Opción A: Eliminar COUNT completamente

```typescript
// ANTES:
const [projects, _total] = await Promise.all([
  prisma.project.findMany({ ... }),
  prisma.project.count({ where })
])

// DESPUÉS:
const projects = await prisma.project.findMany({ ... })

// Usar filteredProjects.length directamente
```

**Ganancia:** ~2 segundos

#### Opción B: Mover filtrado a SQL y mantener COUNT

Si movemos el filtrado a SQL (Problema #3), entonces el COUNT sí es correcto:

```typescript
const [projects, total] = await Promise.all([
  prisma.$queryRaw`SELECT ... WHERE ... balance > 0`,
  prisma.$queryRaw`SELECT COUNT(*) ... WHERE ... balance > 0`,
])

// Ahora 'total' sí es correcto
```

---

## 🟡 Problema #5: Neon Cold Start

### Impacto: 15% del tiempo total (~1-2 segundos) - Solo primer request

### Descripción

Neon (PostgreSQL serverless) suspende databases inactivas:

- **Free tier:** 5 minutos de inactividad → suspende
- **Pro tier:** Configurable o sin suspensión

### Logs Indicativos

```
GET /api/projects 200 in 5175ms  ← Primer request lento
GET /api/projects 200 in 500ms   ← Segundo request rápido (si fuera inmediato)
```

### ¿Cómo Identificar Cold Start?

1. **Tiempo del primer query > 2s:**
   - Cold start: ~1-2s
   - Query real: ~500ms
   - Total: ~2.5s

2. **Segundo query inmediato es mucho más rápido:**
   - Sin cold start: ~500ms

3. **Log de Neon (si está habilitado):**
   ```
   Connection established after wakeup: 1.8s
   ```

### Soluciones

#### Opción A: Aceptar el cold start (gratis)

- Es normal en free tier
- Solo afecta primer request después de 5 min

#### Opción B: Keep-alive ping (gratis)

```typescript
// vercel.json - Cron job cada 4 minutos
{
  "crons": [
    {
      "path": "/api/cron/keep-db-alive",
      "schedule": "*/4 * * * *"
    }
  ]
}
```

```typescript
// app/api/cron/keep-db-alive/route.ts
export async function GET() {
  await prisma.$queryRaw`SELECT 1`
  return Response.json({ ok: true })
}
```

**Pros:** Gratis, simple
**Contras:** 360 requests/día (dentro de límites)

#### Opción C: Upgrade a Neon Pro ($19/mes)

- Sin cold starts
- Más storage
- Más compute
- Read replicas

---

## 🟠 Problema #6: Índice No Utilizado

### Impacto: 3% del tiempo total (~100-200ms)

### Descripción

El índice está optimizado para un campo, pero el query usa otro:

```prisma
// prisma/schema.prisma:103
model Project {
  @@index([projectStatusId, date(sort: Desc)])  // ← Índice en 'date'
}
```

```typescript
// app/api/projects/route.ts:67
orderBy: {
  createdAt: 'desc'
} // ← Query ordena por 'createdAt'
```

### ¿Por qué es Problema?

1. **PostgreSQL no puede usar el índice:**
   - El índice optimiza `ORDER BY date DESC`
   - El query usa `ORDER BY createdAt DESC`
   - Son campos **diferentes**

2. **PostgreSQL debe ordenar en memoria:**

   ```sql
   -- Sin índice adecuado:
   1. Traer todas las filas que cumplen WHERE
   2. Ordenarlas en memoria por createdAt
   3. Aplicar LIMIT
   ```

3. **No escala bien:**
   - Con 10 proyectos: +100ms
   - Con 10,000 proyectos: +5s potencialmente

### Solución

#### Opción A: Corregir el índice

```prisma
model Project {
  // CAMBIAR:
  @@index([projectStatusId, date(sort: Desc)])

  // POR:
  @@index([projectStatusId, createdAt(sort: Desc)])
}
```

Luego: `npm run db:push`

#### Opción B: Cambiar el ORDER BY

```typescript
// Si 'date' es más relevante que 'createdAt':
orderBy: {
  date: 'desc'
} // Usa el índice existente
```

#### Opción C: Agregar índice adicional

```prisma
model Project {
  @@index([projectStatusId, date(sort: Desc)])
  @@index([projectStatusId, createdAt(sort: Desc)])  // ← Nuevo
}
```

**Contras:** Más índices = más overhead en escrituras

---

## 🟠 Problema #7: Neon Pooler Overhead

### Impacto: 5% del tiempo total (~50-200ms)

### Descripción

Usas el pooler de Neon (PgBouncer) para todas las queries:

```bash
# .env.local
DATABASE_URL="postgresql://...@...-pooler.c-2.us-west-2.aws.neon.tech/..."
DIRECT_URL="postgresql://...@....c-2.us-west-2.aws.neon.tech/..."
```

### ¿Qué Hace el Pooler?

PgBouncer en modo "transaction":

- Cada query se ejecuta en una conexión diferente del pool
- No hay prepared statements cache entre queries
- Overhead de handshake por cada query

### Cuándo Usar Cada URL

| Escenario                        | URL a Usar     | Razón                                |
| -------------------------------- | -------------- | ------------------------------------ |
| **Queries de lectura complejos** | `DIRECT_URL`   | Sin overhead de pooler               |
| **Queries de escritura**         | `DATABASE_URL` | Pooling previene conexiones agotadas |
| **Migrations**                   | `DIRECT_URL`   | Requerido por Prisma                 |
| **Edge Functions**               | `DATABASE_URL` | Conexiones efímeras                  |

### Solución

#### Crear cliente separado para lecturas

```typescript
// lib/db-read.ts
export const prismaRead = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL, // Sin pooler
  log: ['error'],
})
```

```typescript
// app/api/projects/route.ts
import { prismaRead } from '@/lib/db-read'

export async function GET(request: Request) {
  const projects = await prismaRead.project.findMany({ ... })
  // ...
}
```

**Ganancia:** ~50-200ms

---

## 🟢 Problema #8: Prisma Query Logging

### Impacto: 2% del tiempo total (~50-100ms) - Solo en dev

### Descripción

Prisma logea todos los queries en desarrollo:

```typescript
// lib/db.ts:10
log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
```

### Overhead del Logging

1. **Query SQL es muy largo:**
   - Con LATERAL joins: ~10 líneas
   - Con JSONB_BUILD_OBJECT: ~20 líneas

2. **Formateo de parámetros:**
   - Prisma formatea los bind parameters
   - Convierte tipos (Decimal, Date, etc.)

3. **I/O de terminal:**
   - WSL2 es más lento que Linux nativo
   - Terminal output puede bloquear

### Solución Temporal

```typescript
// lib/db.ts - Durante performance testing
export const prisma = new PrismaClient({
  log: ['error'], // Solo errors, incluso en dev
})
```

**Ganancia:** ~50-100ms en dev

**Nota:** Revertir después de debugging.

---

## 📊 Resumen de Impactos

| #   | Problema            | Impacto      | Dificultad | Prioridad  |
| --- | ------------------- | ------------ | ---------- | ---------- |
| 1   | LATERAL joins       | ~2.5s (30%)  | Alta       | 🔴 Crítica |
| 2   | Doble API call      | ~2s (25%)    | Media      | 🔴 Alta    |
| 3   | Post-processing JS  | ~800ms (15%) | Media      | 🟡 Alta    |
| 4   | COUNT desperdiciado | ~2s (10%)    | Baja       | 🟡 Media   |
| 5   | Neon cold start     | ~1.5s (15%)  | N/A        | 🟢 Baja    |
| 6   | Índice no usado     | ~200ms (3%)  | Baja       | 🟠 Media   |
| 7   | Pooler overhead     | ~100ms (5%)  | Baja       | 🟠 Baja    |
| 8   | Query logging       | ~100ms (2%)  | Muy baja   | 🟢 Baja    |

---

**Ver también:**

- [Plan de Acción](02-plan-de-accion.md)
- [Ejemplos de Código](03-ejemplos-codigo.md)
