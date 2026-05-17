# Análisis de Mejoras y Bugs Potenciales - Proyecto Cobralon

> **Última validación:** 2026-05-17
> **Proyecto:** Cobralon
> **Objetivo:** Backlog técnico verificable para priorizar bugs, riesgos operacionales y mejoras arquitectónicas.
> **Estado del documento anterior:** reescrito por drift contra el código actual. La versión anterior mezclaba pendientes, resueltos, duplicados y hallazgos obsoletos.

---

## Cómo Usar Este Documento

Cada hallazgo usa un ID estable para evitar duplicados y reaperturas accidentales.

| Campo | Significado |
|-------|-------------|
| **Estado** | `Abierto`, `Validar`, `Obsoleto`, `Resuelto` |
| **Evidencia** | Archivo/línea o comportamiento observado en el código |
| **Criterio de cierre** | Condición concreta para marcarlo como resuelto |
| **Tipo** | `Bug`, `Seguridad`, `Operacional`, `Arquitectura`, `Mantenibilidad`, `Testing` |

### Severidad

| Nivel | Definición |
|-------|------------|
| **P0 - Crítico** | Riesgo de pérdida de dinero, escalada de privilegios, corrupción de datos o caída operacional relevante. |
| **P1 - Alto** | Bug funcional o deuda técnica que puede afectar flujos importantes en producción. |
| **P2 - Medio** | Inconsistencia, riesgo edge o mejora necesaria para escalar con menos fricción. |
| **P3 - Bajo** | Limpieza, mantenibilidad o mejora de calidad sin impacto funcional inmediato. |

---

## Resumen Ejecutivo

El documento anterior no debe usarse como backlog directo. Los puntos sobre `Project.balance`, `updateMultipleProjectBalances`, cron de reconciliación, timezone de cuotas y varios tests ya están resueltos u obsoletos.

Los riesgos vigentes más importantes son:

1. **Crédito aplicado a proyecto:** el flujo UI puede no enviar `creditApplied`, y `ProjectFinancials` no descuenta transacciones `APPLIED`.
2. **Autorización por rol:** el middleware valida sesión, pero no autorización por rol.
3. **`/api/users`:** endpoint autenticado pero sobre-privilegiado, sin Zod ni `withApiHandler`.
4. **Exports/imports masivos:** varios endpoints cargan todo en memoria o procesan batches sin límite.
5. **Crédito/refund:** hay validación fuera de transacción y ocultamiento de saldos negativos.

---

## P0 - Crítico

### P0-01 - Crédito Aplicado Puede No Reducir el Balance Derivado del Proyecto

**Estado:** Abierto
**Tipo:** Bug financiero
**Impacto:** Crédito del cliente puede consumirse sin reflejarse correctamente en el balance financiero del proyecto.

**Evidencia:**
- `paymentToProjectToPayload()` no incluye `creditApplied`, aunque el formulario 1:1 lo maneja.
  - `lib/validations/payment-validations.ts`
- `ProjectFinancials` calcula balance como:
  - `totalAmount - PaymentAllocation - ProjectAdjustment`
  - No descuenta `CreditTransaction` tipo `APPLIED`.
  - `prisma/migrations/20260517120000_create_project_financials_view/migration.sql`
- `POST /api/payments` sí crea `CreditTransaction` tipo `APPLIED`, pero la allocation sigue usando solo `amount`.
  - `app/api/payments/route.ts`

**Riesgo concreto:**
Si un usuario aplica crédito a un pago de proyecto, puede disminuir el crédito disponible del cliente sin disminuir el balance del proyecto, dependiendo del payload real enviado.

**Acción recomendada:**
1. Definir contrato financiero:
   - Opción A: `Payment.amount` representa solo dinero nuevo y `PaymentAllocation.allocatedAmount = amount + creditApplied`.
   - Opción B: `PaymentAllocation` representa solo dinero nuevo y `ProjectFinancials` descuenta `CreditTransaction.APPLIED`.
2. Corregir `paymentToProjectToPayload()` para enviar `creditApplied`.
3. Agregar tests de integración para pago 1:1 con crédito aplicado.

**Criterio de cierre:**
Un pago de proyecto con `amount = 100`, `creditApplied = 50` reduce el crédito del cliente en 50 y reduce el balance del proyecto en 150, con test automatizado.

