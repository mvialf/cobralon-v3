# Ejemplos de Código - Implementaciones Completas

Este archivo contiene código listo para copy-paste para cada optimización.

---

## 📁 Estructura de Archivos a Crear/Modificar

```
/home/mau/programas/Cobralon/
├── lib/
│   ├── db-read.ts (nuevo)
│   ├── cache.ts (nuevo - Fase 3)
│   └── queries/
│       └── get-projects-with-balance.ts (nuevo)
├── app/
│   └── api/
│       ├── projects/route.ts (modificar)
│       └── projects-with-metadata/route.ts (nuevo - Fase 1)
└── prisma/
    └── schema.prisma (modificar índice)
```

---

## 🚀 FASE 1: Quick Wins

### Win #1: Eliminar COUNT Query

**Archivo:** `app/api/projects/route.ts`

#### ANTES (líneas 61-95)
```typescript
const [projects, _total] = await Promise.all([
  prisma.project.findMany({
    relationLoadStrategy: 'join',
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
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
            select: {
              bgClass: true,
            },
          },
        },
      },
      paymentAllocations: {
        select: {
          allocatedAmount: true,
        },
      },
    },
  }),
  prisma.project.count({ where }),
])
```

#### DESPUÉS
```typescript
const projects = await prisma.project.findMany({
  relationLoadStrategy: 'join',
  where,
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' },
  include: {
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
          select: {
            bgClass: true,
          },
        },
      },
    },
    paymentAllocations: {
      select: {
        allocatedAmount: true,
      },
    },
  },
})
```

---

### Win #2: Corregir Índice

**Archivo:** `prisma/schema.prisma`

#### ANTES (línea ~103)
```prisma
model Project {
  id                  String              @id @default(uuid())
  projectNumber       String
  projectName         String?
  customerId          String
  // ... más campos

  @@index([customerId])
  @@index([projectNumber])
  @@index([projectStatusId])
  @@index([date])
  @@index([customerId, projectStatusId])
  @@index([projectStatusId, date(sort: Desc)])  // ← PROBLEMA
}
```

#### DESPUÉS
```prisma
model Project {
  id                  String              @id @default(uuid())
  projectNumber       String
  projectName         String?
  customerId          String
  // ... más campos

  @@index([customerId])
  @@index([projectNumber])
  @@index([projectStatusId])
  @@index([date])
  @@index([customerId, projectStatusId])
  @@index([projectStatusId, createdAt(sort: Desc)])  // ← CORREGIDO
}
```

**Ejecutar:**
```bash
npm run db:push
```

---

### Win #3: API Unificada

**Crear archivo:** `app/api/projects-with-metadata/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { ProjectWhereInput } from '@/types/api'
import { calculateProjectBalance } from '@/lib/business-logic/project-balance'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const search = searchParams.get('search') || ''
    const customerId = searchParams.get('customerId') || ''
    const projectState = searchParams.get('projectState') || 'Activo'

    const skip = (page - 1) * limit

    // Construir filtro
    const where: ProjectWhereInput = {}

    if (customerId) {
      where.customerId = customerId
    }

    if (search) {
      where.OR = [
        { projectNumber: { contains: search, mode: 'insensitive' as const } },
        { projectName: { contains: search, mode: 'insensitive' as const } },
        { projectStatus: { name: { contains: search, mode: 'insensitive' as const } } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
      ]
    }

    // Pre-filtro por status
    if (projectState === 'Activo') {
      where.projectStatus = { isFinal: false }
    } else if (projectState === 'Finalizado') {
      where.projectStatus = { isFinal: true }
    }

    // Ejecutar ambas queries en paralelo
    const [projects, statuses] = await Promise.all([
      // Query de proyectos
      prisma.project.findMany({
        relationLoadStrategy: 'join',
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
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
                select: {
                  bgClass: true,
                },
              },
            },
          },
          paymentAllocations: {
            select: {
              allocatedAmount: true,
            },
          },
        },
      }),

      // Query de status
      prisma.projectStatus.findMany({
        where: { isActive: true },
        include: {
          color: true,
          _count: {
            select: { projects: true },
          },
        },
        orderBy: { order: 'asc' },
      }),
    ])

    // Post-processing (igual que antes)
    const projectsWithCalculations = projects.map((project) => {
      const { totalPaid, balance } = calculateProjectBalance({
        totalAmount: Number(project.total),
        allocations: project.paymentAllocations.map((alloc) => ({
          allocatedAmount: Number(alloc.allocatedAmount),
        })),
      })

      const percentPaid = Number(project.total) > 0 ? (totalPaid / Number(project.total)) * 100 : 0

      return {
        ...project,
        totalPaid,
        balance,
        percentPaid,
      }
    })

    // Filtro fino
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

    return NextResponse.json({
      projects: filteredProjects,
      metadata: {
        statuses,
      },
      pagination: {
        page,
        limit,
        total: filteredProjects.length,
        totalPages: Math.ceil(filteredProjects.length / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching projects with metadata:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 })
  }
}
```

