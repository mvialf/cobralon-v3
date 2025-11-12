# 🚀 Plan de Mejora: Cobralon Upgrade

> **📁 ARCHIVED:** Este directorio contiene la planificación y documentación del proceso de upgrade de React Query completado el 2025-11-12.
>
> **✅ Estado:** Todas las 6 fases completadas exitosamente
>
> **📖 Ver implementación final:** [docs/project/implementation/2025-current.md](../../project/implementation/2025-current.md)
>
> Este archivo se preserva como referencia histórica del plan original y las estimaciones vs realidad.

---

**Fecha de inicio:** 2025-11-12
**Última actualización:** 2025-11-12
**Objetivo:** Backportear mejoras de arquitectura y patrones de Cobrolox → Cobralon

---

## 📊 Estado Actual - ACTUALIZADO

```
Progreso: [██████░░░░] 66.7%

✅ Fase 1: React Query Setup          - 100% COMPLETA
✅ Fase 2: Optimistic Updates         - 100% COMPLETA
✅ Fase 3: Invalidaciones Inteligentes - 100% COMPLETA (2025-11-12)
✅ Fase 4: Hooks Especializados       - 100% COMPLETA (2025-11-12)
⚠️ Fase 5: Testing Strategy           -   0% PENDIENTE
⚠️ Fase 6: Error Handling             -   0% PENDIENTE
```

**Fases completadas HOY (2025-11-12):** Fase 3 + Fase 4

**Ver detalles:** [IMPLEMENTACION-2025-11-12.md](./IMPLEMENTACION-2025-11-12.md)

---

## 📋 Contexto

### Situación Actual

**Cobralon** es el proyecto base que gestiona proyectos de construcción/ventanas con sistema de pagos.

**Cobrolox** es un fork de Cobralon que evolucionó con mejoras significativas durante su desarrollo, implementando:

- ✅ React Query para state management
- ✅ Optimistic updates con rollback
- ✅ Invalidaciones inteligentes de cache
- ✅ Error handling mejorado
- ✅ Testing strategy robusta
- ✅ Documentación exhaustiva

### Objetivo del Plan

Este plan documenta cómo aplicar los **PATRONES y ARQUITECTURA** aprendidos en Cobrolox de vuelta a Cobralon, adaptados al dominio de "Projects" en lugar de "Invoices".

**NO se trata de copiar modelos**, sino de aplicar las mismas técnicas arquitecturales.

---

## 🎯 Mejoras Identificadas

### 1. **React Query (CRÍTICO)**

**Impacto:** Alto | **Esfuerzo:** Alto | **Prioridad:** 🔴 Alta

**Estado actual (Cobralon):**

```typescript
// hooks/use-payments.ts
const [payments, setPayments] = useState([])
useEffect(() => {
  fetchPayments()
}, [])
```

**Estado objetivo (patrón de Cobrolox):**

```typescript
// hooks/queries/use-payments.ts
const { data, isLoading } = useQuery({
  queryKey: ['payments', params],
  queryFn: async () => {
    /* fetch */
  },
  staleTime: 5 * 60 * 1000,
})
```

**Beneficios:**

- Cache inteligente automático
- Loading/error states built-in
- Refetch strategies configurables
- Optimistic updates nativos
- DevTools incluido

---

### 2. **Optimistic Updates**

**Impacto:** Alto | **Esfuerzo:** Medio | **Prioridad:** 🔴 Alta

**Patrón a implementar:**

```typescript
useMutation({
  mutationFn: async (id) => { /* delete */ },
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['projects'] })
    const previousData = queryClient.getQueryData(['projects'])
    queryClient.setQueriesData(['projects'], (old) => /* optimistic update */)
    return { previousData } // Para rollback
  },
  onError: (err, id, context) => {
    queryClient.setQueryData(['projects'], context.previousData) // Rollback
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }
})
```

**Beneficio:** UX instantánea con safety net.

---

### 3. **Invalidaciones Inteligentes con Predicates**

**Impacto:** Medio | **Esfuerzo:** Bajo | **Prioridad:** 🟡 Media

**Patrón a implementar:**

