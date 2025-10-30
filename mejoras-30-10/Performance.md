# Performance - Optimizaciones y Escalabilidad

## ⚡ Estado: AWARENESS

Optimizaciones de performance para cuando el sistema escale. Muchas NO son necesarias actualmente pero es útil conocerlas.

---

## 1. N+1 Queries (RESUELTO ✅)

### 📊 Estado Actual

**Solución implementada:**

```prisma
// prisma/schema.prisma
generator client {
  relationLoadStrategy = "join" // ✅ Previene N+1 queries
}
```

**Efecto:**

```typescript
// ANTES (sin join strategy):
const projects = await db.project.findMany({
  include: { customer: true, projectStatus: true }
})
// → 1 query para projects
// → N queries para customers (1 por proyecto)
// → N queries para projectStatus
// Total: 1 + N + N queries

// DESPUÉS (con join strategy):
// → 1 query con JOINs
// Total: 1 query
```

**Benchmark:**

- **Sin join:** 100 proyectos = 201 queries (~500ms)
- **Con join:** 100 proyectos = 1 query (~50ms)
- **Mejora:** 10x más rápido

### ✅ No Requiere Acción

Ya está implementado correctamente.

---

## 2. Índices de Database (BUENOS ✅)

### 📊 Estado Actual

**Índices implementados:**

```prisma
model Project {
  // Índices simples
  @@index([customerId])
  @@index([projectNumber])
  @@index([projectStatusId])
  @@index([date])

  // Índices compuestos (optimizados para queries frecuentes)
  @@index([customerId, projectStatusId])
  @@index([projectStatusId, date(sort: Desc)])
}

model Payment {
  @@index([customerId])
  @@index([paymentMethodId])
  @@index([date])
  @@index([type])
  @@index([type, date(sort: Desc)])
}
```

**Coverage:**

- ✅ Queries por cliente: `WHERE customerId = ?` (rápido)
- ✅ Queries por estado: `WHERE projectStatusId = ?` (rápido)
- ✅ Queries compuestas: `WHERE customerId = ? AND projectStatusId = ?` (rápido)
- ✅ Ordenamiento: `ORDER BY date DESC` (usa índice)

### ✅ No Requiere Acción Inmediata

Índices bien diseñados. Solo agregar más cuando tengas queries nuevas lentas.

---

## 3. Queries Ineficientes (Client-Side Filtering)

### 📊 Estado Actual (Problema P0)

**Ya documentado en:** `P0-Critical.md` → Sección 2

**Resumen:**

```typescript
// ❌ ACTUAL: Fetch + filtrar client-side
const projects = await db.project.findMany({ take: 10 })
const filtered = projects.filter(p => p.balance > 0)

// ✅ SOLUCIÓN: Filtrar en DB
const projects = await db.project.findMany({
  where: { balance: { gt: 0 } },
  take: 10
})
```

**Ver solución completa en:** `P0-Critical.md`

---

## 4. Sin Pagination Server-Side Completa

### 📊 Estado Actual

**Paginación implementada:**

```typescript
// app/api/projects/route.ts:111-116
const page = parseInt(searchParams.get('page') || '1')
const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
const skip = (page - 1) * limit

const projects = await db.project.findMany({
  skip,
  take: limit,
  // ...
})
```

**Estado:** ✅ FUNCIONA para datasets medianos (<10k registros)

**Problemas cuando escala (>100k registros):**

1. **Offset/Limit es lento en páginas altas:**
   ```sql
   SELECT * FROM projects LIMIT 10 OFFSET 9990;
   -- DB tiene que leer 10,000 filas para skipear 9,990
   ```

2. **Performance degrada linealmente:**
   - Página 1: 50ms
   - Página 100: 200ms
   - Página 1000: 2000ms (2 segundos)

### 💡 Solución (Cursor Pagination)

#### **Implementar Cuando:**

- ✅ Tienes >10,000 registros
- ✅ Usuarios navegan a páginas altas (>100)
- ✅ Performance de paginación es lenta (>500ms)

#### **Cómo Funciona:**

```typescript
// ANTES: Offset pagination
GET /api/projects?page=100&limit=10
// → OFFSET 990 LIMIT 10

// DESPUÉS: Cursor pagination
GET /api/projects?cursor=last-project-id&limit=10
// → WHERE id > 'last-project-id' LIMIT 10
```

**Implementación:**

```typescript
// app/api/projects/route.ts (CON CURSOR)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') // ← ID del último proyecto visto
  const limit = parseInt(searchParams.get('limit') || '10')

  const projects = await db.project.findMany({
    take: limit + 1, // +1 para saber si hay más
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // Skip el cursor mismo
    }),
    orderBy: { createdAt: 'desc' },
    include: { customer: true, projectStatus: true },
  })

  const hasMore = projects.length > limit
  const items = hasMore ? projects.slice(0, -1) : projects

  return NextResponse.json({
    projects: items,
    pagination: {
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    },
  })
}
```

**Uso en frontend:**

