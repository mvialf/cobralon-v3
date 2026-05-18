# Análisis de Mejoras y Bugs Potenciales - Proyecto Cobralon

> **Última validación:** 2026-05-18
> **Proyecto:** Cobralon
> **Objetivo:** Backlog técnico verificable para priorizar bugs, riesgos operacionales y mejoras arquitectónicas.
> **Estado del documento anterior:** reescrito por drift contra el código actual. La versión anterior mezclaba pendientes, resueltos, duplicados y hallazgos obsoletos.

---

## Cómo Usar Este Documento

Cada hallazgo usa un ID estable para evitar duplicados y reaperturas accidentales.

| Campo                  | Significado                                                                    |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Estado**             | `Abierto`, `Validar`, `Obsoleto`, `Resuelto`                                   |
| **Evidencia**          | Archivo/línea o comportamiento observado en el código                          |
| **Criterio de cierre** | Condición concreta para marcarlo como resuelto                                 |
| **Tipo**               | `Bug`, `Seguridad`, `Operacional`, `Arquitectura`, `Mantenibilidad`, `Testing` |

### Severidad

| Nivel            | Definición                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| **P0 - Crítico** | Riesgo de pérdida de dinero, escalada de privilegios, corrupción de datos o caída operacional relevante. |
| **P1 - Alto**    | Bug funcional o deuda técnica que puede afectar flujos importantes en producción.                        |
| **P2 - Medio**   | Inconsistencia, riesgo edge o mejora necesaria para escalar con menos fricción.                          |
| **P3 - Bajo**    | Limpieza, mantenibilidad o mejora de calidad sin impacto funcional inmediato.                            |

---

## Resumen Ejecutivo

El documento anterior no debe usarse como backlog directo. Los puntos sobre `Project.balance`, `updateMultipleProjectBalances`, cron de reconciliación, timezone de cuotas y varios tests ya están resueltos u obsoletos.

Los riesgos vigentes más importantes son:

1. **Exports/imports masivos:** varios endpoints cargan todo en memoria o procesan batches sin límite explícito.
2. **Reglas de calendario:** conflictos de equipo y múltiples eventos por día requieren decisión de negocio, pero sus datos actuales no son críticos.
3. **Autorización por rol:** diferida por decisión de producto; no se prioriza mientras todos los usuarios autenticados sean equivalentes operacionalmente.
4. **Performance DB:** índices faltantes o redundantes deben validarse con query plans antes de tocar producción.
5. **Normalización Decimal vs number:** sigue como deuda de consistencia técnica.

Validación Neon del 2026-05-18:

- Migraciones aplicadas en Neon:
  - `20260517130000_clear_non_critical_operational_data`
  - `20260518100000_harden_financial_integrity`
- Baseline Prisma registrado para migraciones ya reflejadas en la DB:
  - `20260517120000_create_project_financials_view`
  - `20260517123000_add_project_applications`
- Auditoría `npm run audit:important-data`: `0 critical`, `0 warning`.
- `Project.balance` legacy quedó sincronizado con `ProjectFinancials.balance`.
- Datos no críticos limpiados: `project_events`, `aftersale_events`, `visit_events`, `Aftersale`, `visits`, `team_tags`.

Hallazgos que estaban abiertos pero ya fueron cerrados en código actual:

- `P0-01`: crédito aplicado a proyecto.
- `P0-03`: `/api/users` sobre-privilegiado.
- `P1-01`: refund de crédito validado fuera de transacción.
- `P1-02`: saldos negativos de crédito invisibles.
- `P2-01`: `parsePaginationParams` devolviendo `NaN`.
- `P2-02`: `withApiHandler` usando `bodySchema.parse()`.

---

## P0 - Crítico

### P0-01 - Crédito Aplicado Puede No Reducir el Balance Derivado del Proyecto

**Estado:** Resuelto
**Tipo:** Bug financiero
**Impacto:** Crédito del cliente puede consumirse sin reflejarse correctamente en el balance financiero del proyecto.

**Evidencia actualizada:**

- `paymentToProjectToPayload()` envía `creditApplied` a nivel raíz y por allocation.
  - `lib/validations/payment-validations.ts`
- `ProjectFinancials` descuenta `project_applications.settledTotal`, incluyendo `CUSTOMER_CREDIT`.
  - `prisma/migrations/20260517123000_add_project_applications/migration.sql`
- Hay tests para `paymentToProjectToPayload()` con `creditApplied`.
  - `lib/validations/__tests__/payment-validations.test.ts`

