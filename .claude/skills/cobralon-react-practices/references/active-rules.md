# Reglas Activas — Detalle con Ejemplos

Cada regla incluye el problema detectado en Cobralon, ejemplo before/after con codigo real del proyecto, y archivos donde aplicar.

---

## 1. `async-defer-await` — Mover await despues de validaciones

**Impacto:** HIGH — evita bloquear rutas de codigo que retornan temprano

**Problema en Cobralon:** API routes que hacen await para obtener datos antes de validar que los parametros de entrada son correctos. Si la validacion falla, el await fue innecesario.

**Antes:**
```typescript
// app/api/projects/[id]/route.ts
export const PUT = withLogging(async (request, logger, context) => {
  const { id } = await context.params
  const body = await request.json()

  // Busca en DB ANTES de validar el body
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  // Validaciones que podrian haber fallado antes del await
  if (!body.projectStatusId && !body.date) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  // ... actualizar proyecto
})
```

**Despues:**
```typescript
export const PUT = withLogging(async (request, logger, context) => {
  const { id } = await context.params
  const body = await request.json()

  // Validar PRIMERO, antes de ir a la DB
  if (!body.projectStatusId && !body.date) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  // ... actualizar proyecto
})
```

**Archivos objetivo:**
- `app/api/payments/route.ts` — POST valida despues de multiples awaits
- `app/api/projects/[id]/route.ts` — PUT/DELETE
- `app/api/aftersales/[id]/route.ts` — PUT
- `app/api/customers/[id]/route.ts` — PUT

---

## 2. `async-suspense` — Agregar Suspense boundaries

**Impacto:** HIGH — permite streaming de contenido, la pagina se muestra mas rapido

**Problema en Cobralon:** 0 usos de `<Suspense>` en pages principales. Todo el contenido se bloquea hasta que termina el prefetch.

**Estado actual:**
```typescript
// app/projects/page.tsx
export default async function ProjectsPage() {
  const queryClient = new QueryClient()

  // BLOQUEA toda la pagina hasta que terminen AMBOS prefetches
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['projects', ...], queryFn: getInitialProjects }),
    queryClient.prefetchQuery({ queryKey: ['project-statuses'], queryFn: getProjectStatuses }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsPageClient />
    </HydrationBoundary>
  )
}
```

**Con Suspense:**
```typescript
import { Suspense } from 'react'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'

// El layout se muestra inmediatamente, los datos se "streamean"
export default function ProjectsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <ProjectsPageContent />
    </Suspense>
  )
}

// Componente async separado que hace el fetch
async function ProjectsPageContent() {
  const queryClient = new QueryClient()

  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['projects', ...], queryFn: getInitialProjects }),
    queryClient.prefetchQuery({ queryKey: ['project-statuses'], queryFn: getProjectStatuses }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsPageClient />
    </HydrationBoundary>
  )
}
```

**Archivos objetivo:**
- `app/projects/page.tsx`
- `app/customer/page.tsx`
- `app/payments/page.tsx`
- `app/visits/page.tsx`
- `app/aftersales/page.tsx`

**Nota:** Requiere crear un componente Skeleton reutilizable para DataTable.

---

## 3. `bundle-dynamic` — Dynamic imports para componentes pesados

**Impacto:** HIGH — reduce JavaScript inicial enviado al browser

**Problema en Cobralon:** 0 usos de `next/dynamic`. Todos los Client Components se importan estaticamente, incluyendo dialogos y formularios complejos que solo se renderizan on-demand.

**Antes:**
```typescript
// app/projects/page-client.tsx
import { NewProjectDialog } from '@/components/dialogs/projects/new-project-dialog'
import { AlertDialog, AlertDialogAction, ... } from '@/components/ui/alert-dialog'

// Todo el codigo de NewProjectDialog se incluye en el bundle inicial
// aunque el usuario nunca abra el dialogo
```

**Despues:**
```typescript
import dynamic from 'next/dynamic'

const NewProjectDialog = dynamic(
  () => import('@/components/dialogs/projects/new-project-dialog').then(m => m.NewProjectDialog),
  { ssr: false }
)
```