```typescript
// app/projects/page.tsx (CON CURSOR)
const [projects, setProjects] = useState([])
const [nextCursor, setNextCursor] = useState(null)

const loadMore = async () => {
  const params = new URLSearchParams({
    limit: '10',
    ...(nextCursor && { cursor: nextCursor }),
  })

  const response = await fetch(`/api/projects?${params}`)
  const data = await response.json()

  setProjects(prev => [...prev, ...data.projects])
  setNextCursor(data.pagination.nextCursor)
}

// Infinite scroll
useEffect(() => {
  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
      if (nextCursor) loadMore()
    }
  }

  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [nextCursor])
```

**Performance:**

- Página 1: 50ms
- Página 100: 50ms (constante!)
- Página 10,000: 50ms

**Esfuerzo:** 4-6 horas para migrar todas las APIs

---

## 5. Sin Cache (React Query lo Resuelve)

### 📊 Estado Actual

**Ya cubierto en:** `P1-High-Priority.md` → Sección 1

**Problema:**

- Sin cache entre navegaciones
- Mismo dato se fetchea múltiples veces

**Solución:**

- Implementar React Query (P1)
- Cache automático de 1-5 minutos
- Invalidación inteligente

**Ver detalles completos en:** `P1-High-Priority.md`

---

## 6. Bundle Size (Aceptable Actualmente)

### 📊 Estado Actual

**Dependencias grandes:**

```json
{
  "@tanstack/react-table": "8.21.3",  // ~150kb
  "recharts": "2.15.4",                 // ~500kb (!!)
  "@radix-ui/*": "múltiples",           // ~200kb total
  "date-fns": "4.1.0"                   // ~300kb
}
```

**Bundle total estimado:** ~2-3 MB (sin gzip)

**Performance actual:**

- First Load: ~500kb gzipped (aceptable)
- Page Transitions: <100kb (bueno)

### 💡 Optimizaciones (Cuando Sea Necesario)

#### **1. Code Splitting Agresivo**

```typescript
// app/projects/page.tsx (OPTIMIZADO)
import dynamic from 'next/dynamic'

// ✅ Cargar DataTable solo cuando se necesita
const DataTable = dynamic(() => import('@/components/custom/data-table'), {
  loading: () => <div>Cargando tabla...</div>,
  ssr: false, // No renderizar en servidor
})

// ✅ Cargar Charts solo cuando se necesita
const ProjectChart = dynamic(() => import('@/components/charts/project-chart'), {
  loading: () => <div>Cargando gráfico...</div>,
})

export default function ProjectsPage() {
  const [showChart, setShowChart] = useState(false)

  return (
    <div>
      <DataTable data={projects} />

      {showChart && <ProjectChart data={projects} />}
    </div>
  )
}
```

**Beneficio:**

- Bundle inicial: -200kb
- Chart solo se carga cuando usuario lo pide

---

#### **2. Lazy Load Heavy Components**

```typescript
// components/dialogs/projects/edit-project-dialog.tsx
'use client'

import { lazy, Suspense } from 'react'

// ✅ ProjectForm solo se carga cuando abres el dialog
const ProjectForm = lazy(() => import('@/components/forms/projects/project-form'))

export function EditProjectDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <Suspense fallback={<div>Cargando formulario...</div>}>
            <ProjectForm />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

#### **3. Reemplazar Recharts (Si Es Bottleneck)**

**Recharts:** 500kb, feature-rich pero pesado

**Alternativas:**

1. **Chart.js + react-chartjs-2:** ~150kb (más ligero)
2. **lightweight-charts:** ~100kb (muy rápido)
3. **SVG custom:** 0kb (más trabajo)

**Solo cambiar si:** Gráficos se usan en todas las páginas y bundle es muy grande

---

## 7. Imágenes Sin Optimizar

### 📊 Estado Actual

**next.config.mjs:**

```javascript
{
  images: {
    unoptimized: true, // ⚠️ Imágenes sin optimizar
  }
}
```

**Problema:**

- Imágenes se sirven en tamaño original
- Sin WebP/AVIF (formatos modernos)
- Sin lazy loading automático

**Impacto:** Bajo (si no tienes muchas imágenes)

### 💡 Solución (Cuando Tengas Imágenes)

```javascript
// next.config.mjs (CORREGIDO)
{
  images: {
    unoptimized: false, // ✅ Habilitar optimización
    formats: ['image/avif', 'image/webp'], // ✅ Formatos modernos
    domains: ['yourdomain.com'], // ✅ Si usas CDN externo
  }
}
```

**Uso:**

```tsx
import Image from 'next/image'

<Image
  src="/project-photo.jpg"
  alt="Proyecto"
  width={800}
  height={600}
  loading="lazy" // ✅ Lazy load automático
  placeholder="blur" // ✅ Blur mientras carga
