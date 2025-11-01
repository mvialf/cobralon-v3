# Plan de Refactorización de ADRs

**Objetivo:** Reducir ruido y enfocarse en información práctica para usuarios del template.

**Problema:** ADRs actuales tienen 300-500 líneas con ~50% de contenido sobre alternativas NO elegidas que confunden más que ayudan.

**Solución:** Refactorizar a formato "slim" (50-100 líneas) enfocado en "cómo usar lo elegido" vs "por qué NO elegimos X".

---

## Filosofía del Cambio

### ❌ ANTES: Optimizado para justificar decisiones
```
Usuario: "¿Por qué usamos Prisma?"
ADR: "Consideramos Supabase (50 líneas), Drizzle (40 líneas),
      PlanetScale (30 líneas), Railway (25 líneas)..."
Usuario: *Se duerme* 😴
```

### ✅ DESPUÉS: Optimizado para usar lo elegido
```
Usuario: "¿Cómo uso Prisma en este template?"
ADR: "Prisma + Neon porque type-safety + serverless.
      Trade-off: bundle size. Mitigación: usa Edge config.
      Quick start: npm run db:generate"
Usuario: *Productivo en 2 minutos* 🚀
```

---

## Categorización de ADRs

### Tipo 1: "YA DECIDIDO - Usuario solo consume" (9 ADRs)
**Acción:** Reducir a 50-100 líneas

- ✂️ **ADR-008** (Prisma + Neon): 494 → ~80 líneas
- ✂️ **ADR-010** (Playwright MCP): 496 → ~100 líneas
- ✂️ **ADR-005** (Vitest): 326 → ~80 líneas
- ✂️ **ADR-007** (ESLint): 336 → ~70 líneas
- ✂️ **ADR-011** (Capture Dialog): 340 → ~100 líneas
- ✂️ **ADR-001** (Next.js): 155 → ~60 líneas
- ✂️ **ADR-002** (Tailwind): reducir alternativas
- ✂️ **ADR-003** (shadcn/ui): reducir alternativas
- ✂️ **ADR-004** (Layout System): reducir alternativas

### Tipo 2: "USUARIO DEBE DECIDIR" (1 ADR)
**Acción:** Mantener extenso pero reestructurar

- 📋 **ADR-009** (Authentication): 516 → ~250-300 líneas
  - Usuario NO elige auth automáticamente
  - Comparación Stack Auth vs NextAuth vs Clerk es ÚTIL
  - Agregar tabla comparativa al inicio
  - Mantener detalles de cada opción

---

## Template Nuevo "Slim"

```markdown
# ADR-XXX: Título de la Decisión

## Decisión
[2-3 líneas: QUÉ decidimos usar]

## Contexto
[4-6 líneas: Problema específico que resuelve]

## Alternativa Principal (opcional - solo 1)
**[Nombre]:** Razón breve de descarte (2-3 líneas máximo)

## Consecuencias

### Beneficios ✅
1. Beneficio concreto y cuantificado
2. Beneficio concreto y cuantificado
3. Beneficio concreto y cuantificado

### Trade-offs ⚠️
1. Trade-off + cómo mitigarlo
2. Trade-off + cómo mitigarlo

## Quick Start
```bash
# Comandos clave (3-5 comandos)
npm run comando-principal
```

```typescript
// Código ejemplo esencial (5-10 líneas)
import { Main } from '@/lib/main'

const example = new Main()
```

## Referencias
- [Documentación Oficial](https://...)
- [ADR Relacionado](../XXX-related.md)

---
**Última actualización:** YYYY-MM-DD
```

**Longitud objetivo:** 50-100 líneas (vs 300-500 actual)

---

## Criterios de Reducción

### ✅ MANTENER
- Decisión clara y concisa
- Problema específico que resuelve
- Consecuencias prácticas (beneficios + trade-offs)
- Mitigación de trade-offs
- Código ejemplo funcional
- Comandos quick start
- Referencias a docs oficiales

### ❌ ELIMINAR
- Alternativas obvias (Vite no tiene SSR → obvio)
- Pros/cons extensos de tecnologías NO usadas
- Justificaciones largas de "por qué NO"
- Información duplicada de docs oficiales
- Comparaciones que envejecen rápido
- Benchmarks específicos (se vuelven obsoletos)
- Discusiones históricas extensas