**Decisión aplicada:**
`Payment.amount` representa dinero nuevo. El crédito aplicado se registra como aplicación separada al proyecto (`CUSTOMER_CREDIT`) y entra al balance derivado vía `ProjectFinancials`.

**Criterio de cierre:** Cumplido.

---

### P0-02 - Falta Autorización por Rol en Endpoints Sensibles

**Estado:** Resuelto como riesgo aceptado
**Tipo:** Seguridad
**Impacto:** Si en el futuro existen usuarios con distintos niveles de confianza, cualquier usuario autenticado podría ejecutar operaciones que deberían requerir admin o permisos específicos.

**Evidencia actualizada:**

- `withApiHandler` ya soporta autorización centralizada con `requiredRole` y `requiredRoles`.
  - `lib/api-handler.ts`
- Hay tests unitarios para `401`, `403` y roles permitidos.
  - `lib/__tests__/api-handler.test.ts`
- `/api/users` ya usa `requiredRole: 'admin'`.
  - `app/api/users/route.ts`
- El riesgo técnico es adopción incompleta: muchos endpoints sensibles usan `withApiHandler` sin roles, o aún usan `withLogging` directamente.
- Decisión actual: por ahora no interesa diferenciar roles de usuario, por lo que no debe bloquear trabajo de mayor impacto inmediato.

**Decisión operacional:**
Mientras todos los usuarios autenticados tengan el mismo nivel operacional, no se agregan restricciones por rol a endpoints sensibles. El riesgo queda aceptado y documentado para no contaminar el backlog activo.

**Endpoints de alto riesgo:**

- Deletes de customers, projects, payments, aftersales y visits.
- Ajustes financieros de proyecto.
- Import masivo.
- Devoluciones de crédito.
- Gestión de usuarios.

**Acción recomendada si se reabre:**
Aplicar `requiredRole`/`requiredRoles` primero a:

1. `/api/users`
2. Ajustes de proyecto
3. Devolución de crédito
4. Imports
5. Deletes

Nota: `/api/users` ya está cubierto; queda en la lista solo como referencia de patrón.

**Criterio de cierre:**
Mientras no haya roles de negocio, este punto queda cerrado operacionalmente como riesgo aceptado. Si se reabre, los endpoints sensibles deben retornar `403` para usuarios autenticados sin rol permitido, con tests.

---

### P0-03 - `/api/users` Está Autenticado Pero Sobre-Privilegiado

**Estado:** Resuelto
**Tipo:** Seguridad
**Impacto:** Cualquier usuario autenticado podría listar o crear usuarios.

**Evidencia actualizada:**

- `GET` y `POST` usan `withApiHandler`.
- Ambos requieren `requiredRole: 'admin'`.
- `POST` valida con `createUserSchema`.
- `GET` usa `select` de campos acotados y paginación con límite máximo.
  - `app/api/users/route.ts`

**Criterio de cierre:** Cumplido para implementación. Mantener o agregar tests específicos de ruta si se quiere cobertura por endpoint además de los tests de `withApiHandler`.

---

## P1 - Alto

### P1-01 - Refund de Crédito Valida Fuera de Transacción

**Estado:** Resuelto
**Tipo:** Bug financiero / Concurrencia
**Impacto:** Dos requests concurrentes podrían validar contra el mismo saldo y crear retiros que dejan ledger negativo.

**Evidencia actualizada:**

- El endpoint bloquea la fila del cliente dentro de la transacción con `lockCustomerCreditBalance()`.
- Recalcula `getCustomerCreditBalanceDetails()` dentro de la transacción antes de crear el `WITHDRAWAL`.
- Vuelve a calcular saldo dentro de la misma transacción después del movimiento.
  - `app/api/customers/[id]/credit/refund/route.ts`
- Hay tests del flujo de refund con saldo recalculado.
  - `app/api/customers/[id]/credit/refund/__tests__/route.test.ts`

**Criterio de cierre:** Cumplido.

---

### P1-02 - Balances Negativos de Crédito se Ocultan

**Estado:** Resuelto
**Tipo:** Integridad de datos
**Impacto:** Bugs financieros pueden quedar invisibles porque el sistema retorna `0` en vez del saldo real negativo.

**Evidencia actualizada:**

- `getCustomerCreditBalanceDetails()` expone `rawBalance` y `availableBalance`.
- `normalizeCreditBalance()` registra warning estructurado cuando `rawBalance < 0`.
- Las funciones compatibles siguen retornando `availableBalance` clamppeado, pero el saldo negativo ya no queda silencioso.
  - `lib/business-logic/credit-management.ts`
