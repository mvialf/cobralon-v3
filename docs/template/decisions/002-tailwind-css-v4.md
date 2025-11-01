# ADR-002: Tailwind CSS v4

## Estado

**Aceptado** | **Fecha:** 2025-01-13

## Decisión

Usar **Tailwind CSS v4.1.9** con **PostCSS** como sistema de styling del template.

## Contexto

Necesitábamos una solución de styling con buen DX, theming light/dark robusto, performance en producción y productividad para UIs profesionales. Dentro de Tailwind, elegimos **v4** sobre v3 por mejoras de performance (~2x build speed).

## Alternativa Principal

**CSS-in-JS (styled-components, Emotion):** Type-safe y co-located con componentes, pero **NO compatible con React Server Components** (runtime CSS degrada performance). Incompatible con arquitectura del template.

## Consecuencias

### Positivas ✅

- **DX superior:** Utility-first (sin salir del HTML), IntelliSense integrado, prototipado rápido
- **Theming robusto:** CSS variables nativas, light/dark mode con `@custom-variant dark`, compatible con `next-themes`
- **Performance:** v4 mejora ~2x build speed vs v3, PurgeCSS automático, zero runtime overhead (CSS estático)
- **Responsive:** Breakpoints predefinidos (`sm:`, `md:`, `lg:`), mobile-first, hover/focus states built-in

### Negativas ⚠️

**HTML verboso:** Muchas clases en elementos complejos.
**Mitigación:** Extraer componentes reutilizables, usar función `cn()` para composición condicional.

## Quick Start

**Uso básico con utility classes:**

```tsx
<div className="rounded-lg bg-background p-4 hover:bg-accent">
  <h1 className="text-2xl font-bold">Título</h1>
  <p className="text-muted-foreground">Descripción</p>
</div>
```

**Composición condicional con cn():**

```tsx
import { cn } from '@/lib/utils'
;<div
  className={cn('rounded-lg p-4', isActive && 'bg-primary text-primary-foreground', className)}
/>
```

**Theming (light/dark mode):**

CSS variables en [app/globals.css](../../../app/globals.css):

```css
@theme {
  --color-background: hsl(0, 0%, 100%);
  --color-foreground: hsl(240, 10%, 3.9%);
}

.dark {
  --color-background: hsl(240, 10%, 3.9%);
  --color-foreground: hsl(0, 0%, 98%);
}
```

**Responsive design:**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols */}
</div>
```

## Referencias

- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [Next.js + Tailwind Setup](https://nextjs.org/docs/app/building-your-application/styling/tailwind-css)

---

**Última actualización:** 2025-01-13
