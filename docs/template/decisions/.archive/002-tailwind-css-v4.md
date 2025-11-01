# ADR-002: Tailwind CSS v4

## Estado

**Aceptado**

**Fecha:** 2025-01-13

## Contexto

Necesitábamos elegir una solución de styling para el template que fuera:

- Rápida de escribir (DX)
- Consistente y escalable
- Con buen soporte para theming (light/dark mode)
- Productiva para construir UIs profesionales
- Con buena performance en producción

Además, dentro de Tailwind debíamos decidir:

- **Tailwind v3** (stable, amplia adopción)
- **Tailwind v4** (nueva major version, con mejoras)

## Decisión

Usar **Tailwind CSS v4.1.9** con **PostCSS** como sistema de styling del template.

## Alternativas Consideradas

### Alternativa 1: Tailwind CSS v3

- **Pros:**
  - Versión estable y ampliamente adoptada
  - Más plugins y recursos de terceros
  - Menos riesgo de bugs
- **Contras:**
  - No incluye mejoras de performance de v4
  - No tiene las nuevas features de v4
  - Eventualmente quedará deprecada
- **Por qué NO:** v4 está stable y es el futuro. Early adoption nos da ventaja técnica sin riesgo significativo.

### Alternativa 2: CSS Modules

- **Pros:**
  - Scoping automático
  - Sin clases utilitarias (más tradicional)
  - No requiere aprender sintaxis nueva
- **Contras:**
  - Más verboso (archivos separados)
  - Menos DX (más context switching)
  - Dificulta theming dinámico
  - Requiere naming conventions manuales
- **Por qué NO:** DX inferior a Tailwind. Menos productivo para templates.

### Alternativa 3: CSS-in-JS (Emotion, styled-components)

- **Pros:**
  - Co-location de estilos con componentes
  - Props dinámicos fáciles
  - Type-safety con TypeScript
- **Contras:**
  - **No compatible con React Server Components** (runtime CSS)
  - Degrada performance (CSS generado en runtime)
  - Mayor bundle size
- **Por qué NO:** Incompatible con la arquitectura Server Components de Next.js App Router.

### Alternativa 4: Vanilla CSS con variables

- **Pros:**
  - Cero dependencias
  - Control absoluto
  - Performance óptima
- **Contras:**
  - Extremadamente verbose
  - Sin utilidades predefinidas
  - Requiere naming conventions estrictas
  - Dificulta consistencia en equipos
- **Por qué NO:** Demasiado bajo nivel para un template productivo.

### Alternativa 5: UnoCSS

- **Pros:**
  - Más rápido que Tailwind
  - API compatible con Tailwind
  - Más features out-of-the-box
- **Contras:**
  - Comunidad más pequeña
  - Menos plugins de terceros
  - Menos familiar para desarrolladores
- **Por qué NO:** Tailwind tiene mayor adopción. Para opensource, preferimos lo más conocido.

## Consecuencias

### Positivas ✅

1. **Developer Experience Superior**
   - Utility-first: Escribes estilos sin salir del HTML
   - IntelliSense integrado con extensión VSCode
   - No requiere naming conventions complejas
   - Prototipado rápido

2. **Theming Robusto**
   - CSS variables nativas integradas
   - Light/Dark mode con `@custom-variant dark`
   - Configuración en [app/globals.css](../../../app/globals.css#L6-L68)
   - Compatible con `next-themes` out-of-the-box

3. **Performance en Producción**
   - Tailwind v4 mejora ~2x la build speed vs v3
   - PurgeCSS automático (solo estilos usados)
   - Minificación agresiva
   - Zero runtime overhead (CSS estático)

4. **Ecosistema Maduro**
   - Plugins oficiales (`tailwindcss-animate`)
   - shadcn/ui totalmente compatible
   - Amplia documentación y recursos

5. **Responsive por Defecto**
   - Breakpoints predefinidos (`sm:`, `md:`, `lg:`, etc.)
   - Mobile-first approach
   - Hover/Focus states built-in

### Negativas / Trade-offs ⚠️

1. **Early Adoption de v4**
   - v4 es relativamente nuevo (lanzado 2024)
   - Algunos plugins de terceros pueden no ser compatibles
   - **Mitigación:** Documentamos versiones exactas de plugins en [stack.md](../architecture/stack.md)

2. **Curva de Aprendizaje**
   - Sintaxis utility-first puede ser extraña inicialmente
   - Requiere memorizar nombres de clases
   - **Mitigación:** IntelliSense + [documentación oficial](https://tailwindcss.com/docs)

3. **HTML "Verboso"**
   - Muchas clases en elementos complejos
   - Puede afectar legibilidad
   - **Mitigación:** Extraer componentes reutilizables, usar función `cn()` para composición

4. **Dependencia de PostCSS**
   - Requiere paso de build adicional
   - Configuración específica en Next.js
   - **Mitigación:** Next.js soporta PostCSS nativamente, configuración ya incluida

## Implementación

### Archivos principales:

- [app/globals.css](../../../app/globals.css) - Estilos globales + CSS variables para theming
- [tailwind.config.ts](../../../tailwind.config.ts) - Configuración de Tailwind (si existe)
- [postcss.config.mjs](../../../postcss.config.mjs) - Configuración de PostCSS

### CSS Variables para Theming:

```css
/* app/globals.css */
@import 'tailwindcss';

@custom-variant dark (&:is(.dark *));

@theme {
  /* Light mode */
  --color-background: hsl(0, 0%, 100%);
  --color-foreground: hsl(240, 10%, 3.9%);
  /* ... */
}

.dark {
  /* Dark mode overrides */
  --color-background: hsl(240, 10%, 3.9%);
  --color-foreground: hsl(0, 0%, 98%);
  /* ... */
}
```

### Package.json:

```json
{
  "dependencies": {
    "tailwindcss": "4.1.9",
    "@tailwindcss/postcss": "4.1.9",
    "tailwindcss-animate": "1.0.7"
  }
}
```

### Ejemplo de uso con cn():

```tsx
import { cn } from '@/lib/utils'
;<div className={cn('rounded-lg bg-background p-4', isActive && 'border-primary', className)} />
```

## Referencias

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS v4 Release Notes](https://tailwindcss.com/blog/tailwindcss-v4-alpha)
- [Next.js + Tailwind CSS Setup](https://nextjs.org/docs/app/building-your-application/styling/tailwind-css)
- [CSS Variables for Theming](https://tailwindcss.com/docs/customizing-colors#using-css-variables)

## Notas Adicionales

### Migración futura a v5 (cuando exista)

La migración a versiones futuras de Tailwind es generalmente simple:

1. Actualizar `package.json`
2. Revisar breaking changes en changelog
3. Ejecutar codemod si está disponible
4. Actualizar configuración si es necesario

### Plugins Recomendados

Ya incluidos en el template:

- `tailwindcss-animate` - Animaciones predefinidas
- `tw-animate-css` - Más animaciones CSS

Considerar para proyectos específicos:

- `@tailwindcss/typography` - Estilos para contenido editorial
- `@tailwindcss/forms` - Estilos mejorados para formularios
- `@tailwindcss/container-queries` - Container queries support

---

**Última actualización:** 2025-01-13