---

### P0-02 - Falta Autorización por Rol en Endpoints Sensibles

**Estado:** Abierto
**Tipo:** Seguridad
**Impacto:** Cualquier usuario autenticado puede ejecutar operaciones que deberían requerir admin o permisos específicos.

**Evidencia:**
- `middleware.ts` valida sesión con `auth.api.getSession()`, pero no revisa `session.user.role`.
- No se encontró patrón central tipo `requireRole`, `requireAdmin` o checks por endpoint.
- `User.role` existe en Prisma, pero no parece aplicarse a rutas API.

**Endpoints de alto riesgo:**
- Deletes de customers, projects, payments, aftersales y visits.
- Ajustes financieros de proyecto.
- Import masivo.
- Devoluciones de crédito.
- Gestión de usuarios.

**Acción recomendada:**
Crear autorización centralizada en `lib/api-handler.ts` o helper dedicado:

```ts
requireRole(['admin'])
requireRole(['admin', 'finance'])
```

Aplicar primero a:
1. `/api/users`
2. Ajustes de proyecto
3. Devolución de crédito
4. Imports
5. Deletes

**Criterio de cierre:**
Los endpoints sensibles retornan `403` para usuarios autenticados sin rol permitido, con tests.

---

### P0-03 - `/api/users` Está Autenticado Pero Sobre-Privilegiado

**Estado:** Abierto
**Tipo:** Seguridad
**Impacto:** Cualquier usuario autenticado podría listar o crear usuarios.

**Evidencia:**
- `app/api/users/route.ts` no usa `withApiHandler`.
- No tiene validación Zod.
- Usa `console.error` en vez de logger estructurado.
- `GET` retorna `prisma.user.findMany()` sin minimizar campos.
- `POST` crea usuarios sin autorización admin explícita.

**Corrección recomendada:**
1. Envolver con `withApiHandler`.
2. Agregar schema Zod estricto.
3. Requerir rol `admin`.
4. En `GET`, retornar solo campos necesarios: `id`, `name`, `email`, `role`, `createdAt`.
5. Limitar paginación y validar `limit/offset`.

**Criterio de cierre:**
`GET` y `POST /api/users` requieren admin, validan input y tienen tests para `401/403/400/201`.

---

## P1 - Alto

### P1-01 - Refund de Crédito Valida Fuera de Transacción

**Estado:** Abierto
**Tipo:** Bug financiero / Concurrencia
**Impacto:** Dos requests concurrentes podrían validar contra el mismo saldo y crear retiros que dejan ledger negativo.

**Evidencia:**
- `app/api/customers/[id]/credit/refund/route.ts` calcula `creditBalance` antes de la transacción.
- Dentro de la transacción crea `WITHDRAWAL` y luego calcula el nuevo saldo, pero no revalida antes de crear.

**Acción recomendada:**
Mover lectura y validación de saldo dentro de la transacción antes de crear el `WITHDRAWAL`.

**Criterio de cierre:**
El endpoint revalida saldo en la transacción y un test cubre doble refund concurrente o intento de refund mayor al saldo.

---

### P1-02 - Balances Negativos de Crédito se Ocultan

**Estado:** Abierto
**Tipo:** Integridad de datos
**Impacto:** Bugs financieros pueden quedar invisibles porque el sistema retorna `0` en vez del saldo real negativo.

**Evidencia:**
- `getCustomerCreditBalance()` usa `Math.max(0, rawBalance)`.
- `getCustomerCreditBalances()` aplica el mismo patrón batch.

**Acción recomendada:**
1. Calcular `rawBalance`.
2. Loggear warning/error estructurado si `rawBalance < 0`.
3. Definir si la función debe retornar saldo raw o saldo clamp.

**Criterio de cierre:**
Un ledger negativo queda visible en logs/alertas y existe test para saldo negativo.

---

### P1-03 - Exports Cargan Todos los Datos en Memoria

**Estado:** Abierto
**Tipo:** Operacional
**Impacto:** Riesgo de OOM, timeout o caída de función serverless con datasets grandes.

