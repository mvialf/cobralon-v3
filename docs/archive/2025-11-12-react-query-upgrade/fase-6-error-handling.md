# 🚨 Fase 6: Error Handling Mejorado ✅ COMPLETADO

**Estado:** ✅ Completado (2025-11-12) | **Esfuerzo Real:** 1 día | **Riesgo:** Bajo

**Prerequisito:** Fases anteriores completadas ✅

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

- [x] ApiError class creada (lib/errors.ts)
- [x] createApiError helper implementado
- [x] handleMutationError helper centralizado
- [x] Todos los hooks refactorizados (13 mutations):
  - [x] use-projects.ts (4 mutations)
  - [x] use-customers.ts (3 mutations)
  - [x] use-payments.ts (3 mutations)
  - [x] use-aftersales.ts (3 mutations)
- [x] Error handling diferenciado por status code (400, 401, 409, 500+)
- [x] Tests mantienen 91/91 passing
- [x] TypeScript typecheck: Solo errores pre-existentes en test files
- [x] ESLint: Sin errores nuevos (solo 1 warning `any` aceptable)

---

## 🎯 Implementación Final

**Cambios Clave:**

1. **ApiError Class** con `statusCode`, `code`, `details`
2. **createApiError** async helper para construcción desde Response
3. **isApiError** type guard para type narrowing
4. **handleMutationError** helper centralizado con:
   - 400 Bad Request → Custom message o error.message
   - 401 Unauthorized → "Sesión expirada" (TODO: redirect a login)
   - 409 Conflict → Custom message o error.message
   - 500+ Server Error → "Error del servidor. Intente más tarde"
   - Otros → error.message del backend
   - Pre-fetch validations → Regular Error (sin ApiError)

**Archivos Modificados:**

- ✅ `lib/errors.ts` (CREADO - 131 líneas)
- ✅ `hooks/queries/use-projects.ts` (4 mutations refactorizadas)
- ✅ `hooks/queries/use-customers.ts` (3 mutations refactorizadas)
- ✅ `hooks/queries/use-payments.ts` (3 mutations refactorizadas)
- ✅ `hooks/queries/use-aftersales.ts` (3 mutations refactorizadas)

**Validación:**

- ✅ 91/91 tests passing
- ✅ TypeCheck: Errores solo en test files pre-existentes (NO causados por refactor)
- ✅ ESLint: Sin errores nuevos

---

**Última actualización:** 2025-11-12 (Implementación completada)
