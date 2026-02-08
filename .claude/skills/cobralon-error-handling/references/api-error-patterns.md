# Patrones de Error en API Routes

## Patrón Principal: `withApiHandler`

Para POST/PUT/DELETE, `withApiHandler` maneja automáticamente body validation (Zod), UUID validation y error handling. **No necesitas try/catch manual.**

```typescript
import { withApiHandler, BusinessError } from '@/lib/api-handler'

export const PUT = withApiHandler<UpdateEntityBody>(
  async (_request, logger, { params, body }) => {
    // body ya fue parseado y validado con Zod (bodySchema)
    // params.id ya fue validado como UUID (validateUuidParams)

    const entity = await prisma.entity.findUnique({ where: { id: params.id } })
    if (!entity) throw new BusinessError('Entidad no encontrada', 404)

    // Si Prisma lanza P2002 → 409 automático
    // Si Prisma lanza P2025 → 404 automático
    // Si Prisma lanza P2003 → 400 automático
    const updated = await prisma.entity.update({
      where: { id: params.id },
      data: body,
    })

    logger.info({ entityId: params.id }, 'Entity updated')
    return NextResponse.json(updated)
  },
  {
    bodySchema: updateEntitySchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar entidad',
  }
)
```

### Manejo automático de `handleApiError`

| Tipo de error | Status HTTP | Respuesta |
|--------------|-------------|-----------|
| `BusinessError` | su `statusCode` | `{ error: message, code?: string }` |
| `ZodError` | 400 | `{ error: 'Datos inválidos', details: [...] }` |
| Prisma P2002 | 409 | `{ error: 'Ya existe un registro con ese X', code: 'UNIQUE_VIOLATION' }` |
| Prisma P2025 | 404 | `{ error: 'Registro no encontrado', code: 'NOT_FOUND' }` |
| Prisma P2003 | 400 | `{ error: 'Referencia a registro inexistente', code: 'FK_VIOLATION' }` |
| Otro | 500 | `{ error: fallbackMessage }` |

## Patrón para GET lista (`withLogging`)

Las rutas GET de listas usan `withLogging` con try/catch manual (no `withApiHandler`):

```typescript
import { withLogging } from '@/lib/logger-middleware'

export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)

  try {
    const [total, items] = await Promise.all([
      prisma.entity.count({ where: whereCondition }),
      prisma.entity.findMany({ where: whereCondition, skip, take: limit }),
    ])

    logger.info({ total, page, limit }, 'Entities fetched')
    return NextResponse.json({ items, pagination: { page, limit, total } })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entities')
    return NextResponse.json({ error: 'Error al obtener entidades' }, { status: 500 })
  }
})
```

## Logging estructurado con `withLogging`

El middleware `withLogging` (`lib/logger-middleware.ts`) provee:

- `requestId` único por request (UUID v4)
- Child logger con contexto (method, path, searchParams)
- Tracking de duración

Helpers adicionales:
- `logRequestBody(logger, body)` — Loggea body de forma segura
- `logResponse(logger, response)` — Loggea response antes de enviar
- `createBusinessLogger(logger, 'payment')` — Logger con contexto de dominio

## Validación Zod: `parse` vs `safeParse`

Con `withApiHandler`, se usa `parse` (el error es capturado automáticamente por `handleApiError` → 400).

Para GET lista con `withLogging`, se puede usar `safeParse` para control explícito:

```typescript
// En GET lista (withLogging) — safeParse para control manual
const result = schema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: '...' }, { status: 400 })
}
```

## Logger: Convención de mensajes

```typescript
// Operaciones exitosas
logger.info({ entityId: id }, 'Entity created')
logger.info({ count: 5 }, 'Entities fetched')

// Advertencias
logger.warn({ email }, 'Email already exists')
logger.warn({ invalidValue }, 'Invalid parameter')

// Errores — SIEMPRE usar { err: error } para stack trace
logger.error({ err: error }, 'Error creating entity')
logger.error({ err: error, entityId: id }, 'Error updating entity')
```

## Redacción de datos sensibles

Configurado en `lib/logger.ts`:

```typescript
redact: {
  paths: ['password', 'token', 'apiKey', 'accessToken', 'creditCard', 'cvv', 'ssn'],
  censor: '[REDACTED]',
}
```

Pino automáticamente censura estos campos en cualquier nivel de anidamiento.