**Candidatos a dynamic import (solo se renderizan bajo interaccion):**
- Dialogos: `NewProjectDialog`, `NewPaymentDialog`, `NewCustomerDialog`, etc.
- Calendarios: `app/calendar/page.tsx` y componentes de FullCalendar
- Formularios complejos dentro de dialogos
- `AlertDialog` cuando se usa para confirmaciones on-demand

**NO aplicar a:**
- DataTable (se renderiza siempre en viewport)
- AppLayout/Sidebar (estructura principal)
- Componentes que se muestran en el render inicial

---

## 4. `server-select` — Usar select en vez de include en SSR

**Impacto:** MEDIUM — reduce tamano del HTML inicial y payload de serializacion

**Problema en Cobralon:** Server Components usan `include` que trae todos los campos del modelo, aunque solo se usen algunos en la tabla.

**Antes:**
```typescript
// app/projects/page.tsx — getInitialProjects
prisma.project.findMany({
  include: {
    customer: { select: { id: true, name: true, phone: true } },
    projectStatus: { select: { id: true, name: true, isFinal: true, color: { select: { id: true, bgClass: true } } } },
  },
})
// Trae TODOS los campos de Project (description, squareMeters, apartment, etc.)
// que la tabla NO muestra
```

**Despues:**
```typescript
prisma.project.findMany({
  select: {
    id: true,
    projectNumber: true,
    projectName: true,
    date: true,
    total: true,
    balance: true,
    currency: true,
    totalAmount: true,
    customer: { select: { id: true, name: true, phone: true } },
    projectStatus: { select: { id: true, name: true, isFinal: true, color: { select: { bgClass: true } } } },
  },
})
// Solo los campos que realmente usa la DataTable
```

**Archivos objetivo:**
- `app/projects/page.tsx` — `getInitialProjects()`
- `app/customer/page.tsx` — `getInitialCustomers()` (ya usa select, bien)
- `app/payments/page.tsx` — `getInitialPayments()`
- `app/visits/page.tsx` — `getInitialVisits()`
- `app/aftersales/page.tsx` — `getInitialAftersales()`

---

## 5. `rerender-transitions` — useTransition para filtros

**Impacto:** HIGH — mejora interactividad, evita que la UI se congele durante filtrado

**Problema en Cobralon:** 0 usos de `useTransition`. Filtros de DataTable usan setState directo que puede bloquear el input.

**Antes:**
```typescript
// app/projects/page-client.tsx
const handleSearchChange = (search: string) => {
  setSearchTerm(search)  // Bloquea si hay re-render pesado
  if (pagination.pageIndex !== 0) {
    setPagination({ ...pagination, pageIndex: 0 })
  }
}
```

**Despues:**
```typescript
import { useTransition } from 'react'

const [isPending, startTransition] = useTransition()

const handleSearchChange = (search: string) => {
  setSearchTerm(search) // Input se actualiza inmediatamente (urgente)
  startTransition(() => {
    // Re-render de la tabla es no-urgente
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  })
}

// Usar isPending para mostrar indicador visual
<DataTable loading={isLoading || isPending} ... />
```

**Archivos objetivo:**
- `app/projects/page-client.tsx` — filtros de search, status, projectState
- `app/payments/page-client.tsx` — filtros de search, type, method
- `app/customer/page-client.tsx` — filtro de search
- `app/visits/page-client.tsx` — filtros de search, status
- `app/aftersales/page-client.tsx` — filtros

---

## 6. `rerender-derived-state` — Calcular en render, no en effect

**Impacto:** MEDIUM — reduce re-renders, elimina eslint-disable

**Problema en Cobralon:** `customerProjects` es un estado que replica `projects` prop con un useEffect.

**Antes:**
```typescript
// components/forms/payments/payment-to-customer-form.tsx
const [customerProjects, setCustomerProjects] = useState<CustomerProjectForAllocation[]>([])

useEffect(() => {
  if (projects && projects.length > 0) {
    setCustomerProjects(projects)
    const initialAllocations = projects.map((project) => ({
      projectId: project.id,
      allocatedAmount: 0,
    }))
    replace(initialAllocations)
  } else {
    setCustomerProjects([])
    replace([])
  }
}, [projects, replace])
```

