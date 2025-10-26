# Architecture Decision Records (ADRs)

Documentación de decisiones arquitecturales importantes del proyecto Cobralon.

## ¿Qué son los ADRs?

Los **Architecture Decision Records (ADRs)** son documentos que capturan decisiones arquitecturales significativas junto con su contexto y consecuencias. Cada ADR describe:

- **Contexto:** Por qué tomamos esta decisión
- **Decisión:** Qué decidimos hacer
- **Alternativas consideradas:** Qué otras opciones evaluamos y por qué NO las elegimos
- **Consecuencias:** Qué beneficios y trade-offs resultan de esta decisión

## Índice de ADRs del Proyecto

### [ADR-001: PaymentAllocation Architecture (Tabla Intermedia N:M)](001-payment-allocation-architecture.md)

**Status:** ✅ Aceptado | **Fecha:** 2025-10-21

**Decisión:** Implementar tabla intermedia `PaymentAllocation` para modelar la relación N:M entre `Payment` y `Project`.

**Por qué es importante:**

- Soporta tanto pagos 1:1 (proyecto único) como 1:N (múltiples proyectos)
- Permite auditoría detallada: saber exactamente cuánto de cada pago fue asignado a cada proyecto
- Facilita cálculo de balance por proyecto: `total - SUM(allocations)`

**Alternativas rechazadas:**

- FK directo (`payment.projectId`) - No soporta pago a múltiples proyectos
- JSON field (`payment.allocations`) - Pierde normalización y queries relacionales

**Consecuencias clave:**

- ✅ Flexibilidad total para casos de uso complejos
- ⚠️ Requiere 15+ validaciones backend (SUM === amount, misma currency, etc.)

---

### [ADR-002: Dual Payment Flows (Project vs Customer)](002-dual-payment-flows.md)

**Status:** ✅ Aceptado | **Fecha:** 2025-10-21

**Decisión:** Implementar 2 flujos de pago especializados en lugar de 1 universal:

- **Flujo 1:1 (Project Payment):** Pago directo a proyecto específico
- **Flujo 1:N (Customer Payment):** Pago que se distribuye entre múltiples proyectos

**Por qué es importante:**

- El flujo 1:1 (90% de casos) se simplifica: 3 campos vs 8 campos + tabla de asignaciones
- El flujo 1:N (10% de casos) gana algoritmo FIFO automático para distribución inteligente
- **ROI cuantificado:** 14.4x return (36 horas/año ahorradas vs 2.5 horas invertidas)

**Alternativas rechazadas:**

- Form universal con modo "simple"/"avanzado" - Complejidad cognitiva alta
- Solo flujo avanzado 1:N - UX pobre para caso común (90%)

**Consecuencias clave:**

- ✅ UX optimizada para cada caso de uso
- ⚠️ 2 schemas Zod distintos (duplicación controlada)

---

### [ADR-003: Installments Without Interest (Cuotas Sin Interés)](003-installments-without-interest.md)

**Status:** ✅ Aceptado | **Fecha:** 2025-10-21

**Decisión:** Implementar sistema de cuotas (installments) SIN cálculo de interés.

**Por qué es importante:**

- **Legal compliance:** Ley 20.555 (Chile) permite cuotas sin interés sin licencia financiera
- **Simplicidad técnica:** División exacta vs fórmula de interés compuesto
- **Business value:** Evita $60,000/año en comisiones de gateways de pago (3% de $2M/año)
- **Automatización:** Cron job marca cuotas vencidas automáticamente

**Alternativas rechazadas:**

- Cuotas con interés - Requiere licencia financiera ($5,000-$10,000 anuales)
- Gateway de pago externo - Comisiones del 3% ($60,000/año en volumen proyectado)
- Sin cuotas - Reduce tasa de conversión (clientes prefieren pagar en cuotas)

**Consecuencias clave:**

- ✅ $60,000/año ahorrados en comisiones
- ✅ Cron job automatiza marcado de cuotas (Vercel Cron)
- ⚠️ Última cuota absorbe centavos residuales (documentado)

---

### [ADR-004: Neon PostgreSQL Database Provider](004-neon-postgresql.md)

**Status:** ✅ Aceptado | **Fecha:** 2025-10-22

**Decisión:** Usar **Neon PostgreSQL** como proveedor de base de datos serverless.

**Por qué es importante:**

