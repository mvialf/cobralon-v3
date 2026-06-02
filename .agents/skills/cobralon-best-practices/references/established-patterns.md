# Patrones Existentes en Cobralon

Patrones presentes en el proyecto que pueden servir como punto de partida. Verifica que el caso actual tenga el mismo perfil de performance antes de copiarlos; no los preserves si generan waterfalls, renders innecesarios, bundle extra o serialización excesiva.

## Server/Client Split con HydrationBoundary

**Aplica a:** `app/*/page.tsx`
**Estado:** ✅ Implementado en todas las páginas principales

El proyecto separa Server Components (data fetching + prefetch) de Client Components (interactividad).

```typescript
// app/customer/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { CustomersPageClient } from './page-client'

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

**Qué verificar antes de copiar:**
- `page.tsx` como Server Component con prefetch cuando la hidratación aporte valor
- `page-client.tsx` como Client Component con `'use client'`
- HydrationBoundary para pasar datos pre-fetched
- El hook de React Query en page-client reutiliza la misma queryKey

**Páginas que siguen este patrón:** customers, projects, payments, visits, aftersales.

## Promise.all en GET Endpoints

**Aplica a:** `app/api/*/route.ts` (funciones GET)
**Estado:** ✅ Implementado en 7+ endpoints

```typescript
// app/api/customers/route.ts:46-50
const [total, customers] = await Promise.all([
  prisma.customer.count({ where: whereCondition }),
  prisma.customer.findMany({
    where: whereCondition,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  }),
])
```

**Qué verificar antes de copiar:**
- Preferir paralelizar count + findMany en endpoints paginados cuando sean independientes
- Usar destructuring del array para nombrar resultados
- Si hay más queries independientes (ej: facets, aggregations), incluirlas en el mismo Promise.all

## Named Imports

**Aplica a:** Todo el codebase
**Estado:** ✅ Implementado

```typescript
// ✅ Correcto — named imports
import { Pencil, Trash2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCustomers } from '@/hooks/queries/use-customers'

// ❌ Incorrecto — barrel/wildcard imports
import * as Icons from 'lucide-react'
import * as UI from '@/components/ui'
```

**Qué verificar antes de copiar:**
- Importar solo lo que se usa
- Evitar `import *` salvo namespaces necesarios (ej: `import * as React`)
- Imports de lucide-react nombrados cuando el tree-shaking lo aprovecha

## Barrel Files Selectivos

**Aplica a:** `components/*/index.ts`
**Estado:** ✅ Implementado para componentes complejos

```typescript
// components/data-table/index.ts
export { DataTable, type ServerFacet, type ServerFacets } from './data-table'
export { DataTableColumnHeader } from './data-table-column-header'
export { DataTableDropdown } from './data-table-dropdown'
export { type BulkAction } from './data-table-bulk-actions'
export { createSelectColumn } from './columns/select-column'
export { createNormalizedFilter } from './filter-functions'
```

**Qué verificar antes de copiar:**
- Barrel files solo para APIs públicas de componentes complejos (data-table, capture-dialog, tag-system)
- Named exports explícitos; evitar `export *`
- Importar desde el barrel: `import { DataTable } from '@/components/data-table'`

## React Hook Form + Zod

**Aplica a:** `components/forms/*/`
**Estado:** ✅ Implementado en todos los formularios

```typescript
// components/forms/customer/customer-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { customerSchema, type CustomerFormData } from '@/lib/validations/customer-validations'

const form = useForm<CustomerFormData>({
  resolver: zodResolver(customerSchema),
  defaultValues: {
    name: defaultValues?.name || '',
    phone: normalizePhone(defaultValues?.phone || ''),
    email: defaultValues?.email || '',
  },
})
```

**Qué verificar antes de copiar:**
- Schemas de validación en `lib/validations/`
- `zodResolver` como puente entre Zod y React Hook Form
- FormField + FormControl + FormMessage de shadcn/ui
- defaultValues explícitos cuando eviten estados no controlados o renders correctivos

## Composición de Campos de Formulario

**Aplica a:** Formularios complejos con múltiples secciones
**Estado:** ✅ Implementado en ProjectForm

```typescript
// components/forms/projects/project-form.tsx
<ProjectFinancialFields control={form.control} currency={form.watch('currency')} />
<AddressFields control={form.control} defaultRegion={configuration.region} />
<ProjectDetailsFields control={form.control} />
<UninstallTagsFields control={form.control} />
```

**Qué verificar antes de copiar:**
- Sub-componentes reciben `control` del form padre
- Cada sección es un componente reutilizable
- forwardRef + useImperativeHandle para exponer submit/reset al padre

## useFieldArray para Campos Dinámicos

**Aplica a:** Formularios con listas dinámicas
**Estado:** ✅ Implementado en PaymentToCustomerForm

```typescript
// components/forms/payments/payment-to-customer-form.tsx
const { fields, replace, update, remove } = useFieldArray({
  control: form.control,
  name: 'allocations',
})
```

**Qué verificar antes de copiar:**
- useFieldArray para tablas editables (payment allocations)
- FormField dentro de cada row con `name={`allocations.${index}.field`}`
- Validación de sumas con tolerancia financiera

## Structured Logging con Pino + withLogging / withApiHandler

**Aplica a:** `app/api/*/route.ts`
**Estado:** ✅ Implementado en 24+ endpoints

### GET lista paginada → `withLogging`

```typescript
import { withLogging } from '@/lib/logger-middleware'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'

