# Patrones de Error en Cliente

## Clase `ApiError` y helpers (`lib/errors.ts`)

```typescript
// Crear ApiError desde Response
const response = await fetch('/api/payments', { method: 'POST', body })
if (!response.ok) {
  throw await createApiError(response, 'Error al crear pago')
  // → ApiError { message: 'mensaje del server', statusCode: 400, code: '...', details: ... }
}

// Type guard
if (isApiError(error)) {
  console.log(error.statusCode, error.message)
}
```

## `handleMutationError` — Toast automático

Centralizado en `lib/errors.ts`. Muestra toast según status code:

```typescript
// Uso básico — toast automático según status
onError: (error) => {
  handleMutationError(error)
}

// Con mensajes custom por status code
onError: (error) => {
  handleMutationError(error, {
    400: 'No se puede editar un pago con cuotas configuradas',
    409: 'Ya existe un pago con esa referencia',
  })
}
```

Comportamiento por defecto:
- **400** → Muestra `error.message` (mensaje del server)
- **409** → Muestra `error.message` (conflicto)
- **401** → "Sesión expirada"
- **500+** → "Error del servidor. Intente más tarde"
- **Error genérico** → `error.message` o "Error inesperado"

## Toast con sonner

Import: `import { toast } from 'sonner'`

```typescript
// Success
toast.success('Pago creado exitosamente')
toast.success('Pago creado exitosamente', {
  description: `Pago de CLP ${amount} distribuido entre ${n} proyectos`,
})

// Error (normalmente via handleMutationError)
toast.error('Error al crear pago')

// Warning (operaciones parciales)
toast.warning(`${deleted} eliminados, ${failed} con error`)
```

## Patrón completo de mutation

```typescript
export function useCreateEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEntityPayload): Promise<Entity> => {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al crear')
      }

      return response.json()
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
      toast.success('Creado exitosamente')
    },

    onError: (error) => {
      handleMutationError(error)
      console.error('Error creating entity:', error)
    },
  })
}
```

## Validación pre-fetch

Para mutations complejas (pagos), validar datos ANTES del fetch:

```typescript
mutationFn: async (data) => {
  // Validación de negocio pura (sin fetch)
  const validation = validatePaymentAllocations(data.type, data.amount, data.allocations)
  if (!validation.valid) {
    throw new Error(validation.error)  // Dispara onError directamente
  }

  // Solo entonces hacer fetch
  const response = await fetch(...)
}
```

## Error boundaries

El proyecto tiene boundaries globales:

- `app/error.tsx`
- `app/global-error.tsx`

Los errores esperados de UI se siguen manejando con:

1. React Query `isError` state en componentes
2. Conditional rendering en caso de error
3. Toast para errores de mutations

Para boundaries segmentados nuevos, seguir el patrón de Next.js:

```typescript
// app/payments/error.tsx
'use client'

export default function PaymentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2>Error al cargar pagos</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  )
}
```

## Patrones de error en componentes

```typescript
// React Query error state
const { data, isLoading, error } = usePayments(params)

if (error) {
  return <ErrorMessage message={error.message} />
}

// Dialog submit con try-catch
const handleSubmit = async (values) => {
  try {
    setIsSubmitting(true)
    const res = await fetch('/api/payments', { method: 'POST', body: JSON.stringify(payload) })
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Error al registrar')
    }

    toast.success('Registrado exitosamente')
    onOpenChange(false)
    onSuccess?.()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado'
    toast.error(message)
  } finally {
    setIsSubmitting(false)
  }
}
```
