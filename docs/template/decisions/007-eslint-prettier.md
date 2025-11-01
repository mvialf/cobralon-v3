# ADR-007: ESLint 9 + Prettier

## Decisión

Implementar **ESLint 9.37.0** + **Prettier 3.4.2** con configuración estricta y builds que fallan con errores.

## Contexto

El template originalmente **NO tenía linting** y tenía configuración peligrosa:
```javascript
// ⚠️ ANTES (PELIGROSO)
{ eslint: { ignoreDuringBuilds: true } }  // Builds OK con errores
```

**Problema:** Builds exitosos con errores de TypeScript, imports rotos y código inconsistente.

**Solución:** ESLint + Prettier con `ignoreDuringBuilds: false` (builds fallan con errores).

## Alternativa Principal

**Solo Prettier (sin ESLint):** Más simple, solo formatea.

**Por qué NO:** Prettier solo maneja estilo (semicolons, quotes). ESLint detecta bugs potenciales (unused vars, missing deps, incorrect hooks). Necesitamos ambos para calidad de código.

## Consecuencias

### Beneficios ✅

1. **Código consistente:** Prettier enforce estilo único. Mismo formato para todos los archivos. Reduce noise en PRs.

2. **Detección temprana de bugs:** ESLint detecta unused variables, missing React keys, incorrect hooks dependencies, usar `<a>` en lugar de `<Link>` en Next.js.

3. **Builds seguros:**
   ```javascript
   // ✅ AHORA (SEGURO)
   {
     eslint: { ignoreDuringBuilds: false },     // Builds fallan con errores
     typescript: { ignoreBuildErrors: false }   // Builds fallan con type errors
   }
   ```

4. **DX mejorada:** VSCode muestra errores en tiempo real. `npm run lint:fix` auto-corrige la mayoría de issues.

5. **Integración Next.js:** Rules específicas de Next.js (`@next/next/no-html-link-for-pages`, `@next/next/no-img-element`).

### Trade-offs ⚠️

1. **Warnings permisivos (por flexibilidad):**
   ```json
   {
     "prettier/prettier": "warn",  // No error, solo warning
     "@typescript-eslint/no-unused-vars": "warn",
     "@typescript-eslint/no-explicit-any": "warn"
   }
   ```
   - **Razón:** Template debe ser flexible. Cambiar a "error" en producción.

2. **Tiempo adicional en CI/CD:** Linting agrega ~10-30s al pipeline.
   - **Mitigación:** Beneficio (detectar bugs) > costo (tiempo).

## Quick Start

```bash
# Desarrollo
npm run lint           # Check errors
npm run lint:fix       # Auto-fix errors
npm run format         # Format all files
npm run format:check   # Check formatting

# Pre-commit (recomendado)
npm run lint:fix && npm run format

# Build (falla con errores)
npm run build
```

```json
// .eslintrc.json (configuración actual)
{
  "extends": ["next/core-web-vitals", "next/typescript", "prettier"],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }]
  }
}
```

```json
// .prettierrc (configuración actual)
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100
}
```

## Referencias

- [ESLint Documentation](https://eslint.org/docs/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Next.js ESLint](https://nextjs.org/docs/basic-features/eslint)

---

**Última actualización:** 2025-10-17
