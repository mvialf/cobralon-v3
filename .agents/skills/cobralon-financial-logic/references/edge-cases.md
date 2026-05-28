# Edge Cases Financieros

Decisiones de diseño para escenarios no-obvios que surgirán en producción.

## 1. Balance legacy en `Project.balance` vs balance derivado

**Escenario:** código o datos legacy aún miran `Project.balance`, pero el flujo actual lee balance desde `ProjectFinancials`.

**Enfoque actual:**
- `ProjectFinancials` deriva `balance`, `totalPaid`, `overpayment` y `percentPaid`
- `lib/business-logic/project-financials.ts` expone helpers para leer esa vista
- Los endpoints financieros no deben escribir manualmente `Project.balance`

**Decisión de diseño:**
- La fuente operativa es la vista `ProjectFinancials`
- `balance` expuesto al frontend debe venir de la vista o de helpers basados en ella
- Si un test toca balances, verificar que no se escriba `Project.balance`

**Prevención:**
- Todas las operaciones financieras usan `$transaction` para atomicidad
- Consultar `ProjectFinancials` dentro de la transacción cuando el balance deba ser consistente

## 2. Eliminación de un pago ya asignado

**Escenario:** Un pago tiene allocations distribuidas en N proyectos. Se necesita eliminar.

**Enfoque actual (DELETE /api/payments/[id]):**
1. Dentro de `$transaction`:
   - Eliminar el Payment (cascade elimina PaymentAllocations automáticamente)
   - No recalcular/escribir `Project.balance`; el balance se deriva desde la vista
   - Si el pago usó crédito del cliente, crear `CreditTransaction` de reversión
   - Si el pago generó crédito, crear `CreditTransaction` de reversión

**Decisiones clave:**
- Los balances de los proyectos SUBEN cuando se elimina un pago (deuda vuelve)
- El crédito del cliente se ajusta en ambas direcciones
- Se crea `CreditTransaction` tipo `ADJUSTMENT` para auditoría de reversión

## 3. Pago que excede la deuda total (genera crédito)

**Escenario:** Cliente debe 100.000 en total, paga 150.000.

**Flujo:**
1. FIFO distribuye 100.000 entre proyectos (más antiguo primero)
2. Excedente de 50.000 se registra en ledger
3. Se crea `CreditTransaction`: `{ type: 'OVERPAYMENT', amount: 50.000, reason: 'Excedente de pago' }`

**Invariante:** `Customer.creditBalance >= 0` SIEMPRE.

## 4. Pago con crédito aplicado

**Escenario:** Cliente tiene 30.000 de crédito, paga proyecto de 100.000.

**Flujo:**
1. Validar con `canApplyCredit()` que el crédito es suficiente
2. Dentro de `$transaction`:
   - Crear Payment por 100.000
   - Crear aplicación de crédito contra el proyecto
   - `CreditTransaction`: `{ type: 'APPLIED', amount: -30.000, reason: 'Aplicado a pago' }`
   - Efectivo necesario: 70.000

**Invariante:** `Monto pago = Efectivo + Crédito aplicado`.

## 5. Proyecto con balance negativo

**Escenario:** Un ajuste manual o error causa `balance < 0`.

**Decisión:** Esto NO debe ocurrir. Es un invariante del sistema.

**Si ocurre:**
- Es un bug que debe investigarse
- Verificar las PaymentAllocations del proyecto
- Revisar `ProjectFinancials` y las aplicaciones/ajustes que lo alimentan
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

**Solución:** Usar `money.ts` y `FINANCIAL.TOLERANCE` para comparaciones:

```typescript
import { FINANCIAL } from '@/lib/constants/financial-constants'
import { equalsMoney, greaterThanMoneyWithTolerance } from '@/lib/business-logic/money'

// ✅ Correcto
const isEqual = equalsMoney(a, b, FINANCIAL.TOLERANCE)
const hasDebt = greaterThanMoneyWithTolerance(balance, 0, FINANCIAL.BALANCE_TOLERANCE)

// ❌ Incorrecto
const isEqual = a === b
const isZero = balance === 0
```

**Moneda CLP:** Trabajar siempre con enteros (sin decimales). Los montos en CLP no tienen centavos.