**Modificar frontend para usar nueva API:**
```typescript
// app/projects/page.tsx o donde hagas el fetch
useEffect(() => {
  fetch('/api/projects-with-metadata?projectState=Activo')
    .then((res) => res.json())
    .then((data) => {
      setProjects(data.projects)
      setStatuses(data.metadata.statuses)
      setPagination(data.pagination)
    })
}, [])
```

---

### Win #4: Deshabilitar Logging

**Archivo:** `lib/db.ts`

#### ANTES
```typescript
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
```

#### DESPUÉS (temporal)
```typescript
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],  // Solo errors, incluso en dev
  })
```

---

## 🎯 FASE 2: Mejoras Medianas

### Mejora #1: Cliente de Lectura con DIRECT_URL

**Crear archivo:** `lib/db-read.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrismaRead = globalThis as unknown as {
  prismaRead: PrismaClient | undefined
}

export const prismaRead =
  globalForPrismaRead.prismaRead ??
  new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL,  // Sin pooler
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrismaRead.prismaRead = prismaRead
}
```

---

### Mejora #2: Query SQL con Balance Calculado

**Crear archivo:** `lib/queries/get-projects-with-balance.ts`

```typescript
import { prismaRead } from '@/lib/db-read'
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
  subtotal: string  // Decimal viene como string
  tax_rate: string
  total: string
  total_paid: string
  balance: string
  percent_paid: number
  windows_count: number
  square_meters: string
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

  // Filtro por estado
  if (projectState === 'Activo') {
    whereConditions.push('ps."isFinal" = false')
  } else if (projectState === 'Finalizado') {
    whereConditions.push('ps."isFinal" = true')
  }

  // Filtro por cliente
  if (customerId) {
    whereConditions.push(`p."customerId" = $${paramIndex}`)
    params.push(customerId)
    paramIndex++
  }

  // Filtro de búsqueda
  if (search) {
    whereConditions.push(`(
      p."projectNumber" ILIKE $${paramIndex} OR
      p."projectName" ILIKE $${paramIndex} OR
      c.name ILIKE $${paramIndex} OR
      ps.name ILIKE $${paramIndex}
    )`)
    params.push(`%${search}%`)
    paramIndex++
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

  // Query principal con aggregates
  const query = `
    SELECT
      p.id,
      p."projectNumber" as project_number,
      p."projectName" as project_name,
      p."customerId" as customer_id,
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
      p.subtotal::text,
      p."taxRate"::text as tax_rate,
      p.total::text,
      COALESCE(SUM(pa."allocatedAmount"), 0)::text as total_paid,
      (p.total - COALESCE(SUM(pa."allocatedAmount"), 0))::text as balance,
      CASE
        WHEN p.total > 0 THEN (COALESCE(SUM(pa."allocatedAmount"), 0) / p.total) * 100
        ELSE 0
      END as percent_paid,
      p."windowsCount" as windows_count,
      p."squareMeters"::text as square_meters,
      p.description,
      p.currency,
      p."createdAt" as created_at,
      p."updatedAt" as updated_at
    FROM "Project" p
    LEFT JOIN "Customer" c ON c.id = p."customerId"
    LEFT JOIN "ProjectStatus" ps ON ps.id = p."projectStatusId"
    LEFT JOIN "BadgeColor" bc ON bc.id = ps."colorId"
    LEFT JOIN "PaymentAllocation" pa ON pa."projectId" = p.id
    ${whereClause}
    GROUP BY p.id, c.id, c.name, c.phone, ps.id, ps.name, ps."isFinal", bc."bgClass"
    ORDER BY p."createdAt" DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `

  params.push(limit, offset)

  // Query de count
  const countQuery = `
    SELECT COUNT(DISTINCT p.id)::int as count
    FROM "Project" p
    LEFT JOIN "Customer" c ON c.id = p."customerId"
    LEFT JOIN "ProjectStatus" ps ON ps.id = p."projectStatusId"
    ${whereClause}
  `

  const countParams = params.slice(0, paramIndex - 2) // Sin LIMIT y OFFSET

  try {
    // Ejecutar ambas queries en paralelo usando prismaRead
    const [projects, countResult] = await Promise.all([
      prismaRead.$queryRawUnsafe<ProjectWithBalance[]>(query, ...params),
      prismaRead.$queryRawUnsafe<[{ count: number }]>(countQuery, ...countParams),
    ])

    return {
      projects,
      total: countResult[0]?.count || 0,
    }
  } catch (error) {
    console.error('Error in getProjectsWithBalance:', error)
    throw error
  }
}
```

