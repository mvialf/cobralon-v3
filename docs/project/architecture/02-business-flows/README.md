# Flujos de Negocio

Sistema de 5 flujos end-to-end que cubren las operaciones principales del proyecto Cobralon.

---

## 📚 Contenido

### 1. [Crear Proyecto](create-project.md)

**Flujo:** Cliente → Datos → Cálculos → DB

**Pasos principales:**

- Seleccionar/crear cliente
- Ingresar datos del proyecto (dirección, montos, cantidades)
- Calcular total automático (subtotal + IVA)
- Generar projectNumber automático
- Crear en base de datos

**Componentes:**

- Form: `project-form.tsx`
- Dialog: `new-project-dialog.tsx`
- API: `POST /api/projects`

---

### 2. [Pago a Proyecto (1:1)](payment-to-project.md)

**Flujo:** Proyecto → Monto → Payment + Allocation

**Características:**

- Un pago asignado a UN SOLO proyecto
- Cliente y currency derivados del proyecto
- Balance se actualiza automáticamente
- Opcional: Cuotas sin interés

**Componentes:**

- Form: `payment-to-project-form.tsx`
- Dialog: `payment-to-project-dialog.tsx`
- API: `POST /api/payments` (type: "Project")

---

### 3. [Pago a Cliente (1:N)](payment-to-customer.md)

**Flujo:** Cliente → Proyectos → Distribución → Multiple Allocations

**Características:**

- Un pago asignado a MÚLTIPLES proyectos
- Algoritmo FIFO automático disponible
- Validación: SUM(allocations) === payment.amount
- Todos los proyectos deben ser del mismo cliente

**Componentes:**

- Form: `payment-to-customer-form.tsx`
- Dialog: `payment-to-customer-dialog.tsx`
- Business Logic: `payment-fifo.ts`
- API: `POST /api/payments` (type: "Customer")

---

### 4. [Gestión de Cuotas](installments.md)

**Flujo:** Payment con cuotas → Installments automáticos → Cron job marca pagadas

**Características:**

- Creación automática al crear Payment
- Primera cuota vence el día del pago
- Siguientes cuotas cada 30 días
- Última cuota absorbe centavos residuales
- Cron job diario marca cuotas vencidas como "paid"

**Componentes:**

- Page: `installments/page.tsx`
- API: `GET /api/installments` (vista global con filtros)
- Cron: `POST /api/cron/mark-installments-paid`
- Config: `vercel.json` (schedule)

---

### 5. [Configuración de Estados de Proyecto](project-status-config.md)

**Flujo:** Admin → CRUD Estados → Drag & Drop → Actualización en tiempo real

**Características:**

- CRUD completo desde UI
- Drag & drop para reordenar
- 7 colores predefinidos
- Flags: isInitial, isFinal, isActive
- Validación: RESTRICT si hay proyectos usándolo

**Componentes:**

- Page: `settings/project-status/page.tsx`
- Form: `project-status-form.tsx`
- Dialog: `project-status-dialog.tsx`
- Sortable: `sortable-status-item.tsx` (@dnd-kit)
- API: `POST/PUT/DELETE /api/project-status`, `POST /api/project-status/reorder`

---

## Diagramas de Flujo

Cada flujo incluye:

- ✅ Diagrama ASCII paso a paso
- ✅ Validaciones en cada etapa
- ✅ Componentes involucrados
- ✅ APIs utilizadas
- ✅ Business logic aplicada

---

## Características Comunes

### Validación Dual (Frontend + Backend)

Todos los flujos implementan validación en dos capas:

1. **Frontend** (React Hook Form + Zod)
   - UX inmediata
   - Prevención de requests inválidos
   - Feedback visual

2. **Backend** (Zod + Prisma)
   - Seguridad
   - Validación de constraints de DB
   - Business rules complejas

### Transaccionalidad

Operaciones críticas usan transacciones de Prisma:

```typescript
await prisma.$transaction(async (tx) => {
  const payment = await tx.payment.create({ ... })
  await tx.paymentAllocation.createMany({ ... })
  if (installments) {
    await tx.installment.createMany({ ... })
  }
})
```

### Logging Estructurado

Todos los flujos implementan logging con Pino:

```typescript
const logger = parentLogger.child({ customerId, amount })
logger.info('Operation started')
logger.info({ result }, 'Operation completed')
```

---

## Ver También

- [Modelo de Datos](../01-data-model/) - Entidades involucradas en los flujos
- [APIs Implementadas](../06-apis/) - Endpoints con documentación completa
- [Decisiones Técnicas](../05-technical-decisions/) - Por qué estas decisiones
- [Sistema de Logging](../04-logging/) - Detalles de logging end-to-end

---

**Última actualización:** 2025-10-30
