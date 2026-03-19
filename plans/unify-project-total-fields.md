# Plan: Unificar Campos total/totalAmount de Project

**Fecha:** 2026-03-17
**Actualizado:** 2026-03-18
**Estado:** ✅ Completado
**Prioridad:** 2 (Alta)
**Implementado en:** branch `dev2`, commits `11d0516`, `8c9e33c`, `094c569`
**DB migrada:** 2026-03-18 (Neon branch de prueba → producción)

---

## Contexto

### Problema

El modelo `Project` tiene **dos campos que almacenan el mismo valor**:

- `total Decimal @db.Decimal(12, 2)` — campo original, **NON-nullable** (schema línea 172)
- `totalAmount Decimal? @db.Decimal(12, 2)` — introducido post-migración, **nullable** (schema línea 180)

Ambos se escriben con el mismo valor calculado (`subtotal * (1 + taxRate/100)`). El código tiene patrones defensivos `totalAmount ?? total` en 2 lugares y una **inconsistencia activa** donde distintas partes del sistema usan uno u otro campo sin fallback.

### Origen

`totalAmount` se agregó durante la migración de datos importados. Los 90 proyectos legacy tenían `total` pero no `totalAmount` (era null). Post-migración se pobló `totalAmount = total` para todos.

### Inconsistencia activa detectada

| Módulo | Campo usado | Fallback |
|--------|------------|----------|
| `update-project-balance.ts` (lógica core) | `totalAmount ?? total` | Sí |
| `cron/reconcile-balances` (línea 119) | `project.total` | **NO** — ignora totalAmount |
| `scripts/populate-project-balances.ts` (línea 63) | `project.total` | **NO** — ignora totalAmount |
| `app/api/projects/[id]` GET (línea 48) | `project.totalAmount` | **NO** — puede retornar NaN si null |
| `project-balance.ts` (línea 82) | `project.totalAmount || 0` | Usa `||` en vez de `??` — trata 0 como ausente |

### Decisión

- **Mantener:** `totalAmount` (nombre más descriptivo y consistente con la semántica financiera)
- **Eliminar:** `total` (campo original, nombre ambiguo)
- Hacer `totalAmount` **non-nullable** con default 0

---

## Inventario Completo de Archivos Afectados

### Schema

| Archivo | Línea | Campo | Acción |
|---------|-------|-------|--------|
| `prisma/schema.prisma` | 172 | `total Decimal @db.Decimal(12, 2)` | **Eliminar** |
| `prisma/schema.prisma` | 180 | `totalAmount Decimal? @db.Decimal(12, 2)` | Hacer non-nullable: `Decimal @default(0) @db.Decimal(12, 2)` |

### Escrituras en DB (create/update)

| Archivo | Línea | Código | Acción |
|---------|-------|--------|--------|
| `app/api/projects/route.ts` | 254 | `total: new Decimal(calculatedTotal)` | **Eliminar** |
| `app/api/projects/route.ts` | 255 | `totalAmount: new Decimal(finalTotalAmount)` | Mantener |
| `app/api/projects/[id]/route.ts` | 155 | `updateData.total = updatedTotal` | **Eliminar** |
| `app/api/projects/[id]/route.ts` | 156 | `updateData.totalAmount = updatedTotalAmount` | Mantener |
| `app/api/projects/import/route.ts` | 136 | `total: totalAmount` | **Eliminar** |
| `app/api/projects/import/route.ts` | 137 | `totalAmount` | Mantener |

### Lecturas directas de `project.total` (el campo a eliminar)

| Archivo | Línea | Código | Acción |
|---------|-------|--------|--------|
| `lib/queries/project-list.ts` | 33 | `total: Prisma.sql\`p.total\`` en SORT_COLUMN_MAP | Cambiar a `p."totalAmount"` |
| `lib/queries/project-list.ts` | 60 | `p.total,` en SELECT raw SQL | Cambiar a `p."totalAmount"` o eliminar (ya hay `p."totalAmount"` en línea 68) |
| `types/project-list.ts` | 29 | `total: Decimal` en `ProjectListRawRow` | **Eliminar** |
| `types/project-list.ts` | 69 | `total: number` en `ProjectListItem` | **Eliminar** |
| `types/project-list.ts` | 130 | `Number(row.total)` en transform | **Eliminar** |
| `types/project-list.ts` | 148 | `total,` en objeto final | **Eliminar** |
| `app/api/projects/[id]/route.ts` | 57 | `total: Number(project.total)` en GET JSON | **Eliminar** |
| `app/api/projects-with-metadata/route.ts` | 96 | `Number(project.total)` para derivePaymentProgress | Cambiar a `totalAmount` |
| `app/api/cron/reconcile-balances/route.ts` | 119 | `totalAmount: Number(project.total)` | Cambiar a `Number(project.totalAmount)` |
| `app/projects/columns.tsx` | 124 | `row.original.total` en columna de tabla | Cambiar a `totalAmount` |
| `app/projects/page.tsx` | 59 | `Number(p.total)` para cálculo de progreso | Cambiar a `totalAmount` |
| `app/projects/types.ts` | 23 | `total: number` en tipo | **Eliminar** |
| `components/dialogs/projects/view-project-details-dialog.tsx` | 41, 208 | `total: number` prop, `project.total` render | Cambiar a `totalAmount` |
| `lib/excel/project-exporter.ts` | 19, 49 | `total` en tipo y export Excel | Cambiar a `totalAmount` |
| `lib/utils/serialize.ts` | 44 | `total: Number(project.total)` | **Eliminar** |
| `scripts/populate-project-balances.ts` | 63 | `totalAmount: Number(project.total)` | Cambiar a `Number(project.totalAmount)` |

