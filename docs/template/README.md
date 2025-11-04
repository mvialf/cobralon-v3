# SaaS Template - Documentación

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

**Siguiente paso:** [Getting Started → Installation](getting-started/installation.md)

---

## 📦 ¿Qué Incluye Este Template?

### Sistema de Layout Completo

- **AppLayout** - Orchestrator de 2 capas (Sidebar + Content)
- **AppSidebar** - Sidebar colapsible con navegación configurable
- **Responsive** - Mobile-friendly (sidebar → drawer en mobile)

### 50+ Componentes UI (shadcn/ui)

- Forms (Button, Input, Select, Checkbox, etc.)
- Data Display (Card, Table, Badge, Avatar, etc.)
- Feedback (Alert, Dialog, Toast, etc.)
- Navigation (Tabs, Breadcrumb, Pagination, etc.)
- **DataTable** - Sistema avanzado de tablas con TanStack Table
- Ver lista completa: [UI Components](components/ui-components.md)

### Stack Tecnológico Moderno

- **Next.js 15** con App Router y React Server Components
- **Tailwind CSS v4** con CSS variables para theming
- **TypeScript 5** en modo strict
- **shadcn/ui** estilo "New York" (profesional)
- Ver stack completo: [Stack Tecnológico](architecture/stack.md)

### Metodología de Documentación

- **ADRs** (Architecture Decision Records)
- **Implementation Log** para tracking de cambios
- **Patterns** de código recomendados
- Ver metodología: [Documentation](methodology/documentation.md)

### 🎯 Template Skills (Claude Code)

Skills oficiales para acelerar desarrollo con Claude Code:

**CRUD Feature Generator** - Genera features CRUD completos automáticamente

Genera 7 archivos siguiendo patrones del template:
- ✅ Prisma model
- ✅ Zod validation
- ✅ Form component
- ✅ Dialog wrapper
- ✅ API routes (GET + POST)
- ✅ DataTable columns
- ✅ Page component

**Instalación:**
```bash
cp -r docs/template/skills/crud-feature-generator ~/.claude/skills/
```

**Uso:**
```
"Crea un CRUD para Product"
"Genera feature completa para Category"
```

Ver documentación completa: [CRUD Feature Generator](skills/crud-feature-generator/)

---

## 📚 Navegación de Documentación

### Para Empezar

1. [**Installation**](getting-started/installation.md) - Setup inicial
2. [**First Page**](getting-started/first-page.md) - Crear tu primera página
3. [**Customization**](getting-started/customization.md) - Personalizar el template

### Arquitectura y Diseño

- [**Overview**](architecture/overview.md) - Visión arquitectural high-level
- [**Stack**](architecture/stack.md) - Stack tecnológico completo
- [**Dependencies**](architecture/dependencies.md) - Inventario de dependencias (WIP)

### Componentes

- [**AppLayout**](components/app-layout.md) - Orchestrator principal
- [**AppSidebar**](components/app-sidebar.md) - Sidebar de navegación
- [**DataTable**](components/data-table.md) - Sistema de tablas avanzadas
- [**DataTable Pattern**](components/data-table-pattern.md) - ⭐ Arquitectura del patrón de 2 archivos
- [**UI Components**](components/ui-components.md) - 50+ componentes shadcn/ui

### Guías de Setup

- [**Database Setup**](guides/database-setup.md) - Prisma + Neon PostgreSQL
- [**Authentication Setup**](guides/authentication-setup.md) - Stack Auth / NextAuth / Clerk
- [**Utilities**](guides/utilities.md) - ⭐ Funciones de formateo (currency, numbers, dates)
- [**Hooks**](guides/hooks.md) - ⭐ Custom hooks (useDebounce, useIsMobile, useToast)

### Guías de Desarrollo

- [**Building Features**](guides/building-features/) - ⭐ Guía práctica modular de implementación de features
- [**Create DataTable Page**](guides/create-new-datatable-page.md) - Tutorial paso a paso para crear tablas

### Metodología