- **Database branching como Git:** Crear branches de DB para testing sin riesgo
- **Zero vendor lock-in:** PostgreSQL estándar + migraciones Prisma portables
- **Free tier generoso:** 512MB storage + branches ilimitados ($0/mes)
- **Score:** 88.5/100 (mejor alternativa evaluada)

**Alternativas rechazadas:**

- **PlanetScale:** Disqualified (no soporta foreign keys - incompatible con Prisma)
- **Supabase:** 53.5/100 (vendor lock-in alto en auth/storage/realtime)
- **Railway:** 71/100 (más caro, sin database branching)
- **Amazon RDS:** 64.5/100 (complejidad operacional, sin serverless real)

**Consecuencias clave:**

- ✅ Database branching: `git checkout -b feature` → `neon branches create --name feature`
- ✅ Portabilidad total: Exportar a cualquier PostgreSQL con `pg_dump`
- ⚠️ Límite de almacenamiento free tier (512MB) - suficiente para MVP

---

### [ADR-005: No Authentication System (MVP Phase)](005-no-authentication-mvp.md)

**Status:** ✅ Aceptado | **Fecha:** 2025-10-25

**Decisión:** Lanzar MVP **sin sistema de autenticación** con roadmap de 3 fases.

**Por qué es importante:**

- **Time-to-market:** MVP en 2-3 semanas (vs 4-5 con auth) - 33% más rápido
- **Contexto de red interna:** Sistema usado por 1-2 personas en oficina (bajo riesgo)
- **Reversibilidad total:** Migración a NextAuth toma 10-15 horas (mismo costo que implementar desde MVP)
- **Foco en validación:** 100% del tiempo en business logic, no en infraestructura

**Alternativas rechazadas:**

- NextAuth.js desde MVP - 10-15 horas de overhead para validar infraestructura (no negocio)
- Clerk desde MVP - $300/año + vendor lock-in alto para 1-2 usuarios
- Stack Auth desde MVP - Complejidad innecesaria + vendor lock-in medio
- Basic Auth custom - Anti-pattern con password compartido

**Consecuencias clave:**

- ✅ Roadmap de 3 fases: MVP (sin auth) → Production (NextAuth) → Enterprise (RBAC)
- ✅ Triggers claros: >2 usuarios, deploy público, 4 semanas de validación
- ⚠️ No escalable sin migración (limitación aceptada para MVP)
- ⚠️ Sin audit logs por usuario (mitigado con timestamps + 1-2 usuarios)

**Roadmap:**

1. **Fase 1 (actual):** MVP sin auth - Red interna, 1-2 usuarios
2. **Fase 2 (cuando escale):** NextAuth.js - 10-15 horas de implementación
3. **Fase 3 (si necesita):** Enterprise auth - Multi-tenancy, RBAC, SAML

---

## Relación con Template ADRs

Este proyecto está construido sobre un template SaaS que tiene sus propios ADRs. Los ADRs del proyecto son **complementarios** a los del template:

### Template ADRs (Framework/Stack)

Documentados en [docs/template/decisions/](../../template/decisions/):

- **ADR-001:** Next.js 15 + App Router
- **ADR-002:** Tailwind CSS v4
- **ADR-003:** shadcn/ui New York Style
- **ADR-004:** Sistema de Layout 2 Capas
- **ADR-005:** Vitest + Testing Library
- **ADR-007:** ESLint + Prettier
- **ADR-008:** Prisma + Neon (database ORM/provider para template)
- **ADR-009:** No Incluir Autenticación por Defecto (template flexibility)
- **ADR-010:** Playwright MCP + @playwright/test

**Scope:** Decisiones de framework, tooling, componentes UI, testing

### Project ADRs (Business Logic)

Documentados en este directorio ([docs/project/decisions/](./)):

- **ADR-001:** PaymentAllocation Architecture
- **ADR-002:** Dual Payment Flows
- **ADR-003:** Installments Without Interest
- **ADR-004:** Neon PostgreSQL (elección específica del proyecto)
- **ADR-005:** No Authentication System (MVP Phase)

**Scope:** Decisiones de business logic, modelos de negocio, flujos específicos del proyecto

### ¿Cuál Consultar?

- **Decisiones de framework/stack:** → `docs/template/decisions/`
- **Decisiones de negocio/features:** → `docs/project/decisions/` (este directorio)

**Ejemplo:**

- "¿Por qué usamos Tailwind v4?" → Template ADR-002
- "¿Por qué la tabla PaymentAllocation?" → Project ADR-001

---

## Template de ADR

