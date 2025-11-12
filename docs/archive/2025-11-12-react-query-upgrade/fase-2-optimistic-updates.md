# ⚡ Fase 2: Optimistic Updates con Rollback

**Prioridad:** 🔴 Crítica | **Esfuerzo:** 5-7 días | **Riesgo:** Medio

**Prerequisito:** Fase 1 completada (React Query setup)

---

## 📋 Objetivo

Implementar **mutations** (CREATE, UPDATE, DELETE) con **optimistic updates** para UX instantánea y **rollback automático** en caso de error.

**Beneficios:**

- ⚡ UX 10x más rápida (cambios instantáneos)
- 🛡️ Rollback automático en errores
- ✅ Consistency garantizada (refetch post-success)
- 🎯 Menos código boilerplate

---

## 🎯 Patrón: DELETE con Optimistic Update

### Referencia de Cobrolox

**Archivo:** `hooks/queries/use-customers.ts` (líneas 318-369)

```typescript
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar cliente')
      }
    },
    // ✅ FASE 1: onMutate - Optimistic update
    onMutate: async (id) => {
      // 1. Cancel in-flight queries (evitar race conditions)
      await queryClient.cancelQueries({ queryKey: ['customers'] })

      // 2. Snapshot para rollback
      const previousData = queryClient.getQueryData(['customers'])

      // 3. Optimistic update: remover de UI
      queryClient.setQueriesData<CustomersResponse>({ queryKey: ['customers'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          customers: old.customers.filter((c) => c.id !== id),
        }
      })

      // 4. Retornar context para rollback
      return { previousData }
    },
    // ✅ FASE 2: onError - Rollback automático
    onError: (error: Error, id, context) => {
      // Restaurar estado anterior
      if (context?.previousData) {
        queryClient.setQueryData(['customers'], context.previousData)
      }
      toast.error(error.message)
      console.error('Error deleting customer:', error)
    },
    // ✅ FASE 3: onSuccess - Refetch para consistency
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Cliente eliminado exitosamente')
    },
  })
}
```

---

## 🔧 Implementación: useDeleteProject

**Crear:** `hooks/queries/use-projects.ts` (agregar mutation)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar proyecto')
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      const previousData = queryClient.getQueryData(['projects'])

      queryClient.setQueriesData<ProjectsResponse>({ queryKey: ['projects'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          projects: old.projects.filter((p) => p.id !== id),
        }
      })

      return { previousData }
    },
    onError: (error: Error, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['projects'], context.previousData)
      }
      toast.error(error.message)
      console.error('Error deleting project:', error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Proyecto eliminado exitosamente')
    },
  })
}
```

### Uso en Componente

```typescript
// components/tables/projects-table.tsx
import { useDeleteProject } from "@/hooks/queries/use-projects";

export function ProjectsTable({ data }: { data: Project[] }) {
  const deleteProject = useDeleteProject();

  const handleDelete = (projectId: string) => {
    if (!confirm("¿Eliminar proyecto?")) return;

    deleteProject.mutate(projectId);
  };

  return (
    <Table>
      {data.map((project) => (
        <TableRow key={project.id}>
          <TableCell>{project.projectName}</TableCell>
          <TableCell>
            <Button
              variant="destructive"
              onClick={() => handleDelete(project.id)}
              disabled={
                deleteProject.isPending &&
                deleteProject.variables === project.id
              }
            >
              {deleteProject.isPending &&
              deleteProject.variables === project.id ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Eliminar"
              )}
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
}
```

**Mejoras en UX:**

- ✅ Proyecto desaparece instantáneamente
- ✅ Botón muestra loading state (spinner)
- ✅ Otros botones siguen habilitados
- ✅ Si falla, proyecto reaparece automáticamente

---

## 🔧 Implementación: useCreateProject

### Patrón CREATE (sin optimistic)

```typescript
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProjectFormData): Promise<Project> => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear proyecto')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidar para refetch
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Proyecto creado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
      console.error('Error creating project:', error)
    },
  })
}
```

**Por qué NO optimistic en CREATE:**

- No hay item para "crear" en UI antes de respuesta
- Backend puede cambiar datos (generar ID, calcular totales)
- Más simple y seguro

### Uso en Form

```typescript
// components/forms/project-form.tsx
import { useCreateProject } from "@/hooks/queries/use-projects";