**Evidencia:**
- `app/api/customers/export/route.ts` usa `findMany()` sin límite.
- `app/api/payments/export/route.ts` usa `findMany()` sin límite.
- `app/api/projects/export/route.ts` consulta todos los resultados filtrados sin límite.

**Acción recomendada:**
Opción inicial pragmática:
1. Agregar `MAX_EXPORT_ROWS`.
2. Aplicar filtros en DB.
3. Retornar error o advertencia si excede el límite.

Opción robusta:
1. Export streaming CSV/XLSX.
2. Job asíncrono para archivos grandes.

**Criterio de cierre:**
Los exports tienen límite explícito o streaming, y tests cubren límite excedido.

---

### P1-04 - Imports Sin Límite de Batch Size

**Estado:** Abierto
**Tipo:** Operacional / DB
**Impacto:** Transacciones largas, timeouts y locks excesivos.

**Evidencia:**
- `app/api/customers/import/route.ts` crea una transacción con todas las filas.
- Revisar también `payments/import` y `projects/import`.

**Acción recomendada:**
1. Definir `MAX_IMPORT_ROWS`.
2. Procesar en chunks (`BATCH_SIZE`, por ejemplo 250 o 500).
3. Retornar resumen por chunk con errores acumulados.

**Criterio de cierre:**
Imports rechazan o chunkear datasets grandes y tienen tests para límites.

---

### P1-05 - Transacción de Creación de Pagos Sigue Siendo Larga

**Estado:** Validar
**Tipo:** Performance / Concurrencia
**Impacto:** Mayor latencia y riesgo de deadlocks bajo carga.

**Evidencia:**
- `POST /api/payments` crea payment, allocations, installments, actualiza cuotas, crea transacciones de crédito y recorre proyectos con sobrepago dentro de una sola transacción.

**Acción recomendada:**
1. Corregir primero P0-01 para no optimizar sobre un contrato financiero ambiguo.
2. Reemplazar loops de `creditTransaction.create()` por `createMany()` cuando aplique.
3. Medir duración de transacción antes/después.

**Criterio de cierre:**
Hay benchmark o métrica de duración y se eliminan writes secuenciales innecesarios.

---

## P2 - Medio

### P2-01 - `parsePaginationParams` Puede Devolver `NaN`

**Estado:** Abierto
**Tipo:** Bug de validación
**Impacto:** Queries con `skip/take` inválidos.

**Evidencia:**
- `lib/utils/pagination.ts` usa `Math.max(1, parseInt(...))`.
- `parseInt('abc')` produce `NaN`; `Math.max(1, NaN)` sigue siendo `NaN`.

**Acción recomendada:**
Normalizar con `Number.isFinite()` o helper `parsePositiveInt`.

**Criterio de cierre:**
Inputs inválidos (`page=abc`, `limit=abc`, negativos, cero) devuelven defaults seguros con tests.

---

### P2-02 - `withApiHandler` Usa `bodySchema.parse()`

**Estado:** Abierto
**Tipo:** Robustez API
**Impacto:** Errores Zod pueden ser demasiado extensos si llega un payload grande o muy inválido.

**Evidencia:**
- `lib/api-handler.ts` usa `bodySchema.parse(rawBody)`.
- El error se captura, pero no se limita explícitamente la cantidad de issues devueltos.

**Acción recomendada:**
Usar `safeParse()` y limitar detalles a un máximo razonable. Evaluar límite de tamaño de body si se considera vector real.

**Criterio de cierre:**
Respuesta de validación entrega máximo N errores y test cubre payload inválido masivo.

---

### P2-03 - Falta Rate Limiting en Login/Auth

**Estado:** Abierto
**Tipo:** Seguridad
**Impacto:** Fuerza bruta contra login si no hay protección externa.

**Evidencia:**
- `middleware.ts` permite `/api/auth/*` como ruta pública.
- No se observó rate limiting local.

**Acción recomendada:**
Si hay Cloudflare/Vercel/WAF, documentar la regla. Si no, implementar rate limiting server-side o edge-compatible.

**Criterio de cierre:**
Existe rate limiting documentado y probado para login/auth.

---

### P2-04 - Conflictos de Equipo en Calendario No Se Validan

**Estado:** Abierto
**Tipo:** Regla de negocio
**Impacto:** Un mismo integrante puede quedar asignado a eventos superpuestos.

