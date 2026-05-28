# Sistema de Pagos

**Estado:** vigente
**Actualizado:** 2026-05-28

## Resumen

Cobralon registra pagos, distribuye dinero a proyectos, calcula comisiones, genera cuotas informativas y mantiene credito de clientes por ledger.

La fuente de verdad para deuda de proyecto es `ProjectFinancials`. La fuente de verdad para credito de cliente es `CreditTransaction`.

## Entidades

### Payment

Registro del ingreso de dinero.

Campos financieros relevantes:

- `amount`
- `currency`
- `selectedInstallments`
- `commissionAmount`
- `netAmount`
- `commissionRate`
- `commissionFixed`

### PaymentAllocation

Relacion N:M entre `Payment` y `Project`. Define cuanto efectivo de un pago se asigno a cada proyecto.

### ProjectApplication

Registro normalizado de aplicaciones contra deuda de proyecto.

Tipos:

- `CASH`
- `CUSTOMER_CREDIT`
- `ADJUSTMENT`

### CreditTransaction

Ledger de movimientos de credito por cliente. El saldo disponible se calcula como suma del ledger.

Tipos:

- `OVERPAYMENT`
- `APPLIED`
- `REFUND`
- `WITHDRAWAL`
- `ADJUSTMENT`

### ProjectAdjustment

Ajuste administrativo que reduce deuda de proyecto. Debe generar `ProjectApplication` tipo `ADJUSTMENT`.

### Installment

Cuotas informativas sin interes. No tienen `status` ni `paidDate`; el estado se deriva por `dueDate`.

## Flujos

### Pago a proyecto

1. Validar proyecto, cliente, metodo de pago y monto.
2. Calcular comision si el metodo tiene tiers.
3. Crear `Payment`.
4. Crear `PaymentAllocation`.
5. Crear `ProjectApplication` tipo `CASH`.
6. Crear cuotas si `selectedInstallments` aplica.
7. Si el monto excede la deuda, crear `CreditTransaction` tipo `OVERPAYMENT`.

### Pago a cliente

1. Cargar proyectos con deuda desde `ProjectFinancials`.
2. Ordenar deuda por antiguedad para FIFO.
3. Crear un `Payment`.
4. Crear allocations y applications por proyecto.
5. Registrar excedente como credito si sobra dinero.

### Aplicar credito

1. Calcular credito disponible desde `CreditTransaction`.
2. Validar que no quede saldo negativo.
3. Crear `CreditTransaction` tipo `APPLIED`.
4. Crear `ProjectApplication` tipo `CUSTOMER_CREDIT`.

### Devolucion o retiro de credito

1. Validar credito disponible.
2. Crear `CreditTransaction` negativa (`REFUND` o `WITHDRAWAL` segun el flujo).
3. Responder con credito recalculado desde ledger.

## Invariantes

- Ninguna operacion debe dejar credito disponible negativo.
- `Payment.amount` debe ser consistente con allocations, aplicaciones y sobrepago dentro de tolerancia financiera.
- El balance visible de proyecto se lee desde `ProjectFinancials`.
- El credito visible del cliente se lee desde `CreditTransaction`.
- Las operaciones que tocan pagos, credito, ajustes o applications deben ejecutarse dentro de una transaccion Prisma.
- No mutar manualmente saldos derivados para "arreglar" inconsistencias.

## Modulos

- `lib/business-logic/payment-fifo.ts`
- `lib/business-logic/credit-management.ts`
- `lib/business-logic/project-financials.ts`
- `lib/business-logic/installments.ts`
- `lib/business-logic/commission.ts`
- `lib/business-logic/money.ts`

## Endpoints

- `POST /api/payments`
- `GET /api/payments`
- `GET /api/payments/[id]`
- `DELETE /api/payments/[id]`
- `GET /api/payments/customer-projects`
- `GET /api/payments/search-projects`
- `GET /api/installments`
- `GET /api/customers/[id]/credit`
- `POST /api/customers/[id]/credit/refund`
- `POST /api/projects/[id]/adjustments`

## Tests

Unitarios:

- `lib/business-logic/__tests__/payment-fifo.test.ts`
- `lib/business-logic/__tests__/credit-management.test.ts`
- `lib/business-logic/__tests__/project-financials.test.ts`
- `lib/business-logic/__tests__/installments.test.ts`
- `lib/business-logic/__tests__/commission.test.ts`

API:

- `app/api/payments/__tests__/route.test.ts`
- `app/api/installments/__tests__/route.test.ts`
- `app/api/customers/[id]/credit/__tests__/route.test.ts`
- `app/api/customers/[id]/credit/refund/__tests__/route.test.ts`
- `app/api/projects/[id]/adjustments/__tests__/route.test.ts`

## Auditoria legacy

La auditoria local mas reciente documentada reporto:

- `0 critical`
- `10 warning` en `legacy-project-balance-differs-from-financials`

Esto significa que no hay bloqueo critico conocido, pero aun existen diferencias legacy entre saldos historicos y `ProjectFinancials` que deben tratarse como deuda de datos, no como fuente alternativa de verdad.
