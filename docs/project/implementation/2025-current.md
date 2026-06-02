# Implementaciones Vigentes

Este documento resume implementaciones que siguen siendo relevantes para mantener Cobralon. No es un archivo historico exhaustivo.

## Arquitectura financiera

- `ProjectFinancials` centraliza saldos derivados de proyectos.
- `ProjectApplication` normaliza aplicaciones de efectivo, credito y ajustes.
- `CreditTransaction` es el ledger de credito de clientes.
- `Project.balance` y saldos legacy no deben usarse como fuente principal en codigo nuevo.

Archivos clave:

- `lib/business-logic/project-financials.ts`
- `lib/business-logic/credit-management.ts`
- `lib/business-logic/payment-fifo.ts`
- `prisma/migrations/20260517120000_create_project_financials_view/migration.sql`
- `prisma/migrations/20260517123000_add_project_applications/migration.sql`

## Pagos, cuotas y comisiones

- Pagos a proyecto y pagos a cliente conviven como flujos separados.
- FIFO distribuye pagos de cliente a proyectos con deuda.
- Las cuotas son informativas, sin interes, y su estado se deriva desde `dueDate`.
- Las comisiones se guardan al registrar el pago para auditoria.
- El estado de cuenta permite solicitar saldo total, porcentaje o monto fijo sobre la deuda seleccionada. Esta solicitud es documental: no crea pagos, allocations, applications ni movimientos de credito.

Documentacion:

- [Sistema de pagos](../payment-system.md)
- [ADR-001](../decisions/001-payment-allocation-architecture.md)
- [ADR-002](../decisions/002-dual-payment-flows.md)
- [ADR-003](../decisions/003-installments-without-interest.md)

## Autenticacion

- Better Auth esta implementado con Prisma adapter.
- Existen login, sesiones y roles `user`/`admin`.
- `withApiHandler` soporta autorizacion por `allowedRoles`.

Documentacion:

- [Autenticacion](../auth.md)
- [ADR-007](../decisions/007-better-auth.md)

## API routes

- La mayoria de endpoints aplicables usan `withApiHandler` o `withLogging`.
- Los endpoints de auth, health y test cleanup quedan excluidos por diseño.
- `users/route.ts` es endpoint administrativo vigente, no scaffold.

Documentacion:

- [Migracion API routes](api-routes-migration.md)
- [Regla API routes](../../rules/api-routes.md)

## Calendario

- Calendario unificado para proyectos, postventas y visitas.
- Eventos con `scheduledDate`, `order` y asignacion M:N a `TeamTag`.
- Endpoint agregado `GET /api/calendar-events`.

Documentacion:

- [Sistema de calendario](../features/calendar-system.md)

## Importacion y exportacion retirada

- El flujo Excel de importacion/exportacion fue retirado para reducir superficie de mantenimiento.
- No quedan endpoints `/api/*/import`, `/api/*/export`, paginas `/settings/import` o `/settings/export`, ni dependencia `xlsx`.
- Cargas puntuales deben hacerse por DB/scripts controlados hasta que se diseñe una nueva solucion.

## Logging y errores

- Pino es el logger estructurado.
- `BusinessError`, `ApiError` y `withApiHandler` son el camino normal para errores esperados.
- Los endpoints no deben silenciar errores 500.

Documentacion:

- [ADR-012 Pino](../decisions/012-pino-structured-logging.md)

## Estado de auditoria de datos

Ultima auditoria local conocida:

- `0 critical`
- `10 warning` en `legacy-project-balance-differs-from-financials`

Si se vuelve a ejecutar `npm run audit:important-data`, no commitear reportes generados en `backups/`.
