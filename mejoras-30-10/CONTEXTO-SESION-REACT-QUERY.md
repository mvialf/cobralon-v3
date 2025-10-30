# Contexto de Sesión: Implementación React Query

**Fecha:** 2025-10-30
**Estado:** Sprint 2 - Día 1 COMPLETADO (Hooks de Payments) ✅
**Próximo:** Sprint 2 - Día 2 (Tests de Payments)

---

## 📊 Estado Actual de Implementación

### ✅ Completado (Sprint 1)

| Tarea | Archivo(s) | Líneas Reducidas | Status |
|-------|-----------|------------------|---------|
| 1. Eliminar `as any` en columns | `app/projects/columns.tsx` | N/A | ✅ DONE |
| 2. React Query Provider | `components/providers/query-provider.tsx` | N/A | ✅ DONE |
| 3. Hooks de Projects | `hooks/queries/use-projects.ts` | +382 líneas | ✅ DONE |
| 4. Migrar página Projects | `app/projects/page.tsx` | -69 líneas (-35%) | ✅ DONE |

### ✅ Completado (Sprint 2 - Día 1)

| Tarea | Archivo(s) | Líneas | Status |
|-------|-----------|--------|---------|
| 5. Hooks de Payments | `hooks/queries/use-payments.ts` | +576 líneas | ✅ DONE |

### ⏳ Pendiente (Sprint 2)

| Tarea | Complejidad | Estimado | Prioridad |
|-------|-------------|----------|-----------|
| 6. Tests de Payments | Media | 2-3 hrs | 🔴 P0 |
| 7. Migrar página Payments | Media | 2-3 hrs | 🟡 P1 |
| 8. Hooks de Customers | Baja | 1-2 hrs | 🟢 P2 |
| 9. Migrar página Customers | Baja | 1-2 hrs | 🟢 P2 |
| 10. Documentar patterns | Baja | 1 hr | 🟢 P2 |

**Total restante Sprint 2:** 7-12 horas (~1.5-2 días)

---

## 🎯 Lo Que Se Logró

### 1. Eliminación de Type Safety Issues

**Problema:** `as any` rompía inferencia de tipos en DataTable

**Solución:**
```typescript
// ❌ ANTES
const handleStatusChange = (table.options.meta as any)?.handleStatusChange

// ✅ DESPUÉS
interface ProjectsTableMeta {
  handleStatusChange?: (projectId: string, newStatusId: string) => Promise<void>
}

function getProjectsTableMeta(table: any): ProjectsTableMeta {
  return (table.options.meta || {}) as ProjectsTableMeta
}

const { handleStatusChange } = getProjectsTableMeta(table)
```

**Archivo:** `app/projects/columns.tsx:56-70`

---

### 2. React Query Provider Optimizado

**Configuración:**
```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 min fresh
      gcTime: 5 * 60 * 1000,       // 5 min garbage collection
      retry: 1,                     // 1 auto retry
      refetchOnWindowFocus: true,   // Multi-tab sync
      refetchOnReconnect: true,     // Refetch on reconnect
    },
  },
})
```

**Features:**
- ✅ React Query Devtools (development only, bottom-left)
- ✅ Persistent QueryClient (useState para evitar recreación)
- ✅ JSDoc completa

**Archivo:** `components/providers/query-provider.tsx`

---

### 3. Hooks Centralizados de Projects (7 hooks)

**Archivo:** `hooks/queries/use-projects.ts` (382 líneas)

#### Hooks Implementados:

```typescript
// 1. Query con metadata (optimizado para carga de página)
useProjectsWithMetadata(params) → { data, isLoading }
// Returns: { projects: Project[], metadata: { projectStatuses: Status[] } }

// 2. Query simple de lista
useProjects(params) → { data, isLoading, error }
// Returns: { projects: Project[], pagination: PaginationInfo }

// 3. Query de proyecto individual
useProject(id) → { data, isLoading, error }
// Returns: Project | undefined

// 4. Mutation: Create
useCreateProject() → { mutate, mutateAsync, isPending }

// 5. Mutation: Update
useUpdateProject() → { mutate, mutateAsync, isPending }

// 6. Mutation: Delete (con optimistic updates)
useDeleteProject() → { mutate, mutateAsync, isPending }

// 7. Mutation: Update Status (especializado)
useUpdateProjectStatus() → { mutate, mutateAsync, isPending, variables }
```

#### Convenciones Implementadas:

**Query Keys:**
- Lista: `['projects', params]`
- Individual: `['projects', id]`
- Con metadata: `['projects-with-metadata', params]`

