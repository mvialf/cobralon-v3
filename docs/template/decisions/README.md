# Architecture Decision Records (ADRs)

Este directorio contiene los **Architecture Decision Records (ADRs)** del template SaaS.

## ¿Qué son los ADRs?

Los ADRs son documentos que capturan **decisiones arquitecturales importantes** con su contexto, razonamiento y consecuencias. No son simplemente logs de cambios, sino **memoria técnica** del proyecto.

### ADRs responden:

- ❓ **¿Por qué existe este código?** → Contexto arquitectural
- 🤔 **¿Qué alternativas se consideraron?** → Opciones descartadas y por qué
- ✅ **¿Qué problemas resolvió?** → Beneficios cuantificados
- 📚 **¿Dónde está el proceso documentado?** → Links a implementación

### ADRs NO son:

- ❌ Un git log (eso ya existe en git)
- ❌ Documentación de código (eso va en comments/docs)
- ❌ Un changelog de versiones (eso va en CHANGELOG.md)

---

## Template de ADR

Cada ADR sigue este formato:

```markdown
# ADR-XXX: Título Descriptivo de la Decisión

## Estado

[Propuesto | Aceptado | Deprecado | Reemplazado por ADR-YYY]

**Fecha:** YYYY-MM-DD

## Contexto

¿Qué problema o necesidad motivó esta decisión?
¿Qué constraints o requirements existían?

## Decisión

¿Qué decidimos hacer? (clara y concisa)

## Alternativas Consideradas

¿Qué otras opciones evaluamos?

### Alternativa 1: [Nombre]

- **Pros:** ...
- **Contras:** ...
- **Por qué NO:** ...

### Alternativa 2: [Nombre]

- **Pros:** ...
- **Contras:** ...
- **Por qué NO:** ...

## Consecuencias

### Positivas ✅

- Beneficio 1 (cuantificado si es posible)
- Beneficio 2
- Beneficio 3

### Negativas / Trade-offs ⚠️

- Trade-off 1 (y cómo lo mitigamos)
- Trade-off 2
- Limitación conocida

## Implementación

- **Commits relevantes:** `hash1`, `hash2`
- **Archivos principales:** `path/to/file.ts`, `path/to/config.json`
- **Documentación:** [Link a docs relacionadas]

## Referencias

- Link a issue/PR
- Documentación oficial
- Artículos/recursos que influyeron en la decisión
```

---

## ADRs de Este Template

| ADR                                    | Título                    | Estado   | Fecha      |
| -------------------------------------- | ------------------------- | -------- | ---------- |
| [001](001-nextjs-14-app-router.md)     | Next.js 14 + App Router   | Aceptado | 2025-01-XX |
| [002](002-tailwind-css-v4.md)          | Tailwind CSS v4           | Aceptado | 2025-01-XX |
| [003](003-shadcn-ui-new-york.md)       | shadcn/ui New York Style  | Aceptado | 2025-01-XX |
| [004](004-layout-system-tres-capas.md) | Sistema de Layout 3 Capas | Aceptado | 2025-01-XX |

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
