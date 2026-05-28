# ADR-006: Sistema de credito por ledger

**Estado:** Accepted
**Fecha original:** 2025-12-06
**Actualizado:** 2026-05-28

## Contexto

Los clientes pueden quedar con saldo a favor por sobrepagos, devoluciones, retiros o ajustes. Ese saldo requiere trazabilidad; un campo editable no es suficiente para explicar por que aumento o disminuyo.

## Decision

Usar `CreditTransaction` como ledger de credito. Cada movimiento de credito debe estar representado por una transaccion.

Tipos:

- `OVERPAYMENT`
- `APPLIED`
- `REFUND`
- `WITHDRAWAL`
- `ADJUSTMENT`

El credito disponible se calcula desde el ledger con `lib/business-logic/credit-management.ts`.

## Reglas

- El credito disponible nunca puede ser negativo.
- Toda generacion, aplicacion, devolucion o retiro debe ejecutarse dentro de una transaccion Prisma cuando toca otras tablas.
- Las aplicaciones de credito a proyectos deben crear `ProjectApplication` tipo `CUSTOMER_CREDIT`.
- No usar un campo cacheado de cliente como fuente de verdad.

## Consecuencias

- La auditoria responde de donde viene cada saldo a favor.
- Los reportes pueden recalcular credito sin depender de estado mutable.
- Las escrituras son mas complejas porque deben coordinar ledger, applications y saldos derivados.

## Implementacion

- `CreditTransaction` en Prisma.
- `lib/business-logic/credit-management.ts`.
- `app/api/customers/[id]/credit/route.ts`.
- `app/api/customers/[id]/credit/refund/route.ts`.
- Integracion con pagos en `app/api/payments/route.ts`.