### 📦 ARCHIVAR en .archive/
- Versión original completa (para referencia histórica)
- Análisis detallado de alternativas (si se necesita)
- Discusión técnica profunda

---

## Ejemplo de Refactorización

### ANTES: ADR-008 (494 líneas)

```markdown
# ADR-008: Prisma ORM + Neon PostgreSQL

## Alternativas Consideradas

### Alternativa 1: Supabase
- Pros: Auth + DB + Storage en un solo servicio
- Pros: Setup ultra rápido (<30 min)
- Pros: Realtime subscriptions built-in
[... 50 líneas más ...]

### Alternativa 2: Drizzle ORM
- Pros: Más ligero que Prisma (~50% menor bundle)
[... 40 líneas más ...]

### Alternativa 3: Prisma + Supabase PostgreSQL
[... 40 líneas ...]

### Alternativa 4: PlanetScale
[... 30 líneas ...]

### Alternativa 5: Railway PostgreSQL
[... 25 líneas ...]

[TOTAL: 494 líneas - 60% sobre alternativas NO usadas]
```

### DESPUÉS: ADR-008 (~80 líneas)

```markdown
# ADR-008: Prisma ORM + Neon PostgreSQL

## Decisión
Usar Prisma 6.7 como ORM + Neon PostgreSQL como database hosting.

## Contexto
Necesitábamos una solución de base de datos:
- Type-safe: Integración con TypeScript strict mode
- Serverless-friendly: Compatible con Vercel/Netlify
- Sin vendor lock-in: Migrable a otras soluciones
- DX excelente: Productividad alta

## Alternativa Principal
**Drizzle ORM:** Más ligero (~50% menor bundle) y SQL-like API.
NO elegido: Prisma tiene mejor DX para principiantes y ecosystem más maduro.

## Consecuencias

### Beneficios ✅
1. **Type-safety máxima:** Prisma genera tipos TS automáticamente desde schema
2. **DX superior:** `npm run db:studio` abre GUI para ver/editar datos
3. **Database branching:** Neon permite branches como Git (invaluable para testing)
4. **Serverless-optimized:** Pooled connections + direct URL para migrations
5. **Bajo vendor lock-in:** Migrations son SQL portables, Neon es PostgreSQL estándar

### Trade-offs ⚠️
1. **Bundle size mayor:** Prisma Client ~1-2MB (vs 50-100KB de Drizzle)
   - **Mitigación:** Para Edge Runtime usar `engineType = "client"`
2. **Neon free tier cold starts:** Primera query después de 5 min suspensión: ~500ms-1s
   - **Mitigación:** Plan Pro $19/mes con compute activo 24/7 en producción
3. **Curva de aprendizaje:** Sintaxis específica de Prisma (no SQL directo)
   - **Mitigación:** Documentación excelente + schema comentado en template

## Quick Start
```bash
# Generar Prisma Client
npm run db:generate

# Aplicar schema a DB
npm run db:push

# Abrir Prisma Studio (GUI)
npm run db:studio

# Seed data de prueba
npm run db:seed
```

```typescript
// Uso básico type-safe
import { prisma } from '@/lib/db'

const user = await prisma.user.findUnique({
  where: { id: '123' },
  select: {
    email: true,
    posts: { select: { title: true } }
  }
})
// TypeScript sabe exactamente:
// user.email ✅ string
// user.posts ✅ { title: string }[]
```

## Referencias
- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Database Setup Guide](../../guides/database-setup.md)
- [ADR-010: Neon MCP (opcional)](010-neon-mcp-optional.md)

---
**Última actualización:** 2025-01-17

[TOTAL: ~80 líneas - 80% contenido accionable]
```

---

## Orden de Ejecución (Prioridad)

### Alta Prioridad (Más verbose)
1. **ADR-008** (Prisma + Neon) - 494 líneas
2. **ADR-010** (Playwright MCP) - 496 líneas
3. **ADR-005** (Vitest) - 326 líneas
4. **ADR-007** (ESLint) - 336 líneas
5. **ADR-011** (Capture Dialog) - 340 líneas

### Media Prioridad
6. **ADR-001** (Next.js) - 155 líneas
7. **ADR-002** (Tailwind)
8. **ADR-003** (shadcn/ui)
9. **ADR-004** (Layout System)

