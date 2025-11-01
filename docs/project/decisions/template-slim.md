# ADR-XXX: [Título Descriptivo - Decisión Técnica]

## Estado

**Aceptado** | **Fecha:** YYYY-MM-DD

## Decisión

[2-3 líneas: QUÉ decidimos usar en ESTE proyecto específico]

## Contexto

[4-6 líneas: Problema específico del proyecto Cobralon que necesitábamos resolver. Enfocarse en requisitos del negocio, no en justificar por qué NO otras alternativas]

## Alternativa Principal (opcional)

**[Nombre]:** [2-3 líneas explicando por qué NO se eligió. Solo incluir si aporta contexto crítico para este proyecto]

## Consecuencias

### Positivas ✅

1. **[Beneficio específico]:** [Descripción concreta, preferiblemente cuantificada]
2. **[Beneficio específico]:** [Descripción concreta para Cobralon]
3. **[Beneficio específico]:** [Máximo 5 beneficios]

### Negativas ⚠️

1. **[Trade-off específico]:** [Descripción del problema]
   - **Mitigación:** [Solución práctica implementada en Cobralon]
2. **[Trade-off específico]:** [Máximo 3-4 trade-offs]

## Quick Start

```bash
# Comandos clave (3-5 comandos específicos del proyecto)
npm run comando-principal
npm run comando-secundario
```

```typescript
// Código ejemplo funcional en contexto de Cobralon (5-15 líneas)
// Debe ser copy-paste funcional
import { ComponentePrincipal } from '@/lib/main'

const ejemplo = new ComponentePrincipal()
ejemplo.metodo()
```

## Referencias

- [Documentación Oficial](https://ejemplo.com/docs)
- [ADR del Template Relacionado](../../template/decisions/XXX-titulo.md) (si aplica)
- [Guía de Setup](../guides/nombre-guia.md) (si aplica)

---

**Última actualización:** YYYY-MM-DD

---

## Guía de Uso - Template Slim (Decisiones Técnicas)

### Usar este template para:

✅ **Decisiones de stack/herramientas** (ej: Pino logging, Neon DB)
✅ **Configuraciones técnicas** (ej: ESLint rules, TypeScript config)
✅ **Librerías y frameworks** (ej: Zod, TanStack Table)

### Longitud Objetivo:

- **Mínimo:** 50 líneas
- **Óptimo:** 80-120 líneas
- **Máximo:** 150 líneas (solo si absolutamente necesario)

### NO usar este template para:

❌ **Decisiones de modelado de datos** → Usar template-extended.md
❌ **Decisiones de arquitectura de negocio** → Usar template-extended.md
❌ **Decisiones de UX/producto** → Usar template-extended.md

### Secciones Obligatorias:

- ✅ Decisión
- ✅ Contexto
- ✅ Consecuencias (Positivas + Negativas con mitigación)
- ✅ Quick Start (código + comandos)
- ✅ Referencias

### Qué MANTENER:

- Información accionable para desarrolladores de Cobralon
- Código funcional específico del proyecto
- Trade-offs con mitigación implementada
- Referencias a ADRs del template (si complementa decisión)

### Qué ELIMINAR:

- Alternativas obvias o irrelevantes
- Justificaciones extensas de "por qué NO"
- Información duplicada de docs oficiales
- Más de 1-2 alternativas descartadas

### Checklist Pre-Commit:

- [ ] Longitud: 80-120 líneas ✅
- [ ] Responde "¿Cómo uso esto en Cobralon?" ✅
- [ ] Código ejemplo es funcional ✅
- [ ] Trade-offs incluyen mitigación ✅
- [ ] Referencias actualizadas ✅
- [ ] Sin alternativas obvias ✅
