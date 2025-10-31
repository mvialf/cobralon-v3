# Relationships

Tabla completa de relaciones entre entidades con políticas de eliminación y justificaciones.

---

## Tabla de Relaciones Principales

| Relación                              | Tipo | onDelete Policy     | Razón                                                |
| ------------------------------------- | ---- | ------------------- | ---------------------------------------------------- |
| **Customer → Project**                | 1:N  | CASCADE             | Eliminar cliente implica eliminar sus proyectos      |
| **Customer → Payment**                | 1:N  | _(no especificado)_ | Preservar historial de pagos                         |
| **Project → ProjectStatus**           | N:1  | RESTRICT            | No eliminar estado si hay proyectos usándolo         |
| **Project ← PaymentAllocation**       | 1:N  | _(default)_         | Preservar asignaciones a proyecto                    |
| **Payment → PaymentAllocation**       | 1:N  | CASCADE             | Eliminar pago debe eliminar asignaciones             |
| **Payment → Installment**             | 1:N  | CASCADE             | Eliminar pago debe eliminar cuotas                   |
| **Payment → PaymentMethod**           | N:1  | _(no especificado)_ | Preservar métodos históricos                         |
| **PaymentAllocation → Payment**       | N:1  | CASCADE             | Eliminar pago elimina allocation (inverso)           |
| **PaymentAllocation → Project**       | N:1  | _(default)_         | Preservar allocation si proyecto existe              |
| **ProjectStatus → BadgeColor**        | N:1  | _(no especificado)_ | Preservar color si se usa en estado                  |

---

## Detalle de Políticas

### 1. Customer → Project (CASCADE)

```typescript
model Project {
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
}
```

**Política:** `onDelete: CASCADE`

**Razón:**
- Un proyecto **pertenece** a un cliente (ownership)
- Sin cliente, el proyecto pierde sentido de negocio
- Caso de uso: Cliente eliminado accidentalmente → proyectos también se eliminan
- ✅ **Trade-off aceptable:** Si se necesita preservar proyectos, usar soft delete en Customer

**Alternativa considerada:**
- `RESTRICT`: Impediría eliminar cliente con proyectos
- ❌ **Rechazada:** Fuerza limpieza manual de proyectos, mala UX

---

### 2. Customer → Payment (default)

```typescript
model Payment {
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
}
```

**Política:** `onDelete: (default)` - No especificado, comportamiento por defecto de Prisma

**Razón:**
- Los pagos son **historial financiero** crítico
- Nunca eliminar pagos aunque se elimine el cliente
- Caso de uso: Auditoría, contabilidad, reporting
- ✅ **Mejor práctica:** Preservar data financiera siempre

**Alternativa considerada:**
- `CASCADE`: Eliminaría historial financiero
- ❌ **Rechazada:** Pérdida de auditoría inaceptable

**Recomendación futura:**
- Implementar soft delete en Customer (`deletedAt: DateTime?`)
- Evitar eliminación física de clientes con historial

---

### 3. Project → ProjectStatus (RESTRICT)

```typescript
model Project {
  projectStatusId String?
  projectStatus   ProjectStatus? @relation(fields: [projectStatusId], references: [id], onDelete: Restrict)
}
```

**Política:** `onDelete: RESTRICT`

**Razón:**
- ProjectStatus es **configuración** del sistema, no dato de negocio
- No eliminar estado si hay proyectos activos usándolo
- Caso de uso: Proteger contra eliminación accidental de estados en uso
- ✅ **Fuerza workflow correcto:** Admin debe reasignar proyectos antes de eliminar estado

**Flujo correcto:**
```
1. Admin intenta eliminar estado "En Proceso"
2. Sistema verifica: ¿Hay proyectos con projectStatusId = "En Proceso"?
3. Si SÍ → Error 400: "No se puede eliminar. Hay N proyectos usando este estado"
4. Admin reasigna proyectos a otro estado
5. Luego elimina estado
```

**Alternativa considerada:**
- `SET NULL`: Dejaría proyectos sin estado
- ❌ **Rechazada:** Proyectos sin estado pierden tracking

---

### 4. Payment → PaymentAllocation (CASCADE)

```typescript
model PaymentAllocation {
  paymentId String
  payment   Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
}
```

**Política:** `onDelete: CASCADE`

**Razón:**
- PaymentAllocation **depende completamente** de Payment (existence dependency)
- Sin pago, la allocation pierde sentido
- Caso de uso: Eliminar pago debe limpiar asignaciones automáticamente
- ✅ **Coherencia de datos:** Evita allocations huérfanas

**Alternativa considerada:**
- `RESTRICT`: Impediría eliminar pago con allocations
- ❌ **Rechazada:** UX pobre, fuerza limpieza manual innecesaria

---

### 5. Payment → Installment (CASCADE)

```typescript
model Installment {
  paymentId String
  payment   Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
}
```

**Política:** `onDelete: CASCADE`

**Razón:**
- Installment **es parte** del Payment (composition relationship)
- Sin pago, las cuotas no tienen sentido
- Caso de uso: Cancelar pago debe eliminar cuotas automáticamente
- ✅ **Coherencia de datos:** Evita cuotas huérfanas

