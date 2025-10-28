# Plan de Acción - Roadmap de Optimización

## 🎯 Objetivo

Reducir tiempo de carga de `/api/projects` de **5,175ms** a **< 500ms** (mejora del 90%).

---

## 📈 Fases del Plan

```
Fase 1: Quick Wins        5,175ms → 1,500ms (-70%)  [2 horas]
Fase 2: Mejoras Medianas  1,500ms → 500ms (-90%)   [1 semana]
Fase 3: Optimización Pro  500ms → 50ms (-99%)      [2 semanas]
```

---

## 🚀 FASE 1: Quick Wins (HOY - 2 horas)

### Objetivo: Reducir 70% del tiempo (5.2s → 1.5s)

### ✅ Win #1: Eliminar COUNT Query Desperdiciado

**Tiempo estimado:** 15 minutos
**Ganancia:** -2 segundos

#### Antes
```typescript
// app/api/projects/route.ts:61-95
const [projects, _total] = await Promise.all([
  prisma.project.findMany({ ... }),
  prisma.project.count({ where })  // ← ELIMINAR ESTO
])

// ...más adelante en línea 140
return NextResponse.json({
  projects: filteredProjects,
  pagination: {
    total: filteredProjects.length,  // No usamos _total
  },
})
```

#### Después
```typescript
const projects = await prisma.project.findMany({ ... })

// ...resto del código igual

return NextResponse.json({
  projects: filteredProjects,
  pagination: {
    total: filteredProjects.length,
  },
})
```

#### Pasos
1. Abrir `app/api/projects/route.ts`
2. Línea 61: Cambiar `Promise.all([...])` por `prisma.project.findMany({ ... })`
3. Eliminar `_total` de la desestructuración
4. Verificar que línea 140 sigue usando `filteredProjects.length`
5. Test: `curl http://localhost:3000/api/projects` y verificar que funciona

---

### ✅ Win #2: Corregir Índice para ORDER BY

**Tiempo estimado:** 10 minutos
**Ganancia:** -200ms

#### Problema
```prisma
// prisma/schema.prisma:103
@@index([projectStatusId, date(sort: Desc)])  // ← Índice en 'date'
```

Pero el query ordena por `createdAt`:
```typescript
orderBy: { createdAt: 'desc' }  // ← Campo diferente
```

#### Solución
```prisma
// prisma/schema.prisma
model Project {
  // ... campos

  // CAMBIAR este índice:
  // @@index([projectStatusId, date(sort: Desc)])

  // POR este:
  @@index([projectStatusId, createdAt(sort: Desc)])

  // O agregar índice adicional (si usas ambos):
  @@index([projectStatusId, date(sort: Desc)])
  @@index([projectStatusId, createdAt(sort: Desc)])
}
```

#### Pasos
1. Editar `prisma/schema.prisma`
2. Modificar línea 103 según arriba
3. Ejecutar: `npm run db:push`
4. Verificar: `npm run db:generate`

---

### ✅ Win #3: Combinar APIs en Una Sola

**Tiempo estimado:** 30 minutos
**Ganancia:** -200ms (1 round-trip menos)

#### Problema Actual
```typescript
// Frontend hace 2 llamadas:
fetch('/api/projects?projectState=Activo')  // 5.2s
fetch('/api/project-status')                // 5.2s
```

#### Solución: Nueva API Unificada

**Crear:** `app/api/projects-with-metadata/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectState = searchParams.get('projectState') || 'Activo'

  // Ejecutar ambas queries en paralelo
  const [projects, statuses] = await Promise.all([
    // Query de proyectos (copy-paste lógica de /api/projects)
    prisma.project.findMany({
      relationLoadStrategy: 'join',
      where: { /* ... */ },
      include: { /* ... */ },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // Query de status
    prisma.projectStatus.findMany({
      where: { isActive: true },
      include: { color: true },
      orderBy: { order: 'asc' },
    })
  ])

  // Post-processing igual que antes
  const projectsWithCalculations = projects.map(...)
  const filteredProjects = projectsWithCalculations.filter(...)

  return NextResponse.json({
    projects: filteredProjects,
    metadata: {
      statuses,
    },
    pagination: {
      page: 1,
      limit: 10,
      total: filteredProjects.length,
    },
  })
}
```

