# Building Features - Practical Guide

Una guía práctica modular para construir features en proyectos basados en este template SaaS.

**Tiempo de lectura:** 60 min completo | 15 min navegación rápida

---

## 🚀 Quick Start

¿Primera vez aquí? Empieza por:

1. **Leer [Core Principles](core-principles/)** - 4 principios fundamentales (15 min)
2. **Elegir tu Pattern** - Según lo que necesites construir
3. **Consultar [Decision Framework](decision-framework/)** - Cuando tengas dudas

---

## 📚 Navegación Completa

### 🏗️ Core Principles (Empezar aquí)

Los 4 principios que guían todas las decisiones arquitecturales:

1. [**Server Components First**](core-principles/1-server-components-first.md)
   Usa Server Components para fetching, Client Components solo cuando necesites interactividad

2. [**Extract When It Hurts**](core-principles/2-extract-when-it-hurts.md)
   Mantén lógica inline inicialmente. Extrae cuando >10 líneas o se use en 2+ lugares

3. [**Data Down, Events Up**](core-principles/3-data-down-events-up.md)
   Componentes reciben data como props, emiten eventos vía callbacks

4. [**Test What Matters**](core-principles/4-test-what-matters.md)
   Testea pure functions primero, componentes solo si son críticos

➡️ **[Ver todos los principios](core-principles/)**

---

### 🎯 Patterns (Guías paso a paso)

Los 4 patrones más comunes en SaaS (cubren 80% de casos):

1. [**Pattern 1: Read-Only Data Display**](patterns/1-read-only-data-display.md)
   📊 Mostrar listas de datos desde database
   **Ejemplos:** Lista de productos, tabla de órdenes, dashboard con métricas

2. [**Pattern 2: CRUD Operations**](patterns/2-crud-operations.md)
   ✏️ Crear, editar y eliminar registros con forms
   **Ejemplos:** Create product, edit user profile, add team member

3. [**Pattern 3: Modal/Dialog Interactions**](patterns/3-modal-dialog-interactions.md)
   💬 Confirmaciones, forms pequeños, detalles adicionales
   **Ejemplos:** Confirm delete, quick add note, view order details

4. [**Pattern 4: Complex Relations (N:M)**](patterns/4-complex-relations-nm.md)
   🔗 Many-to-many relationships, allocations, join tables
   **Ejemplos:** Order con OrderItems, Project con Payments, User con Roles

➡️ **[Ver todos los patterns](patterns/)**

---

### 🤔 Decision Framework (¿Cuándo hacer qué?)

Responde las preguntas que te haces TODO EL TIEMPO:

- [**When to Extract Transformers**](decision-framework/when-to-extract-transformers.md)
  ¿Inline o lib/transformers/?

- [**When to Create Custom Hooks**](decision-framework/when-to-create-hooks.md)
  ¿Props o useCustomHook()?

- [**Server vs Client Component**](decision-framework/server-vs-client.md)
  ¿async function o "use client"?

- [**When to Create Service Layer**](decision-framework/when-to-create-service-layer.md)
  ¿Prisma directo o ProductService class?

➡️ **[Ver todas las decisiones](decision-framework/)**

---

### ❌ Common Pitfalls (Errores comunes)

Anti-patrones que DEBES evitar:

1. [Over-Extracting Too Soon](common-pitfalls/1-over-extracting-too-soon.md) - YAGNI
2. [Client Component for Everything](common-pitfalls/2-client-component-for-everything.md) - "use client" innecesario
3. [Inline Complex Logic](common-pitfalls/3-inline-complex-logic.md) - 50+ líneas en componente
4. [Testing Everything](common-pitfalls/4-testing-everything.md) - 100% coverage desde día 1
5. [Not Using Server Components](common-pitfalls/5-not-using-server-components.md) - Fetch client-side innecesario
6. [Premature Optimization](common-pitfalls/6-premature-optimization.md) - Memoization sin medir
7. [Mixing Concerns](common-pitfalls/7-mixing-concerns.md) - Fetch + transform + render en un componente

➡️ **[Ver todos los anti-patrones](common-pitfalls/)**

---

### 🧪 Testing Strategy

Qué testear y cómo:

- [**Testing Pyramid**](testing-strategy/testing-pyramid.md) - Prioridades de testing
- [**What to Test First**](testing-strategy/what-to-test-first.md) - Transformers → API Routes → Components
- [**Running Tests**](testing-strategy/running-tests.md) - Comandos y workflow

➡️ **[Ver estrategia completa](testing-strategy/)**

---

### 📈 Scaling Your Codebase

Cuándo refactorizar según crece tu código:

- [**From 1 to 10 Components**](scaling/1-to-10-components.md) - Extract transformers, shared types
- [**From 10 to 50 Components**](scaling/10-to-50-components.md) - Custom hooks, caching, business logic
- [**When to Refactor**](scaling/when-to-refactor.md) - Signals de dolor vs "if it ain't broke"

