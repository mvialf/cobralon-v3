# Archive de ADRs Originales

Este directorio contiene las **versiones originales completas** de los ADRs antes de la refactorización del 2025-11-01.

## ¿Por qué existe este directorio?

Los ADRs originales (300-500 líneas) fueron refactorizados a un formato "slim" (50-100 líneas) para mejorar la experiencia del usuario del template.

**Problema original:**

- ADRs muy largos (promedio 350 líneas)
- 50% del contenido sobre alternativas NO elegidas
- Confundía más que ayudaba
- Tiempo de lectura: 10-15 minutos

**Solución aplicada:**

- Refactorizar a formato "slim" (50-100 líneas)
- Enfoque en "cómo usar lo elegido" vs "por qué NO elegimos X"
- Tiempo de lectura: 3-5 minutos
- 80% contenido accionable

## Contenido de este directorio

**Versiones originales (backup):**

- `001-nextjs-15-app-router.md` (155 líneas)
- `002-tailwind-css-v4.md` (223 líneas)
- `003-shadcn-ui-new-york.md` (289 líneas)
- `004-layout-system-dos-capas.md` (311 líneas)
- `005-vitest-testing-library.md` (326 líneas)
- `007-eslint-prettier.md` (336 líneas)
- `008-prisma-neon.md` (494 líneas) ⚠️ El más verbose
- `009-authentication-options.md` (516 líneas) ⚠️ El más verbose
- `010-playwright-mcp.md` (496 líneas)
- `011-capture-dialog-pattern.md` (340 líneas)
- `README.md` (original)

**Total:** ~3500 líneas de documentación

## ¿Cuándo consultar este directorio?

### ✅ Consultar versiones originales cuando:

- Necesitas entender la historia completa de una decisión
- Quieres ver análisis detallado de alternativas
- Estás investigando por qué NO se eligió una tecnología específica
- Necesitas contexto histórico profundo

### ❌ NO necesitas este directorio para:

- Usar el template normalmente
- Entender cómo funciona una tecnología elegida
- Quick start o setup inicial
- Desarrollo día a día

## Relación con refactor

```
ANTES (versiones en .archive/)
├── ADR-008: 494 líneas
├── 50% sobre alternativas NO usadas
└── Tiempo lectura: 12 minutos

DESPUÉS (versiones en directorio padre)
├── ADR-008: ~80 líneas
├── 80% sobre lo que SÍ usamos
└── Tiempo lectura: 3 minutos
```

## Plan de refactorización

Ver detalles completos en: [`../REFACTORING-PLAN.md`](../REFACTORING-PLAN.md)

## Versionado en Git

Estas versiones originales están versionadas en Git. Si necesitas recuperar una versión original, puedes:

1. **Opción A:** Leer desde este directorio `.archive/`
2. **Opción B:** Usar Git history:
   ```bash
   git log --all --full-history -- docs/template/decisions/008-prisma-neon.md
   git show <commit-hash>:docs/template/decisions/008-prisma-neon.md
   ```

## Eliminación futura

Este directorio puede ser eliminado en el futuro (6-12 meses) si:

- Nadie consulta estas versiones originales
- Las versiones slim se consolidan como estándar
- Ocupan espacio innecesario en el repositorio

Por ahora se mantienen como referencia histórica.

---

**Fecha de creación:** 2025-11-01
**Refactorización:** [REFACTORING-PLAN.md](../REFACTORING-PLAN.md)
**Versiones actuales:** `../` (directorio padre)