**Auto-Invalidación:**
- Create → invalida `['projects']` (refetch automático)
- Update → invalida `['projects']` + `['projects', id]`
- Delete → optimistic update + rollback on error
- UpdateStatus → invalida `['projects']`

**Error Handling:**
- Toast automático en mutations (success/error)
- Rollback automático en delete si falla
- Logs en console para debugging

---

### 4. Migración de Página Projects

**Antes (197 líneas):**
```typescript
const [projects, setProjects] = useState<Project[]>([])
const [statuses, setStatuses] = useState<ProjectStatus[]>([])
const [isLoading, setIsLoading] = useState(true)
const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null)

const fetchProjects = useCallback(async () => {
  try {
    setIsLoading(true)
    const response = await fetch(`/api/projects-with-metadata?projectState=${projectState}`)
    // ... 30+ líneas de lógica manual
  } finally {
    setIsLoading(false)
  }
}, [projectState])

useEffect(() => {
  fetchProjects()
}, [fetchProjects])

const handleProjectCreated = () => { fetchProjects() }
const handleProjectUpdated = () => { fetchProjects() }
const handleProjectDeleted = () => { fetchProjects() }

const handleStatusChange = async (projectId, statusId) => {
  // ... 30+ líneas de fetch + state update manual
}
```

**Después (128 líneas):**
```typescript
const { data, isLoading } = useProjectsWithMetadata({ projectState })
const updateStatusMutation = useUpdateProjectStatus()

const projects = data?.projects || []
const statuses = data?.metadata.projectStatuses || []

const handleStatusChange = async (projectId, statusId) => {
  await updateStatusMutation.mutateAsync({ projectId, statusId })
}

// ✅ No callbacks necesarios - React Query auto-invalida
```

**Reducción:**
- ❌ 4 useState → ✅ 1 useState (solo projectState)
- ❌ 1 useCallback → ✅ 0
- ❌ 1 useEffect → ✅ 0
- ❌ 3 callbacks manuales → ✅ 0 (auto-invalidación)
- ❌ ~80 líneas de lógica manual → ✅ ~10 líneas con hooks

**Archivo:** `app/projects/page.tsx`

---

### 5. Migración de New Project Dialog

**Antes:**
```typescript
const [isSubmitting, setIsSubmitting] = useState(false)

const handleSubmit = async (data) => {
  setIsSubmitting(true)
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al crear proyecto')
    }

    toast.success('Proyecto creado exitosamente')
    setOpen(false)
    onProjectCreated?.()
  } catch (error) {
    toast.error(error.message)
  } finally {
    setIsSubmitting(false)
  }
}
```

**Después:**
```typescript
const createMutation = useCreateProject()

const handleSubmit = async (data) => {
  try {
    await createMutation.mutateAsync(data)
    setOpen(false)
    onProjectCreated?.()
  } catch (error) {
    // Error ya manejado por el hook
  }
}

// Loading state: createMutation.isPending
```

**Archivo:** `components/dialogs/projects/new-project-dialog.tsx`

---

## 🔍 Detalles Técnicos Importantes

### API Endpoint Especial: `/api/projects-with-metadata`

**Razón:** Optimización de red - fetch projects + statuses en 1 llamada

```typescript
// GET /api/projects-with-metadata?projectState=Activo
{
  projects: Project[],
  metadata: {
    projectStatuses: Array<{
      id, name,
      color: { bgClass }
    }>
  }
}
```

**Hook correspondiente:** `useProjectsWithMetadata()`

---

### Optimistic Updates en Delete

```typescript
useDeleteProject() {
  return useMutation({
    // 1. Optimistic: remover de UI inmediatamente
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      const previousData = queryClient.getQueryData(['projects'])

      queryClient.setQueriesData({ queryKey: ['projects'] }, (old) => ({
        ...old,
        projects: old.projects.filter(p => p.id !== id)
      }))

      return { previousData }
    },

    // 2. Rollback si falla
    onError: (error, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['projects'], context.previousData)
      }
      toast.error(error.message)
    },

    // 3. Refetch para consistencia
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Proyecto eliminado')
    }
  })
}
```

---

### Mutation Variables en Pending State

```typescript
// Saber QUÉ proyecto está siendo actualizado
const updateStatusMutation = useUpdateProjectStatus()

const updatingProjectId = updateStatusMutation.isPending
  ? updateStatusMutation.variables?.projectId
  : null

// Pasar a EditableBadge para mostrar spinner
<EditableBadge isPending={updatingProjectId === project.id} />
```

---

## 📋 Plan de Acción para Próxima Sesión