➡️ **[Ver guía de scaling](scaling/)**

---

## 🎯 Quick Reference

### Pattern Decision Tree

```
Need to build a feature?
    ↓
Is it just displaying data?
    ├─ Yes → Pattern 1: Read-Only Display
    └─ No → Needs user input?
           ├─ Yes → Pattern 2: CRUD Operations
           └─ No → Is it a confirmation/view?
                  ├─ Yes → Pattern 3: Modal/Dialog
                  └─ No → Complex relations?
                         └─ Yes → Pattern 4: N:M Relations
```

---

### Checklists

#### Creating a New Feature

- [ ] Is it read-only? → Server Component
- [ ] Needs interactivity? → Client Component
- [ ] Complex transformation (>10 lines)? → Extract to `lib/transformers/`
- [ ] Used in 2+ places? → Definitely extract
- [ ] Create validation schema (`lib/validations/`)
- [ ] Write tests for transformers (if extracted)
- [ ] Manual test in browser

#### Before Committing

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Tests pass (if you wrote them)
- [ ] Component renders correctly (manual test)
- [ ] No console errors

---

### Command Reference

```bash
# Development
npm run dev              # Start dev server (port 3000)

# Quality checks
npm run typecheck        # TypeScript validation
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix linting issues

# Testing
npm test                 # Run all tests
npm test:ui              # Interactive test UI
npm test:coverage        # Coverage report

# Database
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio
npm run db:generate      # Generate Prisma Client
```

---

### File Structure Template

Cuando crees un feature nuevo, usa esta estructura:

```
feature-name/
├── app/
│   └── feature/
│       ├── page.tsx              (Server Component)
│       ├── [id]/page.tsx         (Detail page)
│       └── columns.tsx           (DataTable columns)
│
├── components/
│   ├── forms/feature/
│   │   └── feature-form.tsx      (Client Component form)
│   ├── tables/
│   │   └── feature-table.tsx     (Client Component table)
│   └── dialogs/feature/
│       ├── new-feature-dialog.tsx
│       └── edit-feature-dialog.tsx
│
├── lib/
│   ├── transformers/
│   │   ├── feature-transformers.ts
│   │   └── __tests__/
│   │       └── feature-transformers.test.ts
│   ├── validations/
│   │   └── feature-validations.ts
│   └── types/
│       └── feature.types.ts
│
└── app/api/
    └── feature/
        ├── route.ts              (GET, POST)
        └── [id]/
            └── route.ts          (GET, PUT, DELETE)
```

---

## 🔗 Related Documentation

- [Architecture Overview](../../architecture/overview.md) - Visión arquitectural high-level
- [Code Patterns](../../methodology/patterns/) - Patrones de código específicos
- [Testing Strategy](../../methodology/testing.md) - Estrategia de testing completa
- [Create DataTable Page](../create-new-datatable-page.md) - Tutorial de DataTables
- [Database Setup](../database-setup.md) - Prisma + Neon setup

---

## 📖 What This Guide Covers

Esta guía te muestra **cómo construir los features más comunes** en un SaaS:

- ✅ Tablas de solo lectura (mostrar datos)
- ✅ CRUD operations (crear, editar, eliminar)
- ✅ Modal/Dialog interactions
- ✅ Relaciones complejas (N:M)

**NO cubre:**

- ❌ Setup inicial (ver [Installation](../getting-started/installation.md))
- ❌ Autenticación (ver [Authentication Setup](../authentication-setup.md))
- ❌ Testing exhaustivo (ver [Testing](../../methodology/testing.md))

---

## 👥 Who Should Read This

- Developers que clonaron el template
- Quieres construir features rápidamente
- Necesitas dirección clara sobre arquitectura

---

## 📚 Prerequisites

- Next.js 15 + App Router conocimiento básico
- TypeScript fundamentals
- React Server Components concepts
- Template ya instalado y funcionando

---

## 💡 Philosophy

**Core Ideas:**

- **Server Components First** - Mejor performance y SEO
- **Extract When It Hurts** - YAGNI (no sobre-ingenierizar)
- **Data Down, Events Up** - Componentes desacoplados
- **Test What Matters** - Transformers > Components

**Remember:** Start simple, refactor when it hurts. No premature optimization.

---

## 🚀 Next Steps

1. Lee [Core Principles](core-principles/) (15 min)
2. Construye tu primer feature usando [Pattern 1](patterns/1-read-only-data-display.md)
3. Agrega tests para transformers
4. Consulta [Decision Framework](decision-framework/) cuando tengas dudas
5. Escala gradualmente según [Scaling Guide](scaling/)

---

**¿Preguntas?** Consulta [Code Patterns](../../methodology/patterns/) para patrones más específicos.

**Última actualización:** 2025-10-30
