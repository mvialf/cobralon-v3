# Decisión: CASCADE vs RESTRICT en onDelete

Políticas de eliminación diferenciadas según tipo de relación.

---

## Contexto

Necesitábamos definir qué sucede cuando se elimina un registro parent que tiene children. Dos filosofías:

1. **Ownership** - Parent "posee" children → Eliminar parent elimina children
2. **Reference** - Child "referencia" config → Proteger config si está en uso

---

## Decisión

| Relación                  | Policy   | Razón                                     |
| ------------------------- | -------- | ----------------------------------------- |
| Customer → Project        | CASCADE  | Cliente posee proyectos                   |
| Payment → Allocation      | CASCADE  | Pago posee asignaciones                   |
| Payment → Installment     | CASCADE  | Pago posee cuotas                         |
| Project → ProjectStatus   | RESTRICT | Proteger configuración activa             |

---

## Alternativas Consideradas

### Alternativa 1: Todo CASCADE

```prisma
// Eliminar todo en cascada
onDelete: Cascade
```

**Pros:**
- ✅ Consistencia simple
- ✅ Sin registros huérfanos

**Contras:**
- ❌ **Eliminar estado borra todos los proyectos** (peligroso)
- ❌ Sin protección para configuración

**Por qué NO:** Demasiado destructivo para config.

---

### Alternativa 2: Todo RESTRICT

```prisma
// Proteger todo
onDelete: Restrict
```

**Pros:**
- ✅ Máxima protección

**Contras:**
- ❌ **No se puede eliminar cliente si tiene proyectos** (molesto)
- ❌ Requiere eliminación manual en orden

**Por qué NO:** UX pobre.

---

### Alternativa 3: SET NULL

```prisma
projectStatusId String?
projectStatus   ProjectStatus? @relation(onDelete: SetNull)
```

**Pros:**
- ✅ No bloquea eliminación
- ✅ Preserva proyectos

**Contras:**
- ❌ Proyectos sin estado (estado requerido en UI)
- ❌ Datos inconsistentes

**Por qué NO:** Estado es requerido.

---

## Razones por Relación

### CASCADE: Customer → Project

```prisma
customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
```

**Filosofía:** Customer "posee" sus proyectos.

**Comportamiento:**
```sql
DELETE FROM customers WHERE id = 'abc';
-- Automáticamente elimina proyectos de ese cliente ✅
```

**Razón:** Si se elimina un cliente, sus proyectos ya no tienen sentido.

---

### CASCADE: Payment → Allocation

```prisma
payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
```

**Filosofía:** Payment "posee" sus allocations.

**Comportamiento:**
```sql
DELETE FROM payments WHERE id = 'xyz';
-- Automáticamente elimina allocations de ese pago ✅
```

**Razón:** Allocations sin payment no tienen significado.

---

### CASCADE: Payment → Installment

```prisma
payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
```

**Filosofía:** Payment "posee" sus installments.

**Comportamiento:**
```sql
DELETE FROM payments WHERE id = 'xyz';
-- Automáticamente elimina installments de ese pago ✅
```

**Razón:** Installments sin payment no tienen significado.

---

### RESTRICT: Project → ProjectStatus

```prisma
projectStatus ProjectStatus @relation(fields: [projectStatusId], references: [id], onDelete: Restrict)
```

**Filosofía:** ProjectStatus es configuración compartida.

**Comportamiento:**
```sql
DELETE FROM project_status WHERE id = 'abc';
-- ERROR: Cannot delete status with active projects ❌
```

**Razón:** Proteger configuración activa.

**UX:** Mostrar error en UI antes de intentar eliminar.

---

## Implementación

### API Route con RESTRICT

```typescript
// app/api/project-status/[id]/route.ts
export const DELETE = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}

  try {
    await prisma.projectStatus.delete({
      where: { id }
    })

    logger.info({ statusId: id }, 'Project status deleted')
    return NextResponse.json({ success: true })

  } catch (error) {
    // Prisma lanza error si hay proyectos usando este status
    logger.warn({ statusId: id, err: error }, 'Cannot delete status in use')

    return NextResponse.json(
      {
        error: 'Cannot delete status',
        reason: 'This status is being used by active projects'
      },
      { status: 400 }
    )
  }
})
```

### Frontend Validation

```typescript
// components/dialogs/settings/delete-status-dialog.tsx
async function handleDelete() {
  // Check si está en uso antes de intentar
  const projects = await fetch(`/api/projects?projectStatusId=${statusId}`)
  const { data } = await projects.json()

  if (data.length > 0) {
    toast.error(`Cannot delete status: ${data.length} projects using it`)
    return
  }

  // Intentar eliminar
  const response = await fetch(`/api/project-status/${statusId}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    toast.error('Cannot delete status')
  } else {
    toast.success('Status deleted')
  }
}
```

---

## Trade-offs

### ⚠️ RESTRICT Puede Bloquear UX

Si usuario intenta eliminar estado con proyectos activos.

**Mitigación:**
- Frontend validation (check antes de intentar)
- Clear error messages
- UI muestra count de proyectos usando el estado

---

## Ver También

- [Relationships](../01-data-model/relationships.md) - Tabla completa de relaciones
- [Prisma Schema](https://www.prisma.io/docs/concepts/components/prisma-schema/relations#referential-actions)

**Última actualización:** 2025-10-30
