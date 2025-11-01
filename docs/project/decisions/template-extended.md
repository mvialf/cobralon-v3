# ADR-XXX: [Título Descriptivo - Decisión de Negocio/Arquitectura]

## Estado

**Aceptado** | **Fecha:** YYYY-MM-DD

## Quick Start (Cómo Usar)

> **💡 Sección nueva:** Respuesta rápida a "¿Cómo me afecta esto como desarrollador?"

```typescript
// Código ejemplo esencial (5-20 líneas)
// Muestra el uso práctico de la decisión en Cobralon
import { ComponentePrincipal } from '@/lib/main'

const ejemplo = await prisma.model.findMany({
  include: { relacionClave: true },
})
```

**Archivos clave modificados:**

- `ruta/archivo.ts` - Qué contiene
- `ruta/otro.ts` - Qué contiene

---

## Contexto

[5-10 líneas: Problema de negocio/arquitectura que necesitábamos resolver en Cobralon]

### Requisitos Identificados

**Funcionales:**

- Requisito 1 del negocio
- Requisito 2 del negocio

**No Funcionales:**

- Performance, escalabilidad, mantenibilidad

### Casos de Uso Reales

[Describir casos de uso concretos del proyecto Cobralon]

## Decisión

[3-5 líneas: QUÉ decidimos implementar]

### Arquitectura/Modelo

```typescript
// Schema, interfaces, o código arquitectural clave
// Ejemplo: Prisma models, tipos TypeScript, etc.
```

### Ejemplo de Uso

```typescript
// Casos de uso comunes (10-30 líneas)
// Caso 1: Uso básico
// Caso 2: Uso avanzado
```

## Alternativas Consideradas

> **Importante:** En decisiones de negocio, las alternativas SON valiosas porque documentan el razonamiento.

### Alternativa 1: [Nombre]

**Descripción:** [Qué era esta alternativa]

**Pros:**

- Pro 1 específico
- Pro 2 específico

**Contras (por qué NO):**

- Contra crítico 1
- Contra crítico 2

### Alternativa 2: [Nombre]

[Repetir estructura...]

## Consecuencias

### Positivas ✅

1. **[Beneficio específico]:** [Descripción concreta, preferiblemente cuantificada]
2. **[Beneficio específico]:** [Impacto en Cobralon]
3. **[Beneficio específico]:** [Máximo 6-8 beneficios]

### Negativas ⚠️

1. **[Trade-off específico]:** [Descripción del problema]
   - **Mitigación:** [Cómo lo resolvimos en Cobralon]
2. **[Trade-off específico]:** [Máximo 4-5 trade-offs]

## Implementación

### Fase 1: [Descripción]

- Paso 1
- Paso 2

### Fase 2: [Descripción]

- Paso 1
- Paso 2

## Decisiones Derivadas

[Si esta decisión generó otras decisiones menores, listarlas]

- Decisión A: [Breve descripción]
- Decisión B: [Breve descripción]

## Validación

**Tests implementados:**

- Test 1: [Qué valida]
- Test 2: [Qué valida]

**Métricas de éxito:**

- Métrica 1: [Resultado esperado vs obtenido]
- Métrica 2: [Resultado esperado vs obtenido]

## Referencias

- [Documentación Oficial](https://ejemplo.com) (si aplica)
- [ADR del Template Relacionado](../../template/decisions/XXX-titulo.md)
- [ADR del Proyecto Relacionado](XXX-titulo.md)
- [Guía de Implementación](../guides/nombre-guia.md)

## Apéndice (opcional)

### Diagramas

```
[Diagramas de arquitectura, flujos, etc. si son necesarios]
```

### Benchmarks

[Benchmarks específicos si son relevantes]

### Lessons Learned

[Aprendizajes durante la implementación]

---

**Última actualización:** YYYY-MM-DD

---

## Guía de Uso - Template Extended (Decisiones de Negocio)

### Usar este template para:

✅ **Modelado de datos** (ej: Payment Allocation N:M)
✅ **Arquitectura de negocio** (ej: Dual Payment Flows)
✅ **Lógica de negocio compleja** (ej: Installments sin interés)
✅ **Decisiones de producto** (ej: No Auth en MVP)

### Longitud Objetivo:

- **Mínimo:** 150 líneas
- **Óptimo:** 200-400 líneas
- **Máximo:** 600 líneas (si absolutamente necesario)

### Filosofía:

En decisiones de negocio, el CONTEXTO es el valor. No reducir solo por reducir.

### Sección Crítica:

**Quick Start al inicio** → Permite lectura rápida, luego profundizar

### Secciones Obligatorias:

- ✅ Quick Start (al inicio)
- ✅ Contexto (detallado)
- ✅ Decisión (con código/schema)
- ✅ Alternativas Consideradas (2-4 alternativas)
- ✅ Consecuencias
- ✅ Implementación (fases si aplica)
- ✅ Referencias

### Secciones Opcionales (pero recomendadas):

- Validación (tests, métricas)
- Decisiones Derivadas
- Apéndice (diagramas, benchmarks)

### Qué MANTENER:

- TODO el contexto de negocio
- Alternativas evaluadas (documentan razonamiento)
- Ejemplos de código extensos si clarifican
- Diagramas si ayudan a entender

### Qué MEJORAR:

- Agregar Quick Start al inicio
- Asegurar code examples funcionales
- Trade-offs con mitigación clara
- Estructura consistente

### Checklist Pre-Commit:

- [ ] Quick Start al inicio ✅
- [ ] Contexto de negocio completo ✅
- [ ] Alternativas documentan "por qué NO" ✅
- [ ] Código ejemplo funcional ✅
- [ ] Trade-offs con mitigación ✅
- [ ] Referencias actualizadas ✅
