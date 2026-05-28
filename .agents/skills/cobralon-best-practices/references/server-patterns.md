# Patrones Server-Side

Optimizaciones para Server Components, API routes y operaciones del servidor.

---

## React.cache() para deduplicación

**Impacto:** HIGH
**Aplica a:** `app/*/page.tsx`, funciones de data fetching compartidas
**Estado:** ⚠️ Pendiente — no se usa en el proyecto

`React.cache()` deduplica llamadas con los mismos argumentos dentro de un render pass. Útil cuando múltiples Server Components necesitan los mismos datos.

### Incorrecto

```typescript
// app/customer/[id]/page.tsx
// ❌ Si CustomerInfo y CustomerProjects ambos necesitan el customer,
// se hacen 2 queries idénticas
async function CustomerInfo({ id }: { id: string }) {
  const customer = await prisma.customer.findUnique({ where: { id } })
  return <div>{customer?.name}</div>
}

async function CustomerProjects({ id }: { id: string }) {
  const customer = await prisma.customer.findUnique({ where: { id } })
  return <div>{customer?.projects.length} proyectos</div>
}
```

### Correcto

```typescript
import { cache } from 'react'

// ✅ Se ejecuta solo una vez por render pass, aunque se llame múltiples veces
const getCustomer = cache(async (id: string) => {
  return prisma.customer.findUnique({
    where: { id },
    include: { projects: true },
  })
})

async function CustomerInfo({ id }: { id: string }) {
  const customer = await getCustomer(id)
  return <div>{customer?.name}</div>
}

async function CustomerProjects({ id }: { id: string }) {
  const customer = await getCustomer(id)
  return <div>{customer?.projects.length} proyectos</div>
}
```

**Cuándo aplicar:** Páginas de detalle (`[id]/page.tsx`) donde múltiples secciones necesitan la misma entidad.

**Nota:** `React.cache()` es diferente de `unstable_cache` de Next.js. `React.cache()` deduplica dentro de un request. `unstable_cache` persiste entre requests.

## after() para operaciones no-bloqueantes

**Impacto:** HIGH
**Aplica a:** `app/api/*/route.ts`
**Estado:** ⚠️ Pendiente — no se usa en el proyecto

`after()` de Next.js 15 permite ejecutar código después de enviar la response al cliente. Ideal para logging, analytics, audit trails.

### Incorrecto

```typescript
// app/api/payments/route.ts
// ❌ El logging bloquea la response — el cliente espera más
export const POST = withLogging(async (request, logger) => {
  const payment = await createPayment(data)

  // Esto se ejecuta ANTES de enviar la response
  logger.info({ paymentId: payment.id, amount: data.amount }, 'Payment created')
  await prisma.auditLog.create({
    data: { action: 'PAYMENT_CREATED', entityId: payment.id },
  })

  return NextResponse.json(payment, { status: 201 })
})
```

### Correcto

```typescript
import { after } from 'next/server'

// ✅ La response se envía inmediatamente, logging/audit corre después
export const POST = withLogging(async (request, logger) => {
  const payment = await createPayment(data)

  after(async () => {
    logger.info({ paymentId: payment.id, amount: data.amount }, 'Payment created')
    await prisma.auditLog.create({
      data: { action: 'PAYMENT_CREATED', entityId: payment.id },
    })
  })

  return NextResponse.json(payment, { status: 201 })
})
```

**Candidatos en Cobralon:**
- Logging de operaciones de pago (child logger en POST payments)
- Audit trail de cambios en proyectos/clientes
- Cualquier operación que no afecte la response

**Limitación:** Solo funciona en el Node.js runtime, no en Edge.

## Minimizar serialización RSC

**Impacto:** HIGH
**Aplica a:** `app/*/page.tsx` → `page-client.tsx`
**Estado:** ✅ Implementado con `serialize()`

El proyecto ya usa `lib/utils/serialize.ts` para convertir tipos Prisma (Decimal, BigInt) antes de pasarlos al cliente.

### Correcto (ya implementado)

```typescript
// app/customer/page.tsx
async function getInitialCustomers() {
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ take: 50, skip: 0 }),
    prisma.customer.count(),
  ])
  // ✅ serialize() convierte Decimal → number, Date → ISO string
  return serialize({ customers, pagination: { total } })
}
```

### Mejora pendiente: pasar solo datos necesarios

```typescript
// ⚠️ Mejorable: no pasar campos que el client no necesita
async function getInitialCustomers() {
  const customers = await prisma.customer.findMany({
    // ✅ Seleccionar solo campos necesarios para la tabla
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      creditBalance: true,
      _count: { select: { projects: true } },
    },
    take: 50,
  })
  return serialize(customers)
}
```

**Regla:** Usar `select` en lugar de incluir toda la entidad cuando el Client Component solo necesita un subset de campos.

## Parallel fetching en Server Components

**Impacto:** HIGH
**Aplica a:** `app/*/page.tsx` con múltiples prefetch queries
**Estado:** ✅ Implementado

El proyecto ya paraleliza prefetch queries en Server Components.

### Correcto (ya implementado)

```typescript
// Ejemplo: página de detalle de cliente con tabs
export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const queryClient = new QueryClient()

  // ✅ Prefetch en paralelo
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['customer', id],
      queryFn: () => getCustomer(id),
    }),
    queryClient.prefetchQuery({
      queryKey: ['customer-projects', id],
      queryFn: () => getCustomerProjects(id),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomerDetailClient />
    </HydrationBoundary>
  )
}
```

**Qué mantener:** Siempre usar `Promise.all` cuando hay múltiples `prefetchQuery` independientes en un Server Component.

## Dedup HydrationBoundary

**Impacto:** MEDIUM
**Aplica a:** `app/*/page.tsx`
**Estado:** ✅ Implementado

Un solo `HydrationBoundary` con `dehydrate(queryClient)` serializa todas las queries pre-fetched.

```typescript
// ✅ Un solo boundary para todos los prefetches
<HydrationBoundary state={dehydrate(queryClient)}>
  <PageClient />
</HydrationBoundary>

// ❌ No crear múltiples boundaries
<HydrationBoundary state={dehydrate(qc1)}>
  <SectionA />
</HydrationBoundary>
<HydrationBoundary state={dehydrate(qc2)}>
  <SectionB />
</HydrationBoundary>
```
