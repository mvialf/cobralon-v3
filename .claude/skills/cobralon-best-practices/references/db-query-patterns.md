# Patrones de DB & Raw Query Performance

Patrones establecidos para optimizar queries Prisma y raw SQL en endpoints con datos tabulares.

---

## Raw SQL con Prisma.sql / Prisma.empty

**Aplica a:** Queries que Prisma ORM no puede expresar eficientemente (JOINs con GROUP BY entre tablas pivote, aggregations complejas).
**Estado:** Implementado en `app/api/payments/route.ts` (facet de projectNumber)

Usar `Prisma.sql` para fragmentos condicionales y `Prisma.empty` para omitirlos. Esto es inyection-safe (prepared statements).

```typescript
// Patrón: SQL condicional seguro
prisma.$queryRaw<Array<{ projectNumber: string; count: bigint }>>`
  SELECT p."projectNumber", COUNT(*) as count
  FROM "PaymentAllocation" pa
  JOIN "Project" p ON pa."projectId" = p.id
  JOIN "Payment" pm ON pa."paymentId" = pm.id
  ${search ? Prisma.sql`JOIN "Customer" c ON c.id = pm."customerId"` : Prisma.empty}
  WHERE 1=1
    ${search ? Prisma.sql`AND (c.name ILIKE ${`%${search}%`} OR p."projectNumber" ILIKE ${`%${search}%`})` : Prisma.empty}
    ${type ? Prisma.sql`AND pm.type = ${type}` : Prisma.empty}
  GROUP BY p."projectNumber"
  ORDER BY p."projectNumber"
`
```

**Reglas:**
- JOIN condicional: agregar JOIN solo cuando el filtro lo requiere (ej: JOIN Customer solo con search)
- `WHERE 1=1` permite agregar condiciones con `AND` sin lógica de "primer WHERE"
- Nunca interpolar strings directamente; siempre usar `${variable}` dentro de `Prisma.sql`

## JOIN vs EXISTS en raw queries

**Regla:** Preferir JOIN directo sobre EXISTS subquery cuando se filtra por columnas de tablas relacionadas.

```sql
-- Incorrecto: EXISTS ejecuta subconsulta correlacionada por fila
WHERE EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = pm."customerId" AND c.name ILIKE '%x%')

-- Correcto: JOIN directo, el planner optimiza mejor
JOIN "Customer" c ON c.id = pm."customerId"
WHERE c.name ILIKE '%x%'
```

## COUNT(*) vs COUNT(DISTINCT)

**Regla:** Si la tabla tiene `@@unique` constraint en las columnas del JOIN, `COUNT(DISTINCT id)` es redundante. Usar `COUNT(*)`.

```prisma
// PaymentAllocation ya tiene @@unique([paymentId, projectId])
// Por lo tanto COUNT(DISTINCT pa.id) == COUNT(*)
```

## Facets opcionales con includeFacets

**Aplica a:** Endpoints con server-side filtering que tienen queries costosas de aggregation.
**Estado:** Implementado en GET `/api/payments`

Separar queries costosas (facets, aggregations) de las queries base (list + count). El cliente solicita facets solo cuando las necesita.

```typescript
// Query param: ?includeFacets=true
const includeFacets = searchParams.get('includeFacets') === 'true'

const baseQueries = [
  prisma.payment.findMany({ where, skip, take: limit }),
  prisma.payment.count({ where }),
] as const

if (includeFacets) {
  const [payments, total, ...facetResults] = await Promise.all([
    ...baseQueries,
    // Facets costosas solo cuando se solicitan
    prisma.payment.groupBy({ by: ['type'], where, _count: true }),
    prisma.$queryRaw`...`,
  ])
  return NextResponse.json({ payments, pagination, facets })
}

// Sin facets: solo queries base
const [payments, total] = await Promise.all(baseQueries)
return NextResponse.json({ payments, pagination })
```

**Cuándo el cliente solicita facets:**
- Carga inicial de la página
- Cambio de filtros que invalida los conteos
- NO en paginación simple (cambio de página)

## Estrategia de indexing

**Aplica a:** `prisma/schema.prisma`

Crear índices basados en queries reales medidas con benchmark, no especulativamente.

### Índices compuestos con sort direction

```prisma
// Para queries ORDER BY date DESC filtradas por customerId
@@index([customerId, date(sort: Desc)])

// Para queries ORDER BY createdAt ASC (FIFO)
@@index([createdAt(sort: Asc)])

// Para facets que hacen JOIN por projectId primero
@@index([projectId, paymentId])
```

### Índices para filtros combinados frecuentes

```prisma
// Estado + balance (filtrar proyectos activos con deuda)
@@index([projectStatusId, balance])

// Tipo + fecha desc (listar pagos por tipo ordenados)
@@index([type, date(sort: Desc)])
```

### Proceso para agregar índices

1. Identificar query lenta (logs de `withLogging` con `duration`)
2. Verificar con benchmark real (curl autenticado, 3+ requests warm)
3. Agregar índice en `schema.prisma`
4. Aplicar con `npx prisma db push`
5. Re-medir para confirmar mejora
