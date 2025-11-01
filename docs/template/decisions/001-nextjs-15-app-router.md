# ADR-001: Next.js 15 con App Router

## Estado

**Aceptado** | **Fecha:** 2025-10-17

## Decisión

Usar **Next.js 15.5.6** con **App Router** como framework base del template SaaS.

## Contexto

Necesitábamos un framework React moderno con Server Components, routing file-based, ecosistema maduro y producción-ready. Dentro de Next.js, elegimos **App Router** sobre Pages Router (legacy).

## Alternativa Principal

**Pages Router:** Más estable pero legacy, sin soporte nativo de React Server Components.
NO elegido: App Router es el futuro de Next.js. Usar Pages Router sería deuda técnica desde día 1.

## Consecuencias

### Positivas ✅

- **Performance:** React Server Components reducen bundle size, menos JS al cliente, streaming SSR
- **DX excepcional:** File-based routing (cero config), TypeScript first-class, hot reload rápido
- **SEO:** SSR por defecto, Metadata API integrada
- **Future-proof:** App Router es la dirección oficial de Next.js y React

### Negativas ⚠️

**Curva de aprendizaje:** Requiere entender Server vs Client Components.
**Mitigación:** Template incluye documentación clara en [patterns/](../methodology/patterns/).

**⚠️ CRÍTICO - Build permisivo por defecto:**

```javascript
// next.config.mjs (CAMBIAR EN PRODUCCIÓN)
{
  eslint: { ignoreDuringBuilds: true },    // ⚠️ Builds NO fallan con errores
  typescript: { ignoreBuildErrors: true }, // ⚠️ Builds NO fallan con tipos
}
```

**Acción requerida:** Cambiar a `false` antes de deploy. Ver [stack.md](../architecture/stack.md).

## Quick Start

```bash
# Crear nueva página
# app/dashboard/page.tsx
export default function DashboardPage() {
  return <div>Mi Dashboard</div>
}

# Server Component por defecto ✅
# Para Client Component:
"use client"
import { useState } from 'react'

export default function InteractivePage() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

**Path aliases configurados:**

```typescript
import { Button } from '@/components/ui/button' // ✅
import AppLayout from '@/components/layout/app-layout' // ✅
```

## Referencias

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)

---

**Última actualización:** 2025-10-17
