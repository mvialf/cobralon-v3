# 🧪 Fase 5: Testing Strategy para Hooks

**Prioridad:** 🟡 Alta | **Esfuerzo:** 3-5 días | **Riesgo:** Medio

**Prerequisito:** Fase 4 completada

---

## 📋 Objetivo

Implementar tests para hooks de React Query, enfocándose en:

- ✅ Optimistic updates
- ✅ Rollback en errors
- ✅ Invalidaciones correctas
- ✅ Loading states

**Target:** 80%+ coverage en hooks críticos

---

## 🔧 Setup de Testing

```bash
# Ya instaladas en el proyecto
npm install --save-dev vitest @vitejs/plugin-react
npm install --save-dev @testing-library/react @testing-library/user-event
npm install --save-dev jsdom
```

**Crear helper:** `hooks/queries/__tests__/utils.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // No retry en tests
        gcTime: 0,    // No cache en tests
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}
```

---

## 📝 Template de Test

**Crear:** `hooks/queries/__tests__/use-projects.test.tsx`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '../use-projects'
import { createWrapper, createQueryClient } from './utils'

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET list', () => {
    it('fetches projects successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [{ id: '1', projectName: 'Test' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      })

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.projects).toHaveLength(1)
      expect(result.current.data?.projects[0].projectName).toBe('Test')
    })

    it('handles errors correctly', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error?.message).toBe('Network error')
    })
  })

  describe('GET single', () => {
    it('fetches single project', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', projectName: 'Test' }),
      })

      const { result } = renderHook(() => useProject('1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.projectName).toBe('Test')
    })

    it('no ejecuta si no hay ID', () => {
      const { result } = renderHook(() => useProject(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetching).toBe(false)
    })
  })

  describe('DELETE con optimistic update', () => {
    it('hace optimistic update correctamente', async () => {
      const queryClient = createQueryClient()

      // Pre-populate cache
      queryClient.setQueryData(['projects'], {
        projects: [
          { id: '1', projectName: 'Project 1' },
          { id: '2', projectName: 'Project 2' },
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      })

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      await act(async () => {
        result.current.mutate('1')
      })

      // Verificar optimistic update (antes de onSuccess)
      const dataAfterOptimistic = queryClient.getQueryData(['projects'])
      expect(dataAfterOptimistic.projects).toHaveLength(1)
      expect(dataAfterOptimistic.projects[0].id).toBe('2')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('hace rollback en error', async () => {
      const queryClient = createQueryClient()

      // Pre-populate cache
      const originalData = {
        projects: [
          { id: '1', projectName: 'Project 1' },
          { id: '2', projectName: 'Project 2' },
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      }

      queryClient.setQueryData(['projects'], originalData)

      // Mock fetch para fallar
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      await act(async () => {
        result.current.mutate('1')
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      // Verificar rollback
      const dataAfterRollback = queryClient.getQueryData(['projects'])
      expect(dataAfterRollback).toEqual(originalData)
    })
  })

  describe('CREATE mutation', () => {
    it('invalida queries en success', async () => {
      const queryClient = createQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '3', projectName: 'New Project' }),
      })

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      await act(async () => {
        result.current.mutate({ projectName: 'New Project', /* ... */ })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Verificar que se llamó invalidateQueries
      expect(invalidateSpy).toHaveBeenCalled()
    })
  })
})
```

---

## 📋 Checklist de Tests

### use-projects.test.tsx

- [ ] GET list - success
- [ ] GET list - error handling
- [ ] GET single - success
- [ ] GET single - enabled guard
- [ ] CREATE - invalidations
- [ ] UPDATE - invalidations
- [ ] DELETE - optimistic update
- [ ] DELETE - rollback en error

### use-customers.test.tsx

- [ ] (mismo patrón)

### use-payments.test.tsx

- [ ] CREATE - validaciones pre-fetch
- [ ] (resto del patrón)

---

## 🚀 Siguiente Fase

→ **[Fase 6: Error Handling Mejorado](./fase-6-error-handling.md)**

---

**Última actualización:** 2025-11-12