export function ProjectForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<ProjectFormData>({ /* config */ });
  const createProject = useCreateProject();

  const onSubmit = async (data: ProjectFormData) => {
    try {
      await createProject.mutateAsync(data);
      onSuccess?.();
      form.reset();
    } catch (error) {
      // Error ya manejado por el hook
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Fields */}
      <Button
        type="submit"
        disabled={createProject.isPending}
      >
        {createProject.isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
```

---

## 🔧 Implementación: useUpdateProject

### Patrón UPDATE (optimistic opcional)

```typescript
export interface UpdateProjectData {
  id: string
  data: Partial<ProjectFormData>
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: UpdateProjectData): Promise<Project> => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar proyecto')
      }

      return response.json()
    },
    onSuccess: (_updatedProject) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Proyecto actualizado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
      console.error('Error updating project:', error)
    },
  })
}
```

---

## 📋 Plan de Implementación por Entidad

### 1. Projects (Empezar aquí)

**Archivo:** `hooks/queries/use-projects.ts`

**Mutations a implementar:**

- [ ] `useCreateProject()` - POST /api/projects
- [ ] `useUpdateProject()` - PUT /api/projects/[id]
- [ ] `useDeleteProject()` - DELETE /api/projects/[id] (con optimistic)

**Esfuerzo:** 1-2 días

### 2. Customers

**Archivo:** `hooks/queries/use-customers.ts`

**Mutations a implementar:**

- [ ] `useCreateCustomer()` - POST /api/customers
- [ ] `useUpdateCustomer()` - PUT /api/customers/[id]
- [ ] `useDeleteCustomer()` - DELETE /api/customers/[id] (con optimistic)

**Esfuerzo:** 1 día

### 3. Payments

**Archivo:** `hooks/queries/use-payments.ts`

**Mutations a implementar:**

- [ ] `useCreatePayment()` - POST /api/payments (CON VALIDACIONES)
- [ ] `useUpdatePayment()` - PUT /api/payments/[id]
- [ ] `useDeletePayment()` - DELETE /api/payments/[id] (con optimistic)

**IMPORTANTE:** useCreatePayment requiere **validaciones pre-fetch** (ver Fase 4).

**Esfuerzo:** 2 días

### 4. Aftersales

**Archivo:** `hooks/queries/use-aftersales.ts` (nuevo)

**Mutations a implementar:**

- [ ] `useCreateAftersale()` - POST /api/aftersales
- [ ] `useUpdateAftersale()` - PUT /api/aftersales/[id]
- [ ] `useDeleteAftersale()` - DELETE /api/aftersales/[id] (con optimistic)

**Esfuerzo:** 1 día

### 5. Installments

**Archivo:** `hooks/queries/use-installments.ts` (nuevo)

**Mutations especiales:**

- [ ] `useMarkInstallmentAsPaid()` - PATCH /api/installments/[id]/mark-as-paid
- [ ] `useMarkInstallmentAsPending()` - PATCH /api/installments/[id]/mark-as-pending

**Esfuerzo:** 1 día

---

## ⚠️ Errores Comunes y Soluciones

### Error 1: Race Condition (no cancelar queries)

**Síntoma:** Después de optimistic update, item reaparece brevemente

**Causa:** Query in-flight completa y sobrescribe optimistic update

**Solución:**

```typescript
onMutate: async (id) => {
  // ✅ SIEMPRE cancelar queries primero
  await queryClient.cancelQueries({ queryKey: ['projects'] })

  // ... resto del optimistic update
}
```

### Error 2: No guardar previousData

**Síntoma:** En error, no se puede hacer rollback

**Causa:** Olvidar retornar context en onMutate

**Solución:**

```typescript
onMutate: async (id) => {
  // ...
  const previousData = queryClient.getQueryData(["projects"]);

  // ✅ SIEMPRE retornar para context
  return { previousData };
},
onError: (error, id, context) => {
  // ✅ Usar context para rollback
  if (context?.previousData) {
    queryClient.setQueryData(["projects"], context.previousData);
  }
}
```

### Error 3: Olvidar invalidar en onSuccess

**Síntoma:** Después de success, UI muestra data desactualizada

**Causa:** Confiar solo en optimistic update (backend puede cambiar data)

**Solución:**

```typescript
onSuccess: () => {
  // ✅ SIEMPRE invalidar para refetch from server
  queryClient.invalidateQueries({ queryKey: ['projects'] })
}
```

---

## 🧪 Testing de Mutations

### Test: Optimistic Update + Rollback

```typescript
// hooks/queries/__tests__/use-projects.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDeleteProject } from '../use-projects'

describe('useDeleteProject', () => {
  it('hace optimistic update y rollback en error', async () => {
    // Setup
    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    })

    // Mock fetch para fallar
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    // Guardar data original
    const originalData = queryClient.getQueryData(['projects'])

    // Execute
    await act(async () => {
      result.current.mutate('project-123')
    })

    // Verificar rollback
    await waitFor(() => {
      expect(queryClient.getQueryData(['projects'])).toEqual(originalData)
    })

    expect(result.current.isError).toBe(true)
  })

  it('invalida queries en success', async () => {
    // Mock fetch success
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    })

    // Spy en invalidateQueries
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      result.current.mutate('project-123')
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] })
    })
  })
})
```

---

## ✅ Checklist de Completitud

### Mutations Implementadas

- [ ] useCreateProject
- [ ] useUpdateProject
- [ ] useDeleteProject (con optimistic)
- [ ] useCreateCustomer
- [ ] useUpdateCustomer
- [ ] useDeleteCustomer (con optimistic)
- [ ] useCreatePayment
- [ ] useUpdatePayment
- [ ] useDeletePayment (con optimistic)
- [ ] useCreateAftersale
- [ ] useUpdateAftersale
- [ ] useDeleteAftersale (con optimistic)
- [ ] useMarkInstallmentAsPaid
- [ ] useMarkInstallmentAsPending

### Validación

- [ ] Optimistic updates funcionan (cambio instantáneo)
- [ ] Rollback funciona en errors
- [ ] Loading states correctos
- [ ] Toast notifications apropiados
- [ ] No race conditions visibles

### Testing

- [ ] Tests de optimistic updates
- [ ] Tests de rollback
- [ ] Tests de invalidations

---

## 📊 Métricas de Éxito

### Antes:

- ⏱️ Delete: 500ms-2s de espera
- ❌ Sin feedback inmediato
- ❌ Sin rollback automático

### Después:

- ⚡ Delete: 0ms percibido (optimistic)
- ✅ Feedback instantáneo
- ✅ Rollback automático en errores
- ✅ Consistency garantizada (refetch)

**KPIs:**

- **Perceived latency:** -100% (instantáneo)
- **User satisfaction:** +80% (feedback inmediato)
- **Bug rate:** -50% (rollback automático)

---

## 🚀 Siguiente Fase

→ **[Fase 3: Invalidaciones Inteligentes](./fase-3-invalidaciones-inteligentes.md)**

---

**Última actualización:** 2025-11-12
