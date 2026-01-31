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
  // 3. Actualizar Customer.creditBalance
  // 4. Crear CreditTransaction (auditoría)
})
```

## Reglas FIFO

- Ver `lib/business-logic/payment-fifo.ts` para lógica de distribución
- Los pagos se imputan a proyectos ordenados por `createdAt` ASC
- El excedente va a crédito del cliente

## Documentación

- Setup: [docs/template/guides/database-setup.md](docs/template/guides/database-setup.md)
- Arquitectura financiera: [docs/project/architecture.md](docs/project/architecture.md)

## Skills relacionados

- **Lógica financiera completa**: usar skill `cobralon-financial-logic` para invariantes y patrón de transacción
- **Performance de queries**: usar skill `cobralon-best-practices` para paralelización
