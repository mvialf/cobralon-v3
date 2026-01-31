# Templates Avanzados de CRUD

Patrones para casos más complejos que el CRUD simple de 1 entidad.

## 1. Many-to-Many (Relación N:M)

Basado en: Project ↔ UninstallTag via `ProjectUninstallTag`.

### Schema Prisma

```prisma
// Tabla pivot explícita (permite metadata como createdAt)
model EntityTag {
  id        String   @id @default(uuid())
  entityId  String
  tagId     String
  createdAt DateTime @default(now())

  entity    Entity   @relation(fields: [entityId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([entityId, tagId])
  @@index([entityId])
  @@index([tagId])
}
```

### API: Patrón "Reemplazo" (deleteMany + createMany)

```typescript
// En PUT /api/entities/[id]
if (body.tagIds !== undefined) {
  // 1. Eliminar TODAS las relaciones existentes
  await tx.entityTag.deleteMany({
    where: { entityId: id },
  })

  // 2. Crear nuevas relaciones
  if (body.tagIds.length > 0) {
    await tx.entityTag.createMany({
      data: body.tagIds.map((tagId: string) => ({
        entityId: id,
        tagId,
      })),
    })
  }
}
```

**Preferir `deleteMany + createMany` sobre `connect/disconnect`.** Es más eficiente cuando se cambian múltiples relaciones.

### Form: Transformación ID ↔ Objeto

```typescript
<FormField
  control={control}
  name="tagIds"  // Array<string> en form state
  render={({ field }) => {
    // IDs → objetos para el componente UI
    const selectedObjects = field.value
      ?.map(id => availableTags.find(t => t.id === id))
      .filter(Boolean) as Tag[]

    // Objetos → IDs al actualizar form
    const handleChange = (tags: Tag[]) => {
      field.onChange(tags.map(t => t.id))
    }

    return (
      <TagSelector
        selectedTags={selectedObjects}
        availableTags={availableTags}
        onTagsChange={handleChange}
      />
    )
  }}
/>
```

### Hook genérico para tags CRUD

Referencia real: `hooks/use-tags-crud.ts` — Parametrizable por endpoint.

```typescript
// Crear instancia para cada tipo de tag
export function useEntityTags() {
  return useTagsCrud({
    endpoint: '/api/entity-tags',
    responseKey: 'entityTags',
    entityLabel: 'tag',
  })
}
```

## 2. Faceted Filters (Server-Side)

Basado en: GET /api/payments con filtros por tipo y método de pago.

### API: Facets opcionales con `includeFacets`

```typescript
const includeFacets = searchParams.get('includeFacets') === 'true'

if (includeFacets) {
  // Ejecutar facets en paralelo con query principal
  const [items, total, typeFacets, categoryFacets] = await Promise.all([
    prisma.entity.findMany({ where, take: limit, skip }),
    prisma.entity.count({ where }),

    // Facet: groupBy simple
    prisma.entity.groupBy({
      by: ['type'],
      where,
      _count: true,
    }),

    // Facet: con JOIN (raw query para relaciones)
    prisma.$queryRaw`
      SELECT c.name, COUNT(*) as count
      FROM "Entity" e
      JOIN "Category" c ON e."categoryId" = c.id
      WHERE ...conditions...
      GROUP BY c.name
      ORDER BY c.name
    `,
  ])

  return NextResponse.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    facets: {
      type: typeFacets.map(f => ({ value: f.type, label: f.type, count: f._count })),
      category: categoryFacets.map(f => ({ value: f.name, label: f.name, count: Number(f.count) })),
    },
  })
} else {
  // Sin facets — query más rápida
  const [items, total] = await Promise.all([
    prisma.entity.findMany({ where, take: limit, skip }),
    prisma.entity.count({ where }),
  ])

  return NextResponse.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
```

### Cliente: Facets solo en página 1

```typescript
const queryParams = useMemo(() => ({
  page: pagination.pageIndex + 1,
  limit: pagination.pageSize,
  search: debouncedSearch || undefined,
  type: typeFilter,
  // Facets solo en primera página (carga inicial + cambio de filtros)
  includeFacets: pagination.pageIndex === 0,
}), [pagination, debouncedSearch, typeFilter])
```

### Componente: `DataTableFacetedFilter`

```typescript
// Componente existente en components/data-table/data-table-faceted-filter.tsx
<DataTableFacetedFilter
  title="Tipo"
  options={typeOptions}
  serverFacets={facets?.type}              // Server-side counts
  controlledSelectedValues={selectedTypes}  // Server-side state
  onFilterChange={(values) => setTypeFilter(values[0])}
/>
```

### Decisión de diseño: NO prefetch facets en SSR

```typescript
// page.tsx — Solo datos, sin facets
return serialize({
  items,
  pagination,
  // facets se cargan en cliente cuando se usan filtros
})
```

## 3. Hard Delete con Cascade (patrón actual)

Cobralon NO usa soft delete (`deletedAt`). Usa hard delete con Prisma cascades.

### Schema: Configurar onDelete

```prisma
model Project {
  // Cascade: se elimina automáticamente cuando se borra el proyecto
  uninstallTags  ProjectUninstallTag[]  // onDelete: Cascade en pivot
  allocations    PaymentAllocation[]     // onDelete: Cascade

  // Restrict: previene borrar si hay dependencias
  projectStatus  ProjectStatus? @relation(..., onDelete: Restrict)
}
```

### API: Verificar antes de borrar

```typescript
export async function DELETE(request: Request, { params }) {
  const { id } = await params

  const existing = await prisma.entity.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  // Prisma maneja cascade automáticamente
  await prisma.entity.delete({ where: { id } })

  return NextResponse.json({ message: 'Eliminado exitosamente' })
}
```

### Cuándo considerar cada tipo de relación

| onDelete | Uso | Ejemplo |
|----------|-----|---------|
| `Cascade` | Datos dependientes sin valor propio | Tabla pivot, allocations |
| `Restrict` | Datos referenciados que no deben perderse | Status, categorías |
| `SetNull` | Referencia opcional que puede quedar huérfana | (no usado en Cobralon) |
