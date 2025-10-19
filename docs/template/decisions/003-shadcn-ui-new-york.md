# ADR-003: shadcn/ui con Estilo "New York"

## Estado

**Aceptado**

**Fecha:** 2025-01-13

## Contexto

Necesitábamos un sistema de componentes UI para el template que fuera:

- Profesional y moderno visualmente
- Accesible (ARIA compliant)
- Personalizable y sin vendor lock-in
- Compatible con React Server Components
- Productivo (no reinventar la rueda)

Además, shadcn/ui ofrece dos estilos visuales:

- **Default**: Estilo más sutil y minimalista
- **New York**: Estilo más profesional y pulido

## Decisión

Usar **shadcn/ui** como sistema de componentes con el estilo **"New York"**.

## Alternativas Consideradas

### Alternativa 1: Material UI (MUI)

- **Pros:**
  - Ecosistema maduro y completo
  - Muchos componentes prebuiltos
  - Amplia adopción enterprise
  - Theming robusto
- **Contras:**
  - **Bundle size enorme** (500kb+ mínimo)
  - Estilos opinados difíciles de customizar
  - CSS-in-JS (incompatible con RSC sin workarounds)
  - Look and feel muy reconocible (menos único)
- **Por qué NO:** Demasiado pesado y no optimizado para RSC. Menos personalizable.

### Alternativa 2: Chakra UI

- **Pros:**
  - Excelente DX
  - Accessibility first
  - Theming potente
  - Componentes composables
- **Contras:**
  - CSS-in-JS runtime (problemas con RSC)
  - Bundle size significativo
  - Requiere configuración adicional para Next.js 14
- **Por qué NO:** Runtime CSS no es ideal para Server Components. Performance inferior.

### Alternativa 3: Mantine

- **Pros:**
  - Componentes completos y bien documentados
  - Hooks utilities incluidos
  - Buen ecosistema
- **Contras:**
  - Estilos muy opinados
  - CSS-in-JS (emotion)
  - No optimizado para RSC
- **Por qué NO:** Mismo problema que MUI/Chakra con CSS-in-JS.

### Alternativa 4: Radix UI (solo primitives)

- **Pros:**
  - Accesibilidad excepcional
  - Unstyled (control absoluto)
  - Headless (logic only)
  - Ligero
- **Contras:**
  - **Requiere estilizar TODO manualmente** (mucho trabajo)
  - Sin componentes visuales prebuilt
  - Curva de aprendizaje alta
- **Por qué NO:** Demasiado bajo nivel para un template productivo. shadcn/ui YA está construido sobre Radix.

### Alternativa 5: Ant Design

- **Pros:**
  - Muy completo (200+ componentes)
  - Profesional para dashboards enterprise
  - Documentación exhaustiva
- **Contras:**
  - Look and feel muy reconocible (poco personalizable)
  - Bundle size grande
  - Menos moderno en comparación con opciones nuevas
- **Por qué NO:** Menos flexible. Estilo muy específico que no todos los proyectos quieren.

### Alternativa 6: shadcn/ui estilo "Default"

- **Pros:**
  - Mismo sistema, solo diferente styling
  - Más minimalista
- **Contras:**
  - Menos "pulido" visualmente
  - Menos contraste (puede afectar accessibility)
- **Por qué NO:** "New York" se ve más profesional y SaaS-ready out-of-the-box.

## Consecuencias

### Positivas ✅

1. **Copy-Paste Architecture (No Vendor Lock-in)**
   - Los componentes se copian a tu proyecto
   - Ownership completo del código
   - Customización sin límites
   - No hay abstracción que no puedas modificar

2. **Performance Óptima**
   - Sin runtime CSS (CSS estático vía Tailwind)
   - Tree-shakeable (solo importas lo que usas)
   - Bundle size mínimo por componente
   - Compatible 100% con React Server Components

3. **Accesibilidad Built-in**
   - Basado en Radix UI primitives (ARIA compliant)
   - Keyboard navigation
   - Screen reader support
   - Focus management

4. **Estilo Profesional "New York"**
   - Más sofisticado visualmente
   - Mejor contraste y legibilidad
   - Apariencia SaaS moderna
   - Fácil de personalizar (solo Tailwind classes)