**Despues:**
```typescript
// El estado derivado se calcula directamente — no necesita useState + useEffect
const customerProjects = projects ?? []

// Sincronizar allocations via useEffect solo para el side effect de replace()
useEffect(() => {
  if (projects && projects.length > 0) {
    replace(projects.map((project) => ({
      projectId: project.id,
      allocatedAmount: 0,
    })))
  } else {
    replace([])
  }
}, [projects, replace])
```

**Archivos con este patron:**
- `components/forms/payments/payment-to-customer-form.tsx`
- Buscar en formularios que usen `useState` + `useEffect` para sincronizar props

---

## 7. `rerender-event-handlers` — Logica en handlers, no en effects

**Impacto:** MEDIUM — reduce complejidad, elimina eslint-disable

**Problema en Cobralon:** useEffect con `eslint-disable-next-line react-hooks/exhaustive-deps` que reacciona a cambios de monto para recalcular FIFO. Esto deberia ser un event handler.

**Antes:**
```typescript
// components/forms/payments/payment-to-customer-form.tsx:200
useEffect(() => {
  if (distributionMode === 'fifo' && watchedAmount > 0 && customerProjects.length > 0 && fields.length > 0) {
    handleCalculateFIFO()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [watchedAmount, distributionMode])
```

**Despues:**
```typescript
// El recalculo FIFO se dispara cuando el usuario cambia el monto o el modo
// No necesita un effect — es una reaccion a un evento del usuario

const handleAmountChange = (newAmount: number) => {
  form.setValue('amount', newAmount)
  if (distributionMode === 'fifo' && newAmount > 0 && customerProjects.length > 0) {
    recalculateFIFO(newAmount)
  }
}

const handleDistributionModeChange = (mode: DistributionMode) => {
  setDistributionMode(mode)
  if (mode === 'fifo' && watchedAmount > 0 && customerProjects.length > 0) {
    recalculateFIFO(watchedAmount)
  }
}
```

**Archivos con `eslint-disable react-hooks/exhaustive-deps`:**
- `components/forms/payments/payment-to-customer-form.tsx:209`
- `components/forms/calendar/aftersale-event-form.tsx:187`
- `components/forms/aftersales/aftersale-form.tsx:126`
- `components/forms/projects/project-form.tsx:152`
- `components/forms/calendar/project-event-form.tsx:220`
- `components/forms/calendar/visit-event-form.tsx:155`
- `components/settings/status-configuration-page.tsx:78`
- `app/settings/payments/page.tsx:160`

**Evaluacion caso por caso:** No todos los eslint-disable son problematicos — algunos son effects legitimos con deps parciales. Revisar cada uno individualmente.

---

## 8. `rerender-clean-deps` — Corregir dependency arrays

**Impacto:** MEDIUM — previene bugs sutiles y comportamiento impredecible

**Problema en Cobralon:** 8 usos de `eslint-disable-next-line react-hooks/exhaustive-deps`. Cada uno indica un dependency array incorrecto.

**Estrategia de correccion:**

1. **Si el effect solo necesita ejecutarse en mount** → Considerar si realmente necesita ser un effect
2. **Si falta una dependencia que causa loops** → Extraer la funcion con useCallback o mover logica a un event handler
3. **Si la dependencia cambia pero no deberia disparar el effect** → Usar useRef para el valor transitorio

**No se debe:**
- Agregar `eslint-disable` adicionales
- Ignorar el warning sin entender por que existe
- Agregar todas las dependencias mecanicamente si causa loops

---

## 9. `rerender-clean-memo` — Eliminar memoizacion innecesaria

**Impacto:** LOW-MEDIUM — reduce complejidad del codigo, mejora legibilidad

**Problema en Cobralon:** ~18 useCallback y ~10 useMemo innecesarios que wrappean:
- Expresiones simples con resultado primitivo
- Funciones que no se pasan como props a componentes memoizados
- Callbacks que se pasan a elementos HTML nativos (no a React.memo)

