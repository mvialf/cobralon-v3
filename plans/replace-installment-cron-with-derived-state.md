# Plan: Reemplazar Cron de Cuotas por Estado Derivado

**Fecha:** 2026-03-17
**Actualizado:** 2026-03-18
**Estado:** ✅ Completado
**Prioridad:** 1 (Alta)
**Implementado en:** branch `dev2`, commit `df8de61`

---

## Contexto

### Problema

Existe un cron job en GitHub Actions (`.github/workflows/cron-jobs.yml`) que se ejecuta diariamente a las 03:00 UTC (00:00 Chile) para llamar a `POST /api/cron/mark-installments-paid`. Este endpoint busca cuotas con `status='pending'` y `dueDate <= hoy`, y les cambia el `status` a `'paid'` y les asigna `paidDate = new Date()`.

Esto es innecesario porque las cuotas son **puramente informativas** — no afectan balances, FIFO ni créditos. Su estado es derivable de la fecha de vencimiento.

### Situación real del código

**Importante:** A diferencia de lo que se asumía inicialmente, la UI **NO** calcula el estado en tiempo real. La UI lee `status` directamente de la DB (`columns.tsx` línea 150). Lo único que calcula en tiempo real es el badge "Vencido" (`columns.tsx` línea 134), que usa **ambos** campos: `dueDate < today && status === 'pending'`.

**Sobre `paidDate`:** El cron escribe `paidDate = new Date()` (fecha de ejecución del cron, no `dueDate`). Si el cron falla por N días, `paidDate` difiere de `dueDate`. Sin embargo, dado que las cuotas son informativas y ningún cálculo depende de `paidDate`, esta diferencia es irrelevante.

### Decisión

- El estado de cuotas será **derivado de `dueDate`**, no almacenado
- Semántica: `dueDate <= hoy` → "vencida/cumplida", `dueDate > hoy` → "pendiente"
- Se eliminan los campos `status` y `paidDate` del modelo `Installment`
- Se elimina el cron job completo (GitHub Actions + endpoint API)

### Nota semántica

Este plan **cambia la semántica** de "pagada" a "vencida". En el sistema actual, una cuota se marca como "pagada" cuando su fecha llega. Esto es correcto en el contexto de cuotas sin interés: la cuota "venció" = se considera cobrada (el pago ya fue registrado como Payment, la cuota es solo un calendario). Si en el futuro se necesitara tracking de pago individual por cuota, este modelo no serviría.

### Modelo actual de Installment

```prisma
model Installment {
  id                String   @id @default(uuid())
  paymentId         String
  installmentNumber Int
  amount            Decimal  @db.Decimal(12, 2)
  dueDate           DateTime
  paidDate          DateTime?          // ← ELIMINAR
  status            String   @default("pending") // ← ELIMINAR
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  payment           Payment  @relation(...)

  @@index([paymentId])
  @@index([status, dueDate])           // ← ELIMINAR (reemplazar por dueDate solo)
}
```

---

## Inventario Completo de Archivos Afectados

### Schema y DB

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `prisma/schema.prisma` | 249 | Eliminar `paidDate DateTime?` |
| `prisma/schema.prisma` | 250 | Eliminar `status String @default("pending")` |
| `prisma/schema.prisma` | 256 | Cambiar `@@index([status, dueDate])` → `@@index([dueDate])` |

### Cron (eliminar completamente)

| Archivo | Acción |
|---------|--------|
| `app/api/cron/mark-installments-paid/route.ts` | **Eliminar archivo** |
| `app/api/cron/mark-installments-paid/__tests__/route.test.ts` | **Eliminar archivo** |
| `.github/workflows/cron-jobs.yml` | **Eliminar archivo** (solo tiene este cron; `reconcile-balances` no está en el workflow) |

### Lógica de negocio

| Archivo | Línea | Uso actual | Cambio |
|---------|-------|------------|--------|
| `lib/business-logic/installments.ts` | 185 | `inst.status === 'pending'` en `getTotalPendingInstallments` | Cambiar a `inst.dueDate > today` |
| `lib/business-logic/installments.ts` | 192 | `status: string` en `PrismaInstallmentData` tipo | Eliminar campo `status` del tipo |
| `lib/business-logic/installments.ts` | 253 | `status: 'pending'` en `generatePrismaInstallmentsCreate` | Eliminar |

### API routes

