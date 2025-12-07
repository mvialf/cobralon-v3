# ADR-006: Credit System Architecture (Wallet)

## Estado

**Propuesto** | **Fecha:** 2025-12-06

## Contexto

En el dominio de cobranza inmobiliaria, es común que ocurran dos situaciones que requieren manejo de "saldos a favor":
1.  **Sobrepago**: Un cliente paga más de lo que debe en un proyecto (ej: error de transferencia o redondeo).
2.  **Devoluciones**: Se cancela una venta y el dinero pagado queda "a favor" del cliente para futuras compras.

Necesitamos un mecanismo robusto para gestionar estos fondos. No basta con un campo "Saldo" editable, se requiere **trazabilidad completa** (auditoría) de por qué aumentó o disminuyó ese saldo.

## Decisión

Implementar un sistema de **Crédits (Wallet)** basado en un Ledger (Libro Mayor) inmutable.

### 1. Modelo de Datos (`CreditTransaction`)

En lugar de solo tener `Customer.creditBalance` como un campo mutable arbitrariamente, cada cambio en el saldo DEBE provenir de una `CreditTransaction`.

```prisma
model Customer {
  id             String @id
  limit          Decimal // Línea de crédito (opcional)
  creditBalance  Decimal @default(0) // Cache del saldo actual
  // ...
  creditTransactions CreditTransaction[]
}

model CreditTransaction {
  id          String   @id @default(cuid())
  customerId  String
  amount      Decimal  // Positivo (Abono) o Negativo (Cargo)
  description String
  reference   String?  // Link a Payment ID o Nota de Crédito
  createdAt   DateTime @default(now())
  
  customer    Customer @relation(...)
}
```

### 2. Invariantes de Negocio

El módulo `lib/business-logic/credit-management.ts` enforcea las siguientes reglas:

- **Invariante 1: No Números Negativos**
  El `creditBalance` de un cliente nunca puede ser menor a 0. No somos un banco que otorga descubiertos.
  
- **Invariante 2: Atomicidad**
  Toda operación de consumo o generación de crédito debe ocurrir dentro de una `db.$transaction`.

### 3. Flujos de Uso

#### A. Generación (Ingreso de dinero)
Cuando se procesa un pago (`Payment`), si el monto excede la deuda del proyecto asignado:
1. Se paga la deuda del proyecto (hasta 0).
2. El remanente se convierte en una `CreditTransaction` (tipo positivo).
3. Se actualiza `Customer.creditBalance`.

#### B. Consumo (Pago con billetera)
Al registrar un nuevo pago, el usuario puede seleccionar "Usar Crédito Disponible":
1. Se valida `amount <= customer.creditBalance`.
2. Se crea una `CreditTransaction` (tipo negativo).
3. Se actualiza `Customer.creditBalance`.
4. Se crea el `PaymentAllocation` correspondiente como si fuera dinero real.

## Consecuencias

### Positivas
- **Auditoría Total**: Ante la pregunta "¿Por qué tengo $500 a favor?", existe un registro exacto (ej: "Sobrante del pago #123").
- **Seguridad**: Previene la "aparición" mágica de dinero. Todo crédito tiene origen.
- **Flexibilidad**: Permite usar saldos a favor para pagar cualquier proyecto del mismo cliente.

### Negativas
- **Complejidad de Escritura**: Requiere transacciones de base de datos para asegurar consistencia entre `Transaction` y `Customer.balance`.
