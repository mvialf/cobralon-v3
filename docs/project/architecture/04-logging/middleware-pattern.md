# Middleware Pattern

Pattern `withLogging()` para wrappear API Route Handlers con logging automático.

---

## Código

```typescript
// lib/logger-middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'
import { randomUUID } from 'crypto'

export type APIHandler = (
  request: NextRequest,
  logger: Logger,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>

export function withLogging(handler: APIHandler) {
  return async (
    request: NextRequest,
    context?: { params: Record<string, string> }
  ) => {
    const requestId = generateRequestId()
    const { method, url } = request
    const path = new URL(url).pathname

    // Child logger con contexto HTTP
    const requestLogger = logger.child({
      requestId,
      method,
      path
    })

    requestLogger.info('Request received')

    const startTime = performance.now()

    try {
      const response = await handler(request, requestLogger, context)
      const duration = Math.round(performance.now() - startTime)

      requestLogger.info(
        { status: response.status, duration },
        'Request completed'
      )

      return response
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)

      requestLogger.error(
        { err: error, duration },
        'Request failed'
      )

      throw error
    }
  }
}

function generateRequestId(): string {
  return randomUUID()
}
```

---

## Uso

### En API Routes

```typescript
// app/api/payments/route.ts
import { withLogging } from '@/lib/logger-middleware'
import { NextRequest, NextResponse } from 'next/server'

export const POST = withLogging(async (request, logger) => {
  // logger ya tiene requestId automático
  logger.info('Payment creation requested')

  const body = await request.json()

  // Child logger con contexto de negocio
  const paymentLogger = logger.child({
    customerId: body.customerId,
    amount: body.amount
  })

  paymentLogger.debug('Starting validations')

  // ... business logic ...

  paymentLogger.info({ paymentId }, 'Payment created successfully')

  return NextResponse.json(payment, { status: 201 })
})
```

---

## Features

### ✅ Request Correlation Automática

Todos los logs del mismo request comparten `requestId`:

```json
{"requestId":"550e8400-...","msg":"Request received"}
{"requestId":"550e8400-...","customerId":"abc","msg":"Payment creation requested"}
{"requestId":"550e8400-...","status":201,"msg":"Request completed"}
```

### ✅ Duration Tracking

Mide tiempo de ejecución automáticamente:

```json
{"requestId":"...","status":201,"duration":342,"msg":"Request completed"}
```

**Performance.now() vs Date.now():**
- `performance.now()` - Preciso a microsegundos
- `Date.now()` - Preciso a milisegundos
- Usamos `performance.now()` para mejor precisión

### ✅ Context Inheritance

Child logger hereda contexto del requestLogger:

```typescript
const requestLogger = logger.child({ requestId, method, path })

const paymentLogger = requestLogger.child({ customerId, amount })

paymentLogger.info('Processing')
// Output incluye: requestId, method, path, customerId, amount
```

### ✅ Error Handling Automático

Si handler lanza error, se loggea automáticamente:

```typescript
try {
  const response = await handler(request, requestLogger, context)
  // ...
} catch (error) {
  requestLogger.error({ err: error }, 'Request failed')
  throw error // Re-throw para que Next.js maneje
}
```

---

## Type Safety

```typescript
export type APIHandler = (
  request: NextRequest,
  logger: Logger, // ← Pino logger
  context?: { params: Record<string, string> }
) => Promise<NextResponse>
```

**Beneficios:**
- ✅ TypeScript infiere tipos automáticamente
- ✅ Autocomplete en IDE
- ✅ Catch errors en compile time

---

## Dynamic Routes

Para rutas dinámicas (`[id]`), el `context` contiene los params:

```typescript
// app/api/payments/[id]/route.ts
export const GET = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}

  const paymentLogger = logger.child({ paymentId: id })

  paymentLogger.info('Fetching payment')
  // ...
})
```

---

## Best Practices

### ✅ DO: Crear Child Logger con Contexto de Negocio

```typescript
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  // ✅ Child logger con contexto
  const entityLogger = logger.child({
    entityId: body.id,
    userId: body.userId
  })

  entityLogger.info('Operation started')
})
```

### ❌ DON'T: Loggear en Cada Línea

```typescript
// ❌ EVITAR: Too much noise
logger.debug('Line 1')
logger.debug('Line 2')
logger.debug('Line 3')

// ✅ MEJOR: Milestones importantes
logger.info('Validation started')
// ... validación ...
logger.info('Validation completed')
```

### ✅ DO: Loggear Errores con Contexto

```typescript
try {
  // ...
} catch (error) {
  logger.error(
    { err: error, customerId, amount },
    'Payment creation failed'
  )
  return NextResponse.json({ error: '...' }, { status: 500 })
}
```

---

## Ver También

- [Logger Singleton](logger-singleton.md) - Configuración base
- [Usage Patterns](usage-patterns.md) - Ejemplos completos
- [Architecture](architecture.md) - Flujo completo

**Última actualización:** 2025-10-30
