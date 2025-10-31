# Arquitectura del Proyecto Cobralon

Sistema completo de gestión de proyectos, clientes y pagos construido con Next.js 15, React 19 y PostgreSQL (Neon).

---

## 📚 Navegación Rápida

### 🏗️ Fundamentos

1. **[Visión General](#visión-general)** - Propósito del sistema y stack tecnológico
2. **[01. Modelo de Datos](01-data-model/)** - Entidades, relaciones, ER diagram completo
3. **[02. Flujos de Negocio](02-business-flows/)** - 5 flujos principales del sistema

### 🎨 Implementación

4. **[03. Arquitectura de Capas](03-layers/)** - 6 capas desde presentación hasta base de datos
5. **[04. Sistema de Logging](04-logging/)** - Pino structured logging end-to-end
6. **[06. APIs Implementadas](06-apis/)** - 8 APIs REST con paginación y filtros

### 🔧 Decisiones y Configuración

7. **[05. Decisiones Técnicas](05-technical-decisions/)** - 6 decisiones arquitecturales clave
8. **[07. Configuración Regional](07-regional-config/)** - Context API multi-país

### 📈 Futuro

9. **[08. Roadmap](08-roadmap.md)** - Performance y features de negocio

---

## Visión General

### Propósito del Sistema

Sistema de gestión integral para empresas que manejan:

- **Clientes** con múltiples proyectos
- **Proyectos** con estados configurables y montos
- **Pagos** asignables a uno o múltiples proyectos
- **Cuotas** (installments) sin interés para pagos
- **Configuración regional** (país, región, comuna) para direcciones

### Stack Tecnológico Principal

| Capa           | Tecnología              | Propósito                     |
| -------------- | ----------------------- | ----------------------------- |
| **Frontend**   | Next.js 15 + React 19   | App Router, Server Components |
| **UI**         | shadcn/ui + Tailwind v4 | Sistema de componentes        |
| **Backend**    | Next.js API Routes      | RESTful APIs                  |
| **Database**   | PostgreSQL (Neon)       | Datos relacionales            |
| **ORM**        | Prisma 6.7              | Type-safe queries             |
| **Validation** | Zod + React Hook Form   | Validación frontend/backend   |
| **State**      | React Context API       | Configuración global          |
| **Logging**    | Pino 9.7.0              | Structured logging            |

---

## Contenido Detallado por Sección

### [01. Modelo de Datos](01-data-model/)

**195 líneas** - Sistema completo de entidades relacionales:

- **[ER Diagram](01-data-model/er-diagram.md)** - Diagrama ASCII completo con 10 modelos
- **[Customer & Project Systems](01-data-model/customer-project-systems.md)** - Clientes y proyectos
- **[Payment Systems](01-data-model/payment-systems.md)** - Pagos, allocations, installments
- **[Relationships](01-data-model/relationships.md)** - Tabla de relaciones clave con onDelete policies

**Modelos principales:** Customer, Project, ProjectStatus, Payment, PaymentAllocation, Installment, PaymentMethod, BadgeColor

---

### [02. Flujos de Negocio](02-business-flows/)

**161 líneas** - 5 flujos end-to-end con diagramas:

- **[Crear Proyecto](02-business-flows/create-project.md)** - Cliente → Datos → Cálculos → DB
- **[Pago a Proyecto (1:1)](02-business-flows/payment-to-project.md)** - Pago simple a un proyecto
- **[Pago a Cliente (1:N)](02-business-flows/payment-to-customer.md)** - FIFO allocation múltiple
- **[Gestión de Cuotas](02-business-flows/installments.md)** - Creación automática + cron job
- **[Config Estados](02-business-flows/project-status-config.md)** - CRUD + drag & drop

---

### [03. Arquitectura de Capas](03-layers/)

**109 líneas** - 6 capas con diagramas ASCII:

- **[Vista General](03-layers/)** - Diagrama completo del stack
- **[Presentation Layer](03-layers/presentation.md)** - Next.js pages + React components
- **[UI Components](03-layers/ui-components.md)** - shadcn/ui + custom components
- **[API Layer](03-layers/api-layer.md)** - Next.js Route Handlers
- **[Business Logic](03-layers/business-logic.md)** - Validations + calculations
- **[Data Access](03-layers/data-access.md)** - Prisma ORM + PostgreSQL

---

### [04. Sistema de Logging](04-logging/)

**242 líneas** - ⭐ Sección técnica más extensa:

- **[Arquitectura](04-logging/architecture.md)** - Pino + middleware pattern
- **[Logger Singleton](04-logging/logger-singleton.md)** - Configuración Pino centralizada
- **[Middleware Pattern](04-logging/middleware-pattern.md)** - withLogging() wrapper
- **[Niveles de Log](04-logging/log-levels.md)** - debug/info/warn/error por ambiente
- **[Patrones de Uso](04-logging/usage-patterns.md)** - API routes + cron jobs
- **[Output Examples](04-logging/output-examples.md)** - Dev vs Production format
- **[Data Redaction](04-logging/data-redaction.md)** - Sensitive fields automáticos
- **[Performance](04-logging/performance.md)** - Benchmarks vs Winston/Bunyan

**Features:** Request correlation, child loggers, structured JSON, Vercel integration

---

### [05. Decisiones Técnicas](05-technical-decisions/)

**149 líneas** - 6 decisiones arquitecturales ADR-style:

- **[PaymentAllocation Table](05-technical-decisions/payment-allocation.md)** - ¿Por qué N:M?
- **[Decimal Precision](05-technical-decisions/decimal-precision.md)** - ¿Por qué Decimal(12,2)?
- **[Cascade vs Restrict](05-technical-decisions/cascade-vs-restrict.md)** - onDelete policies
- **[Installments Separate](05-technical-decisions/installments-separate.md)** - ¿Por qué tabla separada?
- **[Legacy Status Field](05-technical-decisions/legacy-status-field.md)** - Migración gradual
- **[Regional Config](05-technical-decisions/regional-config.md)** - Context API vs i18n

**Formato:** Decisión → Alternativas → Razones → Trade-offs

---

### [06. APIs Implementadas](06-apis/)

**223 líneas** - 8 APIs REST con endpoints completos:

- **[Resumen](06-apis/)** - Tabla comparativa de endpoints
- **[Customers API](06-apis/customers-api.md)** - CRUD + search
- **[Projects API](06-apis/projects-api.md)** - CRUD + filtros + includes
- **[Payments API](06-apis/payments-api.md)** - CRUD + allocation logic
- **[Installments API](06-apis/installments-api.md)** - Vista global con filtros
- **[Cron Job API](06-apis/cron-api.md)** - Mark installments paid

**Features:** Paginación, filtros, includes, validaciones backend, performance optimization

---

### [07. Configuración Regional](07-regional-config/)

**98 líneas** - Sistema Context API multi-país:

- **[Arquitectura](07-regional-config/architecture.md)** - ConfigurationContext + PAISES_CONFIG
- **[Hooks](07-regional-config/hooks.md)** - useConfiguration()
- **[Components](07-regional-config/components.md)** - CurrencyInput, PhoneInput, RutInput
- **[Examples](07-regional-config/examples.md)** - Uso en formularios

**Features:** localStorage persistence, auto-derivation (currency, locale), extensible

---

### [08. Roadmap](08-roadmap.md)

**35 líneas** - Próximos pasos recomendados:

- **Performance:** Balance denormalizado, cursor pagination, Redis cache
- **Features:** Reportes, workflow transitions, multi-tenancy
- **Timeline:** Phase 2 (500+ proyectos), Phase 3 (5000+ proyectos)

---

## Quick Reference

### Archivos Clave del Sistema

```
lib/
├── logger.ts                      # Pino singleton ⭐
├── logger-middleware.ts           # withLogging() wrapper ⭐
├── db.ts                          # Prisma client
├── validations/                   # Zod schemas
├── business-logic/                # Pure functions
├── contexts/                      # React Context
└── constants/                     # Business constants

app/api/
├── customers/                     # CRUD customers
├── projects/                      # CRUD projects
├── payments/                      # CRUD + allocation logic ⭐
├── installments/                  # Vista global cuotas
└── cron/                          # Vercel cron jobs

prisma/
├── schema.prisma                  # 10 modelos ⭐
└── seed.ts                        # Data inicial
```

### Métricas del Sistema

- **Base de datos:** 10 tablas relacionales, 16 índices
- **APIs:** 8 endpoints principales, paginación en 4
- **Logging:** Pino (10x más rápido que Winston)
- **Validaciones:** Zod schemas frontend + backend
- **Performance:** relationLoadStrategy: 'join' (N+1 fix)

---

## Para Nuevos Desarrolladores

### 1. Empieza Aquí

1. Lee **[Visión General](#visión-general)** (arriba)
2. Explora **[01. Modelo de Datos](01-data-model/)** para entender entidades
3. Revisa **[02. Flujos de Negocio](02-business-flows/)** para features principales

### 2. Profundiza por Área

- **Backend Developer:** [03. Layers](03-layers/) → [06. APIs](06-apis/) → [04. Logging](04-logging/)
- **Frontend Developer:** [02. Flows](02-business-flows/) → [07. Regional Config](07-regional-config/)
- **Architect:** [05. Decisiones](05-technical-decisions/) → [08. Roadmap](08-roadmap.md)

### 3. Referencias Cruzadas

- Ver [ADR-012](../decisions/012-pino-structured-logging.md) para decisión completa de logging
- Ver [Implementation Log](../implementation/) para timeline de features
- Ver [Template Docs](../../template/) para patrones generales

---

## Mantenimiento de Esta Documentación

### Actualizar Contenido

1. **Modificar archivo específico** en la carpeta correspondiente
2. **Actualizar este README.md** si cambias estructura
3. **Verificar links relativos** no rompan referencias

### Agregar Nueva Sección

```bash
# 1. Crear carpeta
mkdir docs/project/architecture/09-nueva-seccion

# 2. Crear README.md en la carpeta
# 3. Actualizar este README.md con el nuevo link
# 4. Actualizar TOC si es necesario
```

### Documentación Original

- **Archivo original:** `architecture.md.old` (backup completo preservado)
- **Refactorización:** 2025-10-30
- **Archivos creados:** ~35 archivos modulares
- **Contenido:** 100% preservado, reorganizado para mejor navegación

---

**Última actualización:** 2025-10-30
**Versión del proyecto:** 0.1.0
**Base:** Template SaaS v1.0
**Estructura:** Modular (~35 archivos)
