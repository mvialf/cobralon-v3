---
name: cobralon-financial-logic
description: Guía para implementar features relacionadas con pagos FIFO, sistema de créditos y gestión de deudas en Cobralon.
---

<!-- USAR CUANDO: trabajas con pagos, créditos, balances, deudas, allocations,
PaymentAllocation, creditBalance, o modificas lib/business-logic/.
Esta skill es OBLIGATORIA cuando tocas lógica financiera para evitar bugs críticos. -->

# Lógica Financiera de Cobralon

## Invariantes Críticos (NUNCA VIOLAR)

```
1. Project.balance >= 0           (SIEMPRE)
2. Customer.creditBalance >= 0    (SIEMPRE)
3. FIFO: Deudas antiguas primero  (Ordenar por createdAt ASC)
4. Operaciones de crédito = ATÓMICAS (usar $transaction)
5. Todo movimiento de crédito -> CreditTransaction (auditoría)
```

## Módulos de Lógica de Negocio

| Módulo | Responsabilidad |
|--------|----------------|
| `payment-fifo.ts` | Distribución FIFO (más antiguo primero) |
| `credit-management.ts` | Distribución pago/crédito, validación |
| `credit-eligibility.ts` | Elegibilidad de crédito y labels de UI |
| `project-state.ts` | Estado derivado: Activo vs Finalizado |
| `project-balance.ts` | Cálculo de balance (función más crítica) |
| `totals.ts` | Validación de integridad financiera |
| `installments.ts` | Lógica de cuotas sin interés |
| `update-project-balance.ts` | Actualización/verificación de balance en DB |

**Signatures completas:** [references/module-signatures.md](references/module-signatures.md)

**Patrón de transacción DB y constantes:** [references/transaction-pattern.md](references/transaction-pattern.md)
**Edge cases y decisiones de diseño:** [references/edge-cases.md](references/edge-cases.md)

## Checklist Antes de Modificar Lógica Financiera

- [ ] Leí el módulo relevante en `lib/business-logic/`
- [ ] Entiendo cómo afecta a balances y créditos
- [ ] Usaré `$transaction` para operaciones atómicas
- [ ] Crearé `CreditTransaction` si hay movimiento de crédito
- [ ] Escribí/actualicé tests en `lib/business-logic/__tests__/`
- [ ] Ejecuté `npm run lint && npm run typecheck`

## Tests Requeridos

Después de cambios en lógica financiera:

```bash
# Tests específicos de business-logic
npm test -- lib/business-logic/__tests__/

# Todos los tests
npm test

# Verificación de tipos (CRÍTICO para evitar NaN)
npm run typecheck
```

## Relación con rules y skills

- **API routes** (`api-routes.md`): transacciones, validación Zod en endpoints financieros
- **Database** (`database.md`): comandos Prisma, reglas FIFO, transacciones
- **CRUD generator** (`cobralon-crud-generator`): para crear entidades no-financieras; las financieras requieren esta skill
