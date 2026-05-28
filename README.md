# Cobralon

Sistema de gestión de cobranza y proyectos construido con **Next.js 15**, **React 19**, **TypeScript** y **Tailwind CSS v4**.

## Stack Tecnológico

- **Next.js 15** - App Router + React Server Components
- **React 19** - Con React Query para state management
- **Tailwind CSS v4** - Estilos con CSS variables
- **shadcn/ui** - Componentes UI (estilo New York)
- **Prisma 6.7** + **Neon PostgreSQL** - Base de datos
- **Vitest** + **Playwright** - Testing

## Quick Start

```bash
# Instalar dependencias
npm install

# Configurar base de datos
cp .env.example .env.local
# Editar .env.local con credenciales de Neon

# Generar Prisma Client y aplicar schema
npm run db:generate
npm run db:push

# Iniciar desarrollo
npm run dev
```

## Scripts

```bash
npm run dev          # Desarrollo (localhost:3000)
npm run build        # Build producción
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm test             # Tests unitarios
npm run db:studio    # Prisma Studio (GUI)
```

## Estructura

```
app/
├── api/              # API Routes
├── calendar/         # Sistema de calendario
├── customer/         # Gestión de clientes
├── login/            # Login Better Auth
├── payments/         # Sistema de pagos
├── projects/         # Gestión de proyectos
└── settings/         # Configuración

components/
├── forms/            # Formularios por entidad
├── dialogs/          # Diálogos modales
├── tables/           # Tablas de datos
└── ui/               # Componentes shadcn/ui

lib/
├── business-logic/   # Lógica financiera (FIFO, créditos)
├── validations/      # Schemas Zod
└── db/               # Prisma client

docs/
└── project/          # Documentación del proyecto
```

## Documentación

- **[Arquitectura](docs/project/architecture.md)** - FIFO, créditos, estados
- **[Autenticación](docs/project/auth.md)** - Better Auth y roles
- **[Import/Export](docs/project/import-export.md)** - Excel y tests
- **[Backlog](docs/project/backlog.md)** - Mejoras pendientes
- **[Sistema de Pagos](docs/project/payment-system.md)** - Análisis detallado

## Lógica de Negocio

El sistema implementa:

1. **FIFO** - Distribución de pagos a deudas más antiguas primero
2. **Créditos** - Ledger de saldos a favor por sobrepago
3. **ProjectFinancials** - Saldos derivados desde pagos, créditos y ajustes
4. **Better Auth** - Sesiones y roles `user`/`admin`
5. **Multi-país** - Configuración regional (Chile/Colombia)

Ver [docs/project/architecture.md](docs/project/architecture.md) para detalles.
