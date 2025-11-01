# ADR-007: ESLint 9 + Prettier

## Estado

**Aceptado**

**Fecha:** 2025-10-17

## Contexto

El template originalmente **NO tenía linting configurado**, y peor aún, tenía configuración **extremadamente permisiva** en `next.config.mjs`:

```javascript
// ⚠️ CONFIGURACIÓN ORIGINAL PELIGROSA
{
  eslint: { ignoreDuringBuilds: true },      // Builds no fallan con errores de lint
  typescript: { ignoreBuildErrors: true },   // Builds no fallan con errores de tipo
}
```

**Impacto:** Los builds podían completarse exitosamente incluso con:

- Errores de TypeScript
- Errores de ESLint
- Código inconsistente
- Imports rotos

Esto es **inaceptable** para un template profesional que busca ser production-ready.

## Decisión

Implementar **ESLint 9.17.0** + **Prettier 3.4.2** con:

1. Configuración estricta pero pragmática
2. `ignoreDuringBuilds: false` (builds fallan con errores)
3. Prettier integrado con ESLint
4. Scripts para lint y format

## Alternativas Consideradas

### Alternativa 1: Solo Prettier (sin ESLint)

- **Pros:**
  - Más simple
  - Solo formatea, no valida lógica
  - Cero configuración
- **Contras:**
  - **No detecta errores de código** (unused vars, missing deps, etc.)
  - No enforce code quality, solo style
- **Por qué NO:** ESLint es necesario para detectar bugs potenciales.

### Alternativa 2: Standard JS

- **Pros:**
  - Zero config
  - Opinionado (sin debates de style)
  - Incluye formateador
- **Contras:**
  - Muy opinionado (sin semicolons, etc.)
  - Menos flexible que ESLint
  - No es industry standard en empresas
- **Por qué NO:** Preferimos flexibilidad de ESLint.

### Alternativa 3: Biome (antes Rome)

- **Pros:**
  - Escrito en Rust (muy rápido)
  - Linter + formatter en uno
  - Menos configuración
- **Contras:**
  - Relativamente nuevo
  - Ecosystem más pequeño
  - Menos plugins que ESLint
- **Por qué NO:** ESLint es más maduro y con más plugins.

### Alternativa 4: No usar linting (status quo original)

- **Contras:**
  - **Código inconsistente** entre desarrolladores
  - **Bugs no detectados** (unused vars, missing deps, etc.)
  - **Builds exitosos con errores** (debido a `ignoreDuringBuilds: true`)
- **Por qué NO:** Inaceptable para template profesional.

## Consecuencias

### Positivas ✅

1. **Código Consistente**
   - Prettier enforce estilo: semicolons, quotes, spacing, etc.
   - Todos los archivos siguen misma convención
   - Reduce noise en PRs

2. **Detección Temprana de Bugs**
   - ESLint detecta:
     - Unused variables
     - Missing React keys
     - Incorrect React hooks dependencies
     - Usar `<a>` en lugar de `<Link>` en Next.js
   - Ejemplo: Detectamos 4 errores críticos al activar linting

3. **Builds Seguros**

   ```javascript
   // next.config.mjs CORREGIDO
   {
     eslint: { ignoreDuringBuilds: false },    // ✅ Builds fallan con errores
     typescript: { ignoreBuildErrors: false }, // ✅ Builds fallan con type errors
   }
   ```

   - Imposible hacer deploy con errores
   - CI/CD más confiable

4. **DX Mejorada**
   - VSCode muestra errores en tiempo real
   - `npm run lint:fix` auto-corrige la mayoría de issues
   - `npm run format` formatea todo el proyecto

5. **Integración con Next.js**
   - Next.js incluye ESLint out-of-the-box
   - Rules específicas de Next.js:
     - `@next/next/no-html-link-for-pages` (usar `<Link>`)
     - `@next/next/no-img-element` (usar `<Image>`)

### Negativas / Trade-offs ⚠️

