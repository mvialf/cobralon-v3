# ADR 020: Simplificacion del Modelo Financiero

## Estado

Aceptado para implementacion incremental.

## Contexto

Los flujos mas usados de Cobralon son cliente, proyecto y pago. El sistema ya elimino
import/export Excel porque no aportaba valor operativo. El siguiente cuello de botella es
la complejidad accidental del nucleo financiero: balances derivados, credito de cliente,
allocations, applications y validaciones repartidas entre API routes, schemas y
formularios.

La auditoria financiera dirigida esta registrada en
`docs/project/financial-model-audit.md`.

## Decision

1. Backend y DB siguen siendo autoridad para persistencia financiera.
2. Frontend puede calcular previews, pero no define balances finales.
3. Los calculos deterministas deben vivir en funciones puras sin Prisma ni React.
4. `ProjectFinancials` sigue siendo la lectura autoritativa inicial para deuda visible.
5. `Project.balance` se trata como legacy y queda prohibido en codigo nuevo.
6. `creditApplied` top-level queda eliminado del contrato API; credito debe estar por
   allocation y el schema rechaza el campo top-level.
7. `POST /api/payments` queda dividido: la route es adaptador HTTP y
   `lib/use-cases/payments/create-payment.ts` orquesta el caso de uso financiero.
8. `ProjectApplication` no se elimina en la primera fase; se evalua despues de aislar y
   estabilizar el caso de uso.

## Consecuencias

- Menos logica financiera inline en API routes.
- Tests financieros mas cerca de funciones puras y casos de uso.
- Menos duplicacion entre frontend/backend para previews.
- Cambios de schema grandes quedan para una fase posterior, con datos auditados.

## No Decisiones

- No se migra inmediatamente `ProjectApplication`.
- No se elimina inmediatamente `Project.balance` del schema.
- No se cambia calendario/postventa.
