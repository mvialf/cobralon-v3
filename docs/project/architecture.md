# Arquitectura Cobralon

Cobralon usa Next.js App Router como aplicacion full-stack. La UI vive en `app/` y `components/`; los contratos de entrada en `lib/validations/`; la persistencia en Prisma; y la logica financiera critica en `lib/business-logic/`.

## Principios

- La logica financiera no depende de UI.
- Las operaciones que crean pagos, creditos, aplicaciones o ajustes son transaccionales.
- Los saldos operativos se derivan desde ledgers y vistas, no desde campos mutables arbitrarios.
- Los endpoints usan validacion Zod y errores estandarizados via `withApiHandler` cuando aplica.

## Modelo financiero vigente

### Deuda de proyecto

`Project.totalAmount` representa el total facturado. La deuda visible se lee desde la vista SQL `ProjectFinancials`, definida en migraciones Prisma y consumida por `lib/business-logic/project-financials.ts`.

La vista consolida:

- `PaymentAllocation`: efectivo aplicado a proyectos.
- `ProjectApplication`: aplicaciones de efectivo, credito y ajustes.
- `ProjectAdjustment`: descuentos o condonaciones.
- sobrepagos y balance derivado.

`Project.balance` existe como campo legacy/compatibilidad, pero no debe usarse como fuente principal para nuevas consultas financieras.

### Pagos

`Payment` registra el ingreso de dinero. Puede ser:

- pago a un proyecto especifico;
- pago a cliente distribuido por FIFO entre proyectos con deuda.

`PaymentAllocation` mantiene la asignacion N:M entre pagos y proyectos. Esta tabla permite auditoria por proyecto y soporta pagos 1:N.

### Aplicaciones de proyecto

`ProjectApplication` registra como se salda un proyecto:

- `CASH`: efectivo desde un pago y su allocation.
- `CUSTOMER_CREDIT`: credito del cliente aplicado a deuda.
- `ADJUSTMENT`: ajuste administrativo.

Esta tabla es la base para que `ProjectFinancials` pueda separar efectivo, credito y ajustes sin inferencias ambiguas.

### Credito de clientes

El credito disponible se calcula desde `CreditTransaction` con `lib/business-logic/credit-management.ts`.

Tipos vigentes:

- `OVERPAYMENT`: sobrepago generado.
- `APPLIED`: credito aplicado a un proyecto.
- `REFUND`: devolucion recibida.
- `WITHDRAWAL`: retiro solicitado por cliente.
- `ADJUSTMENT`: ajuste manual.

El saldo no debe derivarse desde un campo cacheado en `Customer`; nuevas lecturas deben usar el ledger o helpers batch para evitar N+1.

### Cuotas

`Installment` es informativo y no calcula interes. El estado de una cuota se deriva por `dueDate`:

- vencida si `dueDate` es anterior o igual a la fecha de corte;
- pendiente si vence en el futuro.

No existe cron vigente para marcar cuotas pagadas, ni campos `status` o `paidDate` en el modelo.

### Comisiones

`CommissionTier` configura porcentaje y fee fijo por metodo de pago y rango de cuotas. Al registrar pagos se guardan `commissionAmount`, `netAmount`, `commissionRate` y `commissionFixed` para auditoria.

## Flujos criticos

### Pago 1:1

1. Validar cliente, proyecto, metodo de pago y monto.
2. Calcular comision si corresponde.
3. Crear `Payment`.
4. Crear `PaymentAllocation`.
5. Crear `ProjectApplication` de efectivo.
6. Si hay sobrepago, crear `CreditTransaction` y dejarlo reflejado por ledger.

### Pago 1:N con FIFO

1. Cargar proyectos con deuda del cliente ordenados por antiguedad.
2. Distribuir el monto desde la deuda mas antigua.
3. Crear allocations y applications en una transaccion.
4. Registrar sobrepago como credito si el pago excede la deuda total.

### Aplicacion de credito

1. Calcular credito disponible desde `CreditTransaction`.
2. Validar que el credito alcance.
3. Crear `CreditTransaction` negativa tipo `APPLIED`.
4. Crear `ProjectApplication` tipo `CUSTOMER_CREDIT`.

### Ajuste de proyecto

1. Validar proyecto y razon de ajuste.
2. Crear `ProjectAdjustment`.
3. Crear `ProjectApplication` tipo `ADJUSTMENT`.
4. Leer balance actualizado desde `ProjectFinancials`.

## Autenticacion y autorizacion

La autenticacion vigente usa Better Auth. Ver [auth.md](auth.md).

`withApiHandler` puede exigir roles con `allowedRoles`; rutas sin roles requeridos no consultan sesion. Los usuarios tienen `role = "user" | "admin"` en Prisma.

## Calendario

El calendario usa tres entidades separadas:

- `ProjectEvent`
- `AftersaleEvent`
- `VisitEvent`

Todas soportan `scheduledDate`, `order` por dia y `TeamTag[]`. El endpoint agregado es `GET /api/calendar-events`.

Ver [features/calendar-system.md](features/calendar-system.md).

## Base de datos

Proveedor: Neon PostgreSQL. ORM: Prisma.

Migraciones relevantes:

- `20260517120000_create_project_financials_view`
- `20260517123000_add_project_applications`
- `20260517130000_clear_non_critical_operational_data`
- `20260518100000_harden_financial_integrity`
- `20260518113000_prune_redundant_indexes`

## Estado de datos legacy

La ultima auditoria local conocida con `npm run audit:important-data` reporto:

- `0 critical`
- `10 warning` en `legacy-project-balance-differs-from-financials`

El reporte generado por el script no debe commitearse en `backups/`.
