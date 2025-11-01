# Architecture Decision Records (ADRs)

Este directorio contiene los **Architecture Decision Records (ADRs)** del template SaaS.

## ¿Qué son los ADRs?

Los ADRs son documentos que capturan **decisiones arquitecturales importantes** con su contexto, consecuencias y cómo usarlas. No son git log ni changelog, sino **memoria técnica práctica** del proyecto.

### ADRs responden:

- ❓ **¿Qué decidimos y por qué?** → Decisión y contexto breve
- 🚀 **¿Cómo lo uso?** → Quick Start con ejemplos prácticos
- ✅ **¿Qué impacto tiene?** → Consecuencias (beneficios + trade-offs)
- 🔗 **¿Dónde aprendo más?** → Referencias oficiales

### ADRs NO son:

- ❌ Justificaciones exhaustivas de por qué NO usar alternativas
- ❌ Git log (ya existe en git)
- ❌ Changelog de versiones (va en CHANGELOG.md)

---

## Template de ADR

### Versión Slim (50-120 líneas) - Predeterminada

Ver [template-slim.md](template-slim.md) para el template completo.

```markdown
# ADR-XXX: Título

## Estado

**Aceptado** | **Fecha:** YYYY-MM-DD

## Decisión

¿Qué decidimos? (1-2 líneas)

## Contexto

¿Por qué? Contexto breve (2-3 líneas)

## Alternativa Principal (opcional)

**[Nombre]:** Breve descripción + por qué NO (2-3 líneas MAX)

## Consecuencias

### Positivas ✅

- Beneficio 1 (cuantificado si es posible)
- Beneficio 2

### Negativas ⚠️

**Trade-off:** Descripción + mitigación (2-3 líneas)

## Quick Start

Código/ejemplos prácticos de cómo usar esto

## Referencias

- [Docs oficiales](url)
```

**Target:** 50-120 líneas | **Tiempo de lectura:** 3-5 minutos

---

## ADRs de Este Template

| ADR                                   | Título                                | Líneas | Tipo       | Estado   |
| ------------------------------------- | ------------------------------------- | ------ | ---------- | -------- |
| [001](001-nextjs-15-app-router.md)    | Next.js 15 + App Router               | 80     | Slim ⚡    | Aceptado |
| [002](002-tailwind-css-v4.md)         | Tailwind CSS v4                       | 87     | Slim ⚡    | Aceptado |
| [003](003-shadcn-ui-new-york.md)      | shadcn/ui New York Style              | 95     | Slim ⚡    | Aceptado |
| [004](004-layout-system-dos-capas.md) | Sistema de Layout 2 Capas             | 97     | Slim ⚡    | Aceptado |
| [005](005-vitest-testing-library.md)  | Vitest + Testing Library              | 117    | Slim ⚡    | Aceptado |
| [007](007-eslint-prettier.md)         | ESLint 9 + Prettier                   | 110    | Slim ⚡    | Aceptado |
| [008](008-prisma-neon.md)             | Prisma + Neon PostgreSQL              | 98     | Slim ⚡    | Aceptado |
| [009](009-authentication-options.md)  | No Incluir Auth por Defecto (+ Guía)  | 515    | Extenso 📚 | Aceptado |
| [010](010-playwright-mcp.md)          | Playwright MCP + @playwright/test     | 117    | Slim ⚡    | Aceptado |
| [011](011-capture-dialog-pattern.md)  | Capture Dialog Pattern (Experimental) | 154    | Slim ⚡    | Aceptado |

**Promedio ADRs Slim:** 106 líneas | **Rango objetivo:** 50-120 líneas

---

## Cuándo Hacer ADR Largo vs Corto

### ADR Slim (50-120 líneas) - PREDETERMINADO ⚡

Usa ADR slim para **decisiones ya tomadas** donde necesitas documentar:

