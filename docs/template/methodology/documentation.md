# Documentación - Metodología ADRs + Implementation Log

Guía para documentar decisiones y cambios en proyectos basados en este template.

## Sistema de Documentación del Template

Este template usa un sistema dual de documentación:

1. **ADRs** (Architecture Decision Records) - Decisiones puntuales e inmutables
2. **Implementation Log** - Timeline cronológico con contexto agregado

## 1. ADRs (Architecture Decision Records)

### ¿Qué son?

Documentos que capturan **decisiones arquitecturales importantes** con contexto, alternativas consideradas y consecuencias.

### Cuándo Crear un ADR

✅ Crea un ADR cuando:

- Eliges entre tecnologías competidoras (React vs Vue)
- Decides una arquitectura o patrón importante
- Introduces una dependencia mayor
- Cambias una decisión arquitectural anterior

❌ NO crees ADR para:

- Cambios triviales de código
- Bug fixes sin impacto arquitectural
- Decisiones obvias sin alternativas

### Template de ADR

Ver [decisions/README.md](../decisions/README.md) para el template completo.

**Estructura básica:**

```markdown
# ADR-XXX: Título

## Estado

Aceptado | Propuesto | Deprecado

## Contexto

¿Por qué esta decisión?

## Decisión

¿Qué decidimos?

## Alternativas Consideradas

¿Qué otras opciones evaluamos y por qué NO?

## Consecuencias

Positivas ✅ y Negativas ⚠️ (con mitigación)
```

### Flujo de Trabajo ADR

1. Crea ADR en estado "Propuesto"
2. Discute con equipo (si aplica)
3. Marca como "Aceptado" cuando se decida
4. Implementa la decisión
5. Referencia el ADR en commits/PRs

## 2. Implementation Log

### ¿Qué es?

Un registro cronológico de **implementaciones significativas** con:

- Contexto de por qué se implementó
- Referencias a ADRs
- Beneficios cuantificados
- Archivos modificados
- Validación técnica

### Cuándo Agregar Entrada

✅ Documenta cuando:

- Implementas una feature completa
- Realizas refactoring significativo
- Migras a nueva tecnología/versión
- Resuelves problema arquitectural complejo

❌ NO documentes:

- Cambios triviales (<5 líneas)
- Bug fixes simples
- Cambios puramente estéticos

### Template de Entrada

```markdown
### [Emoji] Título Descriptivo

- **Status:** ✅ Complete | **Date:** YYYY-MM-DD | **Impact:** High/Medium/Low
- **ADR:** [ADR-XXX](../decisions/XXX-titulo.md)
- **Benefits:** (SIEMPRE cuantificados)
  - Reducción X% en tiempo
  - Y líneas de código eliminadas
  - Mejora Z en métrica
- **Implementación:** ✅ Completada
  - Fase 1: Descripción
  - Fase 2: Descripción
- **Archivos modificados:**
  - `ruta/archivo.ts` - Qué cambió
- **Validación:** ✅ Tests: Pass | Build: Success
```

## 3. Uso en Tu Proyecto

### Setup Inicial

1. Crea estructura:

```bash
mkdir -p docs/project/decisions docs/project/implementation
touch docs/project/implementation/2025-current.md
```

2. Copia template ADR desde [decisions/README.md](../decisions/README.md)

### Workflow Recomendado

#### Para Decisiones Grandes

1. **Propuesta**
   - Crea ADR en `docs/project/decisions/`
   - Marca como "Propuesto"
   - Discute con equipo

2. **Aprobación**
   - Actualiza ADR a "Aceptado"
   - Documenta decisión final

3. **Implementación**
   - Implementa el cambio
   - Agrega entrada en `implementation.md`
   - Referencia el ADR

4. **Commit**
   - Menciona ADR en commit message:

     ```
     feat: implementar autenticación con NextAuth

     Implementa decisión de ADR-005.
     Ver docs/project/decisions/005-nextauth-auth.md
     ```

#### Para Implementaciones Sin ADR

Si es importante pero no requiere ADR:

1. Documenta directamente en `implementation.md`
2. Incluye contexto suficiente (por qué, qué alternativas, beneficios)

## 4. Ejemplos del Template

### ADRs de Este Template

Ver [decisions/](../decisions/):

- [ADR-001: Next.js 14 + App Router](../decisions/001-nextjs-14-app-router.md)
- [ADR-002: Tailwind CSS v4](../decisions/002-tailwind-css-v4.md)
- [ADR-003: shadcn/ui New York](../decisions/003-shadcn-ui-new-york.md)
- [ADR-004: Layout System](../decisions/004-layout-system-tres-capas.md)

### Implementation Log de Ejemplo

Ver [docs/project/implementation.md](../../project/implementation.md) (cuando esté creado).

## 5. Herramientas

### Buscar ADRs por Tema

```bash
grep -r "GraphQL" docs/project/decisions/
```

### Listar Todos los ADRs

```bash
ls -1 docs/project/decisions/*.md
```

### Ver Últimas Implementaciones

```bash
head -n 50 docs/project/implementation.md
```

## 6. Mejores Prácticas

### ✅ DO

- Sé conciso pero completo
- Cuantifica beneficios cuando sea posible
- Documenta el "por qué", no solo el "qué"
- Actualiza docs cuando cambies decisiones
- Referencia ADRs en commits/PRs

### ❌ DON'T

- No documentes TODO (genera ruido)
- No dupliques git log (debe agregar valor)
- No uses formato rígido inflexible (adapta)
- No hagas documentación obligatoria para PRs (crea fricción)

## 7. Cuándo Simplificar

Si encuentras que:

- Nadie lee los ADRs (0 consultas en 6 meses)
- Proceso toma >30 min por entrada
- Equipo resiste culturalmente

**Acción:** Simplifica o discontinúa. Documentación que no se usa es deuda.

## Ver También

- [ADRs del Template](../decisions/) - Ejemplos reales
- [Workflow](workflow.md) - Proceso de desarrollo
- [Testing](testing.md) - Estrategia de testing
- [Patterns](patterns/README.md) - Code patterns