### ✅ Sprint 2 - Día 1: Hooks de Payments (COMPLETADO) 🎉

**Archivo creado:** `hooks/queries/use-payments.ts` (576 líneas)

**Complejidad:** ALTA - Payments tienen lógica de allocations

#### Hooks Implementados:

```typescript
// 1. Query: Lista con filtros y paginación
usePayments(params: {
  page, limit, customerId?, projectId?, dateRange?
}) → { data, isLoading, error }
// Returns: { payments: Payment[], pagination: PaginationInfo }

// 2. Query: Buscar proyectos con balance > 0 (auxiliar para formularios)
useSearchProjects(params: {
  search, limit?
}) → { data, isLoading }
// Returns: ProjectWithBalance[] (enabled cuando search.length >= 2)

// 3. Query: Proyectos de cliente específico (auxiliar para formularios)
useCustomerProjects(customerId: string) → { data, isLoading }
// Returns: ProjectWithBalance[] (enabled cuando customerId existe)

// 4. Mutation: Create payment CON allocations y validaciones
useCreatePayment() → { mutate, mutateAsync, isPending }
// Validaciones frontend:
//   - type === "Project" → allocations.length === 1
//   - type === "Customer" → allocations.length >= 1
//   - SUM(allocations) === amount (tolerancia 0.01)
//   - No projectIds duplicados

// 5. Mutation: Update payment (campos limitados)
useUpdatePayment() → { mutate, mutateAsync, isPending }
// ⚠️ Backend bloquea edición si payment tiene cuotas configuradas

// 6. Mutation: Delete payment (hard delete con CASCADE)
useDeletePayment() → { mutate, mutateAsync, isPending }
// Optimistic update + rollback on error
// CASCADE automático: elimina Installments y PaymentAllocations
```

**⚠️ CORRECCIÓN IMPORTANTE:** Payment NO tiene campo `status`. El modelo solo tiene:
- Installment tiene status ("pending" | "paid")
- Payment NO tiene estados ACTIVE/CANCELED
- Delete es hard delete, no soft delete

#### Validaciones Implementadas:

**Frontend (pre-fetch en useCreatePayment):**
```typescript
1. type === "Project" → allocations.length === 1
2. type === "Customer" → allocations.length >= 1
3. SUM(allocations.allocatedAmount) === amount (tolerancia 0.01)
4. No projectIds duplicados
```

**Backend (en API route):**
```typescript
5. Todos los projectIds pertenecen al mismo customerId
6. Todos los projects tienen misma currency
// Estas requieren fetch de proyectos, por eso están en backend
```

#### Invalidaciones Implementadas (Predicate-Based):

```typescript
// Create payment → invalida con predicate (batch eficiente):
queryClient.invalidateQueries({
  predicate: (query) => {
    const key = query.queryKey[0]
    if (key === 'payments') return true        // Todas las queries de payments
    if (key === 'projects') return true        // Balance de projects cambió
    if (key === 'search-projects') return true // Búsqueda de projects
    if (key === 'customer-projects' &&
        query.queryKey[1] === createdPayment.customerId) {
      return true  // Projects del cliente específico
    }
    return false
  }
})

// Delete payment → optimistic update + invalidación igual que create
// Rollback automático si falla
```

---

### Prioridad 1 (Siguiente): Tests de Mutations 🔴

**Archivo a crear:** `hooks/queries/__tests__/use-payments.test.ts` (~200 líneas)

**Tests críticos a implementar:**

```typescript
describe('useCreatePayment', () => {
  it('debe crear pago 1:1 (tipo Project)', async () => {
    // Mock API response
    // Verificar que se llama POST /api/payments
    // Verificar que invalida ['payments'] y ['projects']
  })

  it('debe crear pago 1:N (tipo Customer)', async () => {
    // Verificar múltiples allocations
    // Verificar SUM(allocations) === amount
  })

  it('debe rechazar si allocations no suman amount', async () => {
    // Verificar que lanza error ANTES del fetch
    // Verificar que NO se crea el pago
  })

  it('debe rechazar si hay projectIds duplicados', async () => {
    // Validación de negocio frontend
  })
})

describe('useDeletePayment', () => {
  it('debe eliminar payment con optimistic update', async () => {
    // Verificar DELETE /api/payments/[id]
    // Verificar optimistic update (desaparece de UI inmediatamente)
    // Verificar rollback si falla
  })
})

describe('useUpdatePayment', () => {
  it('debe actualizar campos permitidos', async () => {
    // amount, date, paymentMethodId, reference, notes
  })
})
```