5. **Ecosistema y DX**
   - CLI para instalar componentes: `npx shadcn@latest add button`
   - 40+ componentes disponibles
   - TypeScript first-class
   - Documentación excelente

6. **Composición Natural**
   - Componentes pequeños y composables
   - Patterns consistentes
   - Fácil de extender

### Negativas / Trade-offs ⚠️

1. **Mantenimiento Manual**
   - Los componentes copiados son TU responsabilidad
   - Updates de shadcn/ui no se aplican automáticamente
   - **Mitigación:** shadcn/ui es estable. Updates poco frecuentes. Podemos usar `shadcn diff` para ver cambios.

2. **Menos Componentes que Librerías Completas**
   - ~40 componentes vs 200+ de Ant Design
   - Componentes complejos (DataGrid, Calendar avanzado) no incluidos
   - **Mitigación:** Fácil agregar librerías especializadas cuando sea necesario (TanStack Table, react-day-picker, etc.)

3. **Curva de Aprendizaje de Radix**
   - Entender cómo funcionan primitives de Radix ayuda a customizar
   - Conceptos como "controlled" vs "uncontrolled" components
   - **Mitigación:** Documentación clara en shadcn/ui. Mayoría de casos de uso cubiertos con ejemplos.

4. **Dependencia de Radix UI**
   - Cada componente shadcn/ui depende de un primitive Radix
   - Breaking changes en Radix afectan componentes
   - **Mitigación:** Radix es estable y mature. Versionado pinned en package.json.

## Implementación

### Configuración:

```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york", // ← Estilo elegido
  "rsc": true, // ← RSC habilitado
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### Componentes Instalados:

Ver [components/ui/](../../../components/ui/) para la lista completa.

Destacados:

- **Forms**: Input, Select, Checkbox, Radio, Textarea
- **Data Display**: Card, Table, Badge, Avatar, Separator
- **Feedback**: Alert, Toast (Sonner), Dialog, Sheet, Drawer
- **Navigation**: Tabs, Breadcrumb, Pagination, Command
- **Overlays**: Popover, Tooltip, HoverCard, ContextMenu, DropdownMenu

### Agregar Nuevos Componentes:

```bash
npx shadcn@latest add [component-name]

# Ejemplo:
npx shadcn@latest add calendar
npx shadcn@latest add form
```

### Ejemplo de Uso:

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Título</CardTitle>
        <CardDescription>Descripción</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="default">Click me</Button>
      </CardContent>
    </Card>
  )
}
```

### Customización de Estilos:

```tsx
// Los componentes son TU código, modifícalos directamente
// components/ui/button.tsx

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors...',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        // ↑ Modifica esto para cambiar el estilo "default"
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // Agrega tus propias variants aquí:
        custom: 'bg-purple-500 text-white hover:bg-purple-600',
      },
      // ...
    },
  }
)
```

## Referencias

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [shadcn/ui GitHub](https://github.com/shadcn-ui/ui)
- [Radix UI Documentation](https://www.radix-ui.com)
- [New York Style Preview](https://ui.shadcn.com/themes)

## Notas Adicionales

### Por Qué "New York" > "Default"

El estilo "New York" ofrece:

- Borders más definidos (mejor definición visual)
- Radius más pronunciados (más moderno)
- Mejor contraste en estados hover/active
- Look más "enterprise/SaaS" vs minimalista

Si prefieres el estilo "Default":

1. Cambiar `"style": "default"` en [components.json](../../../components.json#L3)
2. Re-instalar componentes: `npx shadcn@latest add --all --overwrite`

### Componentes Adicionales

El template incluye componentes adicionales:

- **DataTable**: Implementación de TanStack Table ([components/custom/data-table/](../../../components/custom/data-table/))
- **Combobox**: Componente de selección con búsqueda (DiceUI) ([components/ui/combobox.tsx](../../../components/ui/combobox.tsx))

El DataTable es custom y sigue el patrón de shadcn/ui. El Combobox es de DiceUI instalado vía CLI de shadcn.

---

**Última actualización:** 2025-01-13
