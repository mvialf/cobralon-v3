# Data Access Layer

Capa de acceso a datos construida con Prisma ORM 6.7.

---

## Estructura

```
lib/db.ts               → Prisma Client singleton
prisma/
├── schema.prisma       → 10 modelos relacionales
└── seed.ts             → Data inicial
```

---

## Prisma Client Singleton

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
  relationLoadStrategy: 'join' // ✅ Fix N+1 queries
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
```

**Features:**
- ✅ Singleton pattern (evita múltiples instancias)
- ✅ Hot reload en desarrollo (usa globalThis)
- ✅ Logging condicional por ambiente
- ✅ `relationLoadStrategy: 'join'` previene N+1

---

## Modelos (10 entidades)

### Core Models

1. **Customer** - Clientes
2. **Project** - Proyectos con montos
3. **ProjectStatus** - Estados configurables
4. **BadgeColor** - Colores para estados

### Payment Models

5. **Payment** - Pagos (1:1 o 1:N)
6. **PaymentAllocation** - Tabla intermedia N:M
7. **Installment** - Cuotas sin interés
8. **PaymentMethod** - Métodos de pago

### Legacy

9. **User** - (Template base, no usado actualmente)

---

## Schema Highlights

### Relaciones Importantes

```prisma
model Customer {
  id       String    @id @default(uuid())
  name     String
  phone    String
  email    String?   @unique

  projects Project[]  @relation("CustomerProjects", onDelete: Cascade)
  payments Payment[]  @relation("CustomerPayments")
}

model Project {
  id              String    @id @default(uuid())
  customerId      String
  projectStatusId String?

  customer        Customer        @relation("CustomerProjects", fields: [customerId], references: [id], onDelete: Cascade)
  projectStatus   ProjectStatus?  @relation("ProjectProjectStatus", fields: [projectStatusId], references: [id], onDelete: Restrict)

  paymentAllocations PaymentAllocation[]

  @@index([customerId])
  @@index([projectStatusId])
  @@index([customerId, projectStatusId])
}

model Payment {
  id              String    @id @default(uuid())
  type            String    // "Project" | "Customer"
  amount          Decimal   @db.Decimal(12, 2)

  allocations     PaymentAllocation[]  @relation("PaymentAllocations", onDelete: Cascade)
  installments    Installment[]        @relation("PaymentInstallments", onDelete: Cascade)
}
```

### onDelete Policies

| Relación              | Policy   | Razón                        |
| --------------------- | -------- | ---------------------------- |
| Customer → Project    | CASCADE  | Ownership (parent owns child)|
| Payment → Allocation  | CASCADE  | Coherencia de datos          |
| Payment → Installment | CASCADE  | Coherencia de datos          |
| Project → Status      | RESTRICT | Proteger configuración       |

---

## Índices de Performance

### Índices Simples

```prisma
@@index([customerId])
@@index([projectStatusId])
@@index([date])
@@index([type])
```

### Índices Compuestos

```prisma
// Queries frecuentes optimizadas
@@index([customerId, projectStatusId])
@@index([projectStatusId, date(sort: Desc)])
@@index([type, date(sort: Desc)])
@@index([status, dueDate])
```

**Total:** 16 índices (8 simples + 8 compuestos)

---

## Seed Data

```typescript
// prisma/seed.ts
import { prisma } from '../lib/db'

async function main() {
  // 1. Badge Colors (7 predefinidos)
  await prisma.badgeColor.createMany({
    data: [
      { name: 'Azul', key: 'blue', bgClass: 'bg-blue-500' },
      { name: 'Verde', key: 'green', bgClass: 'bg-green-500' },
      // ...
    ]
  })

  // 2. Payment Methods
  await prisma.paymentMethod.createMany({
    data: [
      { name: 'Efectivo', hasInstallments: false },
      { name: 'Tarjeta de Crédito', hasInstallments: true, maxInstallments: 12 },
      // ...
    ]
  })

  // 3. Project Statuses
  await prisma.projectStatus.create({
    data: {
      name: 'Presupuesto',
      order: 1,
      isInitial: true,
      colorId: blueColor.id
    }
  })
}
```

**Ejecutar:**

```bash
npm run db:seed
# o
npx prisma db seed
```

---

## Comandos Útiles

### Development

```bash
# Generar Prisma Client (después de cambios en schema)
npm run db:generate

# Push schema a DB (desarrollo)
npm run db:push

# Seed data inicial
npm run db:seed

# Abrir Prisma Studio (GUI)
npm run db:studio
```

### Production

```bash
# Crear migración versionada
npm run db:migrate

# Aplicar migraciones pendientes
npx prisma migrate deploy
```

---

## Type Safety

Prisma genera tipos TypeScript automáticamente:

```typescript
import { Prisma, Customer, Project } from '@prisma/client'

// Tipo inferido automáticamente
const customer: Customer = await prisma.customer.findUnique({
  where: { id: 'abc' }
})

// Tipo con relaciones
type ProjectWithCustomer = Prisma.ProjectGetPayload<{
  include: { customer: true }
}>

const project: ProjectWithCustomer = await prisma.project.findUnique({
  where: { id: 'xyz' },
  include: { customer: true }
})
```

---

## Performance Tips

### 1. Select Solo Campos Necesarios

```typescript
// ❌ EVITAR: Traer todo
const customer = await prisma.customer.findUnique({ where: { id } })

// ✅ MEJOR: Solo lo necesario
const customer = await prisma.customer.findUnique({
  where: { id },
  select: { id: true, name: true, phone: true }
})
```

### 2. Usar Transacciones para Operaciones Atómicas

```typescript
await prisma.$transaction(async (tx) => {
  const payment = await tx.payment.create({ data: {...} })
  await tx.paymentAllocation.createMany({ data: allocations })
  await tx.installment.createMany({ data: installments })
})
```

### 3. Batch Operations

```typescript
// ✅ BIEN: Una query
await prisma.installment.updateMany({
  where: { status: 'pending', dueDate: { lte: new Date() } },
  data: { status: 'paid', paidDate: new Date() }
})

// ❌ EVITAR: N queries
for (const installment of installments) {
  await prisma.installment.update({
    where: { id: installment.id },
    data: { status: 'paid' }
  })
}
```

---

## Ver También

- [Modelo de Datos](../01-data-model/) - Diagramas ER completos
- [Database Layer](README.md#6-database-layer) - PostgreSQL @ Neon
- [ADR-008: Prisma + Neon](../../template/decisions/008-prisma-neon.md)

**Última actualización:** 2025-10-30