| Archivo | Línea | Uso actual | Cambio |
|---------|-------|------------|--------|
| `app/api/installments/route.ts` | 29 | `searchParams.get('status')` | Cambiar param a `due=past\|future` o derivar de dueDate |
| `app/api/installments/route.ts` | 38-40 | `where.status = status` | Cambiar a `where.dueDate: { lte: today }` o `{ gt: today }` |
| `app/api/payments/route.ts` | 500-505 | `generatePrismaInstallmentsCreate()` — genera con `status: 'pending'` | Se corrige vía cambio en installments.ts |
| `app/api/payments/route.ts` | 531 | `paidDate` en include/select del payment recién creado | Eliminar del select |
| `app/api/payments/route.ts` | 532 | `status` en include/select del payment recién creado | Eliminar del select |

### UI

| Archivo | Línea | Uso actual | Cambio |
|---------|-------|------------|--------|
| `app/payments/installments/columns.tsx` | 22 | `paidDate: string \| null` en tipo `Installment` | Eliminar |
| `app/payments/installments/columns.tsx` | 23 | `status: string` en tipo `Installment` | Eliminar (agregar campo derivado) |
| `app/payments/installments/columns.tsx` | 134 | `dueDate < today && row.original.status === 'pending'` — badge "Vencido" | Simplificar a `dueDate < today` |
| `app/payments/installments/columns.tsx` | 150-151 | `status === 'paid' ? 'Pagado' : 'Pendiente'` — badge | Derivar de `dueDate <= today` |
| `app/payments/installments/columns.tsx` | 182 | `installment.status === 'pending'` — condicional de acción | Derivar de `dueDate > today` |
| `app/payments/installments/columns.tsx` | 184-192 | `handleMarkAsPaid` — TODO sin implementar | **Eliminar** |
| `app/payments/installments/page.tsx` | 17 | `useState(['pending'])` — filter default | Mantener concepto, cambiar implementación |
| `app/payments/installments/page.tsx` | 24 | `fetch('/api/installments?limit=1000')` — no pasa status | Pasar filtro de fecha |
| `app/payments/installments/page.tsx` | 52-53 | Opciones `'pending'` / `'paid'` | Renombrar a `'upcoming'` / `'past'` o mantener labels y derivar |
| `app/payments/installments/page.tsx` | 57-63 | `useMemo` filtra por `i.status` client-side | Cambiar a filtrar por `dueDate` |

### Tests

| Archivo | Acción |
|---------|--------|
| `lib/business-logic/__tests__/installments.test.ts` | Actualizar — eliminar `status` de datos y asserts |
| `app/api/installments/__tests__/route.test.ts` | Actualizar — cambiar filtros de status a dueDate |
| `app/api/cron/mark-installments-paid/__tests__/route.test.ts` | **Eliminar** |

### Referencias a CRON_SECRET (limpieza)

| Archivo | Línea | Acción |
|---------|-------|--------|
| `app/api/cron/mark-installments-paid/route.ts` | 38 | Eliminado con el archivo |
| `app/api/cron/reconcile-balances/route.ts` | 67 | Ya está comentado — sin acción |
| `.env.example` | 76-78 | Verificar si `reconcile-balances` necesita CRON_SECRET; si no, eliminar |
| `middleware.ts` | 34 | Comentario sobre `/api/cron/*` — mantener si `reconcile-balances` sigue |

---

## Fases de Implementación

### Fase 1: Migración de Base de Datos

**Archivo:** `prisma/schema.prisma`

**Cambios:**
1. Eliminar campo `paidDate` (línea 249)
2. Eliminar campo `status` (línea 250)
3. Reemplazar `@@index([status, dueDate])` por `@@index([dueDate])` (línea 256)
4. Ejecutar `npx prisma migrate dev --name remove-installment-status-fields`

**Modelo resultante:**
```prisma
model Installment {
  id                String   @id @default(uuid())
  paymentId         String
  installmentNumber Int
  amount            Decimal  @db.Decimal(12, 2)
  dueDate           DateTime
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  payment           Payment  @relation(...)

  @@index([paymentId])
  @@index([dueDate])
}
```

**Verificación:**
```bash
npm run typecheck  # Mostrará todos los errores por campos eliminados
```

---

### Fase 2: Lógica de Negocio

**Archivo:** `lib/business-logic/installments.ts`

**Cambios:**

1. **Agregar helper de estado derivado:**
```typescript
export type InstallmentStatus = 'paid' | 'pending'

export function getInstallmentStatus(dueDate: Date): InstallmentStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due <= today ? 'paid' : 'pending'
}
```

