# ADR-004: Sistema de Layout SaaS de 2 Capas

## Estado

**Aceptado**

**Fecha:** 2025-01-13
**Última modificación:** 2025-10-17

## Contexto

Necesitábamos un sistema de layout para aplicaciones SaaS que fuera:

- Profesional y familiar para usuarios (sidebar + contenido)
- Fácil de usar (DX): crear páginas sin reinventar layout cada vez
- Responsive: Funcional en desktop y mobile
- Personalizable: Sidebar configurable, theming, etc.
- Interactivo: Sidebar colapsible, dropdowns, etc.

Patrones comunes en SaaS:

1. Sidebar colapsible con navegación principal
2. Área de contenido principal

## Decisión

Implementar un **sistema de layout de 2 capas** compuesto por:

1. **AppLayout** (orchestrator) - Componente principal que orquesta todo
2. **AppSidebar** (collapsible sidebar) - Sidebar con navegación principal y footer

## Alternativas Consideradas

### Alternativa 1: Server Component Layout

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Header />
        <Sidebar />
        <main>{children}</main>
      </body>
    </html>
  )
}
```

- **Pros:**
  - Más simple conceptualmente
  - Sin necesidad de `"use client"`
  - Mejor performance (menos JavaScript)
- **Contras:**
  - **Sidebar no puede ser interactivo** (collapse, state)
  - Theme toggle requiere workarounds
  - Dropdowns y menus requieren Client Components de todos modos
  - Menos flexible
- **Por qué NO:** La interactividad del sidebar y header es esencial para UX moderna. Server Components puro no es viable.

### Alternativa 2: Radix Navigation Menu

```tsx
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
```

- **Pros:**
  - Primitives accesibles
  - Unstyled (customización total)
- **Contras:**
  - **Demasiado bajo nivel** - requiere construir TODO
  - No incluye layout structure
  - Solo provee la navegación, no el layout completo
- **Por qué NO:** Queremos un layout completo listo para usar, no solo primitives.

### Alternativa 3: Template de shadcn/ui (Sidebar component)

shadcn/ui lanzó un componente `Sidebar` en Noviembre 2024.

- **Pros:**
  - Oficial de shadcn/ui
  - Integración con Radix
- **Contras:**
  - **No existía** cuando creamos el template inicial
  - Requiere configuración adicional
  - Menos opinionado sobre estructura completa
- **Por qué NO (en ese momento):** No disponible. Ahora existe, pero nuestro sistema ya está implementado y funciona bien.

**Nota:** Considerar migrar en futuras versiones del template.

### Alternativa 4: Layout CSS Puro (sin componentes)

```tsx
<div className="grid grid-cols-[auto_1fr]">
  <aside>Sidebar</aside>
  <div>
    <header>Header</header>
    <main>Content</main>
  </div>