- Hay tests para saldo negativo individual y batch.
  - `lib/business-logic/__tests__/credit-management.test.ts`

**Criterio de cierre:** Cumplido.

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

**Estado:** Resuelto parcial
**Tipo:** Performance / Concurrencia
**Impacto:** Mayor latencia y riesgo de deadlocks bajo carga.

**Evidencia:**

- `POST /api/payments` crea payment, allocations, installments, actualiza cuotas, crea transacciones de crédito y recorre proyectos con sobrepago dentro de una sola transacción.

**Acción aplicada:**

1. Se mantiene el contrato financiero ya definido en P0-01.
2. Se eliminó la lectura redundante de proyectos dentro de la transacción.
3. Se reemplazaron writes secuenciales de `CreditTransaction` por `createMany()` para crédito aplicado y sobrepagos.
4. Se agregó `transactionDurationMs` al log de creación exitosa.

**Criterio de cierre:**
Resuelto parcialmente: ya no hay writes secuenciales innecesarios de `CreditTransaction` ni lectura redundante de proyectos. Queda como mejora futura medir con tráfico real si conviene extraer más trabajo de la transacción.

---

## P2 - Medio

### P2-01 - `parsePaginationParams` Puede Devolver `NaN`

**Estado:** Resuelto
**Tipo:** Bug de validación
**Impacto:** Queries con `skip/take` inválidos.

**Evidencia actualizada:**

- `parsePaginationParams()` usa `parsePositiveInteger()` con `Number.isFinite()`.
- Inputs inválidos vuelven a defaults seguros.
  - `lib/utils/pagination.ts`
- Hay tests para `NaN`, strings inválidos, vacíos, cero, negativos y decimales.
  - `lib/utils/__tests__/pagination.test.ts`

**Criterio de cierre:** Cumplido.

---

### P2-02 - `withApiHandler` Usa `bodySchema.parse()`

**Estado:** Resuelto
**Tipo:** Robustez API
**Impacto:** Errores Zod pueden ser demasiado extensos si llega un payload grande o muy inválido.

**Evidencia actualizada:**

- `withApiHandler` usa `bodySchema.safeParse(rawBody)`.
- `handleApiError()` limita detalles Zod con `MAX_ZOD_ISSUES = 5`.
  - `lib/api-handler.ts`
- Hay test que confirma máximo 5 detalles y `totalErrors`.
  - `lib/__tests__/api-handler.test.ts`

**Criterio de cierre:** Cumplido.

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
- Las rutas `app/api/*-events-with-update` fueron eliminadas; los endpoints canónicos aceptan payload simple y extendido.

**Acción aplicada:**

1. Se consolidó la funcionalidad en los endpoints oficiales.
2. Se migraron los hooks a rutas canónicas.
3. Se eliminaron las rutas `*-with-update` tras migrar consumidores internos a endpoints canónicos.
4. Se agregaron tests para payload simple y extendido en proyecto, visita y postventa.

**Criterio de cierre:**
No queda lógica duplicada ni referencias internas a rutas `*-with-update`.

---

### P2-07 - JSON `tasks` Tiene Validación de App Pero No Constraint DB

**Estado:** Diferido por decisión de datos
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

**Decisión actual:**
Los datos actuales de calendario/postventa/visitas no son importantes; se prioriza integridad financiera. El modelo se conserva y esta mejora queda fuera del siguiente corte.

---

### P2-08 - `ProjectAdjustment.amount` No Tiene CHECK DB

**Estado:** Resuelto
**Tipo:** Integridad DB
**Impacto:** Inserts directos podrían crear ajustes negativos.

**Evidencia:**

- `ProjectAdjustment.amount` es `Decimal`, sin constraint DB.
- La app valida, pero DB no.

**Acción aplicada:**
Migración `20260518100000_harden_financial_integrity` agrega:

- `project_adjustments_amount_positive_check`
- `project_applications_amount_positive_check`

La migración fue aplicada en Neon el 2026-05-18. La auditoría posterior reportó `0 critical` y `0 warning`.

**Criterio de cierre:**
Cumplido.

---

### P2-09 - Índices Faltantes/Redundantes

**Estado:** Resuelto parcial
**Tipo:** Performance DB
**Impacto:** Overhead de escritura o queries menos eficientes.

**Evidencia validada:**

- `User.email` tiene `@unique` y además `@@index([email])`.
- `CommissionTier.paymentMethodId` está cubierto por el índice único compuesto.
- Varios índices simples están cubiertos por índices compuestos con el mismo prefijo.
- `Project.balance` es legacy; runtime usa `ProjectFinancials`.
- `EXPLAIN ANALYZE` sobre queries reales de proyectos, pagos y cuenta de cliente mostró tiempos bajos con el volumen actual.