### Patrones defensivos (totalAmount ?? total) — a eliminar

| Archivo | Línea | Código | Acción |
|---------|-------|--------|--------|
| `lib/business-logic/update-project-balance.ts` | 61 | `Number(project.totalAmount ?? project.total)` | Simplificar a `Number(project.totalAmount)` |
| `lib/business-logic/update-project-balance.ts` | 161 | `Number(project.totalAmount ?? project.total)` | Simplificar a `Number(project.totalAmount)` |

### Lecturas de `totalAmount` (se mantienen, eliminar nullability)

| Archivo | Línea | Acción |
|---------|-------|--------|
| `lib/business-logic/project-balance.ts` | 15, 82, 108, 146 | Cambiar tipo `number \| null` → `number` |
| `lib/business-logic/payment-fifo.ts` | 20, 107, 184 | Cambiar tipo `number \| null` → `number` |
| `lib/business-logic/update-project-balance.ts` | 43-44 | Eliminar `total` del select |
| `lib/validations/project-validations.ts` | 84, 115, 134 | Eliminar `optional()` de totalAmount |
| `hooks/queries/use-projects.ts` | 96 | Verificar tipo |
| `hooks/queries/use-payments.ts` | 81 | Verificar tipo |
| `app/api/customers/[id]/account/route.ts` | 52, 60 | Eliminar null check |
| `app/api/payments/search-projects/route.ts` | 81 | Eliminar null check |
| `app/api/payments/customer-projects/route.ts` | 51 | Eliminar null check |
| `components/dialogs/projects/view-project-payments-dialog.tsx` | 19, 53, 89, 132 | Cambiar tipo `number \| null` → `number` |
| `components/dialogs/projects/new-project-dialog.tsx` | 42 | Verificar — envía `totalAmount: total` |
| `components/dialogs/projects/edit-project-dialog.tsx` | 77 | Verificar |
| `components/forms/projects/project-form.tsx` | 86-100 | Verificar — calcula `totalAmount` |
| `components/summarys/payment-summary-card.tsx` | 5, 85 | Cambiar tipo `number \| null` → `number` |
| `components/dialogs/customers/view-customer-account-dialog.tsx` | 225, 330 | Verificar |
| `components/tables/customer-account-projects-table.tsx` | 6, 62 | Verificar tipo |
| `components/forms/search/project-search-field.tsx` | 232 | Verificar |
| `lib/utils/serialize.ts` | 47 | Eliminar null check defensivo |
| `types/project-list.ts` | 37, 79, 158 | Cambiar `Decimal \| null` → `Decimal`, `number \| null` → `number` |

### Tests

| Archivo | Acción |
|---------|--------|
| `tests/e2e/helpers/test-data-factory.ts` | Cambiar `total` → `totalAmount` (líneas 31, 119) |
| `hooks/queries/__tests__/use-projects.test.tsx` | Actualizar mocks — eliminar `total`, ajustar `totalAmount` |
| `lib/excel/__tests__/exporters.test.ts` | Actualizar datos mock |
| `app/api/projects/import/__tests__/route.test.ts` | Verificar asserts |

---

## Fases de Implementación

### Fase 1: Migración de Datos (seguridad)

**Objetivo:** Asegurar que todos los registros tengan `totalAmount` poblado antes de eliminar `total`.

```sql
-- Poblar totalAmount donde sea null (por seguridad — debería haber 0 nulls post-migración)
UPDATE "Project" SET "totalAmount" = "total" WHERE "totalAmount" IS NULL;
```

### Fase 2: Migración de Schema

**Archivo:** `prisma/schema.prisma`