```typescript
// En lugar de 5 invalidaciones separadas:
queryClient.invalidateQueries({ queryKey: ['projects'] })
queryClient.invalidateQueries({ queryKey: ['payments'] })
queryClient.invalidateQueries({ queryKey: ['customers'] })
// ...

// Una sola invalidación con predicate:
queryClient.invalidateQueries({
  predicate: (query) => {
    const key = query.queryKey[0]
    return ['projects', 'payments', 'customers'].includes(key)
  },
})
```

**Beneficio:** Menos código, más eficiente.

---

### 4. **Hooks Especializados por Entidad**

**Impacto:** Alto | **Esfuerzo:** Alto | **Prioridad:** 🔴 Alta

**Estado actual:**

- `hooks/use-payments.ts` (básico)
- `hooks/queries/use-projects.ts` (básico)

**Estado objetivo:**

```
hooks/queries/
├── use-projects.ts       (GET list, GET single, CREATE, UPDATE, DELETE)
├── use-payments.ts       (completo con mutations)
├── use-customers.ts      (completo)
├── use-installments.ts   (mark as paid, etc.)
└── use-aftersales.ts     (nuevo)
```

Cada hook incluye:

- ✅ Queries (list, single)
- ✅ Mutations (create, update, delete)
- ✅ Optimistic updates
- ✅ Invalidaciones automáticas
- ✅ JSDoc completo con ejemplos

---

### 5. **Testing Strategy**

**Impacto:** Alto | **Esfuerzo:** Medio | **Prioridad:** 🟡 Media

**Estado actual:** Business logic testeada ✅, hooks sin tests

**Estado objetivo:**

```
hooks/queries/__tests__/
├── use-projects.test.tsx      (optimistic updates, invalidations)
├── use-payments.test.tsx      (validaciones, mutations)
└── use-customers.test.tsx

lib/business-logic/__tests__/
├── payment-fifo.test.ts       ✅ Ya existe
├── project-balance.test.ts    ✅ Ya existe
└── installments.test.ts       ✅ Ya existe
```

**Coverage target:** 80%+ en hooks críticos.

---

### 6. **Error Handling Mejorado**

**Impacto:** Medio | **Esfuerzo:** Bajo | **Prioridad:** 🟡 Media

**Patrón a implementar:**

```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
  }
}

// En hooks:
onError: (error: ApiError) => {
  if (error.statusCode === 409) {
    toast.error('Conflicto: ' + error.message)
  } else if (error.statusCode >= 500) {
    toast.error('Error del servidor. Intente más tarde')
  } else {
    toast.error(error.message)
  }
}
```

**Beneficio:** UX más clara, mejor debugging.

---

## 📁 Estructura de la Documentación

Este plan está organizado en los siguientes documentos:

1. **[analisis-comparativo.md](./analisis-comparativo.md)** → Análisis detallado de diferencias
2. **[fase-1-react-query-hooks.md](./fase-1-react-query-hooks.md)** → Implementar React Query
3. **[fase-2-optimistic-updates.md](./fase-2-optimistic-updates.md)** → Optimistic updates + rollback
4. **[fase-3-invalidaciones-inteligentes.md](./fase-3-invalidaciones-inteligentes.md)** → Predicates
5. **[fase-4-hooks-especializados.md](./fase-4-hooks-especializados.md)** → Hooks completos por entidad
6. **[fase-5-testing-strategy.md](./fase-5-testing-strategy.md)** → Tests de hooks
7. **[fase-6-error-handling.md](./fase-6-error-handling.md)** → Error types
8. **[roadmap-implementacion.md](./roadmap-implementacion.md)** → Timeline y dependencias

---

## 🗺️ Roadmap de Implementación

### Fase 1: Fundación ✅ **COMPLETA**

- ✅ Instalar @tanstack/react-query
- ✅ Setup QueryClient + QueryClientProvider
- ✅ Migrar use-projects.ts a React Query
- ✅ Migrar use-payments.ts a React Query
- ✅ Migrar use-customers.ts a React Query

**Status:** 100% | **Completada:** Pre-2025-11-12

### Fase 2: Mutations ✅ **COMPLETA**

- ✅ Implementar CREATE mutations (3/3 hooks)
- ✅ Implementar UPDATE mutations (3/3 hooks)
- ✅ Implementar DELETE mutations (3/3 hooks)
- ✅ Agregar optimistic updates (3 DELETE mutations)