**Modificar Frontend:**
```typescript
// app/projects/page.tsx
useEffect(() => {
  fetch('/api/projects-with-metadata?projectState=Activo')
    .then(res => res.json())
    .then(data => {
      setProjects(data.projects)
      setStatuses(data.metadata.statuses)
    })
}, [])
```

---

### ✅ Win #4: Deshabilitar Query Logging (Temporal)

**Tiempo estimado:** 5 minutos
**Ganancia:** -100ms

#### Solución
```typescript
// lib/db.ts
export const prisma = new PrismaClient({
  // ANTES:
  // log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],

  // DESPUÉS (temporal durante debugging):
  log: ['error']  // Solo errors, incluso en dev
})
```

**Nota:** Revertir después de optimización.

---

### 📊 Resultados Esperados Fase 1

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Tiempo total** | 5,175ms | ~1,500ms | -70% |
| **COUNT query** | 2,000ms | 0ms | -100% |
| **Índice ORDER BY** | 200ms | 50ms | -75% |
| **Doble API call** | 400ms latencia | 200ms | -50% |
| **Query logging** | 100ms | 0ms | -100% |

---

## 🎯 FASE 2: Mejoras Medianas (ESTA SEMANA - 4 horas)

### Objetivo: Reducir 90% del tiempo total (1.5s → 500ms)

### 🔧 Mejora #1: Mover Cálculo de Balance a SQL

**Tiempo estimado:** 2 horas
**Ganancia:** -500ms

#### Solución: Usar $queryRaw con Aggregates

**Crear:** `lib/queries/get-projects-with-balance.ts`
```typescript
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export interface ProjectWithBalance {
  id: string
  project_number: string
  project_name: string | null
  customer_id: string
  customer_name: string
  customer_phone: string
  status_id: string | null
  status_name: string | null
  status_is_final: boolean
  status_color: string | null
  phone: string
  street: string
  apartment: string | null
  comuna: string
  region: string
  date: Date
  subtotal: number
  tax_rate: number
  total: number
  total_paid: number
  balance: number
  percent_paid: number
  windows_count: number
  square_meters: number
  description: string | null
  currency: string
  created_at: Date
  updated_at: Date
}

export async function getProjectsWithBalance({
  projectState = 'Activo',
  search = '',
  customerId = '',
  page = 1,
  limit = 10,
}: {
  projectState?: string
  search?: string
  customerId?: string
  page?: number
  limit?: number
}): Promise<{ projects: ProjectWithBalance[]; total: number }> {
  const offset = (page - 1) * limit

  // Construir WHERE dinámico
  const whereConditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (projectState === 'Activo') {
    whereConditions.push('ps.is_final = false')
  } else if (projectState === 'Finalizado') {
    whereConditions.push('ps.is_final = true')
  }

  if (customerId) {
    whereConditions.push(`p.customer_id = $${paramIndex}`)
    params.push(customerId)
    paramIndex++
  }

  if (search) {
    whereConditions.push(`(
      p.project_number ILIKE $${paramIndex} OR
      p.project_name ILIKE $${paramIndex} OR
      c.name ILIKE $${paramIndex} OR
      ps.name ILIKE $${paramIndex}
    )`)
    params.push(`%${search}%`)
    paramIndex++
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : ''

  // Query principal con aggregates
  const query = `
    SELECT
      p.id,
      p."projectNumber" as project_number,
      p."projectName" as project_name,
      p.customer_id,
      c.name as customer_name,
      c.phone as customer_phone,
      p.phone,
      p.street,
      p.apartment,
      p.comuna,
      p.region,
      ps.id as status_id,
      ps.name as status_name,
      ps."isFinal" as status_is_final,
      bc."bgClass" as status_color,
      p.date,
      p.subtotal,
      p."taxRate" as tax_rate,
      p.total,
      COALESCE(SUM(pa."allocatedAmount"), 0) as total_paid,
      p.total - COALESCE(SUM(pa."allocatedAmount"), 0) as balance,
      CASE
        WHEN p.total > 0 THEN (COALESCE(SUM(pa."allocatedAmount"), 0) / p.total) * 100
        ELSE 0
      END as percent_paid,
      p."windowsCount" as windows_count,
      p."squareMeters" as square_meters,
      p.description,
      p.currency,
      p."createdAt" as created_at,
      p."updatedAt" as updated_at
    FROM "Project" p
    LEFT JOIN "Customer" c ON c.id = p.customer_id
    LEFT JOIN "ProjectStatus" ps ON ps.id = p."projectStatusId"
    LEFT JOIN "BadgeColor" bc ON bc.id = ps."colorId"
    LEFT JOIN "PaymentAllocation" pa ON pa."projectId" = p.id
    ${whereClause}
    GROUP BY p.id, c.id, ps.id, bc."bgClass"
    ORDER BY p."createdAt" DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `

  params.push(limit, offset)

  // Query de count
  const countQuery = `
    SELECT COUNT(DISTINCT p.id) as count
    FROM "Project" p
    LEFT JOIN "Customer" c ON c.id = p.customer_id
    LEFT JOIN "ProjectStatus" ps ON ps.id = p."projectStatusId"
    ${whereClause}
  `

  // Ejecutar ambas queries en paralelo
  const [projects, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<ProjectWithBalance[]>(query, ...params),
    prisma.$queryRawUnsafe<[{ count: bigint }]>(countQuery, ...params.slice(0, -2))
  ])

  return {
    projects,
    total: Number(countResult[0].count),
  }
}
```

