---
name: cobralon-error-handling
description: Patrones de manejo de errores para Cobralon con API responses estandarizadas, error boundaries y toast notifications.
---

<!-- USAR CUANDO: manejar errores en API routes, implementar error boundaries,
mostrar errores al usuario, decidir qué loggear con Pino, o estandarizar
respuestas HTTP de error. -->

# Error Handling en Cobralon

## API Error Responses Estandarizadas

| Status | Causa | Formato de respuesta |
|--------|-------|---------------------|
| 400 | Validación Zod / datos inválidos | `{ error: string }` o `{ error: string, details: ZodError[] }` |
| 404 | Recurso no encontrado | `{ error: string }` |
| 409 | Constraint violation (email duplicado, etc.) | `{ error: string }` |
| 500 | Error no controlado | `{ error: string }` |

## `withApiHandler`: Error Handling Automático

`withApiHandler` (`lib/api-handler.ts`) integra `handleApiError` internamente. Para POST/PUT/DELETE **no necesitas try/catch manual**:

```typescript
export const POST = withApiHandler<CreateEntityBody>(
  async (_request, logger, { body }) => {
    // Si Zod falla → 400 automático
    // Si BusinessError → su statusCode automático
    // Si Prisma P2002 → 409 automático
    // Si error desconocido → 500 con fallbackError
    const entity = await prisma.entity.create({ data: body })
    return NextResponse.json(entity, { status: 201 })
  },
  { bodySchema: createEntitySchema, fallbackError: 'Error al crear entidad' }
)
```

Validaciones automáticas de `withApiHandler`:
- **`bodySchema`**: Parsea y valida body con Zod (ZodError → 400)
- **`validateUuidParams`**: Valida UUIDs en URL params (inválido → 400)
- **`fallbackError`**: Mensaje para errores 500 no controlados

## Clase `BusinessError` (`lib/api-handler.ts`)

Error de negocio server-side con status HTTP específico:

```typescript
import { BusinessError } from '@/lib/api-handler'

// Dentro de withApiHandler:
throw new BusinessError('Cliente no encontrado', 404)
throw new BusinessError('Crédito insuficiente', 400)
throw new BusinessError('Email duplicado', 409, 'EMAIL_DUPLICATE')
```

`handleApiError` lo captura y retorna `{ error: message }` con el `statusCode` indicado.

## Clase `ApiError` (`lib/errors.ts`)

```typescript
// Crear desde Response en el frontend
throw await createApiError(response, 'Error al crear pago')

// Manejar en mutation
onError: (error) => {
  handleMutationError(error)  // Toast automático por status code
}
```

`handleMutationError` muestra toasts diferenciados:
- 400 → mensaje del error
- 409 → mensaje del error (conflicto)
- 401 → "Sesión expirada"
- 500+ → "Error del servidor. Intente más tarde"

## Logging con Pino por nivel

| Nivel | Uso | Ejemplo |
|-------|-----|---------|
| `debug` | Info técnica (query params, counts) | `logger.debug({ page, limit }, 'Fetching')` |
| `info` | Operaciones exitosas | `logger.info({ paymentId }, 'Payment created')` |
| `warn` | Problemas recuperables | `logger.warn({ email }, 'Email already exists')` |
| `error` | Exceptions no manejadas | `logger.error({ err: error }, 'Error creating')` |

**Clave:** Siempre usar `{ err: error }` para que Pino serialice el stack trace.

## Toast feedback en mutations

Todas las mutations siguen este patrón:

```
onSuccess → toast.success('Recurso creado exitosamente')
onError   → handleMutationError(error)  // Toast automático
```

Para bulk operations:
```
Todo OK     → toast.success(`${n} eliminados`)
Parcial     → toast.warning(`${ok} eliminados, ${fail} con error`)
```

## Error boundaries

⚠️ No hay archivos `error.tsx` en el proyecto actualmente. Los errores se manejan con:
- Try-catch en API routes
- React Query `onError` en mutations
- Toast notifications para feedback al usuario

## Detalles

- **Patrones de API:** [references/api-error-patterns.md](references/api-error-patterns.md)
- **Patrones de cliente:** [references/client-error-patterns.md](references/client-error-patterns.md)

## Relación con otros skills y rules

| Recurso | Cubre | No duplicar |
|---------|-------|-------------|
| Rule `api-routes.md` | Estructura base de routes | Error handling básico |
| Skill `cobralon-best-practices` | Performance patterns | Retry patterns |
| Este skill | Error handling completo | Todo lo de arriba |