**Acción aplicada:**

1. Se revisaron índices reales en Neon y query plans representativos.
2. Se creó migración `20260518113000_prune_redundant_indexes`.
3. Se eliminaron índices redundantes/legacy sin agregar índices nuevos.

**Criterio de cierre:**
Resuelto parcialmente: se limpian índices redundantes con evidencia. Si el volumen crece, reevaluar búsquedas `OR + normalize_text` y considerar refactor a `UNION` antes de agregar índices nuevos.

---

### P2-10 - Helper Legacy de Balance Ignora Ajustes

**Estado:** Resuelto
**Tipo:** Legacy / Mantenibilidad
**Impacto:** Callers legacy pueden calcular un balance distinto a `ProjectFinancials`.

**Evidencia:**

- El helper que calculaba balance solo desde allocations fue eliminado.
- El script one-shot de sincronización de balances fue eliminado.

**Acción aplicada:**
Se eliminó el helper de balance basado solo en allocations. El runtime debe usar `ProjectFinancials`.

La migración `20260518100000_harden_financial_integrity` sincronizó `Project.balance` legacy desde `ProjectFinancials`; la auditoría posterior confirmó `legacy-project-balance-differs-from-financials: 0`.

**Criterio de cierre:**
No hay helper runtime que calcule balance ignorando ajustes o crédito aplicado.

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

### P3-02 - Helper de Progreso con Edge Case en `total = 0`

**Estado:** Obsoleto
**Tipo:** Edge case / Display
**Evidencia:** El helper fue eliminado durante la limpieza de código muerto.

**Acción recomendada:** Ninguna. El progreso debe venir de `ProjectFinancials`.

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

**Estado:** Resuelto
**Tipo:** Arquitectura financiera
**Impacto:** Riesgo de diferencias de redondeo en casos edge.

**Regla adoptada:**

- DB, persistencia y cálculos financieros usan `Decimal` mediante `lib/business-logic/money.ts`.
- API, UI, Excel, gráficos y display mantienen `number` como contrato de frontera.
- Las comparaciones, sumas, redondeos, cuotas, comisiones, crédito, ajustes y balances pasan por helpers monetarios.
- `Payment.amount` queda inmutable: corregir dinero requiere eliminar/anular y recrear el pago.

**Evidencia:**

- Se agregó helper central de dinero y tests dedicados.
- Se migraron cálculos de `totals`, `installments`, `commission`, FIFO, crédito, balances derivados y validaciones de pagos.
- Se migraron rutas financieras críticas: pagos, eliminación de pagos, proyectos, ajustes, importación de proyectos/pagos y refund de crédito.

**Criterio de cierre:** Cumplido. Las conversiones a `number` quedan limitadas a frontera de salida/serialización/exportación o a contratos públicos existentes.

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

| Variable              | Fuente en código  | Requerida | Entorno       |
| --------------------- | ----------------- | --------- | ------------- |
| `DATABASE_URL`        | Prisma datasource | Sí        | server        |
| `DIRECT_URL`          | Prisma datasource | Sí        | server        |
| `NEXT_PUBLIC_APP_URL` | `.env.example`    | Validar   | client/server |

**Criterio de cierre:**
`lib/env.ts` valida solo variables realmente usadas o requeridas indirectamente.

---

## Hallazgos Resueltos u Obsoletos

Estos puntos no deben aparecer como pendientes en el checklist principal.