---

### Prioridad 3: Migrar Página Payments 🟡

**Archivo:** `app/payments/page.tsx`

**Cambios esperados:**
- Reemplazar fetch manual con `usePayments()`
- Eliminar state management manual (useState + useEffect)
- Usar mutations hooks para acciones (cancel, delete)

---

## 🚨 Puntos de Atención para Payments

### 1. Lógica de Allocations

**Payment puede tener:**
- 1 allocation (tipo "Project")
- N allocations (tipo "Customer")

**Validación crítica:**
```typescript
// SIEMPRE verificar antes de crear
const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
if (Math.abs(totalAllocated - payment.amount) > 0.01) {
  throw new Error('Allocations no suman el monto total')
}
```

### 2. Delete Behavior (Hard Delete)

**Delete payment:**
- Elimina completamente el registro de DB
- CASCADE automático (configurado en Prisma schema):
  - Elimina PaymentAllocations relacionados
  - Elimina Installments relacionados
- Libera balance de proyectos automáticamente
- Optimistic update: desaparece de UI inmediatamente
- Rollback automático si falla el DELETE
- UI: Confirmar con dialog destructivo (AcceptableUseDialog)

### 3. Invalidaciones de Cache

**Escenario:** Crear pago a Proyecto A

```typescript
// Queries que deben refetchear:
1. ['payments'] → Lista de todos los pagos
2. ['payments', paymentId] → Detalle del nuevo pago
3. ['projects'] → Lista de proyectos (balance cambió)
4. ['projects', projectId] → Detalle del Proyecto A (balance cambió)
5. ['customers', customerId] → Detalle del cliente (si implementamos)
```

**Usar invalidación con predicado:**
```typescript
queryClient.invalidateQueries({
  predicate: (query) => {
    // Invalidar todas las queries de projects
    if (query.queryKey[0] === 'projects') return true

    // Invalidar todas las queries de payments
    if (query.queryKey[0] === 'payments') return true

    return false
  }
})
```

### 4. Loading States con mutation.variables

**Saber QUÉ payment está siendo procesado:**
```tsx
// Cada payment puede tener: Ver, Editar, Eliminar
// Usa mutation.variables para identificar el registro activo

const deleteMutation = useDeletePayment()

// En columna de acciones:
<Button
  onClick={() => deleteMutation.mutate(payment.id)}
  disabled={
    deleteMutation.isPending && deleteMutation.variables === payment.id
  }
>
  {deleteMutation.isPending && deleteMutation.variables === payment.id
    ? <Loader2 className="animate-spin" />
    : 'Eliminar'}
</Button>
```

---

## 📁 Archivos de Referencia

### Implementados (Copiar Patterns de Aquí)

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `hooks/queries/use-projects.ts` | 382 | TEMPLATE para otros hooks |
| `hooks/queries/use-payments.ts` | 576 | ✅ **6 hooks con validaciones críticas** |
| `app/projects/page.tsx` | 128 | TEMPLATE para app/payments/page.tsx |
| `components/dialogs/projects/new-project-dialog.tsx` | 92 | Mutation en dialog |
| `app/projects/columns.tsx` | Type-safe table meta | Patrón de callbacks en DataTable |

### Pendientes (Implementar Siguiente)

| Archivo | Tamaño Estimado | Complejidad |
|---------|-----------------|-------------|
| `hooks/queries/__tests__/use-payments.test.ts` | ~200 líneas | 🔴 Media-Alta |
| `app/payments/page.tsx` (refactor) | -60 líneas aprox | 🟡 Media |
| `hooks/queries/use-customers.ts` | ~200 líneas | 🟢 Baja |
| `app/customers/page.tsx` (refactor) | -40 líneas aprox | 🟢 Baja |

---

## 🎓 Patterns Aprendidos

### 1. Hooks con Metadata Combinada

**Cuándo usar:**
```typescript
// ✅ SI la página necesita data + metadata en carga inicial
useProjectsWithMetadata() // projects + statuses en 1 llamada

// ✅ SI son queries independientes
useProjects() // solo projects
useProjectStatuses() // solo statuses (query separado)
```

### 2. Mutation Variables para Loading States

```typescript
const mutation = useMutation(...)

// Acceder a variables en pending:
mutation.variables?.projectId // El ID que se está actualizando

// Usar en UI:
isPending={mutation.isPending && mutation.variables?.id === item.id}
```

### 3. Optimistic Updates Pattern