**Cambios:**
1. Eliminar línea 172: `total Decimal @db.Decimal(12, 2)`
2. Cambiar línea 180: `totalAmount Decimal? @db.Decimal(12, 2)` → `totalAmount Decimal @default(0) @db.Decimal(12, 2)`
3. Ejecutar `npx prisma migrate dev --name unify-project-total-remove-duplicate`

**Verificación:**
```bash
npm run typecheck  # Mostrará errores en ~20+ archivos
```

### Fase 3: Corregir Raw SQL

**Archivo:** `lib/queries/project-list.ts`

**Cambios:**
1. Línea 33: `total: Prisma.sql\`p.total\`` → `total: Prisma.sql\`p."totalAmount"\``
2. Línea 60: `p.total,` → eliminar (ya está `p."totalAmount"` en línea 68)

**Archivo:** `types/project-list.ts`

**Cambios:**
1. Eliminar `total: Decimal` de `ProjectListRawRow` (línea 29)
2. Eliminar `total: number` de `ProjectListItem` (línea 69)
3. Actualizar transform en línea 130: usar `totalAmount` directamente
4. Cambiar `totalAmount: Decimal | null` → `totalAmount: Decimal` (línea 37)

### Fase 4: Corregir lógica de negocio

**Archivos:**
- `lib/business-logic/update-project-balance.ts` — eliminar fallback `?? project.total`, eliminar `total` del select
- `lib/business-logic/project-balance.ts` — cambiar tipos `number | null` → `number`, cambiar `|| 0` → uso directo
- `lib/business-logic/payment-fifo.ts` — cambiar tipos `number | null` → `number`

### Fase 5: Corregir APIs

**Archivos y cambios:**
- `app/api/projects/route.ts` línea 254: eliminar `total: new Decimal(...)` del create
- `app/api/projects/[id]/route.ts` línea 57: eliminar `total:` de la respuesta GET; línea 155: eliminar `updateData.total`
- `app/api/projects/import/route.ts` línea 136: eliminar `total:` del create
- `app/api/projects-with-metadata/route.ts` línea 96: cambiar a `totalAmount`
- `app/api/cron/reconcile-balances/route.ts` línea 119: cambiar a `Number(project.totalAmount)`
- `app/api/customers/[id]/account/route.ts`: eliminar null checks de totalAmount
- `app/api/payments/search-projects/route.ts`: eliminar null check
- `app/api/payments/customer-projects/route.ts`: eliminar null check

### Fase 6: Corregir UI y utilities

**Archivos:**
- `app/projects/columns.tsx` línea 124: `totalAmount` en vez de `total`
- `app/projects/page.tsx` línea 59: `totalAmount` en vez de `total`
- `app/projects/types.ts` línea 23: eliminar `total: number`
- `components/dialogs/projects/view-project-details-dialog.tsx`: cambiar prop y render
- `components/dialogs/projects/view-project-payments-dialog.tsx`: eliminar nullability
- `components/summarys/payment-summary-card.tsx`: eliminar nullability
- `lib/excel/project-exporter.ts`: cambiar a `totalAmount`
- `lib/utils/serialize.ts`: eliminar `total:` (línea 44), simplificar `totalAmount` (línea 47)
- `lib/validations/project-validations.ts`: eliminar `optional()` de totalAmount

### Fase 7: Corregir tests y scripts

- `scripts/populate-project-balances.ts` línea 63: cambiar a `totalAmount` (o marcar como obsoleto)
- `tests/e2e/helpers/test-data-factory.ts`: cambiar tipo y uso
- Actualizar todos los mocks en tests unitarios y de hooks

### Fase 8: Verificación

```bash
npm run lint
npm run typecheck
npx vitest run
# Grep final para encontrar huérfanos:
grep -rn "\.total[^A-Za-z]" --include="*.ts" --include="*.tsx" app/ lib/ components/ types/
# Verificar que no queden referencias en raw SQL:
grep -rn 'p\.total\b\|p\."total"' --include="*.ts" lib/ app/
```

---

## Riesgos

- **Bajo:** Raw SQL en `project-list.ts` referencia `p.total` en SELECT y ORDER BY. Ya identificado y cubierto en Fase 3.
- **Bajo:** `scripts/populate-project-balances.ts` usa `project.total`. Es un script one-shot — marcar como obsoleto si ya no se necesita.
- **Medio:** La respuesta GET de `/api/projects/[id]` actualmente devuelve ambos campos. Los consumers del frontend que lean `project.total` se romperán. Verificar que el frontend use `totalAmount` consistentemente después de los cambios.
- **Bajo:** El grep `\.total[^A-Za-z]` puede tener falsos positivos (`total` como variable local, campo de paginación, etc.). Revisar manualmente.
