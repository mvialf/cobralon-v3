# Arquitectura de Logging

Diagrama de capas y flujo de logging estructurado con Pino.

---

## Diagrama de Capas

```
┌───────────────────────────────────────────────────────────┐
│                      LOGGING LAYER                         │
│  (Pino Structured Logger)                                 │
├───────────────────────────────────────────────────────────┤
│  lib/logger.ts               → Singleton Pino instance    │
│  lib/logger-middleware.ts    → withLogging() wrapper      │
│                                                           │
│  Features:                                                │
│  ├── Environment-aware config (debug dev, info prod)      │
│  ├── Pretty-print en desarrollo                           │
│  ├── JSON estructurado en producción                      │
│  ├── Request correlation (requestId UUID v4)              │
│  ├── Child loggers con contexto de negocio                │
│  ├── Automatic sensitive data redaction                   │
│  ├── Error serialization con stack traces                 │
│  ├── Performance tracking (duration en ms)                │
│  └── Cron job tracking (runId con timestamp)              │
└───────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────┐
│                   LOGGING INTEGRATION                      │
├───────────────────────────────────────────────────────────┤
│  API Routes (Next.js):                                    │
│  ├── app/api/payments/route.ts      ✅ Migrated          │
│  ├── app/api/projects/route.ts      ✅ Migrated          │
│  ├── app/api/customers/route.ts     ✅ Migrated          │
│  └── app/api/cron/mark-installments-paid/ ✅ Migrated    │
│                                                           │
│  Pattern usado:                                           │
│  export const POST = withLogging(async (request, logger) => {
│    const childLogger = logger.child({ customerId, amount })
│    childLogger.info('Operation started')                  │
│    // ... business logic ...                              │
│    childLogger.info({ result }, 'Operation completed')    │
│  })                                                       │
└───────────────────────────────────────────────────────────┘
```

---

## Flujo de Request

### 1. Request Entra a API Route

```typescript
POST /api/payments
    ↓
withLogging() intercepta
    ↓
Genera requestId (UUID v4)
Crea requestLogger con contexto HTTP
```

### 2. Business Logic Ejecuta

```typescript
requestLogger pasado como parámetro
    ↓
Handler crea child logger con contexto de negocio
    ↓
paymentLogger.info('Payment creation requested')
```

### 3. Response Sale

```typescript
Response enviada
    ↓
withLogging() calcula duration
    ↓
requestLogger.info({ status, duration }, 'Request completed')
```

---

## Request Correlation

Todos los logs de un mismo request comparten el mismo `requestId`:

```json
// Log 1
{"requestId":"550e8400-...","msg":"Request received"}

// Log 2
{"requestId":"550e8400-...","customerId":"abc","msg":"Payment creation requested"}

// Log 3
{"requestId":"550e8400-...","status":201,"msg":"Request completed"}
```

**Beneficio:** Buscar todos los logs de un request:

```bash
grep "requestId=550e8400" logs.json
```

---

## Child Logger Hierarchy

```
logger (Pino singleton)
    ↓
requestLogger (con requestId, method, path)
    ↓
paymentLogger (con customerId, amount)
    ↓
Todos los logs heredan contexto completo
```

**Ejemplo:**

```typescript
const logger = pino() // Base logger

const requestLogger = logger.child({
  requestId: 'abc',
  method: 'POST',
  path: '/api/payments',
})

const paymentLogger = requestLogger.child({
  customerId: '123',
  amount: 1500000,
})

paymentLogger.info('Processing payment')
// Output incluye: requestId + method + path + customerId + amount
```

---

## Integración con Vercel

```
Pino logs (JSON) → stdout
    ↓
Vercel captura stdout automáticamente
    ↓
Vercel Logs UI (queryable, filterable)
    ↓
[Opcional] Forward a Datadog, LogRocket, etc.
```

**Features de Vercel Logs:**

- ✅ JSON parsing automático
- ✅ Búsqueda por campos (`customerId:abc`)
- ✅ Filtros por nivel (`level:error`)
- ✅ Time-range queries

---

## Cron Jobs

Cron jobs usan un pattern similar pero sin requestId:

```typescript
export async function POST(request: Request) {
  const runId = generateRunId() // run-2025-10-30T14-32-15-uuid
  const cronLogger = logger.child({
    job: 'mark-installments-paid',
    runId,
  })

  cronLogger.info('Cron job started')
  // ... business logic ...
  cronLogger.info({ updated: count }, 'Cron job completed')
}
```

**`runId` format:** `run-{ISO-timestamp}-{uuid-short}`

---

## Error Handling

Errores se loggean con serialización automática:

```typescript
try {
  // ... operation ...
} catch (error) {
  logger.error({ err: error }, 'Operation failed')
  // Pino incluye stack trace automáticamente
}
```

**Output:**

```json
{
  "level": "error",
  "err": {
    "type": "ValidationError",
    "message": "Invalid data",
    "stack": "ValidationError: Invalid data\n  at ..."
  },
  "msg": "Operation failed"
}
```

---

## Ver También

- [Logger Singleton](logger-singleton.md) - Configuración de Pino
- [Middleware Pattern](middleware-pattern.md) - withLogging() detalle
- [ADR-012](../decisions/012-pino-structured-logging.md) - Decisión completa

**Última actualización:** 2025-10-30