**Evidencia:**
- No se observó validación de conflicto por `teamTagIds`.
- Los eventos validan payload y duplicados por entidad/fecha, pero no disponibilidad de equipo.

**Acción recomendada:**
Definir primero si los eventos tienen hora/rango o solo fecha. Sin rango horario, la regla sería por día completo.

**Criterio de cierre:**
Crear/editar evento retorna `409` si un team tag queda doblemente asignado según la regla definida.

---

### P2-05 - Unique por Entidad y Fecha Bloquea Múltiples Eventos en el Mismo Día

**Estado:** Validar con negocio
**Tipo:** Regla de negocio / DB
**Impacto:** No permite dos eventos del mismo proyecto/postventa/visita en una misma fecha.

**Evidencia:**
- `ProjectEvent`: `@@unique([projectId, scheduledDate])`
- `AftersaleEvent`: `@@unique([aftersaleId, scheduledDate])`
- `VisitEvent`: `@@unique([visitId, scheduledDate])`

**Acción recomendada:**
Confirmar si el negocio necesita múltiples eventos por día. Si sí:
1. Eliminar unique constraint con migración.
2. Reemplazar duplicado accidental por validación de aplicación opcional.

**Criterio de cierre:**
Decisión documentada y migración aplicada si corresponde.

---

### P2-06 - Directorios `*-with-update` Duplican Endpoints

**Estado:** Resuelto
**Tipo:** Mantenibilidad
**Impacto:** Dos rutas para responsabilidades similares elevan el riesgo de bugs divergentes.

**Evidencia:**
- La lógica transaccional de creación de evento + actualización relacionada quedó centralizada en `lib/business-logic/calendar-event-creation.ts`.
- `POST /api/project-events`, `POST /api/visit-events` y `POST /api/aftersale-events` aceptan payload simple y payload extendido.
- Los hooks `useCreate*EventWithUpdate` ahora llaman a endpoints canónicos.
- `app/api/*-events-with-update` queda solo como wrapper legacy liviano.

**Acción aplicada:**
1. Se consolidó la funcionalidad en los endpoints oficiales.
2. Se migraron los hooks a rutas canónicas.
3. Se reemplazó la implementación duplicada de rutas `*-with-update` por wrappers de compatibilidad.
4. Se agregaron tests para payload simple y extendido en proyecto, visita y postventa.

**Criterio de cierre:**
No queda lógica duplicada ni referencias en hooks a rutas `*-with-update`; las rutas legacy solo delegan en la implementación compartida.

---

### P2-07 - JSON `tasks` Tiene Validación de App Pero No Constraint DB

**Estado:** Abierto
**Tipo:** Integridad DB
**Impacto:** Inserts directos pueden guardar JSON no-array.

**Evidencia:**
- `Aftersale.tasks` y `ProjectEvent.tasks` son `Json`.
- La validación Zod de app existe para aftersales, pero DB acepta cualquier JSON válido.

**Acción recomendada:**
Agregar constraints SQL:

```sql
CHECK (jsonb_typeof(tasks) = 'array')
```

**Criterio de cierre:**
Migración con constraints y test/seed que confirma rechazo de JSON inválido.

---

### P2-08 - `ProjectAdjustment.amount` No Tiene CHECK DB

**Estado:** Abierto
**Tipo:** Integridad DB
**Impacto:** Inserts directos podrían crear ajustes negativos.

**Evidencia:**
- `ProjectAdjustment.amount` es `Decimal`, sin constraint DB.
- La app valida, pero DB no.

**Acción recomendada:**
Agregar constraint SQL `amount > 0`.

**Criterio de cierre:**
Migración aplicada y test DB o integración cubre monto negativo.

---

### P2-09 - Índices Faltantes/Redundantes

**Estado:** Validar con query plans
**Tipo:** Performance DB
**Impacto:** Overhead de escritura o queries menos eficientes.

**Evidencia inicial:**
- `User.email` tiene `@unique` y además `@@index([email])`.
- `CreditTransaction` no tiene índice compuesto `[customerId, type]`.
- `CommissionTier.paymentMethodId` puede estar cubierto por unique compuesto.

**Acción recomendada:**
1. Revisar `EXPLAIN ANALYZE` de queries reales.
2. Eliminar redundantes solo con migración revisada.
3. Agregar índices faltantes solo donde haya patrón de query confirmado.