**Alternativa considerada:**
- `RESTRICT`: Impediría eliminar pago con cuotas pendientes
- ❌ **Rechazada:** UX pobre para cancelación de pagos

---

### 6. PaymentAllocation → Project (default)

```typescript
model PaymentAllocation {
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
}
```

**Política:** `onDelete: (default)` - No especificado

**Razón:**
- Si se elimina proyecto, ¿qué pasa con sus allocations?
- **Comportamiento actual:** Error si se intenta eliminar proyecto con allocations
- ✅ **Protección implícita:** Evita eliminar proyectos con historial financiero

**Recomendación futura:**
- Evaluar `RESTRICT` explícito para claridad
- O `SET NULL` si se quiere permitir eliminar proyectos con historial

---

### 7. ProjectStatus → BadgeColor (default)

```typescript
model ProjectStatus {
  colorId String
  color   BadgeColor @relation(fields: [colorId], references: [id])
}
```

**Política:** `onDelete: (default)` - No especificado

**Razón:**
- BadgeColor es configuración base (seedeada)
- **Nunca se elimina** en operación normal
- ✅ **Asunción:** 7 colores predefinidos son permanentes

**Recomendación futura:**
- Si se permite eliminar colores, agregar `RESTRICT`

---

## Filosofía de Diseño

### CASCADE - Ownership

Usa `CASCADE` cuando:
- ✅ Child **pertenece** a Parent (composition)
- ✅ Child **no tiene sentido** sin Parent
- ✅ Ejemplo: Payment → Allocation, Payment → Installment

### RESTRICT - Protection

Usa `RESTRICT` cuando:
- ✅ Child **referencia** configuración
- ✅ Eliminar Parent **rompería integridad**
- ✅ Ejemplo: Project → ProjectStatus

### Default - Financial Data

Usa `default` (sin especificar) cuando:
- ✅ Preservar historial es crítico
- ✅ Relación de "logging" o "auditoría"
- ✅ Ejemplo: Customer → Payment

---

## Constraints Únicos

### PaymentAllocation

```typescript
@@unique([paymentId, projectId])
```

**Propósito:** Un pago no puede asignarse dos veces al mismo proyecto.

**Validación adicional backend:**
```typescript
// app/api/payments/route.ts
const uniqueProjectIds = new Set(allocations.map(a => a.projectId))
if (uniqueProjectIds.size !== allocations.length) {
  throw new Error('No puede haber projectIds duplicados')
}
```

---

## Índices Relacionados con FKs

| Modelo                | Índice                          | Propósito                              |
| --------------------- | ------------------------------- | -------------------------------------- |
| **Project**           | `[customerId]`                  | Queries: "proyectos del cliente X"     |
| **Project**           | `[projectStatusId]`             | Queries: "proyectos en estado Y"       |
| **Project**           | `[customerId, projectStatusId]` | Filtros combinados                     |
| **Payment**           | `[customerId]`                  | Queries: "pagos del cliente X"         |
| **Payment**           | `[paymentMethodId]`             | Queries: "pagos con método Y"          |
| **PaymentAllocation** | `[paymentId]`                   | Joins: payment.allocations             |
| **PaymentAllocation** | `[projectId]`                   | Queries: "allocations del proyecto X"  |
| **Installment**       | `[paymentId]`                   | Joins: payment.installments            |
| **Installment**       | `[status, dueDate]`             | Cron job: cuotas pendientes vencidas   |

---

## Casos de Uso Comunes

### Eliminar Cliente

```typescript
// ✅ Permitido (CASCADE a projects)
await prisma.customer.delete({ where: { id: customerId } })

// Resultado:
// - Cliente eliminado
// - Proyectos del cliente eliminados
// - Payments preservados (history)
// - PaymentAllocations preservadas (history)
```

**Recomendación:** Implementar soft delete:
```typescript
await prisma.customer.update({
  where: { id: customerId },
  data: { deletedAt: new Date() }
})
```

### Eliminar Proyecto

```typescript
// ❌ Error si tiene PaymentAllocations
await prisma.project.delete({ where: { id: projectId } })

// Para eliminar:
// 1. Eliminar allocations manualmente
// 2. O eliminar payments asociados (CASCADE a allocations)
// 3. Luego eliminar proyecto
```

### Eliminar Estado de Proyecto

```typescript
// ❌ Error si hay proyectos usándolo (RESTRICT)
await prisma.projectStatus.delete({ where: { id: statusId } })

// Para eliminar:
// 1. Reasignar proyectos a otro estado
// 2. Luego eliminar estado
```

### Eliminar Pago

```typescript
// ✅ Permitido (CASCADE a allocations + installments)
await prisma.payment.delete({ where: { id: paymentId } })

// Resultado:
// - Payment eliminado
// - PaymentAllocations eliminadas
// - Installments eliminadas
// - Balance de proyectos se recalcula
```

---

## Ver También

- [ER Diagram](er-diagram.md) - Diagrama completo con relaciones visuales
- [Customer & Project Systems](customer-project-systems.md) - Modelos principales
- [Payment Systems](payment-systems.md) - Sistema de pagos
- [Decisión: CASCADE vs RESTRICT](../05-technical-decisions/cascade-vs-restrict.md) - Decisión arquitectural

---

**Última actualización:** 2025-10-30