---

### Mejora #3: Server Component

**Modificar archivo:** `app/projects/page.tsx`

#### ANTES (Client Component)
```typescript
'use client'

import { useEffect, useState } from 'react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [statuses, setStatuses] = useState([])

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data.projects))

    fetch('/api/project-status')
      .then((res) => res.json())
      .then((data) => setStatuses(data))
  }, [])

  return <ProjectsTable projects={projects} statuses={statuses} />
}
```

#### DESPUÉS (Server Component)
```typescript
import { getProjectsWithBalance } from '@/lib/queries/get-projects-with-balance'
import { prismaRead } from '@/lib/db-read'
import { ProjectsTable } from '@/components/projects/projects-table'
import AppLayout from '@/components/layout/app-layout'

interface PageProps {
  searchParams: {
    page?: string
    search?: string
    projectState?: string
    customerId?: string
  }
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || '1')
  const projectState = searchParams.projectState || 'Activo'
  const search = searchParams.search || ''
  const customerId = searchParams.customerId || ''

  // Ejecutar queries en servidor (sin latencia de red)
  const [{ projects, total }, statuses] = await Promise.all([
    getProjectsWithBalance({
      projectState,
      search,
      customerId,
      page,
      limit: 10,
    }),
    prismaRead.projectStatus.findMany({
      where: { isActive: true },
      include: {
        color: true,
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { order: 'asc' },
    }),
  ])

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
          page,
          limit: 10,
          total,
          totalPages: Math.ceil(total / 10),
        }}
      />
    </AppLayout>
  )
}
```

**Modificar componente tabla:**
```typescript
// components/projects/projects-table.tsx
'use client'  // ← Sigue siendo Client para interactividad

import { useState } from 'react'
import { ProjectWithBalance } from '@/lib/queries/get-projects-with-balance'

interface ProjectsTableProps {
  initialProjects: ProjectWithBalance[]
  statuses: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function ProjectsTable({
  initialProjects,
  statuses,
  pagination,
}: ProjectsTableProps) {
  const [projects, setProjects] = useState(initialProjects)

  // Interactividad local: sorting, filtering client-side, etc.
  // ...

  return (
    <div>
      {/* Tu tabla actual */}
    </div>
  )
}
```

---

## 🏗️ FASE 3: Optimización Pro

### Mejora #1: Redis Cache

**Instalar:**
```bash
npm install @upstash/redis
```

**Crear archivo:** `lib/cache.ts`

```typescript
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export function getCacheKey(prefix: string, params: Record<string, any>): string {
  // Ordenar keys para consistencia
  const sortedParams = Object.keys(params)
    .sort()
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .map((key) => `${key}:${params[key]}`)
    .join(':')

  return sortedParams ? `${prefix}:${sortedParams}` : prefix
}

export const CACHE_TTL = {
  PROJECTS: 60, // 1 minuto
  PROJECT_STATUSES: 300, // 5 minutos
  CUSTOMERS: 60,
}
```

**Modificar:** `lib/queries/get-projects-with-balance.ts`

```typescript
import { redis, getCacheKey, CACHE_TTL } from '@/lib/cache'

export async function getProjectsWithBalance(params: {
  projectState?: string
  search?: string
  customerId?: string
  page?: number
  limit?: number
}): Promise<{ projects: ProjectWithBalance[]; total: number }> {
  // Generar cache key
  const cacheKey = getCacheKey('projects', params)

  try {
    // Intentar cache hit
    const cached = await redis.get<{ projects: ProjectWithBalance[]; total: number }>(cacheKey)
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey)
      return cached
    }

    console.log('❌ Cache MISS:', cacheKey)
  } catch (error) {
    console.error('Redis error (fallback to DB):', error)
  }

  // Cache miss o error: query a DB
  const { projectState = 'Activo', search = '', customerId = '', page = 1, limit = 10 } = params

  // ... resto del código SQL igual que antes ...

  const result = {
    projects,
    total: countResult[0]?.count || 0,
  }

  // Guardar en cache (60 segundos)
  try {
    await redis.setex(cacheKey, CACHE_TTL.PROJECTS, result)
  } catch (error) {
    console.error('Redis setex error:', error)
  }

  return result
}
```

**Invalidar cache al crear/actualizar/eliminar:**

```typescript
// app/api/projects/route.ts (POST)
import { redis } from '@/lib/cache'

export async function POST(request: Request) {
  const project = await prisma.project.create({ ... })

  // Invalidar cache de proyectos
  try {
    // Opción 1: Invalidar todos los proyectos (simple pero brutal)
    const keys = await redis.keys('projects:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }

    // Opción 2: Invalidar solo del cliente afectado (más granular)
    // await redis.del(`projects:customerId:${project.customerId}:*`)
  } catch (error) {
    console.error('Cache invalidation error:', error)
  }

  return NextResponse.json(project, { status: 201 })
}
```

