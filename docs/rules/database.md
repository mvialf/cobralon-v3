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

## Dudas de Arquitectura

Si un cálculo financiero mezcla Prisma con reglas puras, duplica totales entre frontend/backend o no queda claro si debe vivir en DB/view, backend o función compartida, usar `cobralon-architecture-simplification` antes de mover código.
Contrastar también con `docs/rules/api-routes.md` si el cambio entra por endpoints, y con `docs/rules/components.md` si la UI muestra previews, totales o validaciones relacionadas.

## Skills relacionados

- **Lógica financiera completa**: usar skill `cobralon-financial-logic` para invariantes y patrón de transacción
- **Simplificación arquitectónica**: usar skill `cobralon-architecture-simplification` para separar cálculo puro, persistencia y responsabilidades
- **Performance de queries**: usar skill `cobralon-best-practices` para paralelización
- **Testing**: usar skill `cobralon-testing-strategy` para mocking de Prisma y factories
