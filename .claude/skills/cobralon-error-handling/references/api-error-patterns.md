# Patrones de Error en API Routes

## Patrón completo de try/catch

Todas las API routes de Cobralon siguen esta estructura:

```typescript
export const POST = withLogging(async (request, logger) => {
  try {
    const body = await request.json()

    // 1. Validación Zod (safeParse preferido)
    const result = createSchema.safeParse(body)
    if (!result.success) {
      logger.warn({ errors: result.error.errors }, 'Validation failed')
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.errors },
        { status: 400 }
      )
    }

    // 2. Validaciones de negocio
    const customer = await prisma.customer.findUnique({ where: { id: result.data.customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'El cliente no existe' }, { status: 404 })
    }

    // 3. Verificar conflictos (unique constraints)
    const existing = await prisma.entity.findFirst({ where: { email: result.data.email } })
    if (existing) {
      logger.warn({ email: result.data.email }, 'Email already exists')
      return NextResponse.json({ error: 'Ya existe un registro con ese email' }, { status: 409 })
    }

    // 4. Operación principal
    const created = await prisma.entity.create({ data: result.data })

    logger.info({ id: created.id }, 'Entity created')
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    // 5. Prisma errors específicos
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        logger.warn({ meta: error.meta }, 'Unique constraint violation')
        return NextResponse.json({ error: 'Ya existe un registro con esos datos' }, { status: 409 })
      }
      if (error.code === 'P2025') {
        logger.warn('Record not found')
        return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
      }
    }

    // 6. Error genérico
    logger.error({ err: error }, 'Error creating entity')
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
})
```

## Orden de prioridad en catch

1. **Zod errors** → Detectar antes del catch (con `safeParse`)
2. **Prisma P2002** → Unique constraint → 409
3. **Prisma P2025** → Record not found → 404
4. **Genérico** → 500

## Errores de Prisma relevantes

| Código | Significado | Status HTTP |
|--------|-------------|-------------|
| P2002 | Unique constraint violation | 409 Conflict |
| P2025 | Record not found (update/delete inexistente) | 404 Not Found |
| P2003 | Foreign key constraint failure | 409 Conflict |

## Logging estructurado con `withLogging`

El middleware `withLogging` (`lib/logger-middleware.ts`) provee:

- `requestId` único por request (UUID v4)
- Child logger con contexto (method, path, searchParams)
- Tracking de duración

Helpers adicionales:
- `logRequestBody(logger, body)` — Loggea body de forma segura
- `logResponse(logger, response)` — Loggea response antes de enviar
- `createBusinessLogger(logger, 'payment')` — Logger con contexto de dominio

## Validación Zod: `safeParse` vs `parse`

Cobralon prefiere `safeParse` para control explícito del error:

```typescript
// ✅ PREFERIDO — Control explícito
const result = schema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: '...' }, { status: 400 })
}
const data = result.data

// ❌ EVITAR — Error implícito que cae en catch
try {
  const data = schema.parse(body)  // Throws ZodError
} catch (error) {
  if (error instanceof z.ZodError) { ... }
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
