# Logger Singleton

Configuración centralizada del logger Pino.

---

## Archivo

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: getLogLevel(), // info (prod) / debug (dev)
  formatters: { level, bindings },
  serializers: { err, req, res }, // Pino built-in
  redact: {
    paths: ['password', 'token', 'apiKey', 'creditCard', ...],
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev ? { transport: 'pino-pretty' } : {}),
})
```

---

## Configuración Detallada

### 1. Log Level (Environment-Aware)

```typescript
function getLogLevel(): string {
  // Override desde env var
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL
  }

  // Default por ambiente
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}
```

**Niveles:**
- `debug` - Development (todo visible)
- `info` - Production (solo importante)
- `warn` - Warnings en todos
- `error` - Errores en todos

### 2. Formatters

```typescript
formatters: {
  // Formato del nivel de log
  level: (label: string) => {
    return { level: label.toUpperCase() }
  },

  // Bindings (contexto base)
  bindings: (bindings: pino.Bindings) => {
    return {
      pid: bindings.pid,
      hostname: bindings.hostname
    }
  }
}
```

### 3. Serializers (Built-in de Pino)

```typescript
serializers: {
  err: pino.stdSerializers.err,   // Errores con stack trace
  req: pino.stdSerializers.req,   // HTTP requests
  res: pino.stdSerializers.res    // HTTP responses
}
```

**Uso:**

```typescript
logger.error({ err: error }, 'Operation failed')
// Pino serializa automáticamente el error con stack trace
```

### 4. Redaction (Seguridad)

```typescript
redact: {
  paths: [
    'password', 'token', 'apiKey', 'api_key',
    'accessToken', 'access_token',
    'refreshToken', 'refresh_token',
    'secret', 'creditCard', 'credit_card',
    'cardNumber', 'card_number', 'cvv', 'ssn',
  ],
  censor: '[REDACTED]'
}
```

Ver: [Data Redaction](data-redaction.md) para más detalles

### 5. Timestamp (ISO Format)

```typescript
timestamp: pino.stdTimeFunctions.isoTime
```

**Output:**

```json
{"time":"2025-10-30T14:32:15.123Z","msg":"..."}
```

### 6. Transport (Development Only)

```typescript
// Solo en desarrollo
...(isDev ? {
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
} : {})
```

---

## Features del Logger

### ✅ Performance Óptima

- ~30 nanosegundos per log
- 10x más rápido que Winston
- Zero blocking I/O

### ✅ Bundle Size Mínimo

- Core: ~10KB
- Sin dependencias pesadas
- Tree-shakeable

### ✅ Serverless-Friendly

- Sin filesystem writes
- Ideal para Vercel Functions
- Fast cold starts

### ✅ Automatic Redaction

- Campos sensibles censurados automáticamente
- Protección contra leaks accidentales
- Configurable vía paths array

---

## Uso Básico

### Importar

```typescript
import { logger } from '@/lib/logger'
```

### Logs Simples

```typescript
logger.debug('Starting operation')
logger.info('Operation completed')
logger.warn('Invalid data detected')
logger.error('Operation failed')
```

### Logs con Contexto

```typescript
logger.info({
  userId: '123',
  action: 'create_payment'
}, 'User action logged')
```

**Output (JSON):**

```json
{
  "level": "info",
  "time": "2025-10-30T14:32:15.123Z",
  "userId": "123",
  "action": "create_payment",
  "msg": "User action logged"
}
```

### Child Logger

```typescript
const childLogger = logger.child({
  component: 'payment-processor',
  version: '1.0'
})

childLogger.info('Processing payment')
// Output incluye component y version
```

---

## Comparativa de Configuración

| Feature             | Pino       | Winston    | Bunyan     |
| ------------------- | ---------- | ---------- | ---------- |
| Log Level Config    | ✅ Simple  | ✅ Simple  | ✅ Simple  |
| Formatters          | ✅ Built-in| ⚠️ Custom  | ⚠️ Custom  |
| Redaction           | ✅ Built-in| ❌ Manual  | ❌ Manual  |
| Pretty Print (dev)  | ✅ Built-in| ⚠️ Package | ⚠️ Package |
| Performance         | ✅ 10x     | ❌ Slow    | ❌ Slow    |

---

## Ver También

- [Middleware Pattern](middleware-pattern.md) - Cómo se usa en APIs
- [Data Redaction](data-redaction.md) - Campos sensibles
- [Performance](performance.md) - Benchmarks

**Última actualización:** 2025-10-30