export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const { page, limit, skip } = parsePaginationParams(searchParams)
  // ... handler logic con try/catch manual
  return NextResponse.json({
    items,
    pagination: buildPaginationResponse(page, limit, total),
  })
})
```

### GET simple (catálogo/sin paginación) → `withApiHandler`

GETs simples sin paginación (badge-colors, payment-methods, etc.) pueden usar `withApiHandler` sin `bodySchema`:

```typescript
import { withApiHandler } from '@/lib/api-handler'

export const GET = withApiHandler(
  async (_request, logger) => {
    const items = await prisma.entity.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ items })
  },
  { fallbackError: 'Error al obtener entidades' }
)
```

### POST/PUT/DELETE → `withApiHandler`

```typescript
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { createEntitySchema, type CreateEntityBody } from '@/lib/validations/entity-validations'

export const POST = withApiHandler<CreateEntityBody>(
  async (_request, logger, { body }) => {
    // body ya validado con Zod, error handling automático
    const entity = await prisma.entity.create({ data: body })
    logger.info({ entityId: entity.id }, 'Entity created')
    return NextResponse.json(entity, { status: 201 })
  },
  { bodySchema: createEntitySchema, fallbackError: 'Error al crear entidad' }
)
```

**Qué verificar antes de copiar:**
- GET lista paginada → `withLogging` con try/catch manual + `parsePaginationParams`/`buildPaginationResponse`
- GET simple (catálogo) → `withApiHandler` sin bodySchema es alternativa válida
- POST/PUT/DELETE → `withApiHandler` con bodySchema, validateUuidParams, fallbackError
- `BusinessError` para errores de negocio (not found, validación custom)
- Logger inyectado como segundo parámetro del handler
- Child loggers con contexto estructurado para operaciones complejas
- Redacción automática de campos sensibles (password, token, apiKey)

## Lógica Financiera Aislada

**Aplica a:** `lib/business-logic/`
**Estado:** ✅ Implementado

Los módulos de lógica financiera son **puros**: no importan React, Next.js, ni Prisma directamente.

```
lib/business-logic/
├── payment-fifo.ts        # Distribución FIFO de pagos
├── project-financials.ts  # Balance derivado desde vista SQL
├── credit-management.ts   # CreditBalance desde ledger
├── credit-rules.ts        # Reglas puras de crédito
├── project-state.ts       # Máquina de estados de proyecto
├── money.ts               # Decimal seguro
├── totals.ts              # Validación de integridad financiera
└── installments.ts        # Cuotas informativas
```

**Qué verificar antes de copiar:**
- Sin imports de `@/components`, `next/`, ni `@prisma/client` en estos módulos
- Funciones puras para reglas; módulos con DB (`project-financials`, `credit-management`) aceptan `PrismaTransaction` cuando aplica
- Testing directo sin mocking de DB/UI
- Usar `PrismaTransaction` de `@/lib/db/types` para tipar el parámetro `tx` en transacciones

## Pagination Helpers

**Aplica a:** `app/api/*/route.ts` (funciones GET con paginación)
**Estado:** ✅ Implementado en 7+ endpoints

```typescript
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'

const { page, limit, skip } = parsePaginationParams(searchParams) // default limit=10, max=100
// ... usar skip/limit en findMany
return NextResponse.json({
  items,
  pagination: buildPaginationResponse(page, limit, total),
})
```

**Qué verificar antes de copiar:**
- Preferir `parsePaginationParams` en lugar de parsear manualmente
- `buildPaginationResponse` calcula `totalPages` automáticamente
- Default limit=10, máximo limit=100

## Status Route Factory

**Aplica a:** `app/api/*-status/route.ts`
**Estado:** ✅ Implementado para projectStatus, aftersaleStatus, visitStatus

Las 3 entidades de status comparten la misma lógica CRUD y reorder. La factory en `lib/api/status-route-factory.ts` genera handlers parametrizados:

```typescript
import { STATUS_CONFIGS, createStatusListHandler, createStatusCreateHandler } from '@/lib/api/status-route-factory'

const config = STATUS_CONFIGS.project
export const GET = createStatusListHandler(config)
export const POST = createStatusCreateHandler(config)
```

**Qué verificar antes de copiar:**
- Usar la factory para las 3 entidades de status (project, aftersale, visit)
- Evitar duplicar lógica de CRUD de status manualmente
- La factory maneja validaciones de unicidad (isInitial, isFinal, nombre), order automático y soft/hard delete

## keepPreviousData en React Query

**Aplica a:** `hooks/queries/use-*.ts`
**Estado:** ✅ Implementado

```typescript
// hooks/queries/use-customers.ts
export function useCustomers(params: CustomersQueryParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async (): Promise<CustomersResponse> => { /* ... */ },
    placeholderData: keepPreviousData, // Smooth transitions entre páginas
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
```

**Qué verificar antes de copiar:**
- `placeholderData: keepPreviousData` en hooks paginados cuando mejore continuidad visual sin ocultar datos obsoletos
- `staleTime` y `gcTime` configurados para evitar re-fetches innecesarios
- queryKey incluye todos los parámetros de filtrado/paginación

## serialize() para Server → Client

**Aplica a:** `app/*/page.tsx` (Server Components que pasan datos a Client)
**Estado:** ✅ Implementado

```typescript
// lib/utils/serialize.ts
export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value instanceof Decimal) return value.toNumber()
      if (typeof value === 'bigint') return Number(value)
      return value
    })
  )
}
```

**Qué verificar antes de copiar:**
- Serializar datos Prisma antes de pasarlos a Client Components cuando incluyan tipos no serializables
- Convierte Decimal → number y BigInt → number
- Previene errores de hidratación con tipos no serializables

## Path Aliases @/

**Aplica a:** Todo el codebase
**Estado:** ✅ Implementado

```typescript
// ✅ Correcto
import { Button } from '@/components/ui/button'
import { useCustomers } from '@/hooks/queries/use-customers'
import { withLogging } from '@/lib/logger-middleware'

// ❌ Incorrecto
import { Button } from '../../../components/ui/button'
```

**Qué verificar antes de copiar:**
- Preferir `@/` para importaciones internas
- Evitar rutas relativas profundas con `../`
- Configurado en `tsconfig.json` paths
