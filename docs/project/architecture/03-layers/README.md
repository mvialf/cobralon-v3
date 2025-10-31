# Arquitectura de Capas

Sistema de 6 capas desde presentación hasta base de datos.

---

## Capas del Sistema

### 1. [Presentation Layer](presentation.md)

Next.js Pages + React Components

- Pages: `app/**/*.tsx`
- Layouts: `AppLayout`, `AppSidebar`
- Server Components por defecto

### 2. [UI Components](ui-components.md)

shadcn/ui + Custom Components

- 50+ componentes shadcn/ui
- Forms: React Hook Form + Zod
- DataTables: TanStack Table
- Regional: CurrencyInput, PhoneInput, RutInput

### 3. [API Layer](api-layer.md)

Next.js Route Handlers

- 8 APIs REST principales
- Logging estructurado con Pino
- Validación backend con Zod
- Pattern: `withLogging()` middleware

### 4. [Business Logic](business-logic.md)

Pure Functions + Validations

- Zod schemas
- Cálculos: balance, FIFO allocation
- Contexts: ConfigurationContext
- Constants: Financial, Regional

### 5. [Data Access](data-access.md)

Prisma ORM

- 10 modelos relacionales
- `relationLoadStrategy: 'join'` (N+1 fix)
- Singleton pattern para Prisma Client

### 6. Database Layer

PostgreSQL @ Neon

- 10 tablas con 16 índices
- Policies: CASCADE, RESTRICT

---

**Ver:** [Vista General](../README.md#arquitectura-de-capas) para diagrama completo

**Última actualización:** 2025-10-30