- [**Documentation**](methodology/documentation.md) - Cómo usar ADRs + Implementation Log
- [**Workflow**](methodology/workflow.md) - Proceso de desarrollo (WIP)
- [**Testing**](methodology/testing.md) - Estrategia de testing (WIP)
- [**Patterns**](methodology/patterns/README.md) - Code patterns recomendados

### Decisiones Arquitecturales (ADRs)

- [**ADR-001**: Next.js 15 + App Router](decisions/001-nextjs-15-app-router.md)
- [**ADR-002**: Tailwind CSS v4](decisions/002-tailwind-css-v4.md)
- [**ADR-003**: shadcn/ui New York Style](decisions/003-shadcn-ui-new-york.md)
- [**ADR-004**: Sistema de Layout 2 Capas](decisions/004-layout-system-dos-capas.md)
- [**ADR-008**: Prisma + Neon PostgreSQL](decisions/008-prisma-neon.md)
- [**ADR-009**: No Incluir Autenticación por Defecto](decisions/009-authentication-options.md)

---

## 🎯 Características Clave

### ✅ Production-Ready

- TypeScript strict mode
- Next.js 15 App Router (future-proof)
- 50+ componentes UI preconstruidos
- Theming light/dark out-of-the-box

### ✅ Developer Experience

- Path aliases (`@/*`)
- Hot reload rápido
- shadcn/ui copy-paste architecture (ownership completo)
- Documentación exhaustiva

### ✅ Performance

- React Server Components
- CSS estático (sin runtime CSS-in-JS)
- Tailwind v4 (build speed mejorado)
- Tree-shakeable components

### ✅ Escalable y Flexible

- No vendor lock-in
- Customización sin límites
- Metodología de documentación incluida
- Arquitectura modular

---

## 🏗️ Casos de Uso

Este template es perfecto para:

- ✅ Dashboards SaaS
- ✅ Admin panels
- ✅ Aplicaciones internas (internal tools)
- ✅ MVPs rápidos
- ✅ Prototipos de productos

---

## 📖 Ejemplo Rápido

```tsx
// app/dashboard/page.tsx
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <AppLayout
      pageTitle="Dashboard"
      pageDescription="Vista general"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Dashboard' }]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1,234</p>
          </CardContent>
        </Card>
        {/* Más cards... */}
      </div>
    </AppLayout>
  )
}
```

**Resultado:** Página completa con sidebar, breadcrumbs y contenido.

---

## 🚧 Próximos Pasos Recomendados

Después de instalar el template:

1. **Agregar Autenticación**
   - NextAuth.js (recomendado)
   - Clerk
   - Supabase Auth

2. **Setup Base de Datos**
   - Prisma + PostgreSQL (recomendado)
   - Drizzle ORM
   - Supabase

3. **Implementar Features** → Ver [Building Features Guide](guides/building-features/)
   - CRUD operations
   - Forms con React Hook Form + Zod
   - Data tables con TanStack Table

4. **Deploy**
   - Vercel (recomendado para Next.js)
   - Railway, Netlify, etc.

---

## ⚠️ Notas Importantes

### Configuración Permisiva (Cambiar en Producción)

El template tiene configuración permisiva para desarrollo:

```javascript
// next.config.mjs
{
  eslint: { ignoreDuringBuilds: true },      // ⚠️ Cambiar a false
  typescript: { ignoreBuildErrors: true },   // ⚠️ Cambiar a false
  images: { unoptimized: true }              // ⚠️ Configurar CDN
}
```

**Recomendación:** Cambiar antes de deploy a producción.

Ver: [Stack → Configuration](architecture/stack.md#configuration)

---

## 📄 Licencia

Este template es opensource. Ver [LICENSE](../../LICENSE).

---

## 🤝 Contribuir

Si encuentras bugs o quieres contribuir mejoras al template, crea un issue o PR en el repositorio.

---

## 📞 Soporte

- **Documentación:** [docs/template/](.)
- **Ejemplos:** Ver [app/page.tsx](../../app/page.tsx)
- **Issues:** (Agregar link a repo)

---

**¡Listo para empezar!** → [Getting Started](getting-started/installation.md)
