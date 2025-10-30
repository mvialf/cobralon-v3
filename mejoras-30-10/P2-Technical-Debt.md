# P2 - Deuda Técnica y Mejoras (Preparar para Escala)

## 📌 Prioridad: MEDIA

Estas mejoras no bloquean el desarrollo actual, pero preparan el sistema para escalar y reducen fricción futura.

---

## 🎉 Estado de Implementación

### ✅ Completado: Sprint 1 de P1-High-Priority.md (React Query)

**Fecha de completación:** 2025-10-30

**Resumen:**
Se completó exitosamente la migración de la sección de Projects a React Query, eliminando todo el state management manual y reemplazándolo con hooks reutilizables y type-safe.

**Archivos implementados:**
- ✅ `/hooks/queries/use-projects.ts` - 7 hooks completos (382 líneas)
  - `useProjectsWithMetadata()` - Lista con metadata en 1 query
  - `useProjects()` - Lista simple
  - `useProject()` - Detalle individual
  - `useCreateProject()` - Mutation crear
  - `useUpdateProject()` - Mutation actualizar
  - `useDeleteProject()` - Mutation eliminar (con optimistic updates)
  - `useUpdateProjectStatus()` - Mutation especializada para estados

- ✅ `/app/projects/page.tsx` - Migrado (197→128 líneas, -35%)
  - Eliminados: 4 useState, 1 useCallback, 1 useEffect
  - Reemplazados con: 2 React Query hooks

- ✅ `/components/dialogs/projects/new-project-dialog.tsx` - Migrado
  - Eliminada lógica manual de fetch + state
  - Reemplazada con `useCreateProject()` mutation

- ✅ `/app/projects/columns.tsx` - Corregido type safety
  - Eliminado `as any` con type guards

- ✅ `/components/providers/query-provider.tsx` - Configurado
  - React Query Provider con devtools
  - Configuraciones optimizadas (staleTime, retry, refetch)

**Beneficios medidos:**
- 📉 Reducción de código: -35% en página principal
- 📉 Hooks eliminados: -5 hooks manuales
- ✅ Type safety: 100% (sin `as any`)
- ✅ Auto-invalidación: Queries se refrescan automáticamente
- ✅ Optimistic updates: Delete instantáneo con rollback
- ✅ Loading states: Por item individual
- ✅ Error handling: Centralizado con toasts

**Documentación:**
- 📄 Ver contexto completo en: `/mejoras-30-10/CONTEXTO-SESION-REACT-QUERY.md`
- 📄 Plan original en: `/mejoras-30-10/P1-High-Priority.md`

**Próximo Sprint:**
- ⏳ Sprint 2: Migración de Payments y Customers a React Query (pendiente)

---

## 1. Campo `balance` Denormalizado (Performance)

### 📊 Estado Actual

**Lógica de cálculo:**

```typescript
// app/api/projects/route.ts:142-148
const totalPaid = project.paymentAllocations.reduce(
  (sum, allocation) => sum + Number(allocation.allocatedAmount),
  0
)
const balance = Number(project.total) - totalPaid
```

**Patrón:**

- ✅ Balance se calcula en runtime
- ✅ Nunca está desactualizado (siempre correcto)
- ❌ Cálculo se repite en cada query
- ❌ No se puede filtrar/ordenar por balance en DB

### 🔥 Impacto Real

**Escenario actual (100 proyectos):**

```sql
-- Query actual (API route)
SELECT * FROM projects
LIMIT 10 OFFSET 0
-- Luego calcular balance en JavaScript para 10 proyectos
```

**Performance:** Aceptable

**Escenario futuro (10,000 proyectos):**

```sql
-- Si quieres filtrar proyectos con balance > 0:
SELECT * FROM projects -- ❌ Fetcheas TODO
-- Luego calculas balance en JS
-- Luego filtras en JS
-- Luego paginas en JS
```

**Performance:** Muy malo

**Queries imposibles actualmente:**

