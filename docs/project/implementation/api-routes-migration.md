# Migración de API Routes a withApiHandler/withLogging

> **Objetivo:** Estandarizar todas las API routes con logging estructurado (Pino), validación Zod automática, UUID validation y error handling unificado.
>
> **Motivación:** Routes con `catch (_error)` silenciaban errores 500 en producción. Validación manual inconsistente. `console.error` en vez de logging estructurado (viola ADR-012).

## Resumen de fases

| Fase | Estado | Routes | Tests | Líneas |
|------|--------|--------|-------|--------|
| 0 - Preparación + patrón base | ✅ Completa | 10 | 10 crear | +1570/-1390 |
| 1 - Migración masiva | ✅ Completa | 13 | 6 actualizar, 5 crear | +1909/-1283 |
| 2 - Routes mecánicas | ✅ Completa | ~20 | actualizar existentes | — |
| 3 - Routes complejas + dedup | ✅ Completa | ~10 | crear/actualizar | — |
| **Total** | | **~53** | | |

---

## Fase 0: Preparación + patrón base ✅

### Commit: Preparación

| Commit | Descripción |
|--------|-------------|
| `224b321` | Mover `refundCreditSchema` a `lib/validations`, centralizar `projectStateValues` |

### Commits: Primeras migraciones (establecen el patrón)

| Commit | Descripción | Routes | Tests |
|--------|-------------|--------|-------|
| `6d343a1` | Migrar status routes (project/visit/aftersale) | 6 | crear 6 |
| `5d2a59c` | Migrar tag routes (team/uninstall) | 4 | crear 4 |

**Patrón establecido:**
- `withApiHandler` con `bodySchema`, `validateUuidParams`, `fallbackError`
- `BusinessError` para errores de negocio
- Mock de `@/lib/logger-middleware` en tests
- UUIDs válidos en tests (`00000000-0000-0000-0000-000000000001`)

---

## Fase 1: Migración masiva ✅

5 commits incrementales migrando las routes de mayor impacto.

| # | Commit | Descripción | Routes | Tests |
|---|--------|-------------|--------|-------|
| 1 | `05a8ea9` | Schemas API (calendar, aftersale, customer, payment-method, payment) | — | — |
| 2 | `766d442` | Event routes (visit-events, aftersale-events) - **CRÍTICO: errores silenciados** | 4 | 2 actualizar, 2 crear |
| 3 | `ac54097` | Payment-methods routes | 4 | 2 actualizar |
| 4 | `e68bf45` | Aftersales CRUD routes (con transacciones atómicas) | 2 | 2 actualizar |
| 5 | `2d2d73f` | Routes financieras (customers, credit/refund, payments) | 3 | 3 crear |

---

## Fase 2: Routes mecánicas ✅

6 commits migrando routes de bajo riesgo sin lógica de negocio compleja.

| # | Commit | Descripción | Routes | Tests |
|---|--------|-------------|--------|-------|
| 1 | `aa677b8` | Agregar `updateVisitApiSchema` para validación server-side de visits | — | — |
| 2 | `2371c64` | Migrar visits, project-events y calendar-events/reorder a `withApiHandler` | 5 | — |
| 3 | `2937511` | Migrar 12 GET routes a `withLogging` y actualizar tests | 12 | actualizar |
| 4 | `fe6b0c0` | Eliminar código muerto de `logger-middleware` | — | — |
| 5 | `3e6f5c8` | Restaurar `.trim()` en `customerSchema.name` perdido en migración | — | — |
| 6 | `53f8867` | Actualizar tests de visits y customers para `withApiHandler` | — | actualizar |

---

## Fase 3: Routes complejas + dedup ✅

5 commits migrando routes con lógica compleja y deduplicación de schemas.

| # | Commit | Descripción | Routes | Tests |
|---|--------|-------------|--------|-------|
| 1 | `e6f8a8d` | Migrar 3 routes *-with-update a withApiHandler | 3 | — |
| 2 | `d94e604` | Migrar adjustments routes a withApiHandler | 2 | — |
| 3 | `e1bff03` | Crear schema centralizado + migrar 4 reorder routes | 4 | 2 actualizar |
| 4 | `72543a9` | Migrar payments/customer-projects a withApiHandler | 1 | 1 actualizar |

---

## Excluido (no migrar)

| Route | Justificación |
|-------|---------------|
| `customers/export/route.ts`, `projects/export/route.ts`, `payments/export/route.ts` | Ya usan `logger` directo. El wrapper no aporta a endpoints que generan archivos |
| `auth/[...all]/route.ts` | Handler de Better Auth, no aplica |
| `health/warmup/route.ts` | Health check, no necesita logging complejo |
| `test/cleanup/route.ts` | Solo dev |
| `users/route.ts` | Scaffold/template con TODOs |
| `cron/mark-installments-paid/route.ts` | Ya tiene child logger propio, el wrapper no encaja con cron |
| `visit-statuses/route.ts` | Posible endpoint legacy (plural vs singular). Verificar consumidores antes de tocar |