Cuando agregues un nuevo ADR, usa esta estructura:

```markdown
# ADR-XXX: Título Descriptivo

## Estado

**Aceptado** | **Propuesto** | **Deprecado** | **Superseded by ADR-YYY**

**Fecha:** YYYY-MM-DD

## Contexto

¿Por qué necesitamos tomar esta decisión?

- Problema que resolver
- Requisitos de negocio
- Restricciones técnicas
- Casos de uso reales

## Decisión

¿Qué decidimos hacer? (Ser específico y conciso)

## Alternativas Consideradas

### Alternativa 1: [Nombre]

- **Pros:**
  - Ventaja 1
  - Ventaja 2
- **Contras:**
  - Desventaja 1
  - Desventaja 2
- **Por qué NO:** Razón principal de rechazo

### Alternativa 2: [Nombre]

(Repetir estructura)

## Consecuencias

### Positivas ✅

1. **Beneficio 1**
   - Descripción
   - Cuantificado (si aplica)

### Negativas / Trade-offs ⚠️

1. **Trade-off 1**
   - Descripción
   - Mitigación

## Implementación

Detalles técnicos:

- Archivos modificados
- Código de ejemplo
- Configuración necesaria

## Referencias

- Código: Links a archivos relevantes
- Documentación: Links a docs externas
- ADRs relacionados

## Notas Adicionales

Información adicional relevante que no encaja en las secciones anteriores.

---

**Última actualización:** YYYY-MM-DD
```

---

## Cuándo Crear un ADR

✅ **Crea un ADR cuando:**

- Eliges entre tecnologías competidoras (React vs Vue, Prisma vs Drizzle)
- Decides una arquitectura o patrón importante (N:M table, FIFO algorithm)
- Introduces una dependencia mayor con implicaciones a largo plazo
- Cambias una decisión arquitectural anterior (supersede ADR existente)
- La decisión **no es obvia** del código y requiere contexto/justificación

❌ **NO crees ADR para:**

- Cambios triviales de código (<50 líneas, sin impacto arquitectural)
- Bug fixes sin cambio de arquitectura
- Decisiones obvias sin alternativas razonables
- Refactoring que no cambia decisión original

---

## Workflow de ADRs

### 1. Proponer ADR

```markdown
## Estado

**Propuesto**

**Fecha:** 2025-10-XX
```

- Escribe el ADR en estado "Propuesto"
- Discute con equipo (si aplica)
- Evalúa alternativas con análisis profundo

### 2. Aprobar ADR

```markdown
## Estado

**Aceptado**

**Fecha:** 2025-10-XX
```

- Actualiza estado a "Aceptado" cuando se decida
- Implementa la decisión
- Referencia el ADR en commits/PRs: `feat: implement payment FIFO (ADR-002)`

### 3. Deprecar ADR

```markdown
## Estado

**Deprecado**

**Superseded by:** [ADR-010: New Decision](010-new-decision.md)

**Fecha original:** 2025-10-XX
**Fecha de deprecación:** 2025-11-XX
```

- Marca como "Deprecado" si cambias la decisión
- Crea nuevo ADR con la decisión actualizada
- Referencia el ADR viejo desde el nuevo

---

## Métricas del Proyecto

| Métrica                  | Valor  |
| ------------------------ | ------ |
| **ADRs Totales**         | 5      |
| **Aceptados**            | 5      |
| **Propuestos**           | 0      |
| **Deprecados**           | 0      |
| **Total Líneas de Docs** | ~3,200 |
| **Tiempo Invertido**     | ~5h    |

---

## Búsqueda de ADRs

### Por Tema

```bash
# Buscar ADRs relacionados con pagos
grep -r "payment" docs/project/decisions/

# Buscar ADRs relacionados con base de datos
grep -r "database\|PostgreSQL" docs/project/decisions/
```

### Por Estado

```bash
# Listar ADRs aceptados
grep -l "**Aceptado**" docs/project/decisions/*.md

# Listar ADRs propuestos
grep -l "**Propuesto**" docs/project/decisions/*.md
```

---

## Referencias

- **Metodología de Documentación:** [docs/template/methodology/documentation.md](../../template/methodology/documentation.md)
- **Implementation Log:** [docs/project/implementation/](../implementation/) (ver 2025-current.md para entradas recientes)
- **Template ADRs:** [docs/template/decisions/](../../template/decisions/)

---

**Última actualización:** 2025-10-25

**Próxima revisión:** Cuando se agregue ADR-006