```sql
-- ❌ "Dame los 10 proyectos con mayor balance"
-- No se puede: balance no está en DB

-- ❌ "Cuántos proyectos tienen balance > $1M?"
-- No se puede: necesitas fetchear TODOS y calcular

-- ❌ "Suma total de balances pendientes"
-- No se puede eficientemente
```

### 💡 Solución

#### **Fase 1: Agregar Campo Denormalizado**

```prisma
// prisma/schema.prisma (AGREGAR)
model Project {
  id              String   @id @default(uuid())
  projectNumber   String
  // ... campos existentes

  balance         Decimal  @default(0) @db.Decimal(12, 2) // ✅ Nuevo
  balanceUpdatedAt DateTime @default(now()) // ✅ Tracking

  @@index([balance]) // ✅ Índice para queries rápidas
  @@index([balance, customerId]) // ✅ Índice compuesto
}
```

```bash
# Migración
npx prisma migrate dev --name add-balance-field
```

---

#### **Fase 2: Función de Recalculo**

```typescript
// lib/business-logic/project-balance.ts (AGREGAR)
import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Recalcula y actualiza el balance de un proyecto
 * @param projectId - ID del proyecto
 * @returns Nuevo balance
 */
export async function recalculateProjectBalance(projectId: string): Promise<number> {
  // 1. Fetch project con allocations
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      total: true,
      paymentAllocations: {
        select: { allocatedAmount: true },
      },
    },
  })

  if (!project) {
    throw new Error(`Proyecto ${projectId} no encontrado`)
  }

  // 2. Calcular balance
  const totalPaid = project.paymentAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.allocatedAmount),
    0
  )
  const balance = Number(project.total) - totalPaid

  // 3. Actualizar en DB
  await db.project.update({
    where: { id: projectId },
    data: {
      balance: new Decimal(balance),
      balanceUpdatedAt: new Date(),
    },
  })

  return balance
}

/**
 * Recalcula balance de múltiples proyectos
 * Útil para migraciones o recalculos masivos
 */
export async function recalculateMultipleBalances(projectIds: string[]): Promise<void> {
  await Promise.all(projectIds.map((id) => recalculateProjectBalance(id)))
}

/**
 * Recalcula TODOS los balances (usar con cuidado)
 */
export async function recalculateAllBalances(): Promise<void> {
  const projects = await db.project.findMany({
    select: { id: true },
  })

  console.log(`Recalculando balance de ${projects.length} proyectos...`)

  // Procesar en batches de 50
  const batchSize = 50
  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize)
    await recalculateMultipleBalances(batch.map((p) => p.id))
    console.log(`Procesados ${Math.min(i + batchSize, projects.length)}/${projects.length}`)
  }

  console.log('✅ Recalculo completo')
}
```

---

#### **Fase 3: Actualizar en Mutations**

```typescript
// app/api/payments/route.ts (MODIFICAR)

// POST /api/payments
export async function POST(request: Request) {
  // ... validaciones existentes

  const payment = await db.$transaction(async (tx) => {
    // 1. Crear pago
    const payment = await tx.payment.create({
      data: {
        /* ... */
      },
    })

    // 2. Crear allocations
    await tx.paymentAllocation.createMany({
      data: allocations.map((a) => ({
        /* ... */
      })),
    })

    // ✅ 3. Actualizar balance de proyectos afectados
    for (const allocation of allocations) {
      await recalculateProjectBalance(allocation.projectId)
    }

    return payment
  })

  return NextResponse.json(payment, { status: 201 })
}

// DELETE /api/payments/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params

  // Obtener allocations antes de eliminar (para recalcular después)
  const payment = await db.payment.findUnique({
    where: { id },
    include: { allocations: { select: { projectId: true } } },
  })

  if (!payment) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  }

  // Eliminar pago (CASCADE elimina allocations)
  await db.payment.delete({ where: { id } })

  // ✅ Recalcular balance de proyectos afectados
  const projectIds = [...new Set(payment.allocations.map((a) => a.projectId))]
  await recalculateMultipleBalances(projectIds)

  return NextResponse.json({ success: true })
}
```

---

#### **Fase 4: Queries Optimizadas**

**ANTES:**