---

### Mejora #2: Campo Balance Denormalizado

**Modificar schema:**
```prisma
// prisma/schema.prisma
model Project {
  id                  String              @id @default(uuid())
  projectNumber       String
  projectName         String?
  customerId          String
  // ... otros campos
  balance             Decimal             @default(0) @db.Decimal(12, 2)  // ← NUEVO

  // Nuevos índices
  @@index([balance])
  @@index([projectStatusId, balance])
  // ... otros índices
}
```

**Ejecutar:**
```bash
npm run db:push
```

**Crear helper:** `lib/business-logic/update-project-balance.ts`

```typescript
import { prisma } from '@/lib/db'

export async function updateProjectBalance(projectId: string): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        total: true,
        paymentAllocations: {
          select: { allocatedAmount: true },
        },
      },
    })

    if (!project) {
      throw new Error(`Project ${projectId} not found`)
    }

    const totalPaid = project.paymentAllocations.reduce(
      (sum, alloc) => sum + Number(alloc.allocatedAmount),
      0
    )

    const balance = Number(project.total) - totalPaid

    await prisma.project.update({
      where: { id: projectId },
      data: { balance },
    })

    console.log(`✅ Updated balance for project ${projectId}: ${balance}`)
  } catch (error) {
    console.error(`❌ Error updating balance for project ${projectId}:`, error)
    throw error
  }
}

export async function updateMultipleProjectBalances(projectIds: string[]): Promise<void> {
  await Promise.all(projectIds.map((id) => updateProjectBalance(id)))
}
```

**Actualizar en cada Payment:**

```typescript
// app/api/payments/route.ts
import { updateMultipleProjectBalances } from '@/lib/business-logic/update-project-balance'

export async function POST(request: Request) {
  const body = await request.json()
  const { allocations, ...paymentData } = body

  // Crear payment con allocations en transacción
  const payment = await prisma.payment.create({
    data: {
      ...paymentData,
      allocations: {
        create: allocations.map((alloc: any) => ({
          projectId: alloc.projectId,
          allocatedAmount: alloc.allocatedAmount,
        })),
      },
    },
    include: {
      allocations: true,
    },
  })

  // Actualizar balance de proyectos afectados
  const projectIds = allocations.map((alloc: any) => alloc.projectId)
  await updateMultipleProjectBalances(projectIds)

  // Invalidar cache
  await redis.del(`projects:*`)

  return NextResponse.json(payment, { status: 201 })
}
```

**Query simplificado:**

```typescript
// Con campo balance, el query es mucho más simple:
const projects = await prisma.project.findMany({
  where: {
    balance: { gt: 0 },  // ← Balance pre-calculado
    projectStatus: { isFinal: false },
  },
  include: {
    customer: true,
    projectStatus: { include: { color: true } },
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
})

// No need for paymentAllocations include
// No need for post-processing JS
// No need for LATERAL joins
```

---

## 🔬 Scripts de Testing

**Crear:** `scripts/test-performance.ts`

```typescript
#!/usr/bin/env ts-node

async function testPerformance() {
  const iterations = 10
  const results: number[] = []

  console.log(`🏁 Testing performance (${iterations} iterations)...\n`)

  for (let i = 0; i < iterations; i++) {
    const start = Date.now()

    await fetch('http://localhost:3000/api/projects?projectState=Activo')

    const duration = Date.now() - start
    results.push(duration)

    console.log(`Iteration ${i + 1}: ${duration}ms`)
  }

  const avg = results.reduce((a, b) => a + b, 0) / results.length
  const min = Math.min(...results)
  const max = Math.max(...results)
  const p50 = results.sort((a, b) => a - b)[Math.floor(results.length / 2)]
  const p95 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)]

  console.log(`\n📊 Results:`)
  console.log(`  Average: ${avg.toFixed(0)}ms`)
  console.log(`  Min:     ${min}ms`)
  console.log(`  Max:     ${max}ms`)
  console.log(`  P50:     ${p50}ms`)
  console.log(`  P95:     ${p95}ms`)
}

testPerformance()
```

**Ejecutar:**
```bash
chmod +x scripts/test-performance.ts
npm install -g ts-node
ts-node scripts/test-performance.ts
```

---

## 📝 Variables de Entorno

**Agregar a `.env.local`:**

```bash
# Neon Database
DATABASE_URL="postgresql://..." # Con -pooler
DIRECT_URL="postgresql://..."    # Sin -pooler (para lecturas)

# Upstash Redis (Fase 3)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

---

**Ver también:**
- [README](README.md)
- [Problemas Identificados](01-problemas-identificados.md)
- [Plan de Acción](02-plan-de-accion.md)