1. **Warnings Permisivos (por ahora)**

   ```json
   {
     "rules": {
       "prettier/prettier": "warn", // No error, solo warning
       "@typescript-eslint/no-unused-vars": "warn",
       "@typescript-eslint/no-explicit-any": "warn"
     }
   }
   ```

   - **Razón:** Template debe ser flexible. Usuarios pueden hacer strict después.
   - **Recomendación:** Cambiar a "error" en proyectos de producción.

2. **Tiempo Adicional en CI/CD**
   - Linting agrega ~10-30s al pipeline
   - **Mitigación:** Beneficio (detectar bugs) > costo (tiempo).

3. **Curva de Aprendizaje**
   - Desarrolladores nuevos deben aprender reglas
   - **Mitigación:** Errores tienen mensajes claros + links a docs.

## Implementación

### Archivos de Configuración

#### [.eslintrc.json](../../../.eslintrc.json)

```json
{
  "extends": ["next/core-web-vitals", "next/typescript", "prettier"],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "react/no-unescaped-entities": "off",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

#### [.prettierrc](../../../.prettierrc)

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

#### [.prettierignore](../../../.prettierignore)

```
.next/
out/
node_modules/
public/
*.md
package-lock.json
```

### Scripts en package.json

```json
{
  "scripts": {
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,css}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md,css}\""
  }
}
```

### Dependencias Instaladas

```json
{
  "devDependencies": {
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.2.3",
    "prettier": "^3.4.2"
  }
}
```

### Correcciones Realizadas

Al ejecutar `npm run lint` inicialmente, encontramos **4 errores críticos**:

1. **2x** `@next/next/no-html-link-for-pages` en [app-sidebar.tsx](../../../components/layout/app-sidebar.tsx) y header-nav.tsx
   - **Fix:** Reemplazar `<a href="/">` con `<Link href="/">`

2. **2x** `@typescript-eslint/no-empty-object-type` en archivos de componentes
   - **Fix:** Cambiar `interface Foo extends Bar {}` → `type Foo = Bar`

Después de corregir, el build pasa exitosamente ✅

**Nota:** El template anteriormente incluía componente autocomplete con errores de lint que fueron resueltos antes de su eliminación.

## Reglas Clave Explicadas

### 1. `no-unused-vars` (warn)

```typescript
// ❌ Warning
const unused = 5

// ✅ OK (prefijo con _)
const _unused = 5
```

### 2. `no-explicit-any` (warn)

```typescript
// ⚠️ Warning (pero permitido)
function foo(bar: any) { ... }

// ✅ Mejor
function foo(bar: unknown) { ... }
```

### 3. `@next/next/no-html-link-for-pages` (error)

```tsx
// ❌ Error
<a href="/about">About</a>

// ✅ Correcto
<Link href="/about">About</Link>
```

### 4. `prettier/prettier` (warn)

Prettier formatea automáticamente:

- Semicolons (off)
- Single quotes (on)
- Trailing commas (es5)
- Line width (100 chars)

## Workflow Recomendado

### Durante Desarrollo

VSCode con extensiones:

- **ESLint** - dbaeumer.vscode-eslint
- **Prettier** - esbenp.prettier-vscode

Settings:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Antes de Commit

```bash
npm run lint:fix  # Auto-fix lint errors
npm run format    # Format all files
npm run build     # Verify build passes
```

### En CI/CD (futuro)

```yaml
# .github/workflows/ci.yml
- run: npm run lint
- run: npm run format:check
- run: npm run build
```

## Decisiones Pendientes

- [ ] **Hacer reglas más estrictas**: Cambiar warnings a errors
- [ ] **Configurar Git hooks**: husky + lint-staged
- [ ] **Configurar CI/CD**: GitHub Actions para lint check

## Referencias

- [ESLint Documentation](https://eslint.org/docs/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Next.js ESLint](https://nextjs.org/docs/basic-features/eslint)
- [TypeScript ESLint](https://typescript-eslint.io/)

---

**Última actualización:** 2025-01-13