| ID anterior                                                          | Estado actual    | Motivo                                                                                                             |
| -------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Validación redundante fuerte de `creditApplied` fuera de transacción | Obsoleto         | La validación relevante ocurre dentro de la transacción. Solo queda una validación barata de tipo.                 |
| Metadata de `OVERPAYMENT` sin `creditApplied`                        | Resuelto         | Metadata ya incluye `creditApplied`.                                                                               |
| Reversión de crédito por signo ambiguo                               | Resuelto         | DELETE de pagos revierte según tipo de transacción.                                                                |
| LIKE sin escapar en búsqueda de pagos                                | Resuelto         | `%` y `_` se escapan en pagos.                                                                                     |
| `Project.balance` como fuente runtime                                | Resuelto         | Runtime principal usa `ProjectFinancials`; columna legacy fue sincronizada en Neon y auditoría quedó sin warnings. |
| `updateMultipleProjectBalances` N+1                                  | Resuelto         | La función fue eliminada.                                                                                          |
| Cron `reconcile-balances` sin protección                             | Obsoleto         | Endpoint eliminado.                                                                                                |
| Import de pagos sin recalcular balance                               | Obsoleto         | Balance se deriva desde `ProjectFinancials`.                                                                       |
| Cuotas por suma de 30 días                                           | Resuelto         | Usa `addMonths()`.                                                                                                 |
| Estados de cuotas `paid/pending` confusos                            | Resuelto         | Usa `due/upcoming`.                                                                                                |
| Timezone de cuotas/visitas                                           | Resuelto         | Usa helpers en `lib/timezone.ts`.                                                                                  |
| `search-projects` con `balance > 1` hardcoded                        | Resuelto         | Usa `FINANCIAL.BALANCE_TOLERANCE`.                                                                                 |
| `Project.PUT` recalcula balance sin ajustes                          | Obsoleto         | Ya no recalcula/escribe balance persistido.                                                                        |
| Testing de imports/adjustments inexistente                           | Obsoleto parcial | Existen tests para varios endpoints antes listados como sin cobertura. Exports endpoint siguen siendo candidatos.  |
| Endpoints `*-with-update` duplicados                                 | Resuelto         | Los hooks usan rutas canónicas y las rutas duplicadas fueron eliminadas.                                           |
| `P0-01` crédito aplicado a proyecto                                  | Resuelto         | `creditApplied` viaja en payload y `ProjectFinancials` descuenta aplicaciones `CUSTOMER_CREDIT`.                   |
| `P0-03` `/api/users` sobre-privilegiado                              | Resuelto         | Usa `withApiHandler`, Zod, paginación, `select` acotado y `requiredRole: 'admin'`.                                 |
| `P1-01` refund valida fuera de transacción                           | Resuelto         | Refund bloquea cliente y recalcula saldo dentro de la transacción.                                                 |
| `P1-02` saldos negativos ocultos                                     | Resuelto         | Se expone `rawBalance`, se mantiene `availableBalance` compatible y se loggea saldo negativo.                      |
| `P2-01` paginación puede devolver `NaN`                              | Resuelto         | `parsePositiveInteger()` normaliza con `Number.isFinite()` y tiene tests.                                          |
| `P2-02` `withApiHandler` usa `parse()`                               | Resuelto         | Usa `safeParse()` y limita detalles Zod a 5 issues.                                                                |
| `P2-08` CHECK financiero faltante                                    | Resuelto         | Neon tiene constraints para `project_applications.amount > 0` y `project_adjustments.amount > 0`.                  |
| `P2-10` helper ambiguo de balance                                    | Resuelto         | Se eliminó el helper que calculaba balance desde allocations sin ajustes ni crédito aplicado.                      |
| `P0-02` autorización por rol                                         | Riesgo aceptado  | Roles diferidos por decisión de producto mientras todos los usuarios autenticados sean equivalentes.               |
| `P1-05` transacción larga de pagos                                   | Resuelto parcial | `CreditTransaction` usa batch writes, se eliminó lectura redundante y se loggea duración de transacción.           |
| `P2-09` índices faltantes/redundantes                                | Resuelto parcial | Se eliminaron índices redundantes/legacy con query plans reales; no se agregaron índices nuevos.                   |
| `P3-04` mezcla de `Decimal` y `number`                               | Resuelto         | Cálculos financieros usan helper Decimal central; `number` queda como contrato de frontera.                        |

---

## Checklist Priorizado

### Semana 1

- [ ] Agregar límites explícitos a exports.
- [ ] Agregar límites explícitos o chunking a imports.
- [ ] Migrar imports que aún usan `withLogging` directo hacia `withApiHandler` si aplica.
- [ ] Agregar tests para límites de imports/exports.
- [ ] Agregar rate limiting o documentar protección externa de login/auth.

### Semana 2

- [x] Revisar duración de transacción de `POST /api/payments` después del cierre de `P0-01`.
- [ ] Agregar constraints DB para JSON `tasks` cuando calendario/postventa vuelva a ser prioritario.
- [x] Agregar CHECK DB para `ProjectAdjustment.amount > 0`.
- [x] Sincronizar `Project.balance` legacy con `ProjectFinancials` en Neon.
- [x] Documentar explícitamente que los roles quedan diferidos mientras todos los usuarios autenticados tengan el mismo nivel operacional.

### Mes Actual

- [ ] Resolver regla de negocio de múltiples eventos por día.
- [ ] Validar conflictos de equipo en calendario.
- [x] Revisar índices con query plans.
- [x] Estandarizar Decimal vs number.
- [ ] Limpiar dependencias/archivos huérfanos solo después de validar reporte Knip.

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