### Caso Especial
10. **ADR-009** (Authentication) - Mantener extenso pero reestructurar

---

## Métricas de Éxito

### Antes del Refactor
- ❌ Promedio: 300-400 líneas/ADR
- ❌ Tiempo lectura: 10-15 minutos
- ❌ Ratio útil: ~50% (resto es ruido)
- ❌ Alternativas: 4-6 por ADR

### Después del Refactor
- ✅ Promedio: 70-100 líneas/ADR
- ✅ Tiempo lectura: 3-5 minutos
- ✅ Ratio útil: ~80% (información accionable)
- ✅ Alternativas: 0-1 por ADR (solo la más relevante)

### KPIs Cualitativos
- ✅ Usuario encuentra info en <1 minuto
- ✅ Responde "¿cómo me afecta?" no "¿por qué NO X?"
- ✅ Código ejemplo funcional sin contexto adicional
- ✅ Trade-offs incluyen mitigación práctica
- ✅ Fácil de mantener actualizado

---

## Estructura de Directorios Post-Refactor

```
docs/template/decisions/
├── .archive/                          # Versiones originales (backup)
│   ├── 001-nextjs-15-app-router.md
│   ├── 002-tailwind-css-v4.md
│   └── ...
│
├── 001-nextjs-15-app-router.md       # Versión slim (60 líneas)
├── 002-tailwind-css-v4.md            # Versión slim
├── 003-shadcn-ui-new-york.md         # Versión slim
├── 004-layout-system-dos-capas.md    # Versión slim
├── 005-vitest-testing-library.md     # Versión slim (80 líneas)
├── 007-eslint-prettier.md            # Versión slim (70 líneas)
├── 008-prisma-neon.md                # Versión slim (80 líneas)
├── 009-authentication-options.md     # Reestructurado (250-300 líneas)
├── 010-playwright-mcp.md             # Versión slim (100 líneas)
├── 011-capture-dialog-pattern.md     # Versión slim (100 líneas)
│
├── README.md                          # Actualizado con nueva filosofía
├── REFACTORING-PLAN.md               # Este documento
└── template-slim.md                   # Template para futuros ADRs
```

---

## Notas Importantes

### ¿Qué pasa con la información eliminada?
- **Versiones originales:** Archivadas en `.archive/` para referencia histórica
- **Info valiosa eliminada:** Si algo es crítico, se condensa en 2-3 líneas
- **Info duplicada:** Mejor referencia a docs oficiales (siempre actualizadas)

### ¿Cuándo hacer un ADR largo vs corto?

**ADR LARGO (200-300 líneas):**
- Usuario DEBE tomar decisión (ej: ADR-009 Authentication)
- Comparación de opciones es esencial
- No hay default claro

**ADR CORTO (50-100 líneas):**
- Decisión ya tomada en el template
- Usuario solo consume/usa
- Enfoque en "cómo usar" no "por qué elegimos"

### ¿Se puede revertir?
Sí, completamente. Versiones originales estarán en `.archive/` y en Git history.

---

## Timeline Estimado

| Fase | Tiempo Estimado | Dependencias |
|------|----------------|--------------|
| FASE 1: Preparación | 30 min | Ninguna |
| FASE 2: ADRs Críticos (5 docs) | 3-4 horas | FASE 1 |
| FASE 3: ADRs Moderados (4 docs) | 2-3 horas | FASE 1 |
| FASE 4: ADR-009 Especial | 1 hora | FASE 1 |
| FASE 5: Docs Meta | 1 hora | FASE 2-4 |
| FASE 6: Validación | 2 horas | FASE 5 |
| FASE 7: Finalización | 30 min | FASE 6 |
| **TOTAL** | **10-12 horas** | - |

**Recomendación:** Hacer en sesiones de 2-3 horas para mantener calidad y enfoque.

---

## Próximos Pasos

1. ✅ Revisar este plan con el equipo (si aplica)
2. ⏳ Ejecutar FASE 1 (Preparación)
3. ⏳ Refactorizar ADR-008 como prueba piloto
4. ⏳ Validar enfoque con usuario de prueba
5. ⏳ Continuar con resto de ADRs

---

**Fecha de creación:** 2025-11-01
**Autor:** Equipo Template
**Estado:** Plan aprobado - Listo para ejecutar
