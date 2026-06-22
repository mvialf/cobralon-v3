# Implementaciones Vigentes

Este documento resume implementaciones que siguen siendo relevantes para mantener Cobralon. No es un archivo historico exhaustivo.

## Arquitectura financiera

- `ProjectFinancials` centraliza saldos derivados de proyectos.
- `project-balance.ts` concentra calculos puros de snapshot financiero de proyecto.
- `ProjectApplication` normaliza aplicaciones de efectivo, credito y ajustes.
- `CreditTransaction` es el ledger de credito de clientes.
- `Project.balance` y saldos legacy no deben usarse como fuente principal en codigo nuevo.
- `creditApplied` API top-level fue retirado; credito aplicado debe ir por allocation.
- `createPayment` separa el caso de uso financiero de `POST /api/payments`.
- La auditoria financiera read-only de proyecto expone `ProjectFinancials` y
  `ProjectApplication` sin crear ni recalcular datos desde frontend.

Archivos clave:

- `lib/business-logic/project-balance.ts`
- `lib/business-logic/project-financials.ts`
- `lib/business-logic/credit-management.ts`
- `lib/business-logic/payment-fifo.ts`
- `lib/use-cases/payments/create-payment.ts`
- `prisma/migrations/20260517120000_create_project_financials_view/migration.sql`
- `prisma/migrations/20260517123000_add_project_applications/migration.sql`

Documentacion:

- [Auditoria del modelo financiero](../financial-model-audit.md)
- [Conciliacion de balances legacy](../legacy-balance-reconciliation.md)
- [ADR-020](../decisions/020-financial-simplification.md)

## Pagos, cuotas y comisiones

- 2026-06-02: `createPayment` fue modularizado internamente con helpers privados para validacion, carga de entidades, creacion del pago, cuotas netas, credito aplicado, `ProjectApplication` y sobrepagos.
- `POST /api/payments` se mantiene como adaptador HTTP delgado; sus tests cubren contrato HTTP, validacion Zod y traduccion de errores.
- La cobertura financiera critica de pagos vive en `lib/use-cases/payments/__tests__/create-payment.test.ts`; no se modifico DB, `ProjectApplication` ni `Project.balance`.
- La UI de pagos usa un flujo unico de registro: el pago se crea para un cliente y la tabla de distribucion muestra los proyectos afectados, incluso cuando hay un solo proyecto.
- FIFO distribuye automaticamente el monto entre proyectos con deuda; la distribucion puede ajustarse manualmente.
- El selector de cliente del registro de pagos filtra clientes con proyectos con saldo pendiente.
- La accion "Registrar pago" en proyectos funciona como shortcut al cliente del proyecto y se oculta cuando el proyecto no tiene saldo pendiente.
- La creacion de pagos se orquesta en `lib/use-cases/payments/create-payment.ts`; la route HTTP permanece como adaptador.
- El modelo financiero sigue usando `PaymentAllocation` y `ProjectApplication` como fuente de verdad de aplicacion a proyectos; `Payment.type` queda como compatibilidad interna durante la transicion.
- Las cuotas son informativas, sin interes, y su estado se deriva desde `dueDate`.
- 2026-06-16: El `status` de las cuotas dejo de calcularse en `GET /api/installments` y
  ahora se deriva en el cliente con `getInstallmentStatus`. Se corrigio el bug
  `isOverdue` en `app/payments/installments/columns.tsx` (la condicion anterior
  nunca devolvia `true`). El endpoint conserva el filtro `status` traduciendolo a
  `dueDate` para no mover logica autoritativa al frontend.
- Se agrego `validateCustomerCreditApplication` en `lib/validations/payment-business-rules.ts`
  para centralizar la validacion de que un cliente tiene suficiente credito disponible
  cuando una allocation usa `useCredit`. El formulario `PaymentToCustomerForm` reutiliza
  esta regla junto con `validatePaymentApplicationSum`.
- `GET /api/installments` puede retornar `monthlyTotals` para mostrar una proyeccion informativa de cuotas proximas por mes; la UI de `Cuotas Comercio` usa 6 meses horizontales como selector y resumen.
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

## Clientes

- 2026-06-15: Correccion en edicion de cliente sin email. El frontend enviaba
  `email: null`, pero `updateCustomerApiSchema` no aceptaba `null`, causando 400
  "Datos invalidos" en produccion para clientes importados sin email. Se cambio
  a `email: ''`, que el backend ya convierte a `null` correctamente.
  Archivo: `components/dialogs/customers/edit-customer-dialog.tsx`.

## Marcador de atencion en proyectos

- 2025-06-16: Se agrego `Project.flagStatus` (string `"none" | "flagged"`) para marcar proyectos que necesitan atencion, evitando boolean para permitir estados futuros.
- 2026-06-22: Se agrego `Project.flaggedAt` nullable y el indice `Project(flagStatus, flaggedAt DESC)` para que el Panel Principal ordene por fecha real de marcado, no por cualquier actualizacion del proyecto.
- La tabla de proyectos muestra un icono bookmark inline entre las columnas "Estado" y "Estado Proyecto"; sin encabezado de columna, sin resaltar fila.
- El icono usa variables globales del tema: outline `text-muted-foreground`, relleno `text-primary`.
- Click inline alterna el estado con mutacion optimista en React Query; fallos se revierten y notifican con toast.
- `PUT /api/projects/[id]` acepta `flagStatus`; al marcar setea `flaggedAt = now()`, al desmarcar setea `flaggedAt = null`.
- `POST /api/projects` respeta `flagStatus` si se envia y setea `flaggedAt` de forma consistente.
- El Panel Principal (celda C) muestra el proyecto con `flagStatus = "flagged"` mas reciente por `flaggedAt`, con saldo y total, o "Sin proyectos destacados" si no hay ninguno.
- Se agregaron tests del contrato API y del optimistic update del hook.

Archivos clave:

- `app/projects/components/project-flag-cell.tsx`
- `app/projects/columns.tsx`
- `app/projects/page-client.tsx`
- `hooks/queries/use-projects.ts`
- `app/page.tsx`
- `app/api/projects/[id]/route.ts`
- `app/api/projects/route.ts`
- `lib/validations/project-validations.ts`
- `prisma/schema.prisma`

## Estado de auditoria de datos

Ultima auditoria local conocida:

- `0 critical`
- `18 warning` en `legacy-project-balance-differs-from-financials`

Si se vuelve a ejecutar `npm run audit:important-data`, no commitear reportes generados en `backups/`.
