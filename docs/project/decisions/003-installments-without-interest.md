# ADR-003: Cuotas sin interes

**Estado:** Accepted
**Fecha original:** 2025-10-21
**Actualizado:** 2026-05-28

## Contexto

Cobralon necesita registrar pagos en cuotas para fines operativos y de seguimiento, sin comportarse como motor financiero de interes compuesto ni gateway de cobro.

## Decision

Implementar `Installment` como agenda informativa de cuotas sin interes.

Campos vigentes:

- `paymentId`
- `installmentNumber`
- `amount`
- `netAmount`
- `dueDate`
- timestamps

El estado de una cuota se deriva en runtime desde `dueDate`. No existen `status`, `paidDate` ni cron de marcado automatico.

## Reglas

- La suma de cuotas debe coincidir con el monto del pago dentro de tolerancia financiera.
- La ultima cuota absorbe diferencias de redondeo.
- Las cuotas no modifican por si mismas la deuda del proyecto; la deuda se resuelve por `PaymentAllocation`, `ProjectApplication` y `ProjectFinancials`.
- No agregar interes, mora o recargos sin un ADR nuevo.
- No reintroducir cron para marcar cuotas pagadas salvo que exista una necesidad de negocio distinta a la visualizacion.

## Consecuencias

- Menos estado persistido y menos jobs operacionales.
- El UI puede mostrar cuotas vencidas o futuras sin mutar la base.
- La auditoria financiera sigue viviendo en pagos, allocations, applications y credit transactions.

## Implementacion

- Modelo Prisma: `Installment`.
- Logica: `lib/business-logic/installments.ts`.
- API: `app/api/installments/route.ts`.
- Tests: `lib/business-logic/__tests__/installments.test.ts` y `app/api/installments/__tests__/route.test.ts`.