2. **Adaptar `getTotalPendingInstallments()` (línea 181-185):**
```typescript
// Antes: inst.status === 'pending'
// Después:
const today = new Date()
today.setHours(0, 0, 0, 0)
return installments.filter(inst => new Date(inst.dueDate) > today)
```

3. **Adaptar `generatePrismaInstallmentsCreate()` (línea 253):**
   - Eliminar `status: 'pending'` del objeto de creación

4. **Eliminar `status` del tipo `PrismaInstallmentData` (línea 192)**

5. **Actualizar tests** (`__tests__/installments.test.ts`)

**Verificación:**
```bash
npx vitest run lib/business-logic/__tests__/installments.test.ts
```

---

### Fase 3: API — Eliminar Cron y Adaptar Endpoints

**Eliminar:**
- `app/api/cron/mark-installments-paid/route.ts`
- `app/api/cron/mark-installments-paid/__tests__/route.test.ts`

**Cambios en `GET /api/installments` (`app/api/installments/route.ts`):**
1. Reemplazar param `status` por lógica de `dueDate`:
   - `status=paid` → `where: { dueDate: { lte: startOfToday() } }`
   - `status=pending` → `where: { dueDate: { gt: startOfToday() } }`
2. Eliminar `status` y `paidDate` del select (ya no existen)
3. Agregar campo virtual `status` en la respuesta usando `getInstallmentStatus(dueDate)`:
```typescript
const installmentsWithStatus = installments.map(i => ({
  ...i,
  status: getInstallmentStatus(i.dueDate),
  paidDate: null, // compatibilidad temporal, o eliminar si el frontend se adapta
}))
```

**Cambios en `POST /api/payments` (`app/api/payments/route.ts`):**
1. Líneas 531-532: eliminar `paidDate` y `status` del select/include de installments

**Verificación:**
```bash
npm run typecheck
```

---

### Fase 4: UI

**Archivo:** `app/payments/installments/columns.tsx`

**Cambios:**
1. Eliminar `paidDate` y `status` del tipo `Installment` (si la API los envía como campos virtuales, mantener en el tipo)
2. Simplificar badge de estado (líneas 150-151):
```typescript
// La API ya envía status derivado, o calcularlo aquí:
const status = getInstallmentStatus(new Date(row.original.dueDate))
```
3. Simplificar lógica `isOverdue` (línea 134): ahora es simplemente `dueDate < today` (ya no necesita chequear `status === 'pending'` porque pending implica dueDate > today)
4. Eliminar `handleMarkAsPaid` (líneas 184-192) — era un TODO sin implementar
5. Eliminar columna `paidDate` si existía como columna visible

**Archivo:** `app/payments/installments/page.tsx`

**Cambios:**
1. El filtro `statusFilter` sigue funcionando conceptualmente — `'pending'`/`'paid'` se traducen a rangos de fecha
2. Opción A (mejor): pasar filtro a la API → `fetch('/api/installments?status=pending&limit=50')` con paginación real
3. Opción B (mínimo): mantener filtrado client-side pero sobre `dueDate` en vez de `status`

**Verificación:**
```bash
npm run dev  # Verificar visualmente la tabla de cuotas
```

---

### Fase 5: Limpieza

**Eliminar:**
- `.github/workflows/cron-jobs.yml` (solo contiene el cron de installments)

**Verificar:**
- `middleware.ts` línea 34: comentario sobre `/api/cron/*` — mantener si `reconcile-balances` sigue existiendo
- `.env.example` líneas 76-78: verificar si CRON_SECRET se usa en otro lugar (solo en `reconcile-balances` comentado)

**Verificación final:**
```bash
npm run lint
npm run typecheck
npx vitest run
```

---

## Coordinación con otros planes

- **Plan `migrate-endpoints-to-sql`** punto 3 (installments client-side): está **bloqueado** por este plan. Implementar este primero para evitar tocar la misma UI dos veces.
- El filtro `status` del API cambiará de ser un campo de DB a una derivación por fecha — el plan SQL debe usar `dueDate` en vez de `status` para filtros.

---

## Riesgos

- **Bajo:** Las cuotas son puramente informativas — ningún cálculo financiero depende de ellas. El riesgo de regresión financiera es nulo.
- **Bajo:** Si el cron de GitHub Actions no se elimina y sigue corriendo, el endpoint ya no existirá y retornará 404. No causa daño.
- **Medio:** Si en el futuro se necesita tracking de pago individual por cuota (no solo por Payment), habrá que reintroducir un campo de estado. Pero dado que las cuotas son solo un calendario de cobro, esto es improbable.