**Criterio de cierre:**
Migración de índices basada en query plans o patrones confirmados.

---

### P2-10 - `calculateProjectBalance()` Sigue Ignorando Ajustes

**Estado:** Abierto
**Tipo:** Legacy / Mantenibilidad
**Impacto:** Callers legacy pueden calcular un balance distinto a `ProjectFinancials`.

**Evidencia:**
- `lib/business-logic/project-balance.ts` calcula `totalAmount - allocations`.
- No considera `ProjectAdjustment`.

**Acción recomendada:**
Renombrar a `calculateProjectBalanceWithoutAdjustments()` o extender firma para recibir ajustes.

**Criterio de cierre:**
No hay función con nombre ambiguo que ignore ajustes sin declararlo.

---

### P2-11 - Cuotas de Monto Cero en Montos Pequeños

**Estado:** Abierto
**Tipo:** UX / Validación financiera
**Impacto:** Montos pequeños con muchas cuotas pueden generar cuotas `$0`.

**Evidencia:**
- `calculateInstallments(0.1, 12, ...)` puede generar cuotas de 0.
- `validateInstallmentsSum()` valida suma, no monto individual positivo.

**Acción recomendada:**
Definir monto mínimo por cuota o rechazar combinaciones donde alguna cuota sea 0.

**Criterio de cierre:**
Test de monto pequeño con muchas cuotas rechaza o distribuye sin cuotas cero.

---

## P3 - Bajo

### P3-01 - Formato de Moneda en Mensajes Usa `toLocaleString`

**Estado:** Abierto
**Tipo:** Consistencia UX
**Evidencia:** `canRefundCredit()` y `canApplyCredit()` formatean montos con `$${value.toLocaleString('es-CL')}`.

**Acción recomendada:** Usar `formatCurrency()` centralizado.

**Criterio de cierre:** Mensajes financieros usan el helper común.

---

### P3-02 - `derivePaymentProgress()` Tiene Edge Case con `total = 0`

**Estado:** Abierto
**Tipo:** Edge case / Display
**Evidencia:** Retorna `percentPaid = 0` cuando `total === 0`, incluso si `balance <= 0`.

**Acción recomendada:** Documentar comportamiento o retornar 100% cuando total es 0 y no hay deuda.

**Criterio de cierre:** Tests cubren `total = 0`.

---

### P3-03 - `relationJoins` Sigue Como Preview Feature

**Estado:** Validar periódicamente
**Tipo:** Dependencia / Arquitectura
**Evidencia:** `previewFeatures = ["relationJoins"]` en `prisma/schema.prisma`.

**Acción recomendada:** Revisar compatibilidad al actualizar Prisma y mantener versión pineada.

**Criterio de cierre:** Decisión documentada o feature estable en versión usada.

---

### P3-04 - Mezcla de `Decimal` y `number`

**Estado:** Abierto
**Tipo:** Arquitectura financiera
**Impacto:** Riesgo de diferencias de redondeo en casos edge.

**Acción recomendada:**
Definir regla:
- DB y cálculos financieros: `Decimal`.
- API/display: `number` solo en serialización.

**Criterio de cierre:**
Guía documentada y helpers financieros no mezclan sin conversión explícita.

---

### P3-05 - Limpieza de Dependencias y Archivos Huérfanos

**Estado:** Validar antes de eliminar
**Tipo:** Mantenibilidad
**Evidencia:** Knip reporta dependencias y archivos potencialmente no usados.

**Acción recomendada:**
Ejecutar `npm run lint:deep`, revisar manualmente entrypoints, scripts one-shot y archivos usados por Playwright/config.

**Criterio de cierre:**
Dependencias realmente no usadas eliminadas; falsos positivos documentados.

---

### P3-06 - Variables de Entorno Sin Matriz Verificada

**Estado:** Validar
**Tipo:** Configuración
**Problema anterior:** El documento viejo asumía variables de Better Auth no observadas directamente en el código.

**Acción recomendada:**
Crear matriz:

