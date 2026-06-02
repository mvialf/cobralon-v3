# Patrones Críticos: Async Waterfalls y Bundle Size

Las dos categorías de mayor impacto en performance. Combina reglas adaptadas de las guías Vercel con issues concretos de Cobralon.

---

## Async Waterfalls

### Paralelizar queries independientes

**Impacto:** CRITICAL
**Aplica a:** `app/api/*/route.ts`
**Estado:** ✅ Implementado — GET endpoints con Promise.all, POST payments con patrón defer

Cuando las queries Prisma son independientes, suele convenir ejecutarlas en paralelo con `Promise.all`.

#### Correcto (implementado en payments POST con patrón defer)

```typescript
// app/api/payments/route.ts:345-354
// ✅ Defer: iniciar queries antes de validaciones sync
const dbQueriesPromise = Promise.all([
  prisma.customer.findUnique({ where: { id: customerId } }),
  prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } }),
  prisma.project.findMany({ where: { id: { in: projectIds } } }),
])

// Validaciones sync mientras queries corren en paralelo...
// ...

// Await solo cuando se necesitan los resultados
const [customerExists, paymentMethod, projects] = await dbQueriesPromise
```

### Defer await hasta donde se necesite

**Impacto:** CRITICAL
**Aplica a:** `app/api/*/route.ts`
**Estado:** ⚠️ Pendiente

Iniciar promises al principio del handler, hacer await solo cuando se necesite el valor. Permite que las queries corran mientras se procesa otra lógica.

#### Incorrecto

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  // ❌ await inmediato bloquea hasta resolver
  const customer = await prisma.customer.findUnique({ where: { id: body.customerId } })

  // Validaciones que no necesitan el resultado de la query
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  // Ahora sí necesitamos customer
  if (!customer) { /* ... */ }
}
```

#### Correcto

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()

  // ✅ Iniciar promise sin await
  const customerPromise = prisma.customer.findUnique({ where: { id: body.customerId } })

  // Validaciones síncronas mientras la query corre
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  // Await solo cuando necesitemos el resultado
  const customer = await customerPromise
  if (!customer) { /* ... */ }
}
```

**Cuándo aplicar:** Cuando hay validaciones síncronas (formato, rango, campos requeridos) antes de necesitar datos de la DB.

### Suspense boundaries para streaming

**Impacto:** CRITICAL
**Aplica a:** `app/*/page.tsx`
**Estado:** ⚠️ Pendiente

Usar `<Suspense>` en Server Components para streaming de contenido pesado. Permite enviar el shell de la página mientras los datos se cargan.

#### Incorrecto

```typescript
// app/customer/page.tsx
// ❌ Todo el prefetch bloquea el render completo
export default async function CustomersPage() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['customers', { page: 1, limit: 50 }],
    queryFn: getInitialCustomers,
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomersPageClient />
    </HydrationBoundary>
  )
}
```

#### Correcto

```typescript
// ✅ Suspense permite streaming del shell mientras carga datos
import { Suspense } from 'react'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'

export default function CustomersPage() {
  return (
    <AppLayout pageTitle="Clientes">
      <Suspense fallback={<DataTableSkeleton columns={5} rows={10} />}>
        <CustomersData />
      </Suspense>
    </AppLayout>
  )
}

async function CustomersData() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({ /* ... */ })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomersPageClient />
    </HydrationBoundary>
  )
}
```

**Beneficio:** El usuario ve el layout inmediatamente. La tabla se streama cuando los datos están listos.

---

## Bundle Size

### Dynamic imports para componentes pesados

**Impacto:** CRITICAL
**Aplica a:** `components/`, `app/`
**Estado:** ⚠️ Pendiente — no se usa `next/dynamic` en el proyecto

Componentes que no se renderizan al cargar la página son candidatos a `next/dynamic`, especialmente si arrastran dependencias pesadas.

#### Incorrecto

```typescript
// ❌ Dialog de importación Excel se incluye en el bundle inicial
import { ImportExcelDialog } from '@/components/dialogs/import-excel-dialog'

export function CustomersPageClient() {
  const [showImport, setShowImport] = useState(false)
  return (
    <>
      <DataTable />
      <ImportExcelDialog open={showImport} onOpenChange={setShowImport} />
    </>
  )
}
```

#### Correcto

```typescript
import dynamic from 'next/dynamic'

// ✅ Se carga solo cuando el usuario abre el dialog
const ImportExcelDialog = dynamic(
  () => import('@/components/dialogs/import-excel-dialog').then(m => ({ default: m.ImportExcelDialog })),
  { ssr: false }
)

export function CustomersPageClient() {
  const [showImport, setShowImport] = useState(false)
  return (
    <>
      <DataTable />
      {showImport && <ImportExcelDialog open={showImport} onOpenChange={setShowImport} />}
    </>
  )
}
```

**Candidatos para dynamic import en Cobralon:**
- Diálogos de importación/exportación Excel
- Componentes de captura (capture-dialog)
- Cualquier dialog/modal que requiera librerías pesadas

### Defer third-party libs

**Impacto:** CRITICAL
**Aplica a:** `lib/excel/*.ts`
**Estado:** ⚠️ Verificar

Antes de optimizar `xlsx`, verifica imports en código productivo y en tests por separado. Un import estático en tests no implica impacto en el bundle productivo; un import productivo solo importa para bundle size si llega al grafo client o al camino inicial que se está midiendo.

#### Incorrecto

```typescript
// Ejemplo hipotético: parser Excel alcanzable por el bundle inicial
// ⚠️ Import estático — verificar si este módulo llega al bundle client/inicial
import * as XLSX from 'xlsx'

export function parseProjectExcel(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' })
  // ...
}
```

#### Correcto

```typescript
// lib/excel/project-parser.ts
// ✅ Import dinámico — xlsx se carga solo cuando se llama la función
export async function parseProjectExcel(buffer: ArrayBuffer) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array' })
  // ...
}
```

**Alternativa:** Si los parsers se alcanzan solo detrás de un componente cargado con `next/dynamic`, puede ser suficiente para el bundle inicial. El import dinámico en el parser agrega protección, pero conviene confirmarlo con bundle analyzer o trazas reales.

### Named imports (no barrel *)

**Impacto:** CRITICAL
**Aplica a:** Todo el codebase
**Estado:** ✅ Implementado

Ya documentado en [established-patterns.md](established-patterns.md#named-imports). Preferir este patrón cuando mantenga el tree-shaking efectivo.

```typescript
// ✅ Tree-shakeable
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

// ❌ Incluye todo el módulo
import * as Icons from 'lucide-react'
```

### Conditional module loading

**Impacto:** HIGH
**Aplica a:** Módulos con dependencias pesadas
**Estado:** ⚠️ Pendiente

Cargar módulos solo cuando una condición se cumple.

#### Incorrecto

```typescript
// ❌ Se carga siempre aunque la feature flag esté off
import { HeavyChart } from '@/components/charts/heavy-chart'

export function Dashboard({ showCharts }: { showCharts: boolean }) {
  return showCharts ? <HeavyChart /> : <p>Charts desactivados</p>
}
```

#### Correcto

```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/charts/heavy-chart'))

export function Dashboard({ showCharts }: { showCharts: boolean }) {
  // ✅ Solo se carga el chunk si showCharts es true
  return showCharts ? <HeavyChart /> : <p>Charts desactivados</p>
}
```
