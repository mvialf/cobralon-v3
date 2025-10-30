# Arquitectura del Template SaaS

Esta es la visión high-level de la arquitectura del template.

## Principios Fundamentales

### 1. Server-First con Client Components Tácticos

El template está diseñado para maximizar el uso de **React Server Components** (RSC):

- **Server Components por defecto**: Mejor performance, menor bundle size
- **Client Components solo cuando es necesario**: Interactividad, hooks del navegador, event handlers
- **Hybrid rendering**: Lo mejor de ambos mundos

### 2. Composition Over Configuration

Preferimos composición de componentes sobre configuración compleja:

- Componentes pequeños y reutilizables
- Props claras y bien definidas
- Patterns predecibles

### 3. Developer Experience (DX) First

- **Path aliases** (`@/*`) para imports limpios
- **TypeScript strict** para catch de errores tempranos
- **shadcn/ui** para componentes consistentes sin reinventar la rueda
- **Tailwind v4** con CSS variables para theming flexible

### 4. Production-Ready Defaults

- Next.js 15 con App Router (futuro-proof)
- Tailwind CSS v4 (última versión estable)
- shadcn/ui "new-york" style (profesional y moderno)
- Sistema de temas light/dark out-of-the-box

---

## Arquitectura de Capas

```
┌─────────────────────────────────────────────┐
│           App Router (Next.js 15)           │
│                                             │
│  /app/                                      │
│  ├── page.tsx         (Server Component)    │
│  ├── layout.tsx       (Root layout)         │
│  └── dashboard/                             │
│      └── page.tsx     (Wrapped in AppLayout)│
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           Layout System (2 Capas)           │
│                                             │
│  AppLayout (Orchestrator)                   │
│  ├── AppSidebar      (Collapsible sidebar)  │
│  └── Main Content    (Page-specific)        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│        UI Components (shadcn/ui)            │
│                                             │
│  40+ componentes pre-built:                 │
│  - Forms (Input, Select, Checkbox, etc.)    │
│  - Data Display (Table, Card, Badge, etc.)  │
│  - Feedback (Alert, Toast, Dialog, etc.)    │
│  - Navigation (Tabs, Breadcrumb, etc.)      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│        Styling Layer (Tailwind v4)          │
│                                             │
│  - CSS Variables para theming               │
│  - Utility-first approach                   │
│  - Responsive by default                    │
│  - Dark mode support                        │
└─────────────────────────────────────────────┘
```

---

## Flujo de Datos

### Server Components (Páginas)

```
User Request → Next.js Server → Fetch Data → Render RSC → HTML to Client
```

### Client Components (Interactividad)

```
User Interaction → Event Handler → State Update → Re-render Component
```

### Hybrid (Común en este template)

```
Page (Server) → AppLayout (Client) → Children (puede ser Server o Client)
```

---

## Estructura de Directorios

```
saas-layout/
├── app/                    # App Router de Next.js
│   ├── layout.tsx         # Root layout con ThemeProvider
│   ├── page.tsx           # Homepage
│   └── globals.css        # Estilos globales + CSS variables
│
├── components/
│   ├── layout/            # Sistema de layout
│   │   ├── app-layout.tsx        # Orchestrator principal
│   │   ├── app-sidebar.tsx       # Sidebar colapsible
│   │   └── page-header.tsx       # Header de página
│   │
│   ├── ui/                # shadcn/ui components (40+)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   └── custom/            # Componentes custom adicionales
│       └── data-table/    # TanStack Table implementation
│
├── lib/
│   └── utils.ts           # Utilidad cn() y helpers
│
├── hooks/
│   ├── use-mobile.ts      # Detección de breakpoints
│   └── use-toast.ts       # Sistema de toasts
│
└── docs/                  # Documentación del template
    ├── template/          # Docs del framework
    └── project/           # Docs del proyecto específico
```

---

## Sistema de Layout: Deep Dive

El template incluye un sistema de layout SaaS profesional de **2 capas**:

### 1. AppLayout (Orchestrator)

- **Archivo**: [components/layout/app-layout.tsx](../../../components/layout/app-layout.tsx)
- **Tipo**: Client Component (`"use client"`)
- **Responsabilidad**: Orquestar AppSidebar + contenido principal
- **Props**: `pageTitle`, `pageDescription`, `breadcrumbs`, `children`

### 2. AppSidebar (Navigation Sidebar)

- **Archivo**: [components/layout/app-sidebar.tsx](../../../components/layout/app-sidebar.tsx)
- **Features**: Colapsible, navegación principal, footer con user menu
- **Configuración**: Arrays `navigationItems` y `settingsItems` (editable)

**Ver más detalles en**: [components/app-layout.md](../components/app-layout.md)

---

## Decisiones Arquitecturales (ADRs)

Las decisiones arquitecturales importantes están documentadas en:

- [ADR-001: Next.js 15 + App Router](../decisions/001-nextjs-14-app-router.md)
- [ADR-002: Tailwind CSS v4](../decisions/002-tailwind-css-v4.md)
- [ADR-003: shadcn/ui New York Style](../decisions/003-shadcn-ui-new-york.md)
- [ADR-004: Sistema de Layout 2 Capas](../decisions/004-layout-system-dos-capas.md)

---

## Stack Tecnológico Completo

Ver [stack.md](stack.md) para el inventario completo de dependencias y versiones.

---

## Siguiente Paso

Para empezar a usar el template:

1. **Instalación:** [Getting Started](../getting-started/installation.md)
2. **Implementación de features:** [Building Features Guide](../guides/building-features/) ⭐
