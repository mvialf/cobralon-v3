# Flujo: Configuración de Estados de Proyecto

CRUD completo de ProjectStatus con drag & drop para reordenamiento desde UI.

---

## Flujo Principal

```
Admin → Settings → Estados de Proyecto
   ↓
CRUD Operations:
   CREATE: Nuevo estado con color y flags
   READ: Lista con drag & drop
   UPDATE: Editar nombre/color/flags
   DELETE: Solo si no hay proyectos usándolo (RESTRICT)
   REORDER: Drag & drop actualiza campo "order"
   ↓
Sistema actualiza Combobox en ProjectForm en tiempo real
```

---

## Operaciones CRUD

### CREATE

**API:** `POST /api/project-status`

**Body:**
```typescript
{
  name: "En Instalación",
  colorId: "blue-uuid",
  isInitial: false,
  isFinal: false,
  isActive: true
}
```

**Validaciones:**
- name: único
- colorId: debe existir
- Solo un estado puede ser isInitial

---

### READ

**API:** `GET /api/project-status`

**Response:**
```typescript
[
  {
    id: "uuid",
    name: "Presupuesto",
    order: 1,
    color: { name: "Azul", bgClass: "bg-blue-500", textClass: "text-white" },
    isInitial: true,
    isFinal: false,
    isActive: true
  },
  // ... más estados ordenados por "order"
]
```

---

### UPDATE

**API:** `PUT /api/project-status/[id]`

**Body:** Campos editables (name, colorId, isInitial, isFinal, isActive)

---

### DELETE

**API:** `DELETE /api/project-status/[id]`

**Validación:**
```typescript
const projectsUsingStatus = await prisma.project.count({
  where: { projectStatusId: id }
})

if (projectsUsingStatus > 0) {
  return NextResponse.json(
    { error: `No se puede eliminar. Hay ${projectsUsingStatus} proyectos usando este estado` },
    { status: 400 }
  )
}
```

**onDelete Policy:** `RESTRICT` (forzado por Prisma schema)

---

### REORDER (Drag & Drop)

**API:** `POST /api/project-status/reorder`

**Body:**
```typescript
{
  updates: [
    { id: "uuid-1", order: 1 },
    { id: "uuid-2", order: 2 },
    { id: "uuid-3", order: 3 }
  ]
}
```

**Implementación:**
```typescript
await prisma.$transaction(
  updates.map(({ id, order }) =>
    prisma.projectStatus.update({
      where: { id },
      data: { order }
    })
  )
)
```

---

## Componentes

### Page

```typescript
// app/settings/project-status/page.tsx
export default async function ProjectStatusPage() {
  const statuses = await prisma.projectStatus.findMany({
    include: { color: true },
    orderBy: { order: 'asc' }
  })

  return (
    <AppLayout pageTitle="Estados de Proyecto">
      <ProjectStatusList statuses={statuses} />
    </AppLayout>
  )
}
```

### Sortable List

```typescript
// Usa @dnd-kit/core + @dnd-kit/sortable
<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={statuses} strategy={verticalListSortingStrategy}>
    {statuses.map(status => (
      <SortableStatusItem key={status.id} status={status} />
    ))}
  </SortableContext>
</DndContext>
```

---

## Ver También

- [ProjectStatus Model](../01-data-model/customer-project-systems.md#projectstatus-estados-de-proyecto)
- [BadgeColor Model](../01-data-model/customer-project-systems.md#badgecolor-colores-de-badges)
- [Project Status API](../06-apis/project-status-api.md)

---

**Última actualización:** 2025-10-30