```typescript
// app/api/projects/route.ts (ANTES)
const projects = await db.project.findMany({
  include: { paymentAllocations: true }
})

// Calcular balance client-side
const projectsWithBalance = projects.map(p => ({
  ...p,
  balance: p.total - p.paymentAllocations.reduce(...)
}))

// Filtrar client-side
const withBalance = projectsWithBalance.filter(p => p.balance > 0)
```

**DESPUÉS:**

```typescript
// app/api/projects/route.ts (DESPUÉS)
const projects = await db.project.findMany({
  where: {
    balance: { gt: 0 }, // ✅ Filtrado en DB
  },
  orderBy: {
    balance: 'desc', // ✅ Ordenar por balance
  },
  select: {
    id: true,
    projectNumber: true,
    balance: true, // ✅ Ya calculado
    // No necesitas paymentAllocations
  },
})

// ✅ Sin cálculos adicionales
return NextResponse.json({ projects })
```

**Beneficios:**

- ✅ Query 10x más rápida (sin JOIN a paymentAllocations)
- ✅ Filtrado en DB (escala a millones de registros)
- ✅ Ordenamiento en DB (usa índices)

---

#### **Fase 5: Migración Inicial**

```typescript
// scripts/migrate-balances.ts (CREAR)
import { recalculateAllBalances } from '@/lib/business-logic/project-balance'

async function main() {
  console.log('🚀 Iniciando migración de balances...')
  await recalculateAllBalances()
  console.log('✅ Migración completada')
}

main()
  .catch(console.error)
  .finally(() => process.exit())
```

```bash
# Ejecutar una vez después de agregar el campo
npm run db:push
npx tsx scripts/migrate-balances.ts
```

---

### 📋 Plan de Acción

| Fase | Tarea                                | Tiempo | Archivo                                 |
| ---- | ------------------------------------ | ------ | --------------------------------------- |
| 1    | Agregar campo `balance` a schema     | 30 min | `prisma/schema.prisma`                  |
| 2    | Implementar función de recalculo     | 1 hr   | `lib/business-logic/project-balance.ts` |
| 3    | Actualizar API de payments           | 1 hr   | `app/api/payments/route.ts`             |
| 4    | Actualizar API de projects (queries) | 1 hr   | `app/api/projects/route.ts`             |
| 5    | Script de migración                  | 30 min | `scripts/migrate-balances.ts`           |
| 6    | Tests de recalculo                   | 1 hr   | `lib/business-logic/__tests__/...`      |

**Total:** 1 día

**Cuándo implementar:**

- ⚠️ **Ahora:** Si ya tienes >1000 proyectos
- ✅ **Pronto:** Si esperas crecer a >1000 proyectos en 3-6 meses
- ⏳ **Después:** Si estás en fase MVP (<100 proyectos)

---

## 2. Campos Legacy Redundantes

### 📊 Estado Actual

**Schema:**

```prisma
model Project {
  // ❌ Redundancia 1: total vs totalAmount
  total           Decimal  @db.Decimal(12, 2)
  totalAmount     Decimal? @db.Decimal(12, 2) // ← Mismo valor que total

  // ❌ Redundancia 2: projectStatusId vs projectStatusLegacy
  projectStatusId    String?
  projectStatusLegacy String @default("") // ← Campo viejo
}
```

### 🔥 Impacto

**Problemas:**

1. ❌ **Confusión:** ¿Usar `total` o `totalAmount`?
2. ❌ **Bugs:** Si actualizas uno pero no el otro
3. ❌ **Storage:** Espacio desperdiciado
4. ❌ **Migración:** Proyectos viejos usan `projectStatusLegacy` (String), nuevos usan FK

### 💡 Solución

#### **Migración 1: Eliminar `totalAmount`**

