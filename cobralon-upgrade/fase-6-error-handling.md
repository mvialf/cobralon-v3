# 🚨 Fase 6: Error Handling Mejorado

**Prioridad:** 🟢 Media | **Esfuerzo:** 2-3 días | **Riesgo:** Bajo

**Prerequisito:** Fases anteriores completadas

---

## 📋 Objetivo

Implementar **error types diferenciados** para UX más clara y mejor debugging.

---

## 🔧 Implementación

**Crear:** `lib/errors.ts`

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createApiError(response: Response, fallback: string): ApiError {
  // Parsear error del backend si existe
  const errorData = await response.json().catch(() => ({}))

  return new ApiError(errorData.error || fallback, response.status, errorData.code)
}
```

**Actualizar hooks:**

```typescript
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al eliminar proyecto')
      }
    },
    onError: (error: ApiError) => {
      // Error handling diferenciado
      if (error.statusCode === 409) {
        toast.error(`Conflicto: ${error.message}`)
      } else if (error.statusCode >= 500) {
        toast.error('Error del servidor. Intente más tarde')
        // Log to monitoring service
      } else if (error.statusCode === 401) {
        toast.error('Sesión expirada')
        // Redirect to login
      } else {
        toast.error(error.message)
      }
    },
  })
}
```

---

## ✅ Checklist

- [ ] ApiError class creada
- [ ] createApiError helper
- [ ] Todos los hooks usan ApiError
- [ ] Error handling diferenciado por status code
- [ ] Tests de error handling

---

**Última actualización:** 2025-11-12