/>
```

**Beneficios:**

- Tamaño reducido: 50-80%
- Formatos modernos (WebP/AVIF)
- Responsive automático
- Lazy loading

**Esfuerzo:** 30 minutos (cambiar config + migrar a `next/image`)

---

## 8. Sin CDN (Vercel lo Incluye)

### 📊 Estado Actual

Si deployeas en Vercel:

- ✅ CDN global automático
- ✅ Edge caching
- ✅ Brotli compression
- ✅ HTTP/3

**No requiere acción.**

Si deployeas en otro lugar (Railway, AWS, etc.):

- Considera Cloudflare CDN (gratis)
- O Vercel (recomendado para Next.js)

---

## 9. Database Connection Pooling

### 📊 Estado Actual

**Prisma ya incluye connection pooling:**

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

**Connection pooling:** ✅ Habilitado por default

**Límites en Neon:**

- Free tier: 1 database, 0.5 GB
- Paid: Hasta 1000 connections concurrentes

**Optimización (si llegas al límite):**

```prisma
datasource db {
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL") // ← Para migrations
}
```

```bash
# .env
DATABASE_URL="postgres://...?pgbouncer=true&connection_limit=20" # ← Pooling
DIRECT_DATABASE_URL="postgres://..." # ← Sin pooling (migrations)
```

---

## 🎯 Priorización de Performance

### Implementar AHORA (Si Aplica)

| Optimización          | Impacto | Cuándo                        | Esfuerzo |
| --------------------- | ------- | ----------------------------- | -------- |
| Server-side filtering | Alto    | P0 - Inmediato                | 4 hrs    |
| React Query           | Alto    | P1 - Próximo sprint           | 2 días   |

### Implementar PRONTO (Cuando Escales)

| Optimización          | Impacto | Cuándo                        | Esfuerzo |
| --------------------- | ------- | ----------------------------- | -------- |
| Balance denormalizado | Alto    | >1000 proyectos               | 1 día    |
| Cursor pagination     | Medio   | >10k registros, páginas altas | 6 hrs    |

### Opcional (Nice-to-Have)

| Optimización          | Impacto | Cuándo                        | Esfuerzo |
| --------------------- | ------- | ----------------------------- | -------- |
| Code splitting        | Bajo    | Bundle >5MB                   | 3 hrs    |
| Image optimization    | Bajo    | Muchas imágenes en app        | 30 min   |
| Reemplazar Recharts   | Bajo    | Gráficos en todas las páginas | 1 día    |

### Ya Implementado ✅

| Feature                | Estado | Beneficio                  |
| ---------------------- | ------ | -------------------------- |
| N+1 prevention (join)  | ✅     | 10x más rápido             |
| Índices de DB          | ✅     | Queries optimizadas        |
| Pagination básica      | ✅     | Funciona hasta 10k records |
| Connection pooling     | ✅     | Prisma lo maneja           |
| CDN (Vercel)           | ✅     | Global edge network        |

---

## 📊 Benchmarks Esperados

### Configuración Actual (100-1000 registros)

| Métrica                | Tiempo | Estado |
| ---------------------- | ------ | ------ |
| Load /projects         | <200ms | ✅     |
| Create project (API)   | <100ms | ✅     |
| Load project detail    | <150ms | ✅     |
| Load payments (table)  | <200ms | ✅     |
| TTFB (Time to First Byte) | <300ms | ✅  |

### Con Optimizaciones P0+P1 (1k-10k registros)

| Métrica                | Tiempo | Mejora |
| ---------------------- | ------ | ------ |
| Load /projects         | <100ms | 2x     |
| Create project         | <50ms  | 2x     |
| Navegación con cache   | <10ms  | 20x    |

### Con Optimizaciones P2 (10k-100k registros)

| Métrica                | Tiempo | Mejora |
| ---------------------- | ------ | ------ |
| Queries complejas      | <50ms  | 4x     |
| Paginación (cualquier página) | <50ms | Constante |
| Filtrado server-side   | <100ms | 3x     |

---

## 🔧 Herramientas de Monitoring

### Development

```bash
# Analizar bundle
npm run build
npx @next/bundle-analyzer

# Lighthouse
npm run dev
# Abrir DevTools → Lighthouse → Run
```

### Production (Cuando Deploys)

**Opciones:**

1. **Vercel Analytics** (incluido gratis)
   - Web Vitals
   - Serverless function metrics

2. **Sentry** (errores + performance)
   ```bash
   npm install @sentry/nextjs
   ```

3. **LogRocket** (session replay + performance)
   - Ver qué hacen usuarios cuando la app es lenta

---

## 📖 Referencias

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Prisma Performance](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Web Vitals](https://web.dev/vitals/)
- [React Query Performance](https://tanstack.com/query/latest/docs/react/guides/performance)

---

**Resumen:**

- ✅ **Fundamentals:** Ya implementados (N+1, índices, pooling)
- ⚠️ **P0/P1:** Implementar en próximas 2-4 semanas
- ⏳ **P2:** Solo cuando escales o tengas problemas reales
- 📊 **Monitor:** Medir antes de optimizar (no premature optimization)