```typescript
// scripts/migrate-remove-total-amount.ts
import { db } from '@/lib/db'

async function main() {
  // 1. Verificar que todos los proyectos tengan total === totalAmount
  const projects = await db.project.findMany({
    select: { id: true, total: true, totalAmount: true },
  })

  const inconsistent = projects.filter(
    (p) => p.totalAmount && Math.abs(Number(p.total) - Number(p.totalAmount)) > 0.01
  )

  if (inconsistent.length > 0) {
    console.error(`❌ ${inconsistent.length} proyectos inconsistentes:`)
    console.error(inconsistent)
    throw new Error('Corregir manualmente antes de migrar')
  }

  console.log('✅ Todos los proyectos son consistentes')

  // 2. Eliminar columna del schema
  // (ejecutar después de verificar)
}

main()
```

```prisma
// prisma/schema.prisma (DESPUÉS DE VERIFICAR)
model Project {
  total           Decimal  @db.Decimal(12, 2)
  // totalAmount eliminado ✅
}
```

```bash
npx tsx scripts/migrate-remove-total-amount.ts
npx prisma migrate dev --name remove-total-amount
```

---

#### **Migración 2: Eliminar `projectStatusLegacy`**

**Paso 1: Migrar proyectos legacy**

```typescript
// scripts/migrate-project-status.ts
import { db } from '@/lib/db'

async function main() {
  // 1. Obtener proyectos con status legacy
  const legacyProjects = await db.project.findMany({
    where: {
      projectStatusLegacy: { not: '' },
      projectStatusId: null,
    },
  })

  console.log(`Encontrados ${legacyProjects.length} proyectos legacy`)

  // 2. Mapping de legacy strings a nuevos IDs
  const statusMapping: Record<string, string> = {
    'En Proceso': 'uuid-en-proceso',
    Finalizado: 'uuid-finalizado',
    Presupuesto: 'uuid-presupuesto',
    // ... agregar todos los mappings
  }

  // 3. Crear estados faltantes
  for (const [legacyName, newId] of Object.entries(statusMapping)) {
    const exists = await db.projectStatus.findUnique({ where: { id: newId } })
    if (!exists) {
      await db.projectStatus.create({
        data: {
          id: newId,
          name: legacyName,
          order: 0,
          colorId: 'default-color-id',
          isInitial: false,
          isFinal: false,
        },
      })
    }
  }

  // 4. Migrar proyectos
  for (const project of legacyProjects) {
    const newStatusId = statusMapping[project.projectStatusLegacy]

    if (!newStatusId) {
      console.warn(`⚠️ Status legacy desconocido: ${project.projectStatusLegacy}`)
      continue
    }

    await db.project.update({
      where: { id: project.id },
      data: {
        projectStatusId: newStatusId,
        projectStatusLegacy: '', // Limpiar
      },
    })
  }

  console.log('✅ Migración completada')
}

main()
```

**Paso 2: Eliminar campo**

```prisma
// prisma/schema.prisma (DESPUÉS DE MIGRAR)
model Project {
  projectStatusId    String // Ahora requerido (not null)
  projectStatus      ProjectStatus @relation(...)
  // projectStatusLegacy eliminado ✅
}
```

```bash
npx tsx scripts/migrate-project-status.ts
npx prisma migrate dev --name remove-legacy-status
```

---

### 📋 Plan de Acción

| Migración              | Tiempo | Riesgo | Cuándo                    |
| ---------------------- | ------ | ------ | ------------------------- |
| Eliminar `totalAmount` | 2 hrs  | Bajo   | Sprint próximo            |
| Migrar status legacy   | 4 hrs  | Medio  | Después de tests robustos |

---

## 3. Validaciones Zod No Usadas en API

### 📊 Estado Actual

**Validations definidas:**

```typescript
// lib/validations/project-validations.ts
export const projectFormSchema = z.object({
  customerId: z.string().uuid(),
  projectNumber: z.string().min(1),
  // ... 15+ campos validados
})
```

**API routes:**

```typescript
// app/api/projects/route.ts:191-221 (POST)
export async function POST(request: Request) {
  const body = await request.json()

  // ❌ Validación manual, NO usa Zod
  if (!body.customerId) {
    return NextResponse.json({ error: 'Cliente es requerido' }, { status: 400 })
  }

  if (!body.projectNumber) {
    return NextResponse.json({ error: 'Número de proyecto requerido' }, { status: 400 })
  }

  // ... 30+ líneas de validación manual
}
```