- ✅ **Qué decidiste** y contexto breve
- ✅ **Cómo usarlo** (Quick Start con código)
- ✅ **Impacto práctico** (consecuencias)
- ✅ **0-1 alternativa principal** mencionada brevemente

**Ejemplos:** Elección de framework (Next.js), librería de estilos (Tailwind), sistema de componentes (shadcn/ui)

**Filosofía:** Focus en "cómo usar lo elegido", NO en justificar exhaustivamente por qué NO otras opciones.

### ADR Extenso (200-400 líneas) - SOLO CASOS ESPECIALES 📚

Usa ADR extenso SOLO cuando el ADR es **guía de comparación** para usuarios:

- ✅ **Usuario debe elegir** entre múltiples opciones (ej: Stack Auth vs NextAuth vs Clerk)
- ✅ **Comparación detallada** es el valor principal del documento
- ✅ **Quick comparison table** al inicio (decisión rápida)
- ✅ **Secciones detalladas** para quien necesite profundizar

**Ejemplos en este template:**

- [ADR-009: Authentication Options](009-authentication-options.md) - Usuario debe elegir proveedor de auth

**⚠️ Importante:** Si TÚ ya decidiste (no el usuario), usa ADR Slim. Los ADRs extensos son **guías de comparación**, no justificaciones.

---

## Cómo Usar ADRs en Tu Proyecto

### Cuándo Crear un ADR

Crea un ADR cuando:

- ✅ Eliges entre tecnologías competidoras (React vs Vue, REST vs GraphQL)
- ✅ Decides una arquitectura o patrón importante
- ✅ Cambias una decisión arquitectural anterior
- ✅ Introduces una dependencia mayor al proyecto
- ✅ La decisión tiene impacto en múltiples partes del sistema

NO crees un ADR para:

- ❌ Cambios triviales de código
- ❌ Bug fixes sin impacto arquitectural
- ❌ Decisiones obvias sin alternativas reales
- ❌ Cambios puramente estéticos

### Flujo de Trabajo

1. **Crea el ADR** en estado "Propuesto"
2. **Discute con el equipo** (si aplica)
3. **Actualiza a "Aceptado"** cuando se decide
4. **Implementa** la decisión
5. **Referencia el ADR** en PRs/commits relevantes

### Numeración

- ADRs se numeran secuencialmente: `001`, `002`, `003`, etc.
- Una vez creado, el número NO cambia (inmutable)
- Si una decisión se revierte, crea un nuevo ADR que reemplace al anterior

---

## Beneficios de Usar ADRs

### Para Ti (futuro)

- 🧠 Recordarás POR QUÉ tomaste decisiones hace 6 meses
- 🔍 Buscarás contexto rápidamente sin explorar git log
- 🚫 Evitarás repetir errores del pasado

### Para Tu Equipo

- 👥 Onboarding más rápido (nuevos devs entienden el "por qué")
- 🤝 Decisiones transparentes y documentadas
- 🔄 Facilita cambiar decisiones con contexto completo

### Para Proyectos Opensource

- 📖 Contribuidores entienden la arquitectura
- 💬 Menos preguntas repetitivas sobre "¿por qué X?"
- ✨ Credibilidad: Muestra proceso de pensamiento técnico

---

## Herramientas

### Crear un nuevo ADR

```bash
# Manualmente
touch docs/template/decisions/005-mi-decision.md
# Copia el template de arriba
```

### Buscar ADRs por tema

```bash
grep -r "GraphQL" docs/template/decisions/
```

### Listar todos los ADRs

```bash
ls docs/template/decisions/*.md
```

---

## Referencias Externas

- [ADR GitHub Org](https://adr.github.io/) - Recursos y ejemplos
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) - Artículo original de Michael Nygard
- [ADR Tools](https://github.com/npryce/adr-tools) - CLI para gestionar ADRs

---

**Usa ADRs en tu proyecto para capturar el "por qué" de tus decisiones técnicas.**
