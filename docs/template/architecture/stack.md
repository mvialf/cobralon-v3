# Stack Tecnológico

Documentación completa del stack tecnológico del template SaaS Layout.

## Core Framework

### Next.js 15.5.6

- **Router**: App Router (RSC habilitado)
- **Rendering**: Hybrid (Server Components + Client Components)
- **Path Alias**: `@/*` mapea a la raíz del proyecto ([tsconfig.json:22-23](../../../tsconfig.json#L22-L23))
- **Migrado desde**: 14.2.16 → 15.5.6 (Octubre 2025)

### React 19.2.0

- Server Components por defecto
- Client Components marcados con `"use client"`
- Hooks modernos disponibles
- **Migrado desde**: React 18 → 19.2.0 (Octubre 2025)

### TypeScript 5

- **Mode**: Strict habilitado ([tsconfig.json:7](../../../tsconfig.json#L7))
- **Target**: ES6
- **Module Resolution**: bundler
- ✅ **Build safety habilitado**: Errores de tipo/lint ahora fallan el build (corregido en migración a Next.js 15)

### Runtime

- **Node.js**: 20.19.4 (mínimo recomendado: >=20.x)
- **Package Manager**: npm (incluido con Node.js)

---

## Styling & UI

### Tailwind CSS v4.1.9

- **PostCSS**: @tailwindcss/postcss 4.1.9
- **Plugins**:
  - `tailwindcss-animate` 1.0.7
  - `tw-animate-css` 1.3.3
- **CSS Variables**: Habilitadas para theming
- **Custom Variants**: `@custom-variant dark` ([app/globals.css:4](../../../app/globals.css#L4))

### shadcn/ui

- **Estilo**: "new-york" ([components.json:3](../../../components.json#L3))
- **RSC**: Habilitado
- **Base Color**: neutral
- **Icon Library**: lucide-react
- **Componentes**: 40+ componentes UI preconstruidos en [components/ui/](../../../components/ui/)

### Radix UI Primitives

Todos los componentes base de shadcn/ui están construidos sobre Radix UI:

- Accordion, Alert Dialog, Avatar, Checkbox, Dialog, Dropdown, etc.
- Versiones específicas en [package.json:13-40](../../../package.json#L13-L40)

### Tipografía

- **Font Sans**: Geist Sans (variable font)
- **Font Mono**: Geist Mono
- Configuradas en [app/layout.tsx](../../../app/layout.tsx) y [app/globals.css:71-72](../../../app/globals.css#L71-L72)

### Sistema de Temas

- **Librería**: next-themes 0.4.6
- **Soporte**: Light/Dark mode con CSS variables
- **Variables**: Definidas en [app/globals.css:6-68](../../../app/globals.css#L6-L68)
- **Color Primario**: `hsl(176, 84%, 25%)` (teal/cyan)

---

## State Management & Forms

### React Hook Form 7.60.0

- Manejo de formularios con bajo re-rendering
- Integrado con Zod para validación

### Zod 3.25.76

- Schema validation
- Type inference automático para TypeScript

### @hookform/resolvers 3.10.0

- Integración entre React Hook Form y Zod
- Ejemplo de uso en componentes shadcn/ui form

---

## Data Display & Visualization

### TanStack Table 8.21.3

- Tablas avanzadas con sorting, filtering, pagination
- Implementación custom en [components/custom/data-table/](../../../components/custom/data-table/)

### Recharts 2.15.4

- Librería de gráficos declarativa
- Componentes: Line, Bar, Area, Pie charts

### date-fns 4.1.0

- Formateo y manipulación de fechas
- Alternativa ligera a moment.js
- Usado en react-day-picker

### Otros Componentes

- **react-day-picker** 9.8.0: Date picker
- **embla-carousel-react** 8.5.1: Carousels
- **input-otp** 1.4.1: One-time password inputs
- **cmdk** 1.0.4: Command palette (Cmd+K)

---

## Layout & UI Utilities

### Layout Components

- **AppLayout**: Sistema de 2 capas (Sidebar + Content) con PageHeader integrado
- **AppSidebar**: Sidebar colapsible con navegación jerárquica y active route highlighting
- Features: Action slot en PageHeader, navegación de 2 niveles, breadcrumbs

### Formatting Utilities (Template Built-in)

Funciones de formateo basadas en Intl API nativa (zero dependencies):

- **formatCurrency()**: Formatea moneda con soporte multi-locale (CLP, USD, EUR, ARS, MXN)
- **formatNumber()**: Formatea números con separadores de miles y decimales configurables
- **formatDate()**: Formatea fechas con variantes short/long/full y soporte i18n

**Ubicación**: [lib/format.ts](../../../lib/format.ts)
**Tests**: [lib/__tests__/format.test.ts](../../../lib/__tests__/format.test.ts) (24 tests)
**Docs**: [guides/utilities.md](../guides/utilities.md)

### Custom Hooks (Template Built-in)

- **useDebounce**: Hook para debouncing de valores (search, auto-save, filters)
  - Type-safe con generics `<T>`
  - Default 300ms, configurable
  - **Ubicación**: [hooks/use-debounce.ts](../../../hooks/use-debounce.ts)
  - **Tests**: [hooks/__tests__/use-debounce.test.tsx](../../../hooks/__tests__/use-debounce.test.tsx) (10 tests)
  - **Docs**: [guides/hooks.md](../guides/hooks.md)

- **useIsMobile**: Detecta breakpoint mobile (<768px)
- **useToast**: Sistema de notificaciones toast (Sonner)

### UI Utilities

- **clsx** 2.1.1: Conditional className construction
- **tailwind-merge** 2.5.5: Merge Tailwind classes sin conflictos
- **class-variance-authority** 0.7.1: Variants system
- **Función `cn()`**: [lib/utils.ts:4-6](../../../lib/utils.ts#L4-L6) combina clsx + twMerge

### Notifications

- **sonner** 1.7.4: Toast notifications modernas
- **vaul** 1.1.2: Drawer component (mobile-first) - Compatible con React 19

---

## Configuration

### Next.js Config ([next.config.mjs](../../../next.config.mjs))

```javascript
{
  eslint: { ignoreDuringBuilds: false },     // ✅ CORREGIDO (Oct 2025)
  typescript: { ignoreBuildErrors: false },  // ✅ CORREGIDO (Oct 2025)
  images: { unoptimized: true }              // ⚠️ Cambiar en producción
}
```

**✅ Mejoras implementadas (Migración Next.js 15):**

1. **Build safety habilitado**: Los builds ahora fallan con errores de lint/tipo
2. **ESLint 9 con flat config**: Migrado a configuración moderna
3. ⚠️ **Images sin optimizar**: Pendiente - cambiar en producción

### TypeScript Config ([tsconfig.json](../../../tsconfig.json))

- Strict mode habilitado ✅
- Path alias `@/*` configurado ✅
- Incremental compilation ✅

### shadcn/ui Config ([components.json](../../../components.json))

- Aliases correctamente configurados para todos los paths
- Estilo "new-york" para apariencia profesional
- CSS variables habilitadas para theming dinámico

---

## Analytics & Monitoring

### @vercel/analytics 1.3.1

- Analytics integrado para deployments en Vercel
- Zero-config en producción
- Métricas de performance automáticas

---

## Scripts Disponibles

```bash
npm run dev     # Desarrollo en localhost:3000
npm run build   # Build de producción
npm start   # Servidor de producción
npm run lint    # ESLint (pero ignorado en builds)
```

---

## Decisiones Pendientes

### Para Futuros Proyectos Basados en Este Template

- [ ] **Corregir `next.config.mjs`**: Cambiar `ignoreDuringBuilds: false`
- [ ] **Optimizar images**: Remover `unoptimized: true` si se usa CDN
- [ ] **Testing framework**: No incluido (¿Vitest? ¿Jest? ¿Playwright?)
- [ ] **E2E testing**: No configurado
- [ ] **Linting rules**: Revisar y establecer reglas estrictas
- [ ] **Git hooks**: No configurados (considerar husky + lint-staged)
- [ ] **CI/CD**: No configurado

### Notas de Versiones

- ✅ Todas las dependencias están en versiones estables
- ✅ No hay dependencias deprecated
- ✅ **MIGRACIÓN COMPLETADA (Oct 2025)**: Next.js 15.5.6 + React 19 + ESLint 9
- ✅ TypeScript, React y Next.js en últimas versiones stable

---

## Referencias Rápidas

| Tecnología      | Versión                  | Documentación                   |
| --------------- | ------------------------ | ------------------------------- |
| Next.js         | **15.5.6**               | https://nextjs.org/docs         |
| React           | **19.2.0**               | https://react.dev               |
| TypeScript      | 5                        | https://typescriptlang.org/docs |
| ESLint          | **9.37.0** (flat config) | https://eslint.org/docs/latest  |
| Tailwind CSS    | 4.1.9                    | https://tailwindcss.com/docs    |
| shadcn/ui       | latest                   | https://ui.shadcn.com           |
| Radix UI        | latest                   | https://radix-ui.com            |
| TanStack Table  | 8.21.3                   | https://tanstack.com/table      |
| React Hook Form | 7.60.0                   | https://react-hook-form.com     |
| Zod             | 3.25.76                  | https://zod.dev                 |
