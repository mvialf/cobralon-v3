# ADR-001: Next.js 15 con App Router

## Estado

**Aceptado**

**Fecha:** 2025-10-17

## Contexto

Necesitábamos elegir un framework React para el template SaaS que fuera:

- Moderno y con futuro a largo plazo
- Con soporte para Server Components (mejor performance)
- Con routing integrado y file-based
- Con ecosistema maduro y buena documentación
- Producción-ready con DX excepcional

Además, dentro de Next.js debíamos decidir entre:

- **Pages Router** (legacy, más estable)
- **App Router** (nuevo, future-proof, con RSC)

## Decisión

Usar **Next.js 15.5.6** con **App Router** como base del template.

## Alternativas Consideradas

### Alternativa 1: Next.js con Pages Router

- **Pros:**
  - Más estable y maduro
  - Más recursos y ejemplos en la comunidad
  - Menos breaking changes
- **Contras:**
  - No soporta React Server Components nativamente
  - Es el approach legacy (Next.js 13+ recomienda App Router)
  - Peor performance (más JavaScript en el cliente)
- **Por qué NO:** El futuro de Next.js es App Router. Usar Pages Router sería crear deuda técnica desde día 1.

### Alternativa 2: Remix

- **Pros:**
  - Excelente manejo de data loading
  - Web standards-first approach
  - Buen DX
- **Contras:**
  - Ecosistema más pequeño que Next.js
  - Menor cantidad de recursos y templates
  - Requiere más configuración para deploy (comparado con Vercel + Next.js)
- **Por qué NO:** Next.js tiene mayor adopción, más recursos, y mejor integración con el ecosistema React.

### Alternativa 3: Vite + React Router

- **Pros:**
  - Extremadamente rápido en desarrollo
  - Altamente configurable
  - Sin opiniones fuertes sobre arquitectura
- **Contras:**
  - No incluye SSR out-of-the-box
  - Requiere más setup manual
  - No soporta React Server Components sin configuración compleja
- **Por qué NO:** Demasiado bajo nivel para un template SaaS. Queremos opiniones (DX) incluidas.

## Consecuencias

### Positivas ✅

1. **Performance superior**
   - React Server Components reducen bundle size
   - Menos JavaScript enviado al cliente
   - Streaming SSR para mejor TTFB (Time To First Byte)

2. **Developer Experience**
   - File-based routing (cero configuración)
   - Colocation de lógica con páginas
   - TypeScript first-class support
   - Hot reload rápido

3. **SEO y accesibilidad**
   - SSR por defecto
   - Metadata API para SEO
   - Mejor indexación en buscadores

4. **Ecosistema y soporte**
   - Mayor comunidad de Next.js
   - Vercel (creadores) provee hosting optimizado
   - Amplia documentación y ejemplos

5. **Future-proof**
   - App Router es el futuro de Next.js
   - React Server Components es la dirección de React
   - Actualizaciones y features nuevas irán a App Router

### Negativas / Trade-offs ⚠️

1. **Curva de aprendizaje de App Router**
   - Diferente mental model vs Pages Router
   - Requiere entender Server vs Client Components
   - **Mitigación:** Documentación clara en este template sobre cuándo usar cada uno

2. **Algunos paquetes de terceros no son compatibles con RSC**
   - Librerías que usan APIs del navegador no funcionan en Server Components
   - **Mitigación:** Wrappear en Client Components cuando sea necesario

3. **Build permisivo por defecto**
   - Configuramos `ignoreBuildErrors: true` en [next.config.mjs](../../../next.config.mjs#L6-L7)
   - **Impacto:** Los builds no fallan con errores de tipo/lint
   - **Mitigación:** Documentado en [stack.md](../architecture/stack.md). Los usuarios deben cambiarlo en producción.

## Implementación

### Archivos principales:

- [next.config.mjs](../../../next.config.mjs) - Configuración de Next.js
- [app/layout.tsx](../../../app/layout.tsx) - Root layout con ThemeProvider
- [app/page.tsx](../../../app/page.tsx) - Homepage
- [tsconfig.json](../../../tsconfig.json#L22-L23) - Path aliases configurados

### Configuración clave:

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true }, // ⚠️ Cambiar en producción
  typescript: { ignoreBuildErrors: true }, // ⚠️ Cambiar en producción
  images: { unoptimized: true }, // ⚠️ Configurar CDN en producción
}
```

### Package.json:

```json
{
  "dependencies": {
    "next": "^15.5.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  }
}
```

## Referencias

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [React Server Components Explained](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)
- [Vercel Next.js Deployment](https://vercel.com/docs/frameworks/nextjs)

---

**Última actualización:** 2025-01-13