**Problemas:**

1. ❌ **Código duplicado:** Zod + validación manual
2. ❌ **Inconsistencia:** Validación frontend ≠ backend
3. ❌ **Mantenimiento:** Cambiar validación = tocar 2 lugares
4. ❌ **Errores:** Fácil olvidar agregar validación en uno de los lugares

### 💡 Solución

```typescript
// app/api/projects/route.ts (CORREGIDO)
import { projectFormSchema } from '@/lib/validations/project-validations'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // ✅ Usar Zod para validar
    const validated = projectFormSchema.parse(body)

    // Crear proyecto con datos validados
    const project = await db.project.create({
      data: validated,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    // ✅ Manejar errores de validación Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validación fallida',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Error genérico
    console.error('Error creando proyecto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

**Beneficios:**

- ✅ Single source of truth: 1 schema para frontend + backend
- ✅ Menos código: ~50 líneas menos por endpoint
- ✅ Errores consistentes
- ✅ Type-safe: TypeScript infiere tipos de Zod

**Esfuerzo:** 2-3 horas para migrar todas las APIs

---

## 4. Error Handling Inconsistente

### 📊 Estado Actual

**Patrón 1: Console.error**

```typescript
// app/api/projects/route.ts:280
catch (error) {
  console.error('Error creating project:', error)
  return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
}
```

**Patrón 2: Toast en frontend**

```typescript
// app/projects/page.tsx:62
catch (error) {
  console.error('Error:', error)
  toast.error('Error al cargar proyectos')
}
```

**Problemas:**

1. ❌ **Sin logging estructurado:** No puedes buscar errores
2. ❌ **Sin context:** ¿Qué usuario? ¿Qué proyecto?
3. ❌ **Sin monitoring:** No sabes cuando algo falla en producción
4. ❌ **Mensajes genéricos:** "Error al crear proyecto" no ayuda a debuggear

### 💡 Solución Mínima (Sin Librerías Externas)

```typescript
// lib/logger.ts (CREAR)
interface LogContext {
  userId?: string
  projectId?: string
  customerId?: string
  [key: string]: any
}

export class Logger {
  static error(message: string, error: Error, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      env: process.env.NODE_ENV,
    }

    // En desarrollo: console.error con formato
    if (process.env.NODE_ENV === 'development') {
      console.error('🔴 ERROR:', message)
      console.error('Details:', error)
      if (context) console.error('Context:', context)
    }

    // En producción: log estructurado (JSON)
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify(logEntry))
      // Futuro: enviar a Sentry, DataDog, etc.
    }
  }

  static warn(message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context,
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ WARNING:', message, context)
    }

    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify(logEntry))
    }
  }

  static info(message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ INFO:', message, context)
    }

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry))
    }
  }
}
```

**Uso:**

```typescript
// app/api/projects/route.ts (MEJORADO)
import { Logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = projectFormSchema.parse(body)

    const project = await db.project.create({ data: validated })

    Logger.info('Proyecto creado', {
      projectId: project.id,
      projectNumber: project.projectNumber,
      customerId: project.customerId,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    Logger.error('Error creando proyecto', error as Error, {
      customerId: body?.customerId,
      requestBody: body,
    })

    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
  }
}
```

**Esfuerzo:** 1 día para agregar logging a todas las APIs

---

## 🎯 Resumen P2

| Mejora                        | Impacto                        | Cuándo Implementar     | Esfuerzo |
| ----------------------------- | ------------------------------ | ---------------------- | -------- |
| Campo `balance` denormalizado | Queries 10x más rápidas        | Cuando >1000 proyectos | 1 día    |
| Eliminar campos legacy        | Menos confusión, menos storage | Próximo sprint         | 6 hrs    |
| Usar Zod en APIs              | Single source of truth         | Próximo sprint         | 3 hrs    |
| Logger estructurado           | Debugging más fácil            | Antes de producción    | 1 día    |

**Total estimado:** 3-4 días de trabajo

**ROI a largo plazo:**

- Performance escalable
- Codebase más limpio
- Debugging más rápido
- Menos sorpresas en producción