</div>
```

- **Pros:**
  - Sin abstracción
  - Control total
  - Performance óptima
- **Contras:**
  - **Requiere reimplementar en cada página** (o en layout root)
  - Sin sidebar colapsible out-of-the-box
  - Sin responsive handling fácil
  - No reutilizable
- **Por qué NO:** DX pobre. Queremos abstracción reutilizable.

### Alternativa 5: Library de Third-Party (React Admin, Refine, etc.)

- **Pros:**
  - Todo incluido (routing, auth, CRUD, etc.)
  - Muchos features
- **Contras:**
  - **Vendor lock-in extremo**
  - Muy opinado
  - No compatible con Next.js App Router nativamente
  - Overhead de features innecesarios
- **Por qué NO:** Demasiado complejo y restrictivo para un template flexible.

## Consecuencias

### Positivas ✅

1. **Developer Experience Excepcional**

   ```tsx
   // Crear una nueva página es trivial:
   import AppLayout from '@/components/layout/app-layout'

   export default function MyPage() {
     return (
       <AppLayout pageTitle="Mi Página" pageDescription="Descripción">
         <div>Contenido aquí</div>
       </AppLayout>
     )
   }
   ```

   - Solo import + props + children
   - Sin preocuparse por sidebar, estructura

2. **Configuración Centralizada**
   - Sidebar navigation en un solo lugar: [app-sidebar.tsx:19-48](../../../components/layout/app-sidebar.tsx#L19-L48)
   - Fácil agregar/quitar links de navegación

3. **Interactividad Moderna**
   - Sidebar colapsible (estado persiste)
   - Theme toggle light/dark
   - Dropdowns accesibles (Radix)
   - Badges de notificaciones
   - Avatar con user menu

4. **Responsive por Defecto**
   - Mobile: Sidebar como drawer overlay
   - Desktop: Sidebar permanente colapsible
   - Breakpoints automáticos

5. **Profesional y Familiar**
   - UX que usuarios ya conocen (GitHub, Linear, Notion-style)
   - Consistencia visual en todas las páginas

### Negativas / Trade-offs ⚠️

1. **Todo es Client Component**

   ```tsx
   'use client' // ← AppLayout, AppSidebar
   ```

   - **Impacto:** Más JavaScript en el cliente
   - **Por qué es necesario:** La interactividad (sidebar, dropdowns) requiere `useState`, event handlers, etc.
   - **Mitigación:** Los `children` de AppLayout PUEDEN ser Server Components. Solo el layout wrapper es cliente.

2. **Menos Flexible que Custom Layout por Página**
   - Si una página necesita layout MUY diferente, no puede usar AppLayout
   - **Mitigación:** AppLayout es opcional. Páginas pueden tener layout custom si lo necesitan.

3. **Dependencia de Radix UI Sidebar/Collapsible**
   - Si Radix cambia API, necesitamos actualizar
   - **Mitigación:** Radix es estable. Tenemos control del código (copy-paste architecture).

4. **Configuración de Sidebar es Manual**
   - Agregar links requiere editar `navigationItems` array
   - No hay auto-generation desde rutas
   - **Mitigación:** Es explícito y predecible. Preferimos esto sobre "magia".

## Implementación

### Arquitectura de 2 Capas

```
AppLayout (components/layout/app-layout.tsx)
└── SidebarProvider (Radix UI context)
    ├── AppSidebar (collapsible)
    │   ├── SidebarHeader (logo + collapse trigger)
    │   ├── SidebarContent
    │   │   ├── navigationItems (main nav)
    │   │   └── settingsItems (secondary nav)
    │   └── SidebarFooter (user menu dropdown)
    │
    └── main (contenido principal)
        ├── PageHeader (título, descripción, breadcrumbs)
        └── children (contenido de la página)
```

### Archivos Principales

1. **AppLayout** ([components/layout/app-layout.tsx](../../../components/layout/app-layout.tsx))
   - Orchestrator principal
   - Props: `pageTitle`, `pageDescription`, `breadcrumbs`, `children`
   - Client Component

2. **AppSidebar** ([components/layout/app-sidebar.tsx](../../../components/layout/app-sidebar.tsx))
   - Sidebar colapsible
   - Configuración: `navigationItems` (líneas 19-36), `settingsItems` (líneas 38-48)
   - Footer con dropdown de usuario
   - Icons desde `lucide-react`

3. **PageHeader** ([components/layout/page-header.tsx](../../../components/layout/page-header.tsx))
   - Renderiza título + descripción + breadcrumbs
   - Dentro del contenido principal

### Ejemplo de Uso Completo

```tsx
// app/dashboard/page.tsx
import AppLayout from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <AppLayout
      pageTitle="Dashboard"
      pageDescription="Vista general de tu cuenta"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Dashboard' }]}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent>Métrica 1</CardContent>
        </Card>
        {/* Más contenido... */}
      </div>
    </AppLayout>
  )
}
```

### Configurar Navegación del Sidebar

Editar [components/layout/app-sidebar.tsx:19-48](../../../components/layout/app-sidebar.tsx#L19-L48):

```tsx
const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Nuevo Item', // ← Agregar aquí
    href: '/nuevo',
    icon: Plus,
  },
  // ...
]
```

## Referencias

- Implementación: [components/layout/](../../../components/layout/)
- Uso en homepage: [app/page.tsx](../../../app/page.tsx)
- Radix UI Collapsible: https://www.radix-ui.com/primitives/docs/components/collapsible
- Radix UI Dropdown: https://www.radix-ui.com/primitives/docs/components/dropdown-menu

## Notas Adicionales

### Migración Futura a shadcn/ui Sidebar Component

shadcn/ui ahora ofrece un componente oficial `Sidebar` (lanzado Nov 2024):
https://ui.shadcn.com/docs/components/sidebar

**Ventajas de migrar:**

- Más estándar (oficial de shadcn/ui)
- Mejor soporte y actualizaciones

**Decisión futura:** Considerar migración en v2 del template. Por ahora, el sistema actual funciona perfectamente.

### Alternativa sin AppLayout

Si una página necesita layout completamente diferente:

```tsx
// app/landing/page.tsx
export default function LandingPage() {
  // NO uses AppLayout aquí
  return (
    <div>
      <CustomHeader />
      <HeroSection />
      <Footer />
    </div>
  )
}
```

AppLayout es **opcional**. Solo úsalo donde tenga sentido.

---

**Última actualización:** 2025-10-17
