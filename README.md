# SaaS Layout Template

Template de layout SaaS profesional construido con **Next.js 15**, **React 19**, **TypeScript** y **Tailwind CSS v4**.

## 🚀 Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir en navegador
http://localhost:3000
```

## ✨ Características

### Sistema de Layout Completo

- **AppLayout** - Orchestrator de 3 capas (Header + Sidebar + Content)
- **HeaderNav** - Header sticky con theme toggle, notificaciones, user menu
- **AppSidebar** - Sidebar colapsible con navegación configurable
- **Responsive** - Mobile-friendly (sidebar → drawer en mobile)

### 50+ Componentes UI

- Forms, Data Display, Feedback, Navigation
- **DataTable** - Sistema avanzado con TanStack Table
- **Combobox** - Componente de selección con búsqueda y debounce (DiceUI)
- Ver lista completa: [docs/template/components/ui-components.md](docs/template/components/ui-components.md)

### Stack Tecnológico

- **Next.js 15** con App Router y React Server Components
- **React 19** con mejoras de performance e hidratación
- **Tailwind CSS v4** con CSS variables para theming
- **TypeScript 5** en modo strict
- **shadcn/ui** estilo "New York" (profesional)
- **Prisma 6.7** + **Neon PostgreSQL** (database layer opcional)

### Testing & Code Quality

- **Vitest 3.2.4** - Test runner moderno (2-3x más rápido que Jest)
- **React Testing Library 16.3.0** - Testing centrado en el usuario
- **ESLint 8.57.1** - Linting con reglas estrictas
- **Prettier 3.4.2** - Formateo automático de código
- **Chrome DevTools MCP** - E2E testing experimental

### Documentación Completa

- **ADRs** (Architecture Decision Records) - 7 decisiones documentadas
- **Implementation Log** - Timeline de cambios significativos
- **Testing Guides** - Estrategia completa de testing
- **Component Guides** - Documentación de cada componente

## 📚 Documentación

- **[Getting Started](docs/template/README.md)** - Introducción al template
- **[Architecture](docs/template/architecture/overview.md)** - Arquitectura del sistema
- **[Components](docs/template/components/)** - Guías de componentes
- **[Testing](docs/template/methodology/testing.md)** - Estrategia de testing
- **[ADRs](docs/template/decisions/)** - Decisiones arquitecturales

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Ejecutar tests una vez (CI)
npm test -- --run

# UI interactiva de Vitest
npm test -- --ui

# Ejecutar linting
npm run lint

# Auto-fix de linting
npm run lint --fix
```

**Tests Disponibles:**

- ✅ 57 tests pasando (utils, button, card, use-mobile)
- ✅ Cobertura de componentes UI básicos
- ✅ Mocks completos para Radix UI

## 🏗️ Estructura del Proyecto

```
saas-layout/
├── app/                    # App Router de Next.js
│   ├── layout.tsx         # Root layout con ThemeProvider
│   └── page.tsx           # Homepage
│
├── components/
│   ├── layout/            # Sistema de layout (AppLayout, Header, Sidebar)
│   ├── ui/                # 50+ componentes shadcn/ui
│   └── data-table/        # Sistema DataTable con TanStack
│
├── lib/                   # Utilidades (cn, utils)
├── hooks/                 # Custom hooks (use-mobile, use-toast)
│
├── docs/
│   ├── template/          # Documentación del framework
│   └── project/           # Documentación del proyecto específico
│
└── tests/                 # Tests de Vitest
```

## 📦 Scripts Principales

```bash
npm run dev       # Desarrollo en localhost:3000
npm run build     # Build de producción
npm start         # Servidor de producción
npm run lint      # ESLint
npm run lint --fix # Auto-fix ESLint
npm test          # Tests con Vitest
```

## 🎯 Crear Nueva Página

```tsx
// app/dashboard/page.tsx
import { AppLayout } from '@/components/layout/app-layout'

export default function DashboardPage() {
  return (
    <AppLayout
      pageTitle="Dashboard"
      pageDescription="Vista general"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Dashboard' }]}
    >
      <div>Tu contenido aquí</div>
    </AppLayout>
  )
}
```

## 🎨 Agregar Componente shadcn/ui