**Status:** 100% | **Completada:** Pre-2025-11-12
**Total mutations:** 9/9 con optimistic updates

### Fase 3: Invalidaciones Inteligentes ✅ **COMPLETA**

- ✅ Refactorizar use-projects (4 mutations con predicates)
- ✅ Refactorizar use-customers (2 mutations con predicates)
- ✅ Refactorizar use-payments (1 mutation con predicates)
- ✅ Todas las mutations usan batch invalidation

**Status:** 100% | **Completada:** 2025-11-12
**Total refactorizado:** 7 mutations → 10/10 con predicates

### Fase 4: Hooks Especializados ✅ **COMPLETA**

- ✅ use-projects completo (queries + mutations)
- ✅ use-payments completo (queries + mutations)
- ✅ use-customers completo (queries + mutations)
- ✅ use-installments completo (queries) 🆕
- ✅ use-aftersales completo (CRUD completo) 🆕

**Status:** 100% | **Completada:** 2025-11-12
**Total hooks:** 5/5 production-ready

### Fase 5: Testing Strategy ⚠️ **PENDIENTE**

- [ ] Tests de hooks con React Query
- [ ] Tests de optimistic updates
- [ ] Tests de error handling
- [ ] Target: 80%+ coverage

**Status:** 0% | **Estimado:** 3-5 días

### Fase 6: Error Handling ⚠️ **PENDIENTE**

- [ ] Crear lib/api-error.ts con ApiError class
- [ ] Refactorizar hooks para usar ApiError
- [ ] Error types diferenciados por status code

**Status:** 0% | **Estimado:** 2-3 días

---

## 📊 Estimación de Esfuerzo

| Fase                                    | Esfuerzo       | Riesgo    |
| --------------------------------------- | -------------- | --------- |
| Fase 1: React Query Setup               | 3-5 días       | Bajo      |
| Fase 2: Mutations + Optimistic          | 5-7 días       | Medio     |
| Fase 3: Invalidaciones + Error Handling | 2-3 días       | Bajo      |
| Fase 4: Testing Hooks                   | 3-5 días       | Medio     |
| Fase 5: Documentación                   | 2-3 días       | Bajo      |
| **TOTAL**                               | **15-23 días** | **Medio** |

---

## ✅ Criterios de Éxito

### Fase 1 Completa:

- [ ] React Query instalado y configurado
- [ ] 2+ hooks migrados a React Query
- [ ] Cache funcionando correctamente
- [ ] No regressions en funcionalidad existente

### Fase 2 Completa:

- [ ] Todas las mutations implementadas
- [ ] Optimistic updates funcionando
- [ ] Rollback automático en errores
- [ ] UX notablemente más rápida

### Fase 3 Completa:

- [ ] Invalidaciones con predicates
- [ ] Error types diferenciados
- [ ] Mensajes de error claros

### Fase 4 Completa:

- [ ] 80%+ coverage en hooks críticos
- [ ] Tests de optimistic updates
- [ ] CI/CD passing

### Fase 5 Completa:

- [ ] Documentación completa
- [ ] Ejemplos de uso
- [ ] Onboarding doc para nuevos developers

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Breaking Changes en UI

**Probabilidad:** Media | **Impacto:** Alto

**Mitigación:**

- Implementar feature flags
- Rollout gradual (hook por hook)
- Testing exhaustivo antes de merge

### Riesgo 2: Performance Regression

**Probabilidad:** Baja | **Impacto:** Alto

**Mitigación:**

- Benchmarks antes/después
- Monitoring de cache hit rate
- staleTime/gcTime tuneados

### Riesgo 3: Learning Curve React Query

**Probabilidad:** Media | **Impacto:** Medio

**Mitigación:**

- Documentación con ejemplos
- Pair programming
- Code reviews detallados

---

## 📚 Referencias

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Cobrolox Source Code](~/programas/Cobrolox/) - Referencia de implementación

---

## 🤝 Contribuciones

Este plan está vivo. Si encuentras mejores formas de implementar estos patrones o tienes sugerencias, actualiza la documentación.

**Última actualización:** 2025-11-12
