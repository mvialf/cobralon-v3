# Arquitectura del Proyecto Cobralon

Este documento detalla la arquitectura específica y las reglas de negocio de Cobralon, complementando la [arquitectura base del template](../template/architecture/overview.md).

## 🧠 Núcleo de Negocio (`lib/business-logic/`)

A diferencia de una aplicación CRUD estándar, Cobralon contiene lógica financiera crítica que está aislada en módulos puros (sin dependencias de UI ni DB directa) para facilitar el testing.

### 1. Distribución de Pagos FIFO

El sistema de pagos sigue un modelo **FIFO (First-In, First-Out)** estricto para la imputación de pagos a deudas.

- **Módulo**: `lib/business-logic/payment-fifo.ts`
- **Lógica**:
  1.  Toma un monto de pago `P`.
  2.  Obtiene todos los proyectos del cliente con `balance > 0`.
  3.  Ordena los proyectos por `createdAt` asc.
  4.  Itera y asigna fondos hasta que `P = 0`.
- **Propósito**: Garantizar que las deudas más antiguas se salden primero, simplificando la gestión de mora.

### 2. Sistema de Créditos (Wallet)

Los clientes tienen una "billetera" de créditos (saldos a favor) que se genera cuando un pago excede la deuda total o por devoluciones.

- **Módulo**: `lib/business-logic/credit-management.ts`
- **Reglas**:
  - **Generación**: `Pago > Deuda Total` -> El excedente va a Crédito.
  - **Consumo**: Al pagar un nuevo proyecto, se puede usar Crédito + Efectivo.
  - **Atocimidad**: Las operaciones de crédito/débito deben ser transaccionales en la DB.

### 3. Máquina de Estados de Proyecto

El estado de un proyecto es derivado, no solo un campo en la base de datos.

- **Módulo**: `lib/business-logic/project-state.ts`
- **Definición**:
  - `Activo`: (Status != Finalizado) O (Balance > 0)
  - `Finalizado`: (Status == Finalizado) Y (Balance == 0)
- **Implicancia**: Un proyecto no puede considerarse "Cerrado" si aún tiene deuda pendiente, independientemente de lo que diga el usuario administrativo.

### 4. Validación de Integridad Financiera

Usamos un enfoque de "Validación de Sumas" para asegurar consistencia.

- **Módulo**: `lib/business-logic/totals.ts`
- **Tolerancia**: Se usa una tolerancia financiera (`FINANCIAL.TOLERANCE`) para comparaciones de punto flotante.
- **Regla**: `Total Pago == Suma(Allocations) + Crédito Generado`.

## 🗄️ Modelo de Datos (Extensión)

El esquema de Prisma (`prisma/schema.prisma`) implementa estas entidades clave:

- **Customer**: Entidad raíz. Contiene el `creditBalance` agregado.
- **Project**: Unidad de deuda. Calcula su `balance` via `Total - Sum(Payments)`.
- **Payment**: Registro de ingreso de dinero.
- **PaymentAllocation**: Tabla pivote que une `Payment` con `Project` (cuánto de este pago fue a este proyecto).
- **CreditTransaction**: Ledger inmutable de movimientos de crédito (auditoría).

## 🔄 Flujos Críticos

### Ingreso de Pago

1.  Frontend: Usuario ingresa monto.
2.  Backend:
    - Valida existencia de cliente.
    - Ejecuta `calculateFIFO` (in-memory) para previsualizar distribución.
    - Confirma transacción.
    - **DB Config Transaction**:
      - Crea `Payment`.
      - Crea `PaymentAllocation`s.
      - Actualiza `Customer.creditBalance` (si aplica).
      - Crea `CreditTransaction` (si hubo uso/generación).

### Reporte de Saldos

1.  Calcula balance por proyecto en tiempo real (o cached).
2.  Agrega saldos para mostrar "Deuda Total Cliente".
3.  Compara con "Línea de Crédito" (si existiera feature futura).