**Modificar API:**
```typescript
// app/api/projects/route.ts
import { getProjectsWithBalance } from '@/lib/queries/get-projects-with-balance'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const { projects, total } = await getProjectsWithBalance({
    projectState: searchParams.get('projectState') || 'Activo',
    search: searchParams.get('search') || '',
    customerId: searchParams.get('customerId') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '10'), 100),
  })

  return NextResponse.json({
    projects,
    pagination: {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '10'), 100),
      total,
      totalPages: Math.ceil(total / Math.min(parseInt(searchParams.get('limit') || '10'), 100)),
    },
  })
}
```

---

### 🔧 Mejora #2: Migrar a Server Component

**Tiempo estimado:** 1 hora
**Ganancia:** -800ms (elimina latencia de red)

#### Problema
```typescript
// app/projects/page.tsx (Client Component)
'use client'

export default function ProjectsPage() {
  useEffect(() => {
    fetch('/api/projects')  // ← 200ms latencia de red
  }, [])
}
```

#### Solución
```typescript
// app/projects/page.tsx (Server Component)
import { getProjectsWithBalance } from '@/lib/queries/get-projects-with-balance'
import { ProjectsTable } from '@/components/projects/projects-table'

interface PageProps {
  searchParams: {
    page?: string
    search?: string
    projectState?: string
    customerId?: string
  }
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  // Query ejecutada en servidor (0ms latencia)
  const { projects, total } = await getProjectsWithBalance({
    projectState: searchParams.projectState || 'Activo',
    search: searchParams.search || '',
    customerId: searchParams.customerId || '',
    page: parseInt(searchParams.page || '1'),
    limit: 10,
  })

  // También traer statuses en paralelo
  const statuses = await prisma.projectStatus.findMany({
    where: { isActive: true },
    include: { color: true },
    orderBy: { order: 'asc' },
  })

  return (
    <AppLayout
      pageTitle="Proyectos"
      pageDescription="Gestiona tus proyectos y su información"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Proyectos' }]}
    >
      <ProjectsTable
        initialProjects={projects}
        statuses={statuses}
        pagination={{
          page: parseInt(searchParams.page || '1'),
          limit: 10,
          total,
        }}
      />
    </AppLayout>
  )
}
```

**Modificar Tabla:**
```typescript
// components/projects/projects-table.tsx
'use client'  // ← Sigue siendo Client (para interactividad)

interface ProjectsTableProps {
  initialProjects: ProjectWithBalance[]
  statuses: ProjectStatus[]
  pagination: { page: number; limit: number; total: number }
}

export function ProjectsTable({
  initialProjects,
  statuses,
  pagination
}: ProjectsTableProps) {
  const [projects, setProjects] = useState(initialProjects)
  // Interactividad local (sorting, filtering)
  // ...
}
```

---

### 🔧 Mejora #3: Usar DIRECT_URL para Lecturas

**Tiempo estimado:** 30 minutos
**Ganancia:** -100ms

