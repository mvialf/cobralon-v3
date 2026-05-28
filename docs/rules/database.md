---
paths: ["prisma/**", "app/api/**/*.ts", "lib/db.ts", "lib/business-logic/**"]
---

# Reglas de Base de Datos

**Stack:** Prisma 6.7 + PostgreSQL (Neon)

## Comandos Críticos

```bash
npm run db:generate  # Genera Prisma Client
npm run db:push      # Aplica schema (desarrollo)
npm run db:migrate   # Migración versionada (producción)
npm run db:seed      # Pobla data inicial
npm run db:studio    # Prisma Studio (GUI)
```

## Transacciones Financieras

Para operaciones que afectan múltiples tablas (pagos, créditos, allocations):

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Crear Payment
  // 2. Crear PaymentAllocations
  // 3. Crear ProjectApplications
  // 4. Crear CreditTransactions si aplica
})
```

## Reglas FIFO

- Ver `lib/business-logic/payment-fifo.ts` para lógica de distribución
- Los pagos se imputan a proyectos ordenados por `createdAt` ASC
- El excedente va a crédito del cliente
- Leer saldos de proyecto desde `ProjectFinancials`, no desde `Project.balance`
- Leer crédito de cliente desde `CreditTransaction`/helpers de `credit-management`, no desde cache legacy

## Documentación

- Arquitectura financiera: [docs/project/architecture.md](../project/architecture.md)
- Sistema de pagos: [docs/project/payment-system.md](../project/payment-system.md)
- Autenticación: [docs/project/auth.md](../project/auth.md)

## Testing

Después de cambios en business-logic o API routes:

```bash
npm test -- lib/business-logic/__tests__/   # Tests de lógica financiera
npm test -- app/api/                         # Tests de endpoints
```

**Cómo mockear Prisma en tests:** Usar skill `cobralon-testing-strategy`

## Skills relacionados

- **Lógica financiera completa**: usar skill `cobralon-financial-logic` para invariantes y patrón de transacción
- **Performance de queries**: usar skill `cobralon-best-practices` para paralelización
- **Testing**: usar skill `cobralon-testing-strategy` para mocking de Prisma y factories