**Antes:**
```typescript
// Innecesario: handleExportClick no se pasa a componente memoizado
const handleExportClick = useCallback(() => {
  if (hasActiveFilters) {
    setShowExportDialog(true)
  } else {
    handleExport()
  }
}, [hasActiveFilters, handleExport])

// Innecesario: paymentMethods ya es estable via React Query
const paymentMethods = useMemo(
  () => paymentMethodsData || EMPTY_PAYMENT_METHODS,
  [paymentMethodsData]
)
```

**Despues:**
```typescript
// Funcion directa — no hay consumidor memoizado
const handleExportClick = () => {
  if (hasActiveFilters) {
    setShowExportDialog(true)
  } else {
    handleExport()
  }
}

// Operador ?? es suficiente — no necesita memoizacion
const paymentMethods = paymentMethodsData ?? EMPTY_PAYMENT_METHODS
```

**Regla para decidir:**
- **Mantener useCallback** SI: se pasa como prop a un componente con React.memo, o esta en el dependency array de un useEffect
- **Mantener useMemo** SI: el calculo es costoso (O(n) con n > 100, operaciones complejas)
- **Eliminar** SI: wrappea expresiones simples, comparaciones, o fallbacks con ??/||

---

## 10. `rendering-conditional` — Ternario en vez de &&

**Impacto:** LOW — previene bugs de render de valores falsy

**Problema en Cobralon:** 25 usos de `&& <Component />` que pueden renderizar `0` o `""` en pantalla.

**Antes:**
```typescript
// Puede renderizar "0" como texto si count es 0
{count && <Badge>{count}</Badge>}

// Puede renderizar "" como texto si name es string vacio
{name && <span>{name}</span>}
```

**Despues:**
```typescript
// Ternario explicito — siempre renderiza null o el componente
{count > 0 ? <Badge>{count}</Badge> : null}

// O con Boolean() para forzar evaluacion booleana
{Boolean(name) && <span>{name}</span>}

// Para booleanos reales, && es correcto
{isOpen && <Dialog />}  // OK — isOpen es boolean
```

**Regla:** Solo usar `&&` cuando la expresion de la izquierda es estrictamente booleana. En todos los demas casos, usar ternario.

---

## 11. `rendering-hoist-jsx` — Extraer JSX estatico

**Impacto:** LOW — evita recreacion innecesaria de objetos JSX

**Antes:**
```typescript
function ProjectsPageClient() {
  // Se recrea en cada render
  const projectStateFilterOptions = [
    { label: 'Activo', value: 'Activo', bgClass: 'bg-green-050' },
    { label: 'Finalizado', value: 'Finalizado', bgClass: 'bg-blue-050' },
  ]

  return <DataTable filterOptions={projectStateFilterOptions} ... />
}
```

**Despues:**
```typescript
// Fuera del componente — se crea una sola vez
const PROJECT_STATE_FILTER_OPTIONS = [
  { label: 'Activo', value: 'Activo', bgClass: 'bg-green-050' },
  { label: 'Finalizado', value: 'Finalizado', bgClass: 'bg-blue-050' },
] as const

function ProjectsPageClient() {
  return <DataTable filterOptions={PROJECT_STATE_FILTER_OPTIONS} ... />
}
```

**Candidatos:** Configuraciones de columnas, opciones de filtro estaticas, arrays de opciones fijas.

---

## 12. `rendering-content-visibility` — CSS para listas largas

**Impacto:** MEDIUM — evita renderizar filas fuera del viewport

**Aplicar en global.css:**
```css
/* Optimizacion: No renderizar filas de tabla fuera del viewport */
.data-table-row {
  content-visibility: auto;
  contain-intrinsic-size: auto 48px; /* Altura estimada de fila */
}
```

**Nota:** Solo aplicar si las tablas muestran 50+ filas. Con paginacion server-side de 50 registros, el beneficio es minimo. Considerar para vistas sin paginacion como settings o reportes.
