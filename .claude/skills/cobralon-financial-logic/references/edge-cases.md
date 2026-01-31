# Edge Cases Financieros

Decisiones de diseño para escenarios no-obvios que surgirán en producción.

## 1. Balance en DB ≠ Balance calculado (reconciliación)

**Escenario:** `Project.balance` almacenado difiere de `totalAmount - sum(allocations)`.

**Enfoque actual:**
- `updateProjectBalance` (`lib/business-logic/update-project-balance.ts`) recalcula el balance desde las allocations y lo actualiza en DB
- Se ejecuta después de cada operación de pago (create, update, delete)
- `updateMultipleProjectBalances` permite actualización batch

**Decisión de diseño:**
- El campo `balance` es un **cache desnormalizado** para performance de queries
- La fuente de verdad es `totalAmount - sum(PaymentAllocation.allocatedAmount)`
- Si se detecta discrepancia, recalcular con `updateProjectBalance`

**Prevención:**
- Todas las operaciones financieras usan `$transaction` para atomicidad
- Después de crear/eliminar pagos, siempre actualizar balances afectados

## 2. Eliminación de un pago ya asignado

**Escenario:** Un pago tiene allocations distribuidas en N proyectos. Se necesita eliminar.

**Enfoque actual (DELETE /api/payments/[id]):**
1. Dentro de `$transaction`:
   - Eliminar el Payment (cascade elimina PaymentAllocations automáticamente)
   - Recalcular balances de todos los proyectos afectados
   - Si el pago usó crédito del cliente, revertir la CreditTransaction
   - Si el pago generó crédito, revertir el excedente

**Decisiones clave:**
- Los balances de los proyectos SUBEN cuando se elimina un pago (deuda vuelve)
- El crédito del cliente se ajusta en ambas direcciones
- Se crea CreditTransaction de tipo "reversal" para auditoría

## 3. Pago que excede la deuda total (genera crédito)

**Escenario:** Cliente debe 100.000 en total, paga 150.000.

**Flujo:**
1. FIFO distribuye 100.000 entre proyectos (más antiguo primero)
2. Excedente de 50.000 → `Customer.creditBalance += 50.000`
3. Se crea CreditTransaction: `{ type: 'CREDIT', amount: 50.000, reason: 'Excedente de pago' }`

**Invariante:** `Customer.creditBalance >= 0` SIEMPRE.

## 4. Pago con crédito aplicado

**Escenario:** Cliente tiene 30.000 de crédito, paga proyecto de 100.000.

**Flujo:**
1. Validar con `canApplyCredit()` que el crédito es suficiente
2. Dentro de `$transaction`:
   - Crear Payment por 100.000
   - Debitar crédito: `Customer.creditBalance -= 30.000`
   - CreditTransaction: `{ type: 'DEBIT', amount: 30.000, reason: 'Aplicado a pago' }`
   - Efectivo necesario: 70.000

**Invariante:** `Monto pago = Efectivo + Crédito aplicado`.

## 5. Proyecto con balance negativo

**Escenario:** Un ajuste manual o error causa `balance < 0`.

**Decisión:** Esto NO debe ocurrir. Es un invariante del sistema.

**Si ocurre:**
- Es un bug que debe investigarse
- Verificar las PaymentAllocations del proyecto
- Recalcular con `updateProjectBalance` para corregir el cache
- Si persiste, revisar si hay allocations duplicadas

## 6. Corrección manual de errores

**Escenario:** Se registró un pago con monto incorrecto.

**Enfoque:**
- **Pagos sin cuotas:** Editar vía PUT /api/payments/[id] (recalcula allocations)
- **Pagos con cuotas (installments):** NO se puede editar. Eliminar y re-crear
- **Ajustes de balance:** Usar endpoint de adjustments específico del proyecto

**Decisión de diseño:** No existe un concepto de "nota de crédito" formal. Las correcciones se hacen eliminando el pago erróneo y creando uno nuevo.

## 7. Concurrencia: Dos pagos simultáneos al mismo cliente

**Escenario:** Dos personas registran pagos para el mismo cliente al mismo tiempo.

**Protección:** `$transaction` con isolation level default de PostgreSQL (Read Committed).

**Riesgo residual:** Si ambas transacciones leen `creditBalance` antes de que la otra escriba, podría haber una inconsistencia temporal. Mitigado por:
- Workers en Next.js procesan requests secuencialmente en el mismo proceso
- El volumen de transacciones de Cobralon es bajo (no es un sistema de alta concurrencia)

## 8. Tolerancia de punto flotante

**Escenario:** `100.005` !== `100.005` en comparaciones de floats.

**Solución:** Usar `FINANCIAL.TOLERANCE` para todas las comparaciones:

```typescript
import { FINANCIAL } from '@/lib/business-logic/constants'

// ✅ Correcto
const isEqual = Math.abs(a - b) < FINANCIAL.TOLERANCE
const isZero = Math.abs(balance) < FINANCIAL.TOLERANCE

// ❌ Incorrecto
const isEqual = a === b
const isZero = balance === 0
```

**Moneda CLP:** Trabajar siempre con enteros (sin decimales). Los montos en CLP no tienen centavos.