#### Solución
```typescript
// lib/db-read.ts (nuevo archivo)
import { PrismaClient } from '@prisma/client'

const globalForPrismaRead = globalThis as unknown as {
  prismaRead: PrismaClient | undefined
}

export const prismaRead =
  globalForPrismaRead.prismaRead ??
  new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL,  // ← Sin pooler
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrismaRead.prismaRead = prismaRead
}
```

**Usar en queries de lectura:**
```typescript
// lib/queries/get-projects-with-balance.ts
import { prismaRead } from '@/lib/db-read'  // ← Cambiar import

export async function getProjectsWithBalance(...) {
  const [projects, countResult] = await Promise.all([
    prismaRead.$queryRawUnsafe<ProjectWithBalance[]>(...),  // ← prismaRead
    prismaRead.$queryRawUnsafe<[{ count: bigint }]>(...)
  ])
}
```

---

### 📊 Resultados Esperados Fase 2

| Métrica | Después Fase 1 | Después Fase 2 | Mejora |
|---------|----------------|----------------|--------|
| **Tiempo total** | 1,500ms | ~500ms | -67% |
| **Balance en SQL** | 800ms (JS) | 100ms (SQL) | -87% |
| **Latencia red** | 400ms | 0ms (SSR) | -100% |
| **Pooler overhead** | 100ms | 0ms (direct) | -100% |

---

## 🏗️ FASE 3: Optimización Profesional (PRÓXIMO SPRINT - 8 horas)

### Objetivo: Performance < 100ms con cache (mejora 99%)

### 🚀 Mejora #1: Campo Denormalizado `balance`

**Tiempo estimado:** 4 horas
**Ganancia:** Query más simple, escalable

#### Migración
```prisma
// prisma/schema.prisma
model Project {
  // ... campos existentes
  balance Decimal @default(0) @db.Decimal(12,2)

  @@index([balance])
  @@index([projectStatusId, balance])
}
```

#### Trigger o Application Logic
```typescript
// lib/business-logic/update-project-balance.ts
export async function updateProjectBalance(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      total: true,
      paymentAllocations: {
        select: { allocatedAmount: true }
      }
    }
  })

  const totalPaid = project.paymentAllocations.reduce(
    (sum, alloc) => sum + Number(alloc.allocatedAmount),
    0
  )
  const balance = Number(project.total) - totalPaid

  await prisma.project.update({
    where: { id: projectId },
    data: { balance }
  })
}
```

#### Actualizar en cada Payment
```typescript
// app/api/payments/route.ts
export async function POST(request: Request) {
  const payment = await prisma.payment.create({
    data: {
      // ...
      allocations: {
        create: allocations.map(alloc => ({
          projectId: alloc.projectId,
          allocatedAmount: alloc.allocatedAmount
        }))
      }
    }
  })

  // Actualizar balance de proyectos afectados
  for (const alloc of allocations) {
    await updateProjectBalance(alloc.projectId)
  }
}
```

---

### 🚀 Mejora #2: Redis Cache con Upstash

**Tiempo estimado:** 3 horas
**Ganancia:** 50ms en cache hit

#### Setup
```bash
npm install @upstash/redis
```

#### Configuración
```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export function getCacheKey(prefix: string, params: Record<string, any>) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join(':')
  return `${prefix}:${sortedParams}`
}
```

#### Uso
```typescript
// lib/queries/get-projects-with-balance.ts
import { redis, getCacheKey } from '@/lib/cache'

export async function getProjectsWithBalance(params) {
  const cacheKey = getCacheKey('projects', params)

  // Intentar cache hit
  const cached = await redis.get(cacheKey)
  if (cached) {
    console.log('Cache HIT:', cacheKey)
    return cached as { projects: ProjectWithBalance[]; total: number }
  }

  console.log('Cache MISS:', cacheKey)

  // Query a DB
  const result = await /* ... query SQL ... */

  // Guardar en cache (60 segundos)
  await redis.setex(cacheKey, 60, result)

  return result
}
```

#### Invalidación
```typescript
// app/api/projects/route.ts (POST)
export async function POST(request: Request) {
  const project = await prisma.project.create({ ... })

  // Invalidar cache
  await redis.del('projects:*')  // O más específico

  return NextResponse.json(project)
}
```

---

### 🚀 Mejora #3: Streaming con React Suspense