```bash
npx shadcn@latest add [component-name]

# Ejemplo:
npx shadcn@latest add calendar
npx shadcn@latest add form
```

## 🗄️ Database Setup (Opcional)

Este template incluye configuración lista para **Prisma ORM** + **Neon PostgreSQL**:

### Quick Start

```bash
# 1. Copiar variables de entorno
cp .env.example .env.local

# 2. Crear proyecto Neon (gratis): https://neon.tech
# 3. Copiar connection strings a .env.local

# 4. Generar Prisma Client
npm run db:generate

# 5. Aplicar schema a DB
npm run db:push

# 6. (Opcional) Seed data de ejemplo
npm run db:seed

# 7. (Opcional) Abrir Prisma Studio
npm run db:studio
```

### Características

- ✅ **Type-safe queries** - IntelliSense completo para DB
- ✅ **Database branching** - Como Git pero para tu DB
- ✅ **Prisma Studio** - GUI para ver/editar datos
- ✅ **Free tier** - 512MB storage + branches ilimitados
- ✅ **Zero vendor lock-in** - PostgreSQL estándar

### Scripts Disponibles

```bash
npm run db:generate         # Genera Prisma Client
npm run db:push            # Aplica schema a DB (dev)
npm run db:migrate         # Crea migración (prod)
npm run db:studio          # Abre GUI de Prisma
npm run db:seed            # Ejecuta seed script
```

### Documentación Completa

- **[Guía de Setup](docs/template/guides/database-setup.md)** - Paso a paso completo
- **[ADR-008: Prisma + Neon](docs/template/decisions/008-prisma-neon.md)** - Decisión técnica
- **Ejemplo API**: Ver `/app/api/users/route.ts`

## 🔧 Configuración

### Path Aliases

- `@/components` → componentes
- `@/lib` → utilidades y helpers
- `@/hooks` → custom hooks
- `@/app` → App Router de Next.js

### Theming

Configurado con CSS variables en `app/globals.css`:

- Light/Dark mode automático
- Sistema de colores personalizable
- Compatible con next-themes

## 📖 Decisiones Arquitecturales (ADRs)

1. **[ADR-001: Next.js 15 + App Router](docs/template/decisions/001-nextjs-14-app-router.md)**
2. **[ADR-002: Tailwind CSS v4](docs/template/decisions/002-tailwind-css-v4.md)**
3. **[ADR-003: shadcn/ui New York Style](docs/template/decisions/003-shadcn-ui-new-york.md)**
4. **[ADR-004: Sistema de Layout 2 Capas](docs/template/decisions/004-layout-system-dos-capas.md)**
5. **[ADR-005: Vitest + Testing Library](docs/template/decisions/005-vitest-testing-library.md)**
6. **[ADR-006: Chrome DevTools MCP](docs/template/decisions/006-chrome-devtools-mcp-experimental.md)**
7. **[ADR-007: ESLint + Prettier](docs/template/decisions/007-eslint-prettier.md)**
8. **[ADR-008: Prisma + Neon](docs/template/decisions/008-prisma-neon.md)**

## ⚠️ Notas Importantes

### Testing

- Tests dinámicos de MediaQueryList no funcionan en jsdom (documentado)
- 11 warnings de ESLint son intencionales (no bloquean build)

### Production Ready

El template tiene configuración **segura para producción**:

- ✅ `ignoreDuringBuilds: false` (corregido)
- ✅ `ignoreBuildErrors: false` (corregido)
- ⚠️ `images: { unoptimized: true }` - Cambiar si usas CDN

## 🚧 Próximos Pasos Recomendados

1. **Setup Database** (Opcional) - Seguir guía en sección "Database Setup" arriba
2. **Agregar Autenticación** - NextAuth.js, Clerk, o Supabase Auth
3. **Implementar Features** - CRUD operations, forms con validación
4. **Deploy** - Vercel (recomendado para Next.js)

## 📄 Licencia

Este template es opensource. Ver [LICENSE](LICENSE).

## 🤝 Contribuir

Si encuentras bugs o quieres contribuir mejoras, crea un issue o PR.

---

**Built with ❤️ usando Next.js 15 + React 19 + shadcn/ui + Tailwind CSS v4**