```typescript
useMutation({
  // 1. Update optimista
  onMutate: async (data) => {
    await queryClient.cancelQueries({ queryKey: ['resource'] })
    const previous = queryClient.getQueryData(['resource'])

    queryClient.setQueryData(['resource'], (old) => {
      // ... update optimista
    })

    return { previous }
  },

  // 2. Rollback si falla
  onError: (err, data, context) => {
    queryClient.setQueryData(['resource'], context.previous)
  },

  // 3. Refetch para consistencia
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] })
  }
})
```

### 4. Invalidación Inteligente

```typescript
// ❌ MAL: Invalidar todo
queryClient.invalidateQueries()

// ✅ BIEN: Invalidar específico
queryClient.invalidateQueries({ queryKey: ['projects'] })

// ✅ MEJOR: Invalidar múltiples relacionados
queryClient.invalidateQueries({
  predicate: (query) => {
    const key = query.queryKey[0]
    return key === 'projects' || key === 'payments'
  }
})
```

---

## 🔧 Herramientas y Debugging

### React Query Devtools

**Ubicación:** Bottom-left en development

**Features:**
- Ver todas las queries activas
- Ver cache actual
- Ver mutations en progreso
- Invalidar queries manualmente
- Ver query keys y data

**Shortcut:** Click en el logo flotante

---

### TypeScript Verification

```bash
npm run typecheck  # Verificar tipos
npm run lint       # ESLint
npm run format     # Prettier
```

---

### Query Key Conventions

```typescript
// Lista
['resource'] → Query de lista
['resource', params] → Lista con filtros

// Individual
['resource', id] → Query individual

// Combinada
['resource-with-metadata'] → Optimización especial
['resource-with-metadata', params] → Con filtros
```

---

## 📈 Métricas de Éxito

### Sprint 1 (Completado)

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Líneas app/projects/page.tsx** | 197 | 128 | -35% |
| **useState hooks** | 4 | 1 | -75% |
| **Fetch manual** | 2 lugares | 0 | -100% |
| **Callbacks manuales** | 3 | 0 | -100% |
| **Type errors** | 1 (`as any`) | 0 | ✅ |

### Sprint 2 (Esperado)

| Métrica | Objetivo |
|---------|----------|
| **Líneas app/payments/page.tsx** | -40% (~60 líneas menos) |
| **Líneas app/customers/page.tsx** | -30% (~40 líneas menos) |
| **Fetch manual en proyecto** | 0 (100% React Query) |
| **Test coverage** | >80% en mutations críticas |

---

## 🚀 Comando de Inicio para Próxima Sesión

```bash
# 1. Verificar estado actual
git status
npm run typecheck

# 2. Ver devtools
npm run dev
# Abrir http://localhost:3000
# Click en devtools (bottom-left)
# Ver queries: ['projects-with-metadata']

# 3. Leer archivos de referencia
cat hooks/queries/use-projects.ts
cat app/payments/page.tsx  # Para entender qué migrar

# 4. Crear nuevo archivo
touch hooks/queries/use-payments.ts
```

---

## 💡 Notas Finales

### ✅ Lo Que Se Logró en Día 1

1. **6 Hooks implementados:** usePayments, useSearchProjects, useCustomerProjects, useCreatePayment, useUpdatePayment, useDeletePayment
2. **4 Validaciones frontend:** type-allocations coherence, sum validation, no duplicates, type validation
3. **Optimistic updates:** Delete con rollback automático
4. **Predicate-based invalidation:** Batch eficiente de queries relacionadas
5. **JSDoc completa:** Documentación inline en cada hook
6. **Type-safe:** 0 errores TypeScript (verificado)

### Estado Real de Payments:

1. **Allocations:** Relación N:M con validación de suma ✅
2. **Tipos de pago:** "Project" (1:1) vs "Customer" (1:N) ✅
3. **Hard delete:** No estados ACTIVE/CANCELED (corrección vs doc original)
4. **Installments:** Pagos en cuotas (CASCADE automático) ✅
5. **Invalidaciones:** Predicate-based eficiente ✅

### Próximos Pasos:

1. **Día 2 (2-3 hrs):** Tests de mutations críticas 🔴 SIGUIENTE
2. **Día 3 (2-3 hrs):** Migrar app/payments/page.tsx
3. **Opcional:** Hooks de Customers + migración

**Restante Sprint 2:** 7-12 horas (~1.5-2 días)

---

**Última actualización:** 2025-10-30
**Autor:** Claude Code
**Sprint 2 - Día 1:** ✅ COMPLETADO (hooks/queries/use-payments.ts - 576 líneas)
**Próxima acción:** Crear tests `hooks/queries/__tests__/use-payments.test.ts`