**Tiempo estimado:** 1 hora
**Ganancia:** UX percibida mejorada

```typescript
// app/projects/page.tsx
import { Suspense } from 'react'
import { ProjectsTable } from '@/components/projects/projects-table'
import { TableSkeleton } from '@/components/ui/table-skeleton'

export default function ProjectsPage({ searchParams }: PageProps) {
  return (
    <AppLayout>
      <Suspense fallback={<TableSkeleton />}>
        <ProjectsTableWrapper searchParams={searchParams} />
      </Suspense>
    </AppLayout>
  )
}

async function ProjectsTableWrapper({ searchParams }) {
  const { projects, total } = await getProjectsWithBalance(searchParams)
  return <ProjectsTable projects={projects} total={total} />
}
```

---

### 📊 Resultados Esperados Fase 3

| Métrica | Después Fase 2 | Después Fase 3 | Mejora Total |
|---------|----------------|----------------|--------------|
| **Tiempo (cache miss)** | 500ms | ~200ms | **-96%** |
| **Tiempo (cache hit)** | 500ms | ~50ms | **-99%** |
| **Query DB** | Complejo | Simple | Mantenible |
| **Escalabilidad** | 10k rows OK | 100k+ rows OK | Futuro-proof |

---

## ✅ Checklist de Implementación

### Fase 1 (HOY)
- [ ] Win #1: Eliminar COUNT query
- [ ] Win #2: Corregir índice ORDER BY
- [ ] Win #3: Combinar APIs
- [ ] Win #4: Deshabilitar query logging
- [ ] **Test:** Medir nueva performance
- [ ] **Verificar:** Funcionalidad intacta

### Fase 2 (ESTA SEMANA)
- [ ] Mejora #1: SQL con aggregates
- [ ] Mejora #2: Server Component
- [ ] Mejora #3: DIRECT_URL
- [ ] **Test:** Medir nueva performance
- [ ] **Verificar:** Tests E2E pasan

### Fase 3 (PRÓXIMO SPRINT)
- [ ] Mejora #1: Campo `balance` denormalizado
- [ ] Mejora #2: Redis cache
- [ ] Mejora #3: Streaming con Suspense
- [ ] **Test:** Load testing con 10k+ registros
- [ ] **Monitor:** Uptime y performance en producción

---

## 📊 KPIs de Éxito

| KPI | Baseline | Objetivo Fase 1 | Objetivo Fase 2 | Objetivo Fase 3 |
|-----|----------|-----------------|-----------------|-----------------|
| **P50 latency** | 5,175ms | < 1,500ms | < 500ms | < 100ms |
| **P95 latency** | 7,000ms | < 2,500ms | < 800ms | < 200ms |
| **Cache hit rate** | 0% | 0% | 0% | > 80% |
| **DB queries/request** | 2 | 1 | 1 | 0-1 |
| **Bytes transferred** | ~50KB | ~50KB | ~50KB | ~50KB |

---

## 🔬 Cómo Medir Performance

### En Desarrollo
```typescript
// app/api/projects/route.ts
export async function GET(request: Request) {
  const start = Date.now()

  const result = await getProjectsWithBalance(...)

  const duration = Date.now() - start
  console.log(`GET /api/projects took ${duration}ms`)

  return NextResponse.json(result, {
    headers: { 'X-Response-Time': `${duration}ms` }
  })
}
```

### Con Chrome DevTools
1. Abrir DevTools → Network tab
2. Reload página
3. Ver timing de `/api/projects` request
4. Click derecho → "Timing" para breakdown

### Con curl
```bash
curl -w "@curl-format.txt" http://localhost:3000/api/projects
```

**curl-format.txt:**
```
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
```

---

## 🚨 Rollback Plan

Si algo sale mal en producción:

### Fase 1
- Revertir commit
- Deploy anterior
- Total downtime: < 5 min

### Fase 2
- Revertir a API calls (quitar SSR)
- Prisma client sigue funcionando
- Total downtime: < 10 min

### Fase 3
- Deshabilitar Redis cache
- Funcionalidad sigue funcionando sin cache
- Performance degrada a Fase 2
- Total downtime: 0 min

---

**Ver también:**
- [Problemas Identificados](01-problemas-identificados.md)
- [Ejemplos de Código](03-ejemplos-codigo.md)
