# ADR-003: shadcn/ui con Estilo "New York"

## Estado

**Aceptado** | **Fecha:** 2025-01-13

## Decisión

Usar **shadcn/ui** como sistema de componentes con el estilo **"New York"**.

## Contexto

Necesitábamos componentes UI profesionales, accesibles (ARIA), personalizables (sin vendor lock-in), compatibles con RSC y productivos. shadcn/ui ofrece dos estilos: "Default" (minimalista) y "New York" (profesional, mejor contraste). Elegimos **New York** por apariencia SaaS-ready.

## Alternativa Principal

**Material UI (MUI) / Chakra UI:** Ecosistemas maduros con muchos componentes, pero con bundle size enorme (500kb+), CSS-in-JS runtime (incompatible con RSC sin workarounds) y estilos muy opinados difíciles de customizar. NO elegidos por performance inferior y vendor lock-in.

## Consecuencias

### Positivas ✅

- **Copy-paste architecture:** Componentes se copian a tu proyecto. Ownership completo, customización sin límites, zero vendor lock-in
- **Performance óptima:** Sin runtime CSS (estático vía Tailwind), tree-shakeable, bundle mínimo, 100% compatible con RSC
- **Accesibilidad:** Basado en Radix UI primitives (ARIA compliant), keyboard navigation, screen readers
- **DX excepcional:** CLI (`npx shadcn@latest add [component]`), 40+ componentes, TypeScript first-class

### Negativas ⚠️

**Mantenimiento manual:** Componentes copiados son TU responsabilidad. Updates no se aplican automáticamente.
**Mitigación:** shadcn/ui es estable, updates poco frecuentes. Usar `shadcn diff` para ver cambios.

## Quick Start

**Agregar nuevos componentes:**

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

**Uso básico:**

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Click me</Button>
        <Button variant="destructive">Delete</Button>
      </CardContent>
    </Card>
  )
}
```

**Customización (eres dueño del código):**

```tsx
// components/ui/button.tsx - EDITA DIRECTAMENTE
const buttonVariants = cva('...', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      // Agrega tus propias variants:
      custom: 'bg-purple-500 text-white hover:bg-purple-600',
    },
  },
})
```

**Componentes incluidos en template:**

Forms: Button, Input, Select, Checkbox, Textarea
Data: Card, Table, Badge, Avatar
Feedback: Alert, Dialog, Toast (Sonner)
Navigation: Tabs, Breadcrumb, Pagination

Ver lista completa: [components/ui/](../../../components/ui/)

## Referencias

- [shadcn/ui Docs](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)

---

**Última actualización:** 2025-01-13
