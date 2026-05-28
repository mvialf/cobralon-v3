# ADRs Cobralon

Este directorio contiene decisiones de arquitectura vigentes o historicamente necesarias para entender el sistema actual.

## Convenciones

- `Accepted`: decision vigente.
- `Superseded`: decision historica reemplazada por otra.
- Los ADRs deben explicar el contexto suficiente para mantener el sistema, no conservar documentacion del template original.

## Indice

| ADR | Estado | Tema |
| --- | --- | --- |
| [001](001-payment-allocation-architecture.md) | Accepted | `PaymentAllocation` como tabla N:M entre pagos y proyectos |
| [002](002-dual-payment-flows.md) | Accepted | flujos separados de pago a proyecto y pago a cliente |
| [003](003-installments-without-interest.md) | Accepted | cuotas sin interes, estado derivado por `dueDate` |
| [004](004-neon-postgresql.md) | Accepted | Neon PostgreSQL como proveedor |
| [005](005-no-authentication-mvp.md) | Superseded | MVP sin auth, reemplazado por ADR-007 |
| [006](006-credit-system-architecture.md) | Accepted | ledger de credito con `CreditTransaction` |
| [007](007-better-auth.md) | Accepted | Better Auth con Prisma adapter |
| [011](011-pageheader-action-slot.md) | Accepted | `PageHeader` con action slot |
| [012 navegacion](012-navegacion-jerarquica.md) | Accepted | navegacion jerarquica |
| [012 logging](012-pino-structured-logging.md) | Accepted | Pino y logging estructurado |

## Cuando crear un ADR

Crear o actualizar un ADR cuando el cambio:

- modifica un invariante financiero;
- introduce o reemplaza un proveedor externo;
- cambia el modelo de datos de una entidad central;
- cambia una estrategia transversal de testing, logging, auth o navegacion.

No crear ADRs para tareas mecanicas, fixes aislados o planes temporales. Esos pertenecen a `docs/project/implementation/` o `plans/` si siguen pendientes.
