# Análisis de Mejoras y Bugs Potenciales - Proyecto Cobralon

> **Fecha de análisis:** 2026-05-07
> **Versión del proyecto:** 3.1.0
> **Branch analizado:** `dev2`
> **Propósito:** Documento exhaustivo de problemas técnicos, bugs potenciales, inconsistencias de flujo y mejoras arquitectónicas. Cualquier agente o desarrollador debe poder entender el contexto, el problema y la solución propuesta sin necesidad de explorar el código adicionalmente.

---

## Tabla de Contenidos

1. [Flujo de Pagos (Payments, Allocations, FIFO, Credit)](#1-flujo-de-pagos)
2. [Flujo de Proyectos (Projects, Balances, Adjustments)](#2-flujo-de-proyectos)
3. [Flujo de Clientes y Créditos](#3-flujo-de-clientes-y-créditos)
4. [Flujo de Cuotas (Installments)](#4-flujo-de-cuotas)
5. [Flujo de Postventa y Visitas](#5-flujo-de-postventa-y-visitas)
6. [Flujo de Calendario](#6-flujo-de-calendario)
7. [Validaciones y Seguridad](#7-validaciones-y-seguridad)
8. [Integridad de Datos y Race Conditions](#8-integridad-de-datos)
9. [Arquitectura y Patrones](#9-arquitectura-y-patrones)
10. [Dependencias y Build](#10-dependencias-y-build)
11. [Autorización y Control de Acceso](#11-autorización-y-control-de-acceso)
12. [Endpoints de Import/Export](#12-endpoints-de-importexport)
13. [Inconsistencias de Patrones API](#13-inconsistencias-de-patrones-api)
14. [Timezone y Manejo de Fechas](#14-timezone-y-manejo-de-fechas)
15. [Base de Datos — Integridad Adicional](#15-base-de-datos--integridad-adicional)
16. [Optimización de Base de Datos y Queries](#16-optimización-de-base-de-datos-y-queries)
17. [Testing — Cobertura](#17-testing--cobertura)
18. [Configuración y Entorno](#18-configuración-y-entorno)

---

## Leyenda de Severidad

| Icono | Nivel | Definición |
|-------|-------|------------|
| 🔴 | **Crítico** | Puede causar pérdida de dinero, corrupción de datos o comportamiento errático en producción. Requiere atención inmediata. |
| 🟡 | **Medio** | Puede causar inconsistencias menores, bugs de UX o deuda técnica que escalará. Debe resolverse en el corto plazo. |
| 🟢 | **Bajo** | Mejora de calidad de código, performance o mantenibilidad. No afecta funcionalidad actual. |

---

## 1. Flujo de Pagos (Payments, Allocations, FIFO, Credit)

### 1.1 🟡 POST /api/payments — Validación Redundante de Crédito Fuera de Transacción

> ✅ **RESUELTO** — Validación fuera de transacción eliminada. La validación dentro de la transacción es suficiente y más segura.

**Contexto:**
El endpoint POST tenía una validación de `creditApplied` en dos etapas:
1. **Fuera de la transacción** (líneas 452-463): validaba que `creditApplied > 0` solo se permita en pagos tipo "Project" con 1 allocation.
2. **Dentro de la transacción** (líneas 593-647): lee el balance real del cliente y valida que el crédito sea suficiente.

**Solución aplicada:**
Eliminada la validación fuera de la transacción. La validación dentro de la transacción es suficiente y más segura porque lee datos frescos.

---

### 1.2 🟡 Sobrepago (Overpayment) — Falta de Contexto en Metadata

> ✅ **RESUELTO** — `creditApplied` agregado al metadata del `OVERPAYMENT`.

**Contexto:**
Cuando un pago genera que el balance del proyecto sea negativo, el sistema automáticamente:
1. Ajusta el balance a 0.
2. Crea un `CreditTransaction` tipo `OVERPAYMENT` con el excedente.

**Solución aplicada:**
Agregado `creditApplied: creditToApply` al metadata del `OVERPAYMENT` para auditoría completa.

---

### 1.3 🟢 DELETE /api/payments/[id] — Reversión de Crédito Depende del Signo del Monto

> ✅ **RESUELTO** — Reversión explícita según tipo de transacción.

**Contexto:**
Al eliminar un pago, se crean transacciones de `ADJUSTMENT` para revertir los créditos asociados.

**Solución aplicada:**
La lógica de reversión ahora es explícita según tipo:
- `OVERPAYMENT` → `-Math.abs(ctAmount)` (resta crédito)
- `APPLIED` → `Math.abs(ctAmount)` (devuelve crédito)

---

### 1.4 🟢 Búsqueda de Pagos — Patrón Frágil de SQL

> ✅ **RESUELTO** — Caracteres especiales de LIKE (`%`, `_`) se escapan antes de usar en queries.

**Contexto:**
El GET de pagos usa `$queryRaw` con `normalize_text()` para búsqueda sin acentos.

**Solución aplicada:**
Caracteres especiales de LIKE (`%` y `_`) se escapan con `replace(/([%_])/g, '\\$1')` al inicio del handler. Aplica a búsqueda principal y facets.

---

## 2. Flujo de Proyectos (Projects, Balances, Adjustments)

### 2.1 🔴 Campo `balance` Persistido — Riesgo de Desincronización Crónica

**Contexto:**
`Project.balance` es un campo calculado que se almacena en la DB (schema Prisma línea 171). Su fórmula es:
```
balance = totalAmount - SUM(allocations.allocatedAmount) - SUM(adjustments.amount)
```

**Problema:**
El balance se actualiza **manualmente** mediante `updateMultipleProjectBalances()` después de cada operación de pago. Si alguna operación:
- Falla silenciosamente después de crear el pago pero antes de actualizar el balance.
- Es editada directamente en DB (sin pasar por la aplicación).
- Tiene un bug en un endpoint secundario.

El balance queda desincronizado. **La existencia del cron `reconcile-balances` es evidencia directa** de que este problema ocurre en producción.

**Impacto:**
- Un proyecto puede mostrar balance $0 cuando en realidad debe $100.000.
- Un proyecto puede mostrar deuda cuando ya está pagado.
- Decisiones de negocio basadas en balance incorrecto (ej: no enviar a cobranza).

**Solución Propuesta (ya planificada en `plans/derive-customer-credit-balance.md`):**
Eliminar `Project.balance` como campo persistido y calcularlo en tiempo real:

```sql
SELECT p.*,
  (COALESCE(p."totalAmount", 0)
   - COALESCE((SELECT SUM(pa."allocatedAmount") FROM "PaymentAllocation" pa WHERE pa."projectId" = p.id), 0)
   - COALESCE((SELECT SUM(a.amount) FROM "project_adjustments" a WHERE a."projectId" = p.id), 0)
  ) as balance
FROM "Project" p
```

**Nota:** Este cambio requiere modificar ~20 archivos que leen `project.balance`. Ver plan completo en `plans/unify-project-total-fields.md` y `plans/fix-n-plus-1-and-redundant-queries.md`.

**Archivos Afectados:**
- `prisma/schema.prisma`
- `lib/business-logic/update-project-balance.ts`
- `lib/business-logic/project-balance.ts`
- `app/api/payments/route.ts`
- `app/api/payments/[id]/route.ts`
- `app/api/cron/reconcile-balances/route.ts`
- `app/api/projects/route.ts`
- `app/projects/columns.tsx`
- `app/projects/page.tsx`
- Y ~15 archivos más (ver plan `unify-project-total-fields.md`)

---

### 2.2 🟡 `updateMultipleProjectBalances` — N+1 Queries Secuenciales

**Contexto:**
Después de crear/eliminar un pago, se actualizan los balances de todos los proyectos afectados.

**Problema:**
`updateMultipleProjectBalances` usa un `for...of` secuencial donde cada iteración hace 2 queries (findUnique + update). Para un pago tipo "Customer" con 10 proyectos, son **20 queries secuenciales dentro de la misma transacción**.

**Código actual (`lib/business-logic/update-project-balance.ts` líneas 117-126):**
```typescript
export async function updateMultipleProjectBalances(
  projectIds: string[],
  tx?: PrismaTransaction
): Promise<number> {
  for (const projectId of projectIds) {
    await updateProjectBalance(projectId, tx)  // findUnique + update
  }
  return projectIds.length
}
```

**Impacto:**
- Transacciones más largas = mayor riesgo de deadlock.
- Mayor latencia en el endpoint POST de pagos.
- A escala (100+ proyectos por pago), esto sería insostenible.

**Solución Propuesta (ya planificada en `plans/fix-n-plus-1-and-redundant-queries.md`):**
Reemplazar el loop por una query SQL batch:

```sql
UPDATE "Project" p
SET balance = COALESCE(p."totalAmount", 0)
  - COALESCE((SELECT SUM(pa."allocatedAmount") FROM "PaymentAllocation" pa WHERE pa."projectId" = p.id), 0)
  - COALESCE((SELECT SUM(a.amount) FROM "project_adjustments" a WHERE a."projectId" = p.id), 0)
WHERE p.id = ANY($1::uuid[])
```

**Archivos Afectados:**
- `lib/business-logic/update-project-balance.ts`
- `app/api/cron/reconcile-balances/route.ts` (Fase 2 del cron)

---

### 2.3 🟡 `calculateProjectBalance` — No Considera Ajustes (`ProjectAdjustment`)

**Contexto:**
La función pura `calculateProjectBalance` (línea 81 de `lib/business-logic/project-balance.ts`) calcula el balance como `totalAmount - totalPaid`. Pero `_updateBalanceInternal` (línea 73 del mismo archivo) resta también los ajustes.

**Problema:**
Hay **dos fórmulas diferentes** para calcular el balance:
1. `calculateProjectBalance()` = totalAmount - allocations (sin ajustes)
2. `_updateBalanceInternal()` = totalAmount - allocations - adjustments

Si un componente del frontend usa `calculateProjectBalance()` directamente (en vez de leer `project.balance` de la DB), mostrará un balance incorrecto (mayor al real).

**Código:**
```typescript
// calculateProjectBalance (línea 81-101)
export function calculateProjectBalance(project: ProjectWithAllocations): ProjectBalanceResult {
  const totalPaid = project.allocations?.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0) || 0
  const balance = totalAmount - totalPaid  // ← Sin ajustes
  // ...
}

// _updateBalanceInternal (línea 73)
const finalBalance = baseBalance - totalAdjustments  // ← Con ajustes
```

**Solución Propuesta:**
Agregar un parámetro opcional `adjustments` a `calculateProjectBalance` para que pueda calcular el balance real:

```typescript
export function calculateProjectBalance(
  project: ProjectWithAllocations,
  adjustments?: Array<{ amount: number }>
): ProjectBalanceResult {
  // ...
  const totalAdjustments = adjustments?.reduce((sum, adj) => sum + adj.amount, 0) || 0
  const balance = totalAmount - totalPaid - totalAdjustments
  // ...
}
```

**Archivos Afectados:**
- `lib/business-logic/project-balance.ts`
- Todos los callers de `calculateProjectBalance`

---

### 2.4 🟢 `derivePaymentProgress` — División por Cero Mal Manejada

**Contexto:**
`derivePaymentProgress` calcula métricas de display a partir de `total` y `balance` persistidos.

**Problema:**
Si `total = 0` y `balance < 0` (sobrepago en proyecto sin monto), `totalPaid` será positivo pero `percentPaid = 0`.

**Código (línea 132-137):**
```typescript
export function derivePaymentProgress(total: number, balance: number): PaymentProgressResult {
  const totalPaid = total - balance  // 0 - (-100) = 100
  const percentPaid = total > 0 ? (totalPaid / total) * 100 : 0  // 0
  // ...
}
```

**Impacto:**
- Caso edge poco probable, pero indica que `total = 0` no está bien manejado.

**Solución Propuesta:**
Documentar el comportamiento esperado cuando `total = 0`, o retornar `percentPaid = 100` cuando `balance <= 0 && total === 0`.

**Archivos Afectados:**
- `lib/business-logic/project-balance.ts`

---

## 3. Flujo de Clientes y Créditos

### 3.1 🟡 `getCustomerCreditBalance` — Oculta Balances Negativos

**Contexto:**
La función calcula el crédito del cliente sumando todas las `CreditTransaction` y aplicando `Math.max(0, ...)`.

**Problema:**
Si por algún bug las transacciones resultan en un balance negativo (ej: se consumió más crédito del que se generó), la función retorna `0` en vez del valor negativo. **Esto oculta bugs de integridad**.

**Código (línea 29-38 de `lib/business-logic/credit-management.ts`):**
```typescript
export async function getCustomerCreditBalance(...): Promise<number> {
  const result = await db.creditTransaction.aggregate({
    where: { customerId },
    _sum: { amount: true },
  })
  return Math.max(0, Number(result._sum.amount ?? 0))  // ← Oculta negativos
}
```

**Impacto:**
- Un bug que genere crédito negativo nunca será detectado.
- El sistema permitirá transacciones que matemáticamente son inválidas.

**Solución Propuesta:**
Loggear un warning cuando el balance real sea negativo:

```typescript
const rawBalance = Number(result._sum.amount ?? 0)
if (rawBalance < 0) {
  logger.warn({ customerId, rawBalance }, 'Customer credit balance is negative - possible data integrity issue')
}
return Math.max(0, rawBalance)
```

**Archivos Afectados:**
- `lib/business-logic/credit-management.ts`

---

### 3.2 🟡 POST /api/customers/[id]/credit/refund — Doble Cálculo de Balance

**Contexto:**
El endpoint de devolución de crédito calcula el balance dos veces:
1. Fuera de la transacción (línea 29): para validar `canRefundCredit`.
2. Dentro de la transacción (línea 56): para obtener el balance actualizado.

**Problema:**
La validación fuera de la transacción es redundante. Entre línea 29 y línea 56, otro request puede modificar el crédito. La validación dentro de la transacción es la que realmente importa.

**Código:**
```typescript
// Fuera de la transacción (línea 29)
const creditBalance = await getCustomerCreditBalance(customerId)

// Validación (línea 32)
const validation = canRefundCredit(body.amount, creditBalance)

// Dentro de la transacción (línea 56)
const newCreditBalance = await getCustomerCreditBalance(customerId, tx)
```

**Solución Propuesta:**
Eliminar el cálculo fuera de la transacción. Calcular el balance solo dentro de la transacción y validar ahí.

**Archivos Afectados:**
- `app/api/customers/[id]/credit/refund/route.ts`

---

### 3.3 🟢 `canRefundCredit` — Formato de Moneda Inconsistente

**Contexto:**
La función retorna mensajes de error con el monto formateado usando `toLocaleString('es-CL')`.

**Problema:**
`toLocaleString` usa el locale del runtime del servidor. Si el servidor está configurado en inglés, el formato será incorrecto. Además, no incluye el símbolo de moneda ni los separadores correctos para CLP.

**Código (línea 211-215):**
```typescript
return {
  valid: false,
  error: `El monto excede el crédito disponible ($${customerCredit.toLocaleString('es-CL')})`,
}
```

**Solución Propuesta:**
Usar la función de formateo existente del proyecto (`lib/format.ts`):

```typescript
import { formatCurrency } from '@/lib/format'
return {
  valid: false,
  error: `El monto excede el crédito disponible (${formatCurrency(customerCredit, 'CLP')})`,
}
```

**Archivos Afectados:**
- `lib/business-logic/credit-management.ts`

---

## 4. Flujo de Cuotas (Installments)

### 4.1 🟡 Fechas de Vencimiento con Suma de Días en Vez de Meses

**Contexto:**
Las cuotas se generan sumando 30 días a la fecha anterior.

**Problema:**
Sumar 30 días no produce fechas mensuales consistentes:
- Cuota 1: 15 de enero
- Cuota 2: 14 de febrero (31 días después)
- Cuota 3: 16 de marzo (30 días después del 14 de febrero)

Los clientes esperan que las cuotas caigan el **mismo día de cada mes**.

**Código (líneas 127-128 de `lib/business-logic/installments.ts`):**
```typescript
const dueDate = new Date(paymentDate)
dueDate.setDate(dueDate.getDate() + (i - 1) * FINANCIAL.DAYS_PER_INSTALLMENT)
```

**Impacto:**
- Confusión para el cliente (fechas de pago irregulares).
- Dificultad para predecir fechas de vencimiento.

**Solución Propuesta:**
Usar `date-fns/addMonths` para mantener el mismo día de cada mes:

```typescript
import { addMonths } from 'date-fns'
const dueDate = addMonths(paymentDate, i - 1)
```

**Archivos Afectados:**
- `lib/business-logic/installments.ts`
- Tests de installments

---

### 4.2 🟡 Semántica Confusa de "paid" en Cuotas

**Contexto:**
Una cuota se marca como "paid" automáticamente cuando su fecha de vencimiento llega (`dueDate <= today`).

**Problema:**
"Pagada" no significa que el cliente pagó. Significa que "venció". Esto es confuso para usuarios y reportes.

**Código (`lib/business-logic/installments.ts` línea 171-177):**
```typescript
export function getInstallmentStatus(dueDate: Date): 'paid' | 'pending' {
  // ...
  return due <= today ? 'paid' : 'pending'  // "paid" = vencida, no pagada realmente
}
```

**Impacto:**
- Reportes de "cuotas pagadas" son engañosos.
- Los usuarios pueden pensar que el cliente ya pagó cuando solo venció la fecha.

**Solución Propuesta:**
Cambiar la terminología:
- `'paid'` → `'due'` (vencida) o `'matured'`
- `'pending'` → `'upcoming'` (próxima)

Documentar explícitamente que las cuotas son puramente informativas y no representan pagos reales.

**Archivos Afectados:**
- `lib/business-logic/installments.ts`
- `app/payments/installments/columns.tsx`
- `app/payments/installments/page.tsx`

---

### 4.3 🟢 `validateInstallmentsSum` — No Valida Cuotas Individuales

**Contexto:**
La función valida que la suma de todas las cuotas sea igual al monto total.

**Problema:**
No valida que cada cuota individual sea positiva. En casos edge (monto muy pequeño, muchas cuotas), las primeras cuotas pueden ser $0.00.

**Ejemplo:** $0.10 en 12 cuotas:
- baseAmount = Math.floor(0.10/12 * 100) / 100 = 0.00
- 11 cuotas de $0.00 + 1 cuota de $0.10

**Impacto:**
- UX confusa (cuotas de $0).

**Solución Propuesta:**
Agregar validación de que cada cuota > 0, o establecer un monto mínimo por cuota.

**Archivos Afectados:**
- `lib/business-logic/installments.ts`

---

## 5. Flujo de Postventa y Visitas

### 5.1 🟡 `Aftersale.tasks` — JSON sin Schema de Validación

**Contexto:**
El campo `tasks` en `Aftersale` es de tipo `Json` en Prisma (schema línea 349).

**Problema:**
No hay validación de schema en el backend. El frontend podría enviar:
- Un objeto en vez de array.
- Un array con objetos de forma inesperada.
- Strings en vez de objetos.

**Impacto:**
- Corrupción de datos.
- Errores en el frontend al iterar sobre `tasks`.

**Solución Propuesta:**
Agregar validación Zod para `tasks` en los endpoints POST/PUT de aftersales:

```typescript
const taskSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
})

const tasksSchema = z.array(taskSchema).default([])
```

**Archivos Afectados:**
- `app/api/aftersales/route.ts`
- `app/api/aftersales/[id]/route.ts`
- `lib/validations/aftersale-validations.ts`

---

### 5.2 🟡 `Visit.scheduledTime` — String sin Formato Validado

**Contexto:**
El campo `scheduledTime` almacena strings como "10:30" o "14:00".

**Problema:**
No hay constraint de formato. Puede contener "25:99", "mañana", o cualquier string.

**Impacto:**
- Datos corruptos en la DB.
- Errores de parsing en el frontend.

**Solución Propuesta:**
Agregar validación Zod con regex:

```typescript
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido. Use HH:mm')
```

**Archivos Afectados:**
- `lib/validations/visit-validations.ts`
- `app/api/visits/route.ts`
- `app/api/visits/[id]/route.ts`

---

## 6. Flujo de Calendario

### 6.1 🟡 Sin Validación de Conflicto de Equipo

**Contexto:**
Los eventos de calendario (`ProjectEvent`, `AftersaleEvent`, `VisitEvent`) pueden tener múltiples `TeamTag` asignados.

**Problema:**
No hay validación de que un mismo miembro del equipo no esté asignado a dos eventos en la misma fecha/hora.

**Escenario:**
Juan Pérez asignado a:
- Evento A: 15 de mayo, 10:00-12:00
- Evento B: 15 de mayo, 11:00-13:00

El sistema lo permite sin advertencia.

**Impacto:**
- Bajo con equipo pequeño, pero crítico para escalar.

**Solución Propuesta:**
Agregar validación en el POST/PUT de eventos que verifique si algún `TeamTag` ya está ocupado en esa fecha:

```typescript
// Pseudo-código
const conflictingEvents = await tx.projectEvent.findMany({
  where: {
    scheduledDate,
    teamTags: { some: { id: { in: teamTagIds } } },
    NOT: { id: currentEventId },  // Excluir evento actual en edición
  },
})
if (conflictingEvents.length > 0) {
  throw new BusinessError('Algunos miembros del equipo ya tienen eventos asignados en esta fecha', 409)
}
```

**Archivos Afectados:**
- `app/api/project-events/route.ts`
- `app/api/project-events/[id]/route.ts`
- `app/api/aftersale-events/route.ts`
- `app/api/visit-events/route.ts`

---

### 6.2 🟡 `ProjectEvent` — `@@unique([projectId, scheduledDate])` Bloquea Múltiples Eventos/Día

**Contexto:**
El schema tiene una constraint unique que impide más de un evento por proyecto por día.

**Problema:**
Si un proyecto necesita múltiples visitas en un día (ej: mañana y tarde), el sistema lo rechaza.

**Schema (línea 430):**
```prisma
@@unique([projectId, scheduledDate])
```

**Impacto:**
- Restricción artificial del flujo de negocio.

**Solución Propuesta:**
Eliminar la constraint unique. Un proyecto puede necesitar múltiples eventos el mismo día. Si se necesita prevenir duplicados accidentales, hacerlo a nivel de aplicación (validar en el endpoint) en vez de a nivel de DB.

**Archivos Afectados:**
- `prisma/schema.prisma`
- `app/api/project-events/route.ts` (agregar validación de duplicado opcional)

---

## 7. Validaciones y Seguridad

### 7.1 🟡 `withApiHandler` — `bodySchema.parse()` sin `safeParse`

**Contexto:**
El middleware `withApiHandler` usa `bodySchema.parse(rawBody)` para validar el body.

**Problema:**
`parse()` lanza `ZodError` con todos los detalles de validación. Si un atacante envía un payload gigante con muchos campos inválidos, la respuesta de error podría ser masiva (potencial vector de DoS por tamaño de respuesta).

**Código (`lib/api-handler.ts` línea 191):**
```typescript
body = bodySchema.parse(rawBody)
```

**Impacto:**
- Respuestas de error potencialmente grandes.
- No hay límite en la cantidad de errores de validación reportados.

**Solución Propuesta:**
Usar `safeParse` y limitar la cantidad de errores reportados:

```typescript
const parseResult = bodySchema.safeParse(rawBody)
if (!parseResult.success) {
  const limitedErrors = parseResult.error.errors.slice(0, 5)
  return NextResponse.json(
    { error: 'Datos inválidos', details: limitedErrors },
    { status: 400 }
  )
}
body = parseResult.data
```

**Archivos Afectados:**
- `lib/api-handler.ts`

---

### 7.2 🟡 Sin Rate Limiting en Login

**Contexto:**
El middleware (`middleware.ts`) protege rutas con autenticación, pero no hay rate limiting en `/login` ni `/api/auth/*`.

**Problema:**
Un atacante puede hacer fuerza bruta ilimitada contra el login.

**Impacto:**
- Cuentas con contraseñas débiles pueden ser comprometidas.

**Solución Propuesta:**
Agregar rate limiting:
- En `middleware.ts`: usar un Map en memoria para trackear intentos por IP.
- O usar un servicio de rate limiting de Vercel/Cloudflare.
- Limitar a 5 intentos por IP cada 15 minutos.

**Archivos Afectados:**
- `middleware.ts`
- O configuración de infraestructura (Vercel/Cloudflare)

---

### 7.3 🟢 `better-auth` — `requireEmailVerification: false`

**Contexto:**
La configuración de Better Auth no requiere verificación de email.

**Problema:**
Cualquiera puede crear una cuenta con cualquier email sin verificar que sea suyo.

**Impacto:**
- Si existe algún endpoint para cambiar roles, un atacante podría crear una cuenta admin.
- Suplantación de identidad.

**Solución Propuesta:**
Evaluar si el negocio necesita verificación de email. Si el sistema es interno (solo empleados), considerar:
- Mantener `requireEmailVerification: false` pero restringir el registro a admins.
- O habilitar verificación si se abre el sistema a clientes.

**Archivos Afectados:**
- `lib/auth.ts`

---

## 8. Integridad de Datos y Race Conditions

### 8.1 🟡 `PaymentAllocation` — Sin Validación de `allocatedAmount <= project.balance`

**Contexto:**
Una allocation asigna un monto de un pago a un proyecto. No hay constraint que garantice que la allocation no exceda el balance del proyecto.

**Problema:**
Un bug en frontend o un endpoint podría crear una allocation mayor al balance. El sistema lo maneja como "sobrepago" (genera crédito), pero esto podría no ser la intención del usuario.

**Impacto:**
- Usuario puede crear créditos accidentalmente sin darse cuenta.
- Posible vector de fraude si un usuario malintencionado explota esto.

**Solución Propuesta:**
Agregar validación en el POST de pagos:

```typescript
for (const alloc of allocations) {
  const project = projects.find(p => p.id === alloc.projectId)
  if (project && alloc.allocatedAmount > Number(project.balance)) {
    return NextResponse.json(
      { error: `La allocation para el proyecto ${project.projectNumber} excede su balance` },
      { status: 400 }
    )
  }
}
```

**Nota:** Esta validación debe ser **opcional** o con confirmación explícita, porque hay casos válidos donde se quiere pagar de más (generar crédito).

**Archivos Afectados:**
- `app/api/payments/route.ts`

---

### 8.2 🟡 `ProjectAdjustment` — Sin Validación de `amount <= balance`

**Contexto:**
`ProjectAdjustment` permite ajustar (reducir) el balance de un proyecto. Se usa para descuentos o condonaciones.

**Problema:**
No hay validación de que el ajuste no exceda el balance actual. Un ajuste de $200.000 en un proyecto con balance de $100.000 generaría balance negativo (-$100.000).

**Impacto:**
- Posible error de captura que pase desapercibido.
- Inconsistencia contable.

**Solución Propuesta:**
Agregar validación en el endpoint de ajustes:

```typescript
if (adjustmentAmount > Number(project.balance)) {
  throw new BusinessError('El ajuste no puede exceder el balance del proyecto', 400)
}
```

O requerir confirmación explícita si el ajuste iguala o excede el balance.

**Archivos Afectados:**
- `app/api/projects/[id]/adjustments/route.ts`

---

### 8.3 🟢 Sobrepago — Sin Registro de Usuario Autorizador

**Contexto:**
Cuando un pago genera sobrepago, se crea un `CreditTransaction` tipo `OVERPAYMENT`.

**Problema:**
El `metadata` no incluye quién (qué usuario) realizó el pago que generó el sobrepago.

**Impacto:**
- Dificultad en auditoría.
- Si hay disputas, no se puede identificar al responsable.

**Solución Propuesta:**
Agregar `userId` al `metadata` del `CreditTransaction`. Requiere obtener el usuario autenticado desde la sesión.

**Archivos Afectados:**
- `app/api/payments/route.ts`
- `lib/auth.ts` (para obtener userId de la sesión)

---

## 9. Arquitectura y Patrones

### 9.1 🔴 Uso de `db:push` en Producción — Sin Migraciones Versionadas

**Contexto:**
El directorio `prisma/migrations/` solo contiene `.gitkeep`. El script `db:push` (línea 27 de `package.json`) se usa para aplicar cambios de schema.

**Problema:**
`db:push`:
- Puede eliminar columnas si se renombra un campo (pérdida de datos).
- No permite rollback.
- No se puede usar en CI/CD de forma segura.
- No hay historial de cambios de schema.

**Impacto:**
- Alto riesgo de pérdida de datos en producción.
- Imposible revertir cambios problemáticos.
- Colisiones si dos desarrolladores hacen cambios simultáneos.

**Solución Propuesta:**
Migrar inmediatamente a `prisma migrate dev` / `prisma migrate deploy`:

```bash
# Crear primera migración con el schema actual
npx prisma migrate dev --name init

# En CI/CD y producción, usar:
npx prisma migrate deploy
```

**Nota:** Los 5 planes técnicos pendientes (`plans/`) requieren cambios de schema. Sin migraciones, el riesgo es muy alto.

**Archivos Afectados:**
- `package.json` (scripts `db:push` → `db:migrate`)
- `prisma/migrations/` (crear migraciones iniciales)
- Documentación de deploy

---

### 9.2 🟡 `relationLoadStrategy: 'join'` — Preview Feature en Producción

**Contexto:**
El schema Prisma usa `previewFeatures = ["relationJoins"]` (línea 3).

**Problema:**
Las preview features de Prisma no tienen garantías de estabilidad. Pueden cambiar de comportamiento o ser eliminadas.

**Impacto:**
- Si Prisma elimina `relationJoins`, todas las queries que lo usan fallarán.
- Actualizaciones de Prisma pueden romper la aplicación.

**Solución Propuesta:**
- Monitorear el roadmap de Prisma.
- Tener un plan de contingencia para reemplazar `relationJoins` con `include` manual si es necesario.
- Considerar pin de versión de Prisma hasta que `relationJoins` sea estable.

**Archivos Afectados:**
- `prisma/schema.prisma`
- Todos los endpoints que usan `relationLoadStrategy: 'join'`

---

### 9.3 🟢 Inconsistencia en Manejo de `Decimal` vs `number`

**Contexto:**
El sistema mezcla `Decimal` (Prisma) y `number` (JavaScript) sin una estrategia consistente.

**Ejemplos:**
- `lib/business-logic/credit-management.ts`: retorna `number`.
- `app/api/payments/route.ts`: usa `new Decimal(amount)` para escritura.
- `lib/business-logic/project-balance.ts`: usa `number` para cálculos.

**Problema:**
`Number(new Decimal('0.1')) + Number(new Decimal('0.2'))` puede dar `0.30000000000000004` debido a la aritmética de punto flotante.

**Impacto:**
- Comparaciones de igualdad pueden fallar silenciosamente.
- Montos financieros pueden tener centavos de diferencia.

**Solución Propuesta:**
Establecer una regla clara:
- **DB/Prisma:** Siempre usar `Decimal`.
- **Cálculos financieros:** Usar `Decimal` o una librería de precisión arbitraria.
- **Frontend/Display:** Convertir a `number` solo al mostrar al usuario.
- **API responses:** Enviar `number` (JSON no soporta Decimal), pero documentar que pueden haber redondeos.

**Archivos Afectados:**
- Múltiples archivos en `lib/business-logic/`, `app/api/`, `hooks/`

---

### 9.4 🟢 `prisma.$transaction` — Sin Isolation Level Especificado

**Contexto:**
Las transacciones de Prisma en PostgreSQL usan `Serializable` por defecto.

**Problema:**
`Serializable` es el nivel más restrictivo. En transacciones largas (como la creación de pagos con múltiples allocations, installments, credit transactions y updates de balance), puede causar:
- Deadlocks.
- Performance degradada bajo carga.

**Solución Propuesta:**
Para lecturas no críticas, considerar `RepeatableRead`:

```typescript
await prisma.$transaction(async (tx) => {
  // ...
}, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
```

Mantener `Serializable` solo para operaciones financieras críticas.

**Archivos Afectados:**
- `app/api/payments/route.ts`
- `app/api/payments/[id]/route.ts`
- `app/api/customers/[id]/credit/refund/route.ts`

---

## 10. Dependencias y Build

### 10.1 🟢 Dependencias No Usadas (Detectadas por Knip)

**Contexto:**
`knip` detectó 22 dependencias no usadas y 7 devDependencies no usadas.

**Lista completa:**
- `@dnd-kit/modifiers`
- `@radix-ui/react-accordion`
- `@radix-ui/react-aspect-ratio`
- `@radix-ui/react-avatar`
- `@radix-ui/react-context-menu`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-menubar`
- `@radix-ui/react-navigation-menu`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-slider`
- `@radix-ui/react-switch`
- `@radix-ui/react-toast`
- `autoprefixer`
- `embla-carousel-react`
- `input-otp`
- `pino-pretty`
- `react-resizable-panels`
- `recharts`
- `rut.js`
- `tailwindcss-animate`
- `vaul`

**devDependencies no usadas:**
- `@types/pino`
- `eslint-config-next`
- `eslint-config-prettier`
- `eslint-plugin-prettier`
- `eslint-plugin-unused-imports`
- `tailwindcss`
- `tw-animate-css`

**Nota:** Algunas de estas dependencias pueden ser usadas indirectamente (ej: `tailwindcss` es usado por PostCSS aunque no se importe directamente en JS). Revisar manualmente antes de eliminar.

**Archivos Afectados:**
- `package.json`

---

### 10.2 🟢 Archivos Huérfanos (Detectados por Knip)

**Contexto:**
`knip` detectó 26 archivos que no son importados por ningún otro archivo del proyecto.

**Lista completa:**
- `check-payment-types.mjs`
- `check-regions.mjs`
- `components/calendar/dnd/draggable-event-card.tsx`
- `components/calendar/dnd/droppable-day-cell.tsx`
- `components/providers/database-keepalive-provider.tsx`
- `components/settings/sortable-aftersale-status-item.tsx`
- `components/settings/sortable-status-item.tsx`
- `components/settings/sortable-visit-status-item.tsx`
- `components/ui/radio-group.tsx`
- `components/ui/rut-input.tsx`
- `components/ui/scroll-area.tsx`
- `components/ui/use-mobile.tsx`
- `hooks/use-database-keepalive.ts`
- `hooks/use-rut-input.ts`
- `lib/rut-validations.ts`
- `lib/test-utils/api-test-helpers.ts`
- `scripts/create-admin.ts`
- `scripts/delete-transactional-data.ts`
- `scripts/fix-overpayment-credit.ts`
- `scripts/populate-project-balances.ts`
- `tests/e2e/auth.setup.ts`
- `tests/e2e/helpers/wait-for-table.ts`
- `tests/e2e/page-objects/dialogs/new-visit.dialog.ts`
- `tests/fixtures/custom-matchers.ts`
- `tests/fixtures/generate-fixtures.ts`
- `update-payment-types.mjs`

**Nota:** Algunos de estos archivos pueden ser entry points (ej: `auth.setup.ts` para Playwright) o scripts one-shot. Revisar manualmente antes de eliminar.

**Archivos Afectados:**
- Múltiples archivos en la raíz y subdirectorios.

---

### 10.3 🟢 Prettier Warnings en Lint

**Contexto:**
`npm run lint` reporta 90 warnings de `prettier/prettier`.

**Problema:**
Warnings de Prettier en el lint indican que el código no está formateado consistentemente.

**Solución Propuesta:**
Ejecutar `npm run format` para formatear todo el codebase, y considerar agregar un pre-commit hook de Husky para evitar que código sin formatear llegue al repo.

**Archivos Afectados:**
- Todo el codebase (`**/*.{ts,tsx,js,jsx,json,md,css}`)

---

---

## 11. Autorización y Control de Acceso

### 11.1 🔴 Sin Verificación de Roles en NINGÚN Endpoint

**Archivos:** Todos los endpoints de API, `middleware.ts`

**Contexto:**
El middleware (`middleware.ts`) solo verifica autenticación (sesión válida), pero **no verifica roles**. No hay un solo endpoint que verifique `session.user.role === 'admin'` antes de permitir operaciones destructivas o sensibles.

**Problema:**
Cualquier usuario autenticado, sin importar su rol, puede:
- Eliminar clientes, proyectos, pagos, aftersales, visitas.
- Crear ajustes de proyecto (descuentos, condonaciones).
- Crear nuevos usuarios (ver issue 11.2).
- Importar datos masivos (customers, payments, projects).
- Devolver créditos a clientes.
- Reordenar eventos de calendario.

**Impacto:**
- Un usuario con rol `user` tiene los mismos privilegios que un `admin`.
- Si una cuenta es comprometida, el atacante tiene control total.
- No hay separación de responsabilidades (SoD).

**Solución Propuesta:**
Opción A — Middleware de autorización:
```typescript
// middleware.ts o lib/with-authz.ts
export function requireRole(handler: Handler, roles: string[]) {
  return async (request: Request, context: Context) => {
    const session = await getSession(request)
    if (!roles.includes(session?.user?.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    return handler(request, context)
  }
}
```

Opción B — Verificación en cada endpoint sensible:
```typescript
// En DELETE /api/projects/[id]/route.ts
const session = await getSession()
if (session?.user?.role !== 'admin') {
  return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })
}
```

**Archivos Afectados:**
- `middleware.ts` (agregar lógica de autorización)
- Todos los endpoints DELETE, POST de import, PUT de ajustes
- `app/api/users/route.ts` (especialmente crítico)

---

### 11.2 🔴 `/api/users` — Endpoint Sin Autenticación ni Validación

**Archivo:** `app/api/users/route.ts`

**Contexto:**
Este endpoint POST permite crear usuarios directamente.

**Problema:**
- **No usa `withApiHandler`** — no tiene validación automática de body.
- **No verifica autenticación** — no hay llamada a `getSession()` ni middleware de auth.
- **No hay validación Zod** — hay un TODO comentado en línea 73:
  ```typescript
  // TODO: Add validation with Zod for production use
  ```
- **Sin protección contra creación de admins** — si el schema permite enviar `role`, cualquiera puede crear un usuario admin.

**Impacto:**
- Cualquier persona que conozca la URL puede crear usuarios en el sistema.
- Potencial escalada de privilegios si el role es enviable.
- Sin validación de email, nombre, o password.

**Solución Propuesta:**
1. Envolver el endpoint con `withApiHandler`.
2. Agregar validación Zod estricta:
   ```typescript
   const createUserSchema = z.object({
     name: z.string().min(2).max(100),
     email: z.string().email(),
     password: z.string().min(8),
     role: z.enum(['user', 'admin']).default('user'),
   })
   ```
3. Requerir autenticación + rol admin para crear usuarios.
4. Eliminar el TODO y implementar la validación.

**Archivos Afectados:**
- `app/api/users/route.ts`

---

### 11.3 🔴 `/api/cron/reconcile-balances` — Sin Protección CRON_SECRET

**Archivo:** `middleware.ts:32` + `app/api/cron/reconcile-balances/route.ts`

**Contexto:**
El middleware permite acceso a `/api/cron/*` sin autenticación:
```typescript
// middleware.ts línea 32
pathname.startsWith('/api/cron/') ||  // ← Permite acceso sin auth
```

El comentario dice "tiene su propia autenticación via CRON_SECRET", pero **el endpoint nunca verifica el CRON_SECRET**.

**Problema:**
Cualquier persona puede ejecutar el cron manualmente enviando un POST a `/api/cron/reconcile-balances`. Esto puede:
- Sobrecargar la DB con queries de reconciliación.
- Ocultar actividad maliciosa entre ejecuciones legítimas.
- Ser usado como vector de DoS si se llama repetidamente.

**Solución Propuesta:**
Agregar verificación de CRON_SECRET en el endpoint:
```typescript
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... lógica de reconciliación
}
```

**Archivos Afectados:**
- `app/api/cron/reconcile-balances/route.ts`
- `app/api/cron/*/route.ts` (todos los cron endpoints)
- `.env.example` (agregar CRON_SECRET)

---

## 12. Endpoints de Import/Export

### 12.1 🟡 Endpoints de Export Sin Límite de Registros (OOM Risk)

**Archivos:**
- `app/api/customers/export/route.ts:33`
- `app/api/payments/export/route.ts:80`
- `app/api/projects/export/route.ts:62`

**Contexto:**
Los endpoints de export hacen `findMany()` sin límite para obtener todos los registros y generar un archivo Excel.

**Problema:**
Si la DB tiene 100K+ registros:
- Se cargan TODOS en memoria del servidor Node.js.
- Se construye un workbook de xlsx en memoria.
- El proceso puede exceder el límite de memoria (512MB en Vercel hobby, 1GB+ en pro).
- Resultado: **OOM crash** o timeout de 60s.

```typescript
// customers/export - sin limit
const allCustomers = await prisma.customer.findMany({
  include: { projects: true, payments: true }  // ← Incluye relaciones
})
```

**Impacto:**
- Crash del servidor en producción con datos reales.
- Timeout que retorna error 504 al usuario.
- En Vercel, el serverless function se termina y se pierde el request.

**Solución Propuesta:**
Opción A — Límite máximo con advertencia:
```typescript
const MAX_EXPORT = 10000
const allCustomers = await prisma.customer.findMany({
  take: MAX_EXPORT,
  // ...
})
if (totalCount > MAX_EXPORT) {
  // Agregar nota en el Excel: "Export limitado a 10K registros"
}
```

Opción B — Streaming para archivos grandes:
- Usar `@fast-csv` o similar para streaming.
- Retornar un `ReadableStream` como response.
- Más complejo pero soporta cualquier volumen.

**Archivos Afectados:**
- `app/api/customers/export/route.ts`
- `app/api/payments/export/route.ts`
- `app/api/projects/export/route.ts`

---

### 12.2 🟡 `/api/payments/import` — Sin Recálculo de Balance Post-Import

**Archivo:** `app/api/payments/import/route.ts:123-142`

**Contexto:**
El endpoint de importación de pagos crea payments y allocations desde un archivo Excel.

**Problema:**
Crea los payments y allocations pero **NO llama a `updateProjectBalance()`** después de cada payment. Los balances de los proyectos importados quedan desincronizados hasta que el cron nocturno los corrija.

```typescript
const payment = await prisma.$transaction(async (tx) => {
  await tx.payment.create({ ... })
  await tx.paymentAllocation.create({ ... })
  // ❌ Falta: updateProjectBalance(projectId, tx)
})
```

**Impacto:**
- Los balances de proyectos importados serán incorrectos durante horas (hasta el cron).
- Si el cron falla, los balances quedan incorrectos indefinidamente.
- Usuarios ven balances erróneos inmediatamente después de importar.

**Solución Propuesta:**
Agregar `updateProjectBalance(projectId, tx)` dentro de la transacción de cada payment:
```typescript
const payment = await prisma.$transaction(async (tx) => {
  const createdPayment = await tx.payment.create({ ... })
  await tx.paymentAllocation.create({ ... })
  await updateProjectBalance(projectId, tx)  // ← Agregar
  return createdPayment
})
```

**Archivos Afectados:**
- `app/api/payments/import/route.ts`

---

### 12.3 🟡 `/api/customers/import` — Sin Límite de Batch Size

**Archivo:** `app/api/customers/import/route.ts:83-91`

**Contexto:**
El endpoint crea un `$transaction` con una operación por cada cliente importado.

**Problema:**
Si se envían 10K clientes en un solo request:
- La transacción tendrá 10K operaciones.
- Puede exceder el timeout de la DB.
- Puede exceder el timeout del serverless function (60s en Vercel).
- Bloquea tablas durante la transacción.

```typescript
const created = await prisma.$transaction(
  validatedCustomers.map((customer) =>
    prisma.customer.create({ ... })
  )
)
```

**Solución Propuesta:**
Limitar el batch size y chunkear:
```typescript
const BATCH_SIZE = 500
const chunks = chunk(validatedCustomers, BATCH_SIZE)
for (const chunk of chunks) {
  await prisma.$transaction(chunk.map(c => prisma.customer.create({ data: c })))
}
```

**Archivos Afectados:**
- `app/api/customers/import/route.ts`
- `app/api/payments/import/route.ts`
- `app/api/projects/import/route.ts`

---

## 13. Inconsistencias de Patrones API

### 13.1 🟡 `withLogging` vs `withApiHandler` — Doble Patrón Inconsistente

**Archivo:** `lib/api-handler.ts:158`

**Contexto:**
Existen dos wrappers para endpoints de API:
- `withApiHandler` — valida UUID, parsea body con Zod, maneja errores, incluye logging.
- `withLogging` — solo agrega logging estructurado, sin validación.

**Problema:**
~20 endpoints usan `withLogging` directo en vez de `withApiHandler`:

**Endpoints que usan `withLogging` directo (sin validación automática):**
- GET `/api/payments`
- GET `/api/projects`
- GET `/api/customers`
- GET `/api/calendar-events`
- GET `/api/installments`
- GET `/api/visits`
- GET `/api/customers/[id]/account`
- GET `/api/customers/[id]/credit`
- Todos los endpoints de export
- Todos los endpoints de import

**Endpoints que usan `withApiHandler`:**
- POST `/api/payments`
- PUT/DELETE `/api/payments/[id]`
- POST `/api/projects`
- PUT `/api/projects/[id]`
- etc.

Los que usan `withLogging` directo:
- No tienen validación de UUID en params.
- No tienen parsing de body con Zod automático.
- Manejo de errores inconsistente.

**Solución Propuesta:**
Crear un `withApiHandlerForGET` que no requiera body schema pero mantenga las demás validaciones:
```typescript
export function withApiHandlerForGET(
  handler: GetHandler,
  options?: { validateParams?: boolean }
) {
  return withLogging(async (request, context) => {
    if (options?.validateParams !== false) {
      validateUuid(context.params)
    }
    return handler(request, context)
  })
}
```

O migrar todos los GET a `withApiHandler` con `bodySchema: z.undefined()`.

**Archivos Afectados:**
- `lib/api-handler.ts`
- ~20 archivos de endpoints GET

---

### 13.2 🟡 SQL de Búsqueda Duplicado en 5+ Endpoints

**Archivos:**
- `app/api/payments/route.ts:92-101`
- `app/api/customers/route.ts:44-49`
- `app/api/projects/search/route.ts`
- `lib/queries/project-list.ts:61-68`
- `app/api/payments/search-projects/route.ts:38-45`

**Contexto:**
El patrón de búsqueda con `normalize_text()` está copiado en múltiples endpoints.

**Problema:**
```sql
WHERE normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
   OR normalize_text(c.email) LIKE normalize_text(${`%${search}%`})
   OR normalize_text(p."projectNumber") LIKE normalize_text(${`%${search}%`})
```

Duplicado en al menos 5 lugares. Si se necesita:
- Cambiar la lógica de búsqueda (ej: agregar búsqueda por teléfono).
- Agregar soporte para búsqueda fuzzy.
- Escapar caracteres especiales de LIKE (`%`, `_`).

Hay que modificar todos los endpoints individualmente.

**Solución Propuesta:**
Crear una función helper:
```typescript
// lib/utils/search.ts
export function buildSearchCondition(
  fields: string[],
  search: string
): Sql {
  const escaped = search.replace(/[%_]/g, '\\$&')
  const patterns = fields.map(f =>
    sql`normalize_text(${Prisma.sql([f])}) LIKE normalize_text(${`%${escaped}%`})`
  )
  return Prisma.sql([patterns.join(' OR ')])
}
```

**Archivos Afectados:**
- `lib/utils/search.ts` (nuevo)
- 5+ archivos de endpoints

---

### 13.3 🟡 Directorios `*-with-update` — Código Duplicado/Experimental

**Archivos:**
- `app/api/project-events-with-update/route.ts`
- `app/api/aftersale-events-with-update/route.ts`
- `app/api/visit-events-with-update/route.ts`

**Contexto:**
Existen directorios duplicados para eventos de calendario con funcionalidad de update.

**Problema:**
No está claro:
- Cuáles son los endpoints "oficiales" (`project-events/` vs `project-events-with-update/`).
- Si los originales son legacy o los nuevos son experimentales.
- Si ambos están en uso por el frontend.

**Impacto:**
- Confusión para desarrolladores nuevos.
- Bugs fixados en uno pueden no replicarse en el otro.
- Mayor superficie de mantenimiento.

**Solución Propuesta:**
1. Identificar cuál versión usa el frontend.
2. Consolidar en un solo endpoint con funcionalidad opcional.
3. Eliminar el duplicado.
4. Documentar la decisión.

**Archivos Afectados:**
- `app/api/project-events-with-update/`
- `app/api/aftersale-events-with-update/`
- `app/api/visit-events-with-update/`
- Frontend components que llaman estos endpoints

---

## 14. Timezone y Manejo de Fechas

### 14.1 🟡 `getInstallmentStatus` — Timezone del Servidor

**Archivo:** `lib/business-logic/installments.ts:171-177`

**Contexto:**
La función determina si una cuota está "pagada" (vencida) comparando con `new Date()`.

**Problema:**
```typescript
export function getInstallmentStatus(dueDate: Date): 'paid' | 'pending' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due <= today ? 'paid' : 'pending'
}
```

`new Date()` usa la timezone del servidor. Si el servidor está en UTC y el cliente en America/Santiago (UTC-4 en invierno):
- Una cuota con `dueDate = 2025-05-15 00:00:00 CLT` se almacena como `2025-05-15 04:00:00 UTC`.
- El servidor a las `2025-05-15 02:00:00 UTC` (que es `2025-05-14 22:00:00 CLT`) ve `today = 2025-05-15 UTC`.
- La cuota aparece como "paid" 2 horas antes de que venza para el cliente.

**Impacto:**
- Cuotas aparecen como vencidas antes de lo esperado.
- Diferencias entre lo que ve el usuario y lo que muestra el sistema.

**Solución Propuesta:**
Usar timezone consistente:
```typescript
import { formatDate, toZonedTime } from 'date-fns-tz'

const TZ = 'America/Santiago'
const today = toZonedTime(new Date(), TZ)
const due = toZonedTime(dueDate, TZ)
```

O almacenar fechas como strings `YYYY-MM-DD` sin componente de tiempo.

**Archivos Afectados:**
- `lib/business-logic/installments.ts`
- Cualquier función que compare fechas con "hoy"

---

### 14.2 🟡 `Visit.POST` — `new Date(body.date)` Sin Timezone

**Archivo:** `app/api/visits/route.ts:81`

**Contexto:**
El endpoint crea visitas parseando la fecha con `new Date(body.date)`.

**Problema:**
```typescript
date: new Date(body.date),  // ← "2025-05-15" → UTC midnight
```

Si `body.date` es `"2025-05-15"` (sin hora):
- JavaScript lo interpreta como `2025-05-15 00:00:00 UTC`.
- En Chile (CLT = UTC-4), esto es `2025-05-14 20:00:00`.
- El usuario ve la visita un día antes en la UI.

**Impacto:**
- Visitas agendadas para el 15 aparecen como el 14.
- Confusión para el equipo que usa el calendario.

**Solución Propuesta:**
Parsear explícitamente como fecha local:
```typescript
import { parseISO, toZonedTime } from 'date-fns-tz'

const TZ = 'America/Santiago'
const localDate = toZonedTime(parseISO(body.date + 'T00:00:00'), TZ)
```

O mejor, almacenar como `@db.Date` (sin componente de tiempo) en Prisma:
```prisma
date DateTime @db.Date  // Ya usado en ProjectEvent, VisitEvent
```

**Archivos Afectados:**
- `app/api/visits/route.ts`
- `prisma/schema.prisma` (cambiar `Visit.date` a `@db.Date`)

---

### 14.3 🟡 `calculatePaymentDistribution` — No Considera Moneda

**Archivo:** `lib/business-logic/credit-management.ts:97-121`

**Contexto:**
La función distribuye un pago entre proyectos del cliente.

**Problema:**
Asume que `projectBalance` y `paymentAmount` están en la misma moneda. Si un proyecto está en USD y el pago en CLP, la distribución será incorrecta.

**Solución Propuesta:**
Agregar validación de moneda o parámetro de conversión:
```typescript
if (project.currency !== paymentCurrency) {
  throw new BusinessError(
    `Moneda del proyecto (${project.currency}) no coincide con moneda del pago (${paymentCurrency})`,
    400
  )
}
```

**Archivos Afectados:**
- `lib/business-logic/credit-management.ts`

---

## 15. Base de Datos — Integridad Adicional

### 15.1 🟡 `CreditTransaction` — Sin Índice Compuesto `[customerId, type]`

**Archivo:** `prisma/schema.prisma:478-506`

**Contexto:**
`getCustomerCreditBalance` filtra por `customerId` y agrupa por tipo.

**Problema:**
Hay índice en `[customerId, createdAt]` pero no en `[customerId, type]`. Consultas que filtran por tipo de transacción para un cliente específico no usan índice compuesto óptimo.

**Solución Propuesta:**
```prisma
@@index([customerId, createdAt(sort: Desc)])
@@index([customerId, type])  // ← Agregar
@@index([type])
```

**Archivos Afectados:**
- `prisma/schema.prisma`

---

### 15.2 🟡 `ProjectAdjustment` — Sin Restricción de `amount > 0`

**Archivo:** `prisma/schema.prisma:517-535`

**Contexto:**
`ProjectAdjustment` almacena montos de descuentos/condonaciones.

**Problema:**
El schema no tiene constraint de CHECK para garantizar que `amount` sea positivo. La validación está solo en el Zod schema del API, pero un INSERT directo a la DB podría crear ajustes negativos.

**Solución Propuesta:**
Agregar validación a nivel de aplicación con trigger o constraint:
```prisma
// No soportado nativamente en Prisma, pero se puede agregar con SQL raw en migración:
// ALTER TABLE "project_adjustments" ADD CONSTRAINT positive_amount CHECK (amount > 0);
```

O al menos validar en el endpoint (ya debería estar hecho, pero verificar).

**Archivos Afectados:**
- `prisma/schema.prisma`
- `app/api/projects/[id]/adjustments/route.ts`

---

### 15.3 🟡 `Aftersale.tasks` y `ProjectEvent.tasks` — JSON sin Constraint de Tipo

**Archivos:** `prisma/schema.prisma:349, 423`

**Contexto:**
Los campos `tasks` son de tipo `Json` con default `"[]"`.

**Problema:**
PostgreSQL JSON type acepta cualquier JSON válido (objetos, strings, numbers, null). No hay constraint que garantice que siempre sea un array.

**Solución Propuesta:**
Agregar constraint a nivel de DB mediante migración raw:
```sql
ALTER TABLE "Aftersale" ADD CONSTRAINT tasks_is_array
  CHECK (jsonb_typeof(tasks) = 'array');

ALTER TABLE "project_events" ADD CONSTRAINT tasks_is_array
  CHECK (jsonb_typeof(tasks) = 'array');
```

Y validar con Zod en los endpoints (ya cubierto en issue 5.1).

**Archivos Afectados:**
- `prisma/schema.prisma`
- Migraciones SQL

---

### 15.4 🟡 `Project` — Sin Índice GIN para Búsqueda en `projectNumber`

**Archivo:** `prisma/schema.prisma:156-197`

**Contexto:**
Hay `@@unique([projectNumber])` pero las búsquedas usan `normalize_text(p."projectNumber") LIKE normalize_text(...)`.

**Problema:**
El índice unique no ayuda con búsquedas LIKE que usan funciones. Con miles de proyectos, la búsqueda será secuencial.

**Solución Propuesta:**
Agregar extensión `pg_trgm` e índice GIN (requiere migración SQL raw):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_project_number_search ON "Project"
  USING GIN (normalize_text("projectNumber") gin_trgm_ops);
```

**Archivos Afectados:**
- `prisma/schema.prisma`
- Migración SQL

---

### 15.5 🟡 `Customer.DELETE` — Cascade Sin Advertencia

**Archivo:** `app/api/customers/[id]/route.ts:78-95` + `prisma/schema.prisma`

**Contexto:**
Eliminar un cliente tiene `onDelete: Cascade` en el schema para projects, payments, creditTransactions.

**Problema:**
No hay verificación de la cantidad de datos que se perderán. Un cliente con 50 proyectos, 200 pagos y 30 transacciones de crédito se elimina sin advertencia.

**Solución Propuesta:**
Agregar conteo previo y requerir confirmación:
```typescript
const counts = await Promise.all([
  prisma.project.count({ where: { customerId: id } }),
  prisma.payment.count({ where: { customerId: id } }),
  prisma.creditTransaction.count({ where: { customerId: id } }),
])
// Retornar counts al frontend para confirmación
```

**Archivos Afectados:**
- `app/api/customers/[id]/route.ts`
- Frontend delete dialog

---

## 16. Optimización de Base de Datos y Queries

### 16.1 🟡 Índices Redundantes en el Schema

**Archivo:** `prisma/schema.prisma`

**Contexto:**
PostgreSQL crea automáticamente índices para columnas `@unique` y el prefijo de índices compuestos `@@unique` ya cubre queries que filtran por las primeras columnas.

**Índices redundantes identificados:**

| Tabla | Índice Redundante | Línea | Razón |
|-------|------------------|-------|-------|
| `User` | `@@index([email])` | 28 | `@unique` ya crea índice automático |
| `CommissionTier` | `@@index([paymentMethodId])` | 227 | `@@unique([paymentMethodId, minInstallments, maxInstallments])` ya lo cubre como prefijo |
| `PaymentAllocation` | `@@index([projectId])` | 287 | `@@index([projectId, paymentId])` ya lo cubre |
| `BadgeColor` | `@@index([order])` | 111 | Tabla de catálogo (~10 filas), overhead innecesario |
| `BadgeColor` | `@@index([isActive])` | 112 | Tabla de catálogo (~10 filas), overhead innecesario |

**Impacto:**
- Cada índice redundante agrega overhead en cada INSERT/UPDATE/DELETE.
- Desperdicio de espacio en disco.
- En tablas pequeñas el impacto es mínimo, pero es deuda técnica.

**Solución Propuesta:**
Eliminar los 5 índices redundantes del schema y generar migración.

**Archivos Afectados:**
- `prisma/schema.prisma`

---

### 16.2 🟡 Índices Faltantes para Patrones de Query Comunes

**Archivo:** `prisma/schema.prisma`

**Contexto:**
Varias queries filtran por combinaciones de columnas que no tienen índices compuestos.

**Índices faltantes:**

```prisma
// ProjectStatus — queries filtran por isFinal + isActive
@@index([isFinal, isActive])

// AftersaleStatus — búsqueda de activos no finales
@@index([isFinal, isActive])

// CreditTransaction — queries de balance por tipo de cliente
@@index([customerId, type])
```

**Impacto:**
- Queries de calendar-events y project search hacen JOIN con ProjectStatus filtrando por `isFinal` + `isActive` sin índice compuesto.
- `getCustomerCreditBalance` filtra por `customerId` pero no tiene índice optimizado para queries que también agrupan por tipo.

**Archivos Afectados:**
- `prisma/schema.prisma`

---

### 16.3 🔴 `updateMultipleProjectBalances` — N+1 Queries Secuenciales (ALTO IMPACTO)

**Archivo:** `lib/business-logic/update-project-balance.ts:103-109`

**Contexto:**
Después de crear/eliminar un pago, se actualizan los balances de todos los proyectos afectados. Esta es la función más llamada en la transacción más crítica del sistema.

**Problema:**
```typescript
// ACTUAL: 2N queries secuenciales dentro de transacción
export async function updateMultipleProjectBalances(
  projectIds: string[],
  tx?: PrismaTransaction
): Promise<number> {
  for (const projectId of projectIds) {
    await updateProjectBalance(projectId, tx)  // findUnique + update
  }
  return projectIds.length
}
```

Para un pago FIFO con 5 proyectos = **10 queries secuenciales** dentro de la misma transacción. Cada query espera a la anterior, manteniendo locks de DB.

**Impacto:**
- Transacciones más largas = mayor riesgo de deadlock.
- Mayor latencia en el endpoint POST de pagos.
- A escala (100+ proyectos por pago), insostenible.

**Solución Propuesta:**
```typescript
// OPTIMIZADO: 2 queries batch
export async function updateMultipleProjectBalances(
  projectIds: string[],
  tx?: PrismaTransaction
): Promise<number> {
  const db = tx || prisma

  // 1 query: leer todos los projects con sus allocations
  const projects = await db.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      id: true,
      totalAmount: true,
      paymentAllocations: { select: { allocatedAmount: true } },
    },
  })

  // Calcular balances en memoria
  const updates = projects.map((project) => {
    const totalPaid = project.paymentAllocations.reduce(
      (sum, a) => sum + Number(a.allocatedAmount), 0
    )
    const balance = Number(project.totalAmount) - totalPaid
    return db.project.update({
      where: { id: project.id },
      data: { balance: new Decimal(balance) },
    })
  })

  // 1 query: actualizar todos en paralelo
  await Promise.all(updates)
  return projects.length
}
```

**Resultado esperado:** De 2N queries secuenciales → 2 queries paralelas. En un pago con 5 proyectos: de ~200ms a ~30ms.

**Archivos Afectados:**
- `lib/business-logic/update-project-balance.ts`
- `app/api/cron/reconcile-balances/route.ts` (puede usar la misma optimización)

---

### 16.4 🔴 Transacción POST /api/payments — Excesivamente Larga

**Archivo:** `app/api/payments/route.ts:308-430`

**Contexto:**
La transacción de creación de pagos es la más compleja del sistema. Maneja allocations, installments, comisiones, créditos y sobrepagos.

**Problema:**
La transacción tiene **~15+ queries secuenciales**:
1. Crear payment + allocations + installments
2. Promise.all con N updates de installments (distribución de neto)
3. Leer credit balance + project (Promise.all)
4. Crear credit transaction (si aplica crédito)
5. `updateMultipleProjectBalances` (2N queries secuenciales)
6. Leer proyectos actualizados (findMany)
7. Loop: para cada proyecto con sobrepago → update + create

El loop de sobrepagos es particularmente problemático:
```typescript
for (const project of updatedProjects) {
  if (Number(project.balance) < 0) {
    await tx.project.update({ where: { id: project.id }, data: { balance: new Decimal(0) } })
    await tx.creditTransaction.create({ data: { ... } })
  }
}
```

**Impacto:**
- Bloquea otros writes a Project/Payment durante la transacción.
- Mayor probabilidad de deadlocks bajo carga concurrente.
- Timeout de transacción si hay muchos proyectos.

**Solución Propuesta:**
Usar `createMany` y `updateMany` para sobrepagos:
```typescript
const overpaidProjects = updatedProjects.filter(
  p => Number(p.balance) < -FINANCIAL.TOLERANCE
)
if (overpaidProjects.length > 0) {
  await tx.project.updateMany({
    where: { id: { in: overpaidProjects.map(p => p.id) } },
    data: { balance: new Decimal(0) },
  })
  await tx.creditTransaction.createMany({
    data: overpaidProjects.map(p => ({
      customerId,
      amount: new Prisma.Decimal(Math.abs(Number(p.balance))),
      type: CreditTransactionType.OVERPAYMENT,
      projectId: p.id,
      paymentId: newPayment.id,
      metadata: {
        paymentAmount: amount,
        projectBalance: Number(p.balance),
        paymentDate: paymentDate.toISOString(),
      },
    })),
  })
}
```

Combinado con la optimización de `updateMultipleProjectBalances` (issue 16.3), la transacción pasa de ~15+ queries a ~6-8.

**Archivos Afectados:**
- `app/api/payments/route.ts`

---

### 16.5 🔴 Exports Sin Paginación — Riesgo de OOM

**Archivos:**
- `app/api/projects/export/route.ts:66-83`
- `app/api/payments/export/route.ts:88-115`
- `app/api/customers/export/route.ts:27-33`

**Contexto:**
Los endpoints de export generan archivos Excel descargando todos los registros de una tabla.

**Problema:**
```typescript
// projects/export — carga TODOS los proyectos con relaciones profundas
const allProjects = await prisma.project.findMany({
  relationLoadStrategy: 'join',
  where,
  orderBy: { createdAt: 'desc' },
  include: {
    customer: { select: { id: true, name: true, phone: true, email: true } },
    projectStatus: { include: { color: true } },
  },
})
// Luego filtra en memoria (líneas 86-111)
```

Si la DB tiene 100K+ registros:
- Se cargan TODOS en memoria del servidor Node.js.
- Se construye un workbook de xlsx en memoria.
- En Vercel: límite de 512MB (hobby) o 1GB+ (pro) → **OOM crash**.
- Timeout de serverless function (60s en Vercel).

Además, el filtro de búsqueda se aplica **en memoria** en vez de en la DB.

**Impacto:**
- Crash del servidor en producción con datos reales.
- Error 504 para el usuario.
- Función serverless terminada abruptamente.

**Solución Propuesta:**

Opción A — Límite máximo con advertencia:
```typescript
const MAX_EXPORT = 10000
const allProjects = await prisma.project.findMany({
  where,  // ← Filtro en DB, no en memoria
  take: MAX_EXPORT,
  select: {  // ← select específico, no include completo
    id: true,
    projectNumber: true,
    projectName: true,
    totalAmount: true,
    balance: true,
    customer: { select: { id: true, name: true } },
    projectStatus: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: 'desc' },
})
```

Opción B — Streaming para archivos grandes (más complejo):
- Usar `@fast-csv` o similar para streaming.
- Retornar un `ReadableStream` como response.
- Soporta cualquier volumen de datos.

**Archivos Afectados:**
- `app/api/projects/export/route.ts`
- `app/api/payments/export/route.ts`
- `app/api/customers/export/route.ts`

---

### 16.6 🟡 Two-Step Lookups — Doble Roundtrip Innecesario

**Archivos:**
- `app/api/payments/search-projects/route.ts:35-64`
- `app/api/projects/search/route.ts:41-74`
- `app/api/aftersales/search-active/route.ts:56-111`

**Contexto:**
Tres endpoints usan el patrón "obtener IDs primero, luego datos completos" para búsquedas con texto.

**Problema:**
```typescript
// Paso 1: Raw query para obtener IDs
const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`
  SELECT p.id FROM "Project" p JOIN "Customer" c ...
  WHERE normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
`

// Paso 2: Prisma query para obtener datos completos
const projects = await prisma.project.findMany({
  where: { id: { in: matchingIds.map(r => r.id) } },
  include: { customer: true }
})
```

Dos roundtrips a la DB cuando uno bastaría. El patrón de "IDs primero" es útil para paginación con conteo separado, pero innecesario aquí con LIMIT 50.

**Impacto:**
- Latencia duplicada para cada búsqueda.
- Mayor carga en la DB.

**Solución Propuesta:**
Un solo query con `where` directo:
```typescript
const projects = await prisma.project.findMany({
  where: {
    totalAmount: { gt: 0 },
    balance: { gt: FINANCIAL.BALANCE_TOLERANCE },
    OR: [
      { projectNumber: { contains: q } },
      { projectName: { contains: q } },
      { customer: { name: { contains: q } } },
    ],
  },
  select: {
    id: true,
    projectNumber: true,
    balance: true,
    customer: { select: { id: true, name: true } },
  },
  take: limit,
  orderBy: { createdAt: 'desc' },
})
```

**Resultado esperado:** Reduce roundtrips de 2 a 1 por request (~50% menos latencia de DB).

**Archivos Afectados:**
- `app/api/payments/search-projects/route.ts`
- `app/api/projects/search/route.ts`
- `app/api/aftersales/search-active/route.ts`

---

### 16.7 🟡 Calendar Events — Includes Excesivamente Profundos

**Archivo:** `app/api/calendar-events/route.ts:58-86`

**Contexto:**
El endpoint de eventos de calendario carga 3 tipos de eventos (project, aftersale, visit) con relaciones profundamente anidadas.

**Problema:**
```typescript
// ACTUAL: customer: true → TODOS los campos del customer
include: {
  project: {
    include: {
      customer: true,  // ← 15+ campos innecesarios
      projectStatus: { include: { color: true } },
      uninstallTags: { include: { uninstallTag: { include: { color: true } } } }
    }
  },
  teamTags: { include: { color: true } }
}
```

`customer: true` incluye todos los campos (id, name, phone, email, createdAt, updatedAt). Lo mismo se repite para los 3 tipos de eventos.

**Impacto:**
- Payload de red ~40-60% más grande de lo necesario.
- Mayor tiempo de serialización JSON.
- Mayor consumo de memoria en el servidor.

**Solución Propuesta:**
```typescript
include: {
  project: {
    select: {
      id: true,
      projectNumber: true,
      projectName: true,
      customer: { select: { id: true, name: true, phone: true } },
      projectStatus: {
        select: {
          id: true,
          name: true,
          color: { select: { bgClass: true, textClass: true } },
        },
      },
    },
  },
  teamTags: {
    select: {
      id: true,
      name: true,
      abbreviation: true,
      color: { select: { bgClass: true, textClass: true } },
    },
  },
}
```

**Archivos Afectados:**
- `app/api/calendar-events/route.ts`

---

### 16.8 🟡 Queries Secuenciales que Pueden Ser Paralelas

**Archivos:**
- `app/api/customers/[id]/credit/route.ts:21-54`
- `app/api/payments/[id]/route.ts` (DELETE)
- `app/api/projects/[id]/route.ts` (PUT)

**Contexto:**
Varios endpoints ejecutan queries independientes de forma secuencial cuando podrían ejecutarse en paralelo.

**Problema 1 — `GET /api/customers/[id]/credit`:**
```typescript
// ACTUAL: secuencial
const customer = await prisma.customer.findUnique({...})
const creditBalance = await getCustomerCreditBalance(customerId)
```

**Solución:**
```typescript
const [customer, creditBalance] = await Promise.all([
  prisma.customer.findUnique({...}),
  getCustomerCreditBalance(customerId)
])
```

**Problema 2 — `DELETE /api/payments/[id]`:**
```typescript
// ACTUAL: lectura fuera de transacción, luego transacción
const existingPayment = await prisma.payment.findUnique({...})
await prisma.$transaction(async (tx) => { ... })
```

Esto también crea una **race condition**: entre la lectura inicial y la transacción, el pago podría ser modificado/eliminado por otra request.

**Solución:**
```typescript
await prisma.$transaction(async (tx) => {
  const existingPayment = await tx.payment.findUnique({...})
  // ... resto de lógica dentro de la transacción
})
```

**Problema 3 — `PUT /api/projects/[id]`:**
```typescript
// ACTUAL: cálculo de balance fuera de transacción
const allocationsSum = await prisma.paymentAllocation.aggregate({
  where: { projectId: id },
  _sum: { allocatedAmount: true }
})
const totalPaid = allocationsSum._sum.allocatedAmount?.toNumber() || 0
updatedBalance = new Decimal(newTotalAmount - totalPaid)

// Luego en transacción
await prisma.$transaction(async (tx) => {
  await tx.project.update({ where: { id }, data: updateData })
})
```

Si alguien crea un pago entre la lectura y el update, el balance será incorrecto.

**Solución:** Mover el cálculo dentro de la transacción.

**Archivos Afectados:**
- `app/api/customers/[id]/credit/route.ts`
- `app/api/payments/[id]/route.ts`
- `app/api/projects/[id]/route.ts`

---

### 16.9 🟡 Endpoints Sin Límites de Seguridad

**Archivos:**
- `app/api/aftersales/route.ts:16-48`
- `app/api/customers/list/route.ts:13-22`
- `app/api/customers/[id]/account/route.ts:29-43`

**Contexto:**
Varios endpoints hacen `findMany` sin ningún límite de registros.

| Endpoint | Archivo | Límite Actual | Recomendado |
|----------|---------|---------------|-------------|
| `/api/aftersales` | `app/api/aftersales/route.ts:16-48` | Ninguno | `take: 500` |
| `/api/customers/list` | `app/api/customers/list/route.ts:13-22` | Ninguno | `take: 1000` |
| `/api/customers/[id]/account` | `app/api/customers/[id]/account/route.ts:29-43` | Ninguno | `take: 100` + paginación |

**Problema:**
Sin límites, un cliente con cientos de proyectos o miles de aftersales causará queries lentas y payloads grandes.

**Solución Propuesta:**
Agregar `take` como safety limit en todos los `findMany` sin paginación:
```typescript
const aftersales = await prisma.aftersale.findMany({
  relationLoadStrategy: 'join',
  orderBy: { reportedAt: 'desc' },
  take: 500,  // ← Safety limit
  include: { project: {...}, aftersaleStatus: {...} }
})
```

**Archivos Afectados:**
- `app/api/aftersales/route.ts`
- `app/api/customers/list/route.ts`
- `app/api/customers/[id]/account/route.ts`

---

### 16.10 🟡 `GET /api/payments` — DISTINCT con JOINs Innecesarios

**Archivo:** `app/api/payments/route.ts:86-93`

**Contexto:**
La búsqueda de pagos usa `SELECT DISTINCT` porque los LEFT JOINs con PaymentAllocation y Project pueden duplicar filas.

**Problema:**
```sql
-- ACTUAL: DISTINCT necesario por LEFT JOINs
SELECT DISTINCT pm.id
FROM "Payment" pm
JOIN "Customer" c ON c.id = pm."customerId"
LEFT JOIN "PaymentAllocation" pa ON pa."paymentId" = pm.id
LEFT JOIN "Project" p ON p.id = pa."projectId"
WHERE normalize_text(c.name) LIKE normalize_text(...)
   OR normalize_text(p."projectNumber") LIKE normalize_text(...)
```

El DISTINCT fuerza un sort/dedup en PostgreSQL que puede ser costoso con muchos resultados.

**Solución Propuesta:**
Usar UNION en vez de DISTINCT — elimina duplicados automáticamente y permite mejor plan de ejecución:
```sql
SELECT pm.id FROM "Payment" pm
JOIN "Customer" c ON c.id = pm."customerId"
WHERE normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
UNION
SELECT pm.id FROM "Payment" pm
JOIN "PaymentAllocation" pa ON pa."paymentId" = pm.id
JOIN "Project" p ON p.id = pa."projectId"
WHERE normalize_text(p."projectNumber") LIKE normalize_text(${`%${search}%`})
   OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${search}%`})
```

**Archivos Afectados:**
- `app/api/payments/route.ts`

---

### 16.11 🟡 Cron Reconcile — Batch Update Ineficiente

**Archivo:** `app/api/cron/reconcile-balances/route.ts:112-119`

**Contexto:**
El cron job de reconciliación de balances corrige proyectos con balances inconsistentes.

**Problema:**
```typescript
// ACTUAL: un update por proyecto
await prisma.$transaction(
  inconsistent.map(({ id, calculatedBalance }) =>
    prisma.project.update({ where: { id }, data: { balance: new Decimal(Number(calculatedBalance)) } })
  )
)
```

Si hay 500 proyectos inconsistentes, crea 500 operaciones individuales en la transacción.

**Solución Propuesta:**
Raw SQL batch con CASE:
```typescript
if (inconsistent.length > 0) {
  const caseClauses = inconsistent
    .map(r => `WHEN '${r.id}' THEN ${r.calculatedBalance}`)
    .join(' ')
  const ids = inconsistent.map(r => `'${r.id}'`).join(',')
  await prisma.$executeRawUnsafe(`
    UPDATE "Project"
    SET balance = CASE id ${caseClauses} END
    WHERE id IN (${ids})
  `)
}
```

**Resultado:** De N operaciones → 1 query SQL.

**Archivos Afectados:**
- `app/api/cron/reconcile-balances/route.ts`

---

### 16.12 🟢 `verifyProjectBalance` — Lectura Wasteful de Allocations

**Archivo:** `lib/business-logic/update-project-balance.ts:120-148`

**Contexto:**
La función verifica si el balance almacenado coincide con el calculado.

**Problema:**
```typescript
export async function verifyProjectBalance(projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      totalAmount: true,
      balance: true,
      paymentAllocations: { select: { allocatedAmount: true } }  // ← Lee TODAS las allocations
    }
  })
  // ... calcula y compara
}
```

Lee todas las allocations completas solo para verificar consistencia. Si se llama frecuentemente, es wasteful.

**Solución Propuesta:**
Usar query SQL directa como en el cron job:
```typescript
const result = await prisma.$queryRaw<{ diff: number }[]>`
  SELECT ABS(p.balance - (
    p."totalAmount" - COALESCE(
      (SELECT SUM(pa."allocatedAmount") FROM "PaymentAllocation" pa WHERE pa."projectId" = p.id), 0
    )
  )) as diff
  FROM "Project" p
  WHERE p.id = ${projectId}
`
return Number(result[0]?.diff) < FINANCIAL.TOLERANCE
```

**Archivos Afectados:**
- `lib/business-logic/update-project-balance.ts`

---

### 16.13 🟢 Queries Redundantes en `project-list.ts`

**Archivo:** `lib/queries/project-list.ts:48-140`

**Contexto:**
Las funciones `queryProjectList`, `countProjects`, `getStatusFacets`, y `getStateFacets` comparten lógica WHERE con JOINs.

**Problema:**
Cada función reconstruye las mismas condiciones WHERE dinámicas con los mismos JOINs. Si se necesita cambiar la lógica de filtrado, hay que modificar 4 funciones.

**Solución Propuesta:**
Extraer la construcción del WHERE a una función compartida:
```typescript
function buildProjectWhere(filters: ProjectFilters): Prisma.Sql {
  // Construye el WHERE una sola vez
  return sql`...`
}
```

**Archivos Afectados:**
- `lib/queries/project-list.ts`

---

### 16.14 🟢 Columna Legacy `projectStatusLegacy` sin Uso

**Archivo:** `prisma/schema.prisma:167`

**Contexto:**
Columna de migración legacy para compatibilidad con datos antiguos.

**Problema:**
```prisma
projectStatusLegacy String @default("") @map("projectStatus")
```

Ocupa espacio en cada fila de Project (~20 bytes + overhead). Si ya no se usa en código, es espacio desperdiciado.

**Solución Propuesta:**
1. Verificar si se usa en código (grep por `projectStatusLegacy` y `projectStatus` mapeado).
2. Si no se usa, eliminar en migración:
   ```bash
   npx prisma migrate dev --name remove_project_status_legacy
   ```

**Archivos Afectados:**
- `prisma/schema.prisma`

---

## 17. Testing — Cobertura

### 16.1 🟡 Endpoints Sin Tests

**Archivos sin tests detectados:**
- `app/api/users/route.ts` — Sin tests (especialmente crítico dado el issue 11.2)
- `app/api/calendar-events/route.ts` — Sin tests
- `app/api/calendar-events/reorder/route.ts` — Sin tests
- `app/api/project-events/[id]/route.ts` — Sin tests
- `app/api/cron/reconcile-balances/route.ts` — Sin tests
- `app/api/test/cleanup/route.ts` — Sin tests
- `app/api/health/warmup/route.ts` — Sin tests
- Todos los endpoints de export — Sin tests
- Todos los endpoints de import — Sin tests
- `app/api/payments/import/route.ts` — Sin tests (crítico dado el issue 12.2)
- `app/api/projects/[id]/adjustments/route.ts` — Sin tests

**Impacto:**
Cambios en estos endpoints pueden introducir bugs sin detección automática. Los issues 11.2 (users sin auth) y 12.2 (import sin balance recalc) podrían haberse detectado con tests.

**Solución Propuesta:**
Priorizar tests para:
1. Endpoints financieros (payments import/export, adjustments).
2. Endpoints de seguridad (users, cron).
3. Endpoints de datos masivos (import/export).

**Archivos Afectados:**
- `tests/` (agregar tests faltantes)

---

### 16.2 🟡 Tests de Business Logic — Casos Edge No Cubiertos

**Archivos:**
- `lib/business-logic/installments.ts` — No hay tests para `generatePrismaInstallmentsCreate`
- `lib/business-logic/commission.ts` — No hay tests para `distributeNetToInstallments`
- `lib/business-logic/project-state.ts` — No hay tests para los Prisma Where clause helpers
- `lib/business-logic/totals.ts` — No hay tests para redondeo con diferentes monedas

**Solución Propuesta:**
Agregar tests unitarios para cada función pura de business logic, especialmente:
- Casos edge con montos pequeños ($0.10).
- Casos con monedas diferentes.
- Casos con fechas límite (fin de mes, año bisiesto).

---

## 18. Configuración y Entorno

### 17.1 🟡 Sin Validación de Variables de Entorno al Inicio

**Archivos:** `lib/db.ts`, `lib/auth.ts`, `middleware.ts`

**Contexto:**
No hay un archivo que valide que todas las variables de entorno requeridas están presentes al inicio de la aplicación.

**Problema:**
Si `DATABASE_URL` falta o tiene formato incorrecto:
- El error ocurre en runtime cuando se hace la primera query.
- El mensaje de error es críptico (Prisma error).
- No hay forma de detectar el problema antes de que llegue tráfico.

Variables que deberían validarse:
- `DATABASE_URL` (requerida)
- `DIRECT_URL` (requerida)
- `BETTER_AUTH_SECRET` (requerida)
- `BETTER_AUTH_URL` (requerida)
- `CRON_SECRET` (requerida para cron endpoints)
- `NODE_ENV` (opcional, pero útil validar)

**Solución Propuesta:**
Crear `lib/env.ts`:
```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  CRON_SECRET: z.string().min(16),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const env = envSchema.parse(process.env)
```

Importar en el entry point (`app/layout.tsx` o `middleware.ts`) para validar al inicio.

**Archivos Afectados:**
- `lib/env.ts` (nuevo)
- `lib/db.ts` (usar `env.DATABASE_URL`)
- `lib/auth.ts` (usar `env.BETTER_AUTH_SECRET`)

---

### 17.2 🟡 `middleware.ts` — Error en Catch Usa `console` en Vez de Logger

**Archivo:** `middleware.ts:55-58`

**Contexto:**
El middleware captura errores de autenticación y redirige a login.

**Problema:**
```typescript
} catch (error) {
  console.error('Error en middleware de auth:', error)  // ← console, no logger
  return NextResponse.redirect(new URL('/login', request.url))
}
```

Usa `console.error` en vez del logger estructurado (`pino`). Esto significa:
- El error no tiene contexto (request ID, IP, user agent).
- No se puede buscar/filter en logs de producción.
- Inconsistente con el resto del logging de la aplicación.

**Solución Propuesta:**
```typescript
import { logger } from '@/lib/logger'

} catch (error) {
  logger.error({ error, url: request.url }, 'Error en middleware de auth')
  return NextResponse.redirect(new URL('/login', request.url))
}
```

**Archivos Afectados:**
- `middleware.ts`

---

### 17.3 🟡 `pagination.ts` — Sin Validación de NaN

**Archivo:** `lib/utils/pagination.ts:11-13`

**Contexto:**
La función de paginación parsea `page` y `limit` de searchParams.

**Problema:**
```typescript
const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
const limit = Math.min(parseInt(searchParams.get('limit') || String(defaultLimit)), 100)
```

`parseInt('abc')` retorna `NaN`. `Math.max(1, NaN)` retorna `NaN`. `Math.min(NaN, 100)` retorna `NaN`.

Resultado: queries con `skip: NaN` y `take: NaN`, que Prisma maneja de forma impredecible.

**Solución Propuesta:**
```typescript
const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
const limit = Math.min(parseInt(searchParams.get('limit') || String(defaultLimit)) || defaultLimit, 100)
```

**Archivos Afectados:**
- `lib/utils/pagination.ts`

---

### 17.4 🟡 `Customer.PUT` — Email Trim Inconsistente

**Archivo:** `app/api/customers/[id]/route.ts:54-58`

**Contexto:**
El endpoint actualiza el email de un cliente con trim.

**Problema:**
```typescript
// Verificación de duplicado (sin trim)
const duplicateEmail = await prisma.customer.findFirst({
  where: { email },  // ← email sin trim
})

// Update (con trim)
...(email !== undefined && { email: email?.trim() || null }),
```

Si un usuario actualiza su email de `"test@example.com"` a `" test@example.com "`:
- La verificación busca `" test@example.com "` (con espacios) → no encuentra duplicado.
- El update guarda `"test@example.com"` (con trim).
- Si ya existe `"test@example.com"`, el update fallará con error de unique constraint.

Pero si el email original era `"test@example.com"` y se intenta cambiar a `"test@example.com "`:
- La verificación busca `"test@example.com "` → no encuentra duplicado.
- El update guarda `"test@example.com"` → funciona.
- Pero la verificación fue innecesaria.

**Solución Propuesta:**
Aplicar trim antes de la verificación:
```typescript
const trimmedEmail = email?.trim() || null
if (trimmedEmail) {
  const duplicateEmail = await prisma.customer.findFirst({
    where: { email: trimmedEmail, id: { not: id } },
  })
  if (duplicateEmail) {
    return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 })
  }
}
```

**Archivos Afectados:**
- `app/api/customers/[id]/route.ts`

---

### 17.5 🟡 `/api/payments/search-projects` — Hardcoded `balance > 1`

**Archivo:** `app/api/payments/search-projects/route.ts:41`

**Contexto:**
La query raw busca proyectos con balance pendiente.

**Problema:**
```sql
WHERE p."totalAmount" > 0
  AND p.balance > 1  -- ← Hardcoded
```

Debería usar `FINANCIAL.BALANCE_TOLERANCE` (definido en constants). Si la tolerancia cambia, este endpoint no se actualiza.

**Solución Propuesta:**
```typescript
WHERE p."totalAmount" > 0
  AND p.balance > ${FINANCIAL.BALANCE_TOLERANCE}
```

**Archivos Afectados:**
- `app/api/payments/search-projects/route.ts`
- `lib/constants/financial.ts`

---

### 17.6 🟡 `Project.PUT` — Cambio de `customerId` Sin Migrar Créditos

**Archivo:** `app/api/projects/[id]/route.ts:73-78`

**Contexto:**
El endpoint permite cambiar el cliente asignado a un proyecto.

**Problema:**
Si se cambia el `customerId` de un proyecto:
- Las `CreditTransaction` asociadas a ese proyecto siguen apuntando al proyecto.
- Pero el `customerId` de la transacción no se actualiza.
- `getCustomerCreditBalance(customerId)` filtra por `customerId` de la transacción, no del proyecto.
- Las transacciones quedan "huérfanas" del cliente original.

**Impacto:**
- El balance de crédito del cliente original queda incorrecto.
- El nuevo cliente no ve las transacciones de crédito del proyecto.
- Auditoría inconsistente.

**Solución Propuesta:**
Opción A — Bloquear cambio si hay transacciones:
```typescript
const creditTxCount = await tx.creditTransaction.count({
  where: { projectId: id }
})
if (creditTxCount > 0) {
  throw new BusinessError('No se puede cambiar el cliente de un proyecto con transacciones de crédito', 400)
}
```

Opción B — Migrar transacciones:
```typescript
await tx.creditTransaction.updateMany({
  where: { projectId: id },
  data: { customerId: newCustomerId }
})
```

**Archivos Afectados:**
- `app/api/projects/[id]/route.ts`

---

### 17.7 🟡 `Project.PUT` — Recálculo de Balance Sin Considerar Ajustes

**Archivo:** `app/api/projects/[id]/route.ts:89-95`

**Contexto:**
Cuando se actualiza el `totalAmount` de un proyecto, se recalcula el balance.

**Problema:**
```typescript
const newTotalAmount = finalTotalAmount.toNumber()
updatedBalance = new Decimal(newTotalAmount - totalPaid)
// ❌ Falta: - totalAdjustments
```

Si un proyecto tiene ajustes (descuentos/condonaciones) y se modifica su subtotal, el balance queda incorrecto porque no resta los ajustes existentes.

**Ejemplo:**
- Proyecto: totalAmount = $100.000, paid = $50.000, adjustments = $20.000
- Balance real = $100.000 - $50.000 - $20.000 = $30.000
- Se cambia totalAmount a $120.000
- Balance calculado = $120.000 - $50.000 = $70.000 ❌
- Balance correcto = $120.000 - $50.000 - $20.000 = $50.000 ✅

**Solución Propuesta:**
```typescript
const adjustments = await tx.projectAdjustment.aggregate({
  where: { projectId: id },
  _sum: { amount: true },
})
const totalAdjustments = adjustments._sum.amount?.toNumber() || 0
updatedBalance = new Decimal(newTotalAmount - totalPaid - totalAdjustments)
```

**Archivos Afectados:**
- `app/api/projects/[id]/route.ts`

---

### 17.8 🟡 `/api/test/cleanup` — Protección Solo por NODE_ENV

**Archivo:** `app/api/test/cleanup/route.ts:44`

**Contexto:**
El endpoint de cleanup para testing solo verifica `NODE_ENV`.

**Problema:**
```typescript
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: '...' }, { status: 403 })
}
```

Si alguien despliega con `NODE_ENV=staging` o `NODE_ENV=preview`, el endpoint queda expuesto sin autenticación adicional.

**Solución Propuesta:**
Agregar un `TEST_SECRET` o token de autenticación:
```typescript
const testSecret = request.headers.get('x-test-secret')
if (testSecret !== process.env.TEST_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Archivos Afectados:**
- `app/api/test/cleanup/route.ts`
- `.env.example` (agregar TEST_SECRET)

---

### 17.9 🟡 `calculateProjectTotal` — Redondeo Inconsistente con DB

**Archivo:** `lib/business-logic/totals.ts:65-81`

**Contexto:**
La función usa `Math.round` para redondeo de montos.

**Problema:**
```typescript
export function roundForCurrency(amount: number, currency: string = 'CLP'): number {
  const factor = Math.pow(10, decimals)
  return Math.round(amount * factor) / factor  // ← Math.round
}
```

PostgreSQL `Decimal(12,2)` usa banker's rounding (round half to even). En casos edge (x.xx5), los resultados pueden diferir:
- `Math.round(2.5)` = 3 (JavaScript)
- `ROUND(2.5)` = 2 (PostgreSQL banker's rounding)

**Impacto:**
- Diferencia de 1 centavo en casos edge.
- Acumulable con múltiples cálculos.

**Solución Propuesta:**
Usar el mismo algoritmo que PostgreSQL o documentar la diferencia. Para CLP (sin decimales), la diferencia no aplica.

**Archivos Afectados:**
- `lib/business-logic/totals.ts`

---

### 17.10 🟢 `validateProjectTotal` — Tolerancia No Considera Moneda

**Archivo:** `lib/business-logic/totals.ts:123-130`

**Contexto:**
La validación usa `FINANCIAL.TOLERANCE` (0.01) para todas las monedas.

**Problema:**
Para CLP (sin decimales), la tolerancia debería ser 1, no 0.01.

**Solución Propuesta:**
```typescript
const tolerance = getBalanceTolerance(currency)  // CLP = 1, USD = 0.01
if (Math.abs(difference) > tolerance) {
  // ...
}
```

**Archivos Afectados:**
- `lib/business-logic/totals.ts`

---

### 17.11 🟢 `formatCurrency` — Fallback Silencioso para Moneda Desconocida

**Archivo:** `lib/format.ts:20-31`

**Contexto:**
La función acepta un parámetro `currency` y usa `currencyConfig`.

**Problema:**
```typescript
const config = currencyConfig[currency] || currencyConfig.CLP  // ← Fallback silencioso
```

Si se pasa una moneda no configurada (ej: "EUR"), usa CLP sin warning ni error.

**Solución Propuesta:**
```typescript
const config = currencyConfig[currency]
if (!config) {
  logger.warn({ currency }, 'Unknown currency, falling back to CLP')
  return formatCurrency(amount, 'CLP')
}
```

**Archivos Afectados:**
- `lib/format.ts`

---

### 17.12 🟡 `/api/project-events/[id]` PATCH — Sin Manejo de Unique Constraint

**Archivo:** `app/api/project-events/[id]/route.ts:27-35`

**Contexto:**
El PATCH para drag & drop actualiza la fecha de un evento.

**Problema:**
No verifica que la nueva fecha no cause conflicto con el unique constraint `[projectId, scheduledDate]`. Si un usuario arrastra un evento a una fecha donde ya existe otro, Prisma lanzará P2002 (unique constraint violation) con un error genérico.

**Solución Propuesta:**
Manejar P2002 específicamente:
```typescript
catch (error) {
  if (error.code === 'P2002') {
    return NextResponse.json(
      { error: 'Ya existe un evento para este proyecto en esta fecha' },
      { status: 409 }
    )
  }
  throw error
}
```

**Archivos Afectados:**
- `app/api/project-events/[id]/route.ts`
- `app/api/aftersale-events/[id]/route.ts`
- `app/api/visit-events/[id]/route.ts`

---

### 17.13 🟡 `/api/aftersales/[id]` PUT — Actualización de Proyecto Sin Verificar `isFinal`

**Archivo:** `app/api/aftersales/[id]/route.ts:107-117`

**Contexto:**
Cuando se actualiza un aftersale, también se actualiza el proyecto con nuevos datos de dirección.

**Problema:**
No se verifica si el proyecto está finalizado (`projectStatus.isFinal === true`), lo cual podría ser una violación de reglas de negocio.

**Solución Propuesta:**
```typescript
if (project.projectStatus?.isFinal) {
  return NextResponse.json(
    { error: 'No se puede modificar un proyecto finalizado' },
    { status: 400 }
  )
}
```

**Archivos Afectados:**
- `app/api/aftersales/[id]/route.ts`

---

## Checklist de Acción Priorizada

### Inmediata (Esta Semana)
- [ ] 🔴 Migrar de `db:push` a `prisma migrate dev` / `prisma migrate deploy`
- [ ] 🔴 Arreglar PUT de pagos para recalcular comisiones
- [ ] 🔴 Documentar/estandarizar si `Payment.amount` incluye o no `creditApplied`
- [ ] 🔴 Optimizar `updateMultipleProjectBalances` a batch queries (issue 16.3)
- [ ] 🔴 Optimizar transacción POST pagos con createMany/updateMany (issue 16.4)
- [ ] 🟡 Agregar validación Zod para `Aftersale.tasks`
- [ ] 🟡 Agregar validación de formato HH:mm para `Visit.scheduledTime`

### Corto Plazo (Próximas 2 Semanas)
- [ ] 🟡 Eliminar validación redundante de crédito fuera de transacción
- [ ] 🟡 Agregar `creditApplied` al metadata de `OVERPAYMENT`
- [ ] 🟡 Corregir `calculateProjectBalance` para considerar ajustes
- [ ] 🟡 Unificar two-step lookups en queries únicos (issue 16.6)
- [ ] 🟡 Agregar límites de seguridad a exports (issue 16.5)
- [ ] 🟡 Cambiar fechas de cuotas a `addMonths`
- [ ] 🟡 Revisar archivos huérfanos y eliminar los realmente no usados
- [ ] 🟡 Eliminar índices redundantes del schema (issue 16.1)
- [ ] 🟡 Agregar índices compuestos faltantes (issue 16.2)

### Mediano Plazo (Próximo Mes)
- [ ] 🔴 Eliminar campo `balance` persistido y calcular en tiempo real
- [ ] 🟡 Implementar rate limiting en login
- [ ] 🟡 Validar conflictos de equipo en calendario
- [ ] 🟡 Optimizar calendar events con select específico (issue 16.7)
- [ ] 🟡 Reemplazar DISTINCT por UNION en payments search (issue 16.10)
- [ ] 🟡 Optimizar cron reconcile con batch SQL (issue 16.11)
- [ ] 🟢 Eliminar dependencias no usadas
- [ ] 🟢 Estandarizar uso de `Decimal` vs `number`
- [ ] 🟢 Eliminar columna legacy `projectStatusLegacy` (issue 16.14)

---

## Referencias a Planes Técnicos Existentes

Este documento complementa los planes técnicos ya existentes en `plans/`:

| Plan | Estado | Relación con este Documento |
|------|--------|----------------------------|
| `derive-customer-credit-balance.md` | ✅ Completado | Elimina `Customer.creditBalance` persistido |
| `fix-n-plus-1-and-redundant-queries.md` | ✅ Completado (parcial) | Batch update de balances, optimización de queries |
| `migrate-endpoints-to-sql-pattern.md` | ✅ Completado | Migración de endpoints a SQL raw |
| `replace-installment-cron-with-derived-state.md` | ✅ Completado | Elimina cron de cuotas, estado derivado |
| `unify-project-total-fields.md` | ✅ Completado | Elimina campo `total` duplicado |

---

*Documento generado automáticamente por análisis de código. Última actualización: 2026-05-07.*