| Variable | Fuente en código | Requerida | Entorno |
|----------|------------------|-----------|---------|
| `DATABASE_URL` | Prisma datasource | Sí | server |
| `DIRECT_URL` | Prisma datasource | Sí | server |
| `NEXT_PUBLIC_APP_URL` | `.env.example` | Validar | client/server |

**Criterio de cierre:**
`lib/env.ts` valida solo variables realmente usadas o requeridas indirectamente.

---

## Hallazgos Resueltos u Obsoletos

Estos puntos no deben aparecer como pendientes en el checklist principal.

| ID anterior | Estado actual | Motivo |
|------------|---------------|--------|
| Validación redundante fuerte de `creditApplied` fuera de transacción | Obsoleto | La validación relevante ocurre dentro de la transacción. Solo queda una validación barata de tipo. |
| Metadata de `OVERPAYMENT` sin `creditApplied` | Resuelto | Metadata ya incluye `creditApplied`. |
| Reversión de crédito por signo ambiguo | Resuelto | DELETE de pagos revierte según tipo de transacción. |
| LIKE sin escapar en búsqueda de pagos | Resuelto | `%` y `_` se escapan en pagos. |
| `Project.balance` como fuente runtime | Resuelto parcial | Runtime principal usa `ProjectFinancials`; columna legacy sigue en schema. |
| `updateMultipleProjectBalances` N+1 | Resuelto | La función fue eliminada. |
| Cron `reconcile-balances` sin protección | Obsoleto | Endpoint eliminado. |
| Import de pagos sin recalcular balance | Obsoleto | Balance se deriva desde `ProjectFinancials`. |
| Cuotas por suma de 30 días | Resuelto | Usa `addMonths()`. |
| Estados de cuotas `paid/pending` confusos | Resuelto | Usa `due/upcoming`. |
| Timezone de cuotas/visitas | Resuelto | Usa helpers en `lib/timezone.ts`. |
| `search-projects` con `balance > 1` hardcoded | Resuelto | Usa `FINANCIAL.BALANCE_TOLERANCE`. |
| `Project.PUT` recalcula balance sin ajustes | Obsoleto | Ya no recalcula/escribe balance persistido. |
| Testing de imports/adjustments inexistente | Obsoleto parcial | Existen tests para varios endpoints antes listados como sin cobertura. Exports endpoint siguen siendo candidatos. |
| Endpoints `*-with-update` duplicados | Resuelto | Los hooks usan rutas canónicas y las rutas legacy son wrappers sobre lógica compartida. |

---

## Checklist Priorizado

### Semana 1

- [ ] Corregir contrato de `creditApplied` en pago 1:1 y `ProjectFinancials`.
- [ ] Agregar autorización por rol centralizada.
- [ ] Proteger `/api/users` con admin, Zod y campos mínimos.
- [ ] Mover validación de refund de crédito dentro de transacción.
- [ ] Corregir `parsePaginationParams` contra `NaN`.

### Semana 2

- [ ] Agregar límites a exports e imports.
- [ ] Alertar/loggear saldos negativos de crédito.
- [ ] Limitar errores Zod en `withApiHandler`.
- [ ] Agregar rate limiting o documentar protección externa de login/auth.

### Mes Actual

- [ ] Resolver regla de negocio de múltiples eventos por día.
- [ ] Validar conflictos de equipo en calendario.
- [ ] Agregar constraints DB para JSON `tasks` y `ProjectAdjustment.amount`.
- [ ] Revisar índices con query plans.
- [ ] Estandarizar Decimal vs number.

---

## Reglas Para Mantener Este Documento

1. No agregar hallazgos sin evidencia verificable.
2. No dejar issues resueltos en el checklist principal.
3. Si un punto es hipótesis operacional, marcarlo como `Validar`, no como bug confirmado.
4. Cada issue debe tener criterio de cierre.
5. Al cerrar un issue, moverlo a "Hallazgos Resueltos u Obsoletos" con fecha y PR/commit si existe.
6. Regenerar o revisar TOC y numeración cuando se edite.

---

## Referencias

Planes técnicos existentes relacionados:

- `plans/derive-customer-credit-balance.md`
- `plans/fix-n-plus-1-and-redundant-queries.md`
- `plans/migrate-endpoints-to-sql-pattern.md`
- `plans/replace-installment-cron-with-derived-state.md`
- `plans/unify-project-total-fields.md`
