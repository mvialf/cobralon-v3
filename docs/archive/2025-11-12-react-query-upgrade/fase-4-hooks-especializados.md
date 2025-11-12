# 🎯 Fase 4: Hooks Especializados Completos por Entidad

**Prioridad:** 🔴 Alta | **Esfuerzo:** 3-5 días | **Riesgo:** Bajo

**Prerequisito:** Fases 1-3 completadas

---

## 📋 Objetivo

Consolidar TODOS los hooks especializados por entidad con documentación JSDoc completa.

**Estructura objetivo:**

```
hooks/queries/
├── use-projects.ts       ✅ GET list, GET single, CREATE, UPDATE, DELETE
├── use-customers.ts      ✅ GET list, GET single, CREATE, UPDATE, DELETE
├── use-payments.ts       ✅ GET list, CREATE, UPDATE, DELETE + helpers
├── use-aftersales.ts     ⚠️ NUEVO: GET list, GET single, CREATE, UPDATE, DELETE
├── use-installments.ts   ⚠️ NUEVO: GET list, mark as paid/pending
└── README.md             ⚠️ NUEVO: Documentación de convenciones
```

---

## 🔧 Template de Hook Completo

**Referencia:** `hooks/queries/use-customers.ts` de Cobrolox

````typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CustomerFormData } from "@/lib/validations/customer-validations";

/**
 * Hooks de React Query para [ENTITY]
 *
 * Convenciones:
 * - Query keys: ['entity'] para list, ['entity', id] para single
 * - Mutations invalidan queries relacionadas automáticamente
 * - Delete usa optimistic updates para UX más rápida
 */

// ============================================================================
// TYPES
// ============================================================================

export interface [Entity]QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  // ... otros filtros
}

export interface [Entity]Response {
  [entities]: [Entity][];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// QUERY: GET LIST
// ============================================================================

/**
 * Hook para obtener lista de [entities] con paginación y filtros
 *
 * @param params - Filtros opcionales
 * @returns Query con [entities]
 *
 * @example
 * ```tsx
 * const { data, isLoading } = use[Entities]({ limit: 100 })
 * ```
 */
export function use[Entities](params: [Entity]QueryParams = {}) {
  return useQuery({
    queryKey: ["[entities]", params],
    queryFn: async (): Promise<[Entity]Response> => {
      // ... implementation
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// QUERY: GET SINGLE
// ============================================================================

export function use[Entity](id?: string) {
  return useQuery({
    queryKey: ["[entities]", id],
    queryFn: async (): Promise<[Entity]> => {
      // ... implementation
    },
    enabled: Boolean(id),
  });
}

// ============================================================================
// MUTATION: CREATE
// ============================================================================

export function useCreate[Entity]() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: [Entity]FormData): Promise<[Entity]> => {
      // ... implementation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          // ... invalidations logic
        },
      });
      toast.success("[Entity] creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============================================================================
// MUTATION: UPDATE
// ============================================================================

export function useUpdate[Entity]() {
  // ... similar pattern
}

// ============================================================================
// MUTATION: DELETE (con Optimistic Update)
// ============================================================================

export function useDelete[Entity]() {
  // ... con optimistic update (ver Fase 2)
}
````

---

## 📋 Checklist por Entidad

### use-projects.ts

- [ ] useProjects(params) - GET list
- [ ] useProject(id) - GET single
- [ ] useCreateProject() - POST
- [ ] useUpdateProject() - PUT
- [ ] useDeleteProject() - DELETE con optimistic
- [ ] JSDoc completo con ejemplos
- [ ] Types exportados

### use-customers.ts

- [ ] useCustomers(params) - GET list
- [ ] useCustomer(id) - GET single
- [ ] useCreateCustomer() - POST
- [ ] useUpdateCustomer() - PUT
- [ ] useDeleteCustomer() - DELETE con optimistic
- [ ] JSDoc completo con ejemplos
- [ ] Types exportados

### use-payments.ts

- [ ] usePayments(params) - GET list
- [ ] useSearchProjects(search) - Helper para búsqueda
- [ ] useCustomerProjects(customerId) - Helper para customer
- [ ] useCreatePayment() - POST con validaciones pre-fetch
- [ ] useUpdatePayment() - PUT
- [ ] useDeletePayment() - DELETE con optimistic
- [ ] JSDoc completo con ejemplos
- [ ] Types exportados

### use-aftersales.ts (NUEVO)

- [ ] useAftersales(params) - GET list
- [ ] useAftersale(id) - GET single
- [ ] useCreateAftersale() - POST
- [ ] useUpdateAftersale() - PUT
- [ ] useDeleteAftersale() - DELETE con optimistic
- [ ] JSDoc completo con ejemplos
- [ ] Types exportados

### use-installments.ts (NUEVO)

- [ ] useInstallments(params) - GET list
- [ ] useMarkInstallmentAsPaid() - PATCH .../ mark-as-paid
- [ ] useMarkInstallmentAsPending() - PATCH .../mark-as-pending
- [ ] JSDoc completo con ejemplos
- [ ] Types exportados

---

## 📝 Documentación: hooks/queries/README.md

````markdown
# React Query Hooks

Hooks especializados por entidad usando @tanstack/react-query.

## Convenciones

### Query Keys

- Lista: `['entity', params]`
- Single: `['entity', id]`

Ejemplo:

```typescript
;['projects', { page: 1, customerId: 'abc' }][('projects', 'project-uuid-123')] // Lista filtrada // Single item
```
````

### Stale Time

- Queries de negocio: 5 minutos
- Búsquedas: 30 segundos

### Mutations

- CREATE: No optimistic (backend puede cambiar data)
- UPDATE: No optimistic (backend puede cambiar data)
- DELETE: SÍ optimistic (mejor UX)

### Invalidaciones

Usar predicates para invalidar múltiples families:

```typescript
queryClient.invalidateQueries({
  predicate: (query) => {
    const key = query.queryKey[0]
    return ['entity1', 'entity2'].includes(key)
  },
})
```

## Hooks Disponibles

- [use-projects.ts](./use-projects.ts) - Gestión de proyectos
- [use-customers.ts](./use-customers.ts) - Gestión de clientes
- [use-payments.ts](./use-payments.ts) - Gestión de pagos
- [use-aftersales.ts](./use-aftersales.ts) - Gestión de postventa
- [use-installments.ts](./use-installments.ts) - Gestión de cuotas

```

---

## 🚀 Siguiente Fase

→ **[Fase 5: Testing Strategy](./fase-5-testing-strategy.md)**

---

**Última actualización:** 2025-11-12
```
