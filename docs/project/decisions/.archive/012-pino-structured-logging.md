# ADR-012: Pino Structured Logging

## Estado

**Aceptado**

**Fecha:** 2025-10-30

## Contexto

El proyecto Cobralon está próximo a producción y requiere un sistema de logging robusto para:

- **Debugging eficiente**: Poder rastrear problemas en producción
- **Auditoría**: Mantener registro de operaciones críticas (pagos, proyectos, cron jobs)
- **Monitoring**: Detectar errores y anomalías en tiempo real
- **Performance tracking**: Medir duración de operaciones
- **Request correlation**: Correlacionar logs de una misma request

**Situación actual:**

- Console.log/console.error dispersos en el código
- Sin formato estructurado (dificulta querying)
- Sin contexto adicional (requestId, userId, etc.)
- Sin niveles de log configurables
- No production-ready para entornos serverless

**Necesidades específicas:**

1. Compatible con Vercel serverless (logs efímeros)
2. Performance óptima (bajo overhead)
3. Structured JSON en producción para querying
4. Human-readable en desarrollo
5. Request correlation (requestId único)
6. Child loggers para contexto heredado
7. Sensitive data redaction automática

## Decisión

Implementar **Pino 9.7.0** como sistema de logging estructurado con:

1. **Singleton logger** (`lib/logger.ts`) con configuración por ambiente
2. **Middleware pattern** (`lib/logger-middleware.ts`) para API routes
3. **Request correlation** vía UUID v4 (requestId)
4. **Cron job tracking** vía UUID con timestamp (runId)
5. **Child loggers** para contexto de negocio
6. **Automatic redaction** de campos sensibles
7. **Pretty-print** en desarrollo, JSON en producción

## Alternativas Consideradas

### Alternativa 1: Winston

- **Pros:**
  - Logger más popular en Node.js ecosystem
  - Muy flexible (múltiples transports)
  - Amplia adopción enterprise
- **Contras:**
  - **~10x más lento** que Pino (benchmark: ~300ns vs ~30ns per log)
  - Bundle size más grande (~50KB vs ~10KB)
  - Overhead significativo en serverless
- **Por qué NO:** Performance crítica en serverless. Pino es significativamente más rápido.

### Alternativa 2: Bunyan

- **Pros:**
  - Structured logging nativo
  - Similar a Pino en approach
  - Buen soporte de child loggers
- **Contras:**
  - No mantenido activamente (último release hace 2+ años)
  - Más lento que Pino (~100ns vs ~30ns)
  - Sin pretty-print nativo (requiere bunyan CLI)
- **Por qué NO:** Pino es más rápido y mejor mantenido. Pretty-print integrado.

### Alternativa 3: next-logger

- **Pros:**
  - Específico para Next.js
  - Integración automática
- **Contras:**
  - Menos flexible
  - Menos features avanzadas
  - Comunidad más pequeña
- **Por qué NO:** Pino ofrece más control y features. Better ecosystem.

### Alternativa 4: Custom Logger (console wrapper)

- **Pros:**
  - Control total
  - Zero dependencies
  - Ligero
- **Contras:**
  - Reinventar la rueda
  - Sin features avanzadas (serializers, redaction, etc.)
  - Tiempo de desarrollo significativo
- **Por qué NO:** Pino ya resuelve todos los casos de uso. No vale la pena reinventar.

## Consecuencias

### Positivas ✅

1. **Performance Óptima**
   - ~30ns per log operation (10x más rápido que Winston)
   - Bundle size mínimo (~10KB)
   - Ideal para serverless environments
   - Zero blocking I/O

2. **Developer Experience Superior**
   ```typescript
   // Pretty-print en desarrollo
   [14:32:15] INFO: Payment created successfully
       paymentId: "abc-123"
       customerId: "customer-456"
       amount: 1500000

   // JSON estructurado en producción
   {"level":"info","time":1698765135000,"msg":"Payment created successfully","paymentId":"abc-123","customerId":"customer-456","amount":1500000}
   ```

3. **Request Correlation Automática**
   ```typescript
   export const POST = withLogging(async (request, logger) => {
     // logger ya incluye requestId automáticamente
     logger.info('Processing payment') // ✅ Incluye requestId

     const paymentLogger = logger.child({ customerId })
     paymentLogger.info('Validating customer') // ✅ Incluye requestId + customerId
   })
   ```

4. **Security Built-in**
   - Automatic redaction de campos sensibles:
     - `password`, `token`, `apiKey`, `accessToken`
     - `creditCard`, `cvv`, `ssn`
   - Configuración centralizada en `lib/logger.ts`

5. **Debugging Facilitado**
   - Context inheritance vía child loggers
   - Structured querying en producción
   - Duration tracking automático
   - Error serialization con stack traces

6. **Production-Ready**
   - Compatible con Vercel logging
   - JSON parseable para log aggregators (Datadog, LogRocket, etc.)
   - ISO timestamps
   - Environment-aware configuration

### Negativas / Trade-offs ⚠️

1. **Pretty-Print Requiere Instalación Separada**
   - `pino-pretty` como devDependency (~2MB adicional)
   - Solo se usa en desarrollo (no afecta producción)
   - **Mitigación:** Documentado en package.json, instalación automática con `npm install`

2. **JSON Output No es Human-Readable en Producción**
   - Logs en producción son JSON (difícil de leer directo)
   - Requiere herramientas para visualización (Vercel UI, log aggregators)
   - **Mitigación:** Vercel proporciona UI nativa para logs. Alternativamente usar `pino-pretty` CLI.

3. **Curva de Aprendizaje**
   - Equipo debe aprender:
     - Child loggers
     - Log levels (trace, debug, info, warn, error, fatal)
     - Serializers
     - Context inheritance
   - **Mitigación:** Documentación completa + ejemplos en código.

4. **Overhead de Setup Inicial**
   - Configuración inicial de singleton
   - Migración de console.log existentes
   - Creación de middleware pattern
   - **Mitigación:** Setup ya completado en este sprint. Pattern establecido y reusable.

## Implementación

### Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                   API ROUTE                             │
│  (wrapeado con withLogging)                             │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│          lib/logger-middleware.ts                       │
│  - Genera requestId (UUID v4)                           │
│  - Crea child logger con contexto (requestId, path)     │
│  - Logs automáticos: request received/completed         │
│  - Tracking de duration                                 │
│  - Error handling con logging                           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              lib/logger.ts                              │
│  - Singleton Pino instance                              │
│  - Environment-aware config                             │
│  - Serializers (err, req, res)                          │
│  - Redaction automática                                 │
│  - Pretty-print (dev) / JSON (prod)                     │
└─────────────────────────────────────────────────────────┘
```

### Archivos Principales

1. **lib/logger.ts** (Singleton)
   ```typescript
   export const logger = pino({
     level: getLogLevel(), // info (prod) / debug (dev)
     formatters: { level, bindings },
     serializers: { err, req, res },
     redact: { paths: ['password', 'token', ...], censor: '[REDACTED]' },
     timestamp: pino.stdTimeFunctions.isoTime,
     ...(isDev ? { transport: 'pino-pretty' } : {}),
   })
   ```

2. **lib/logger-middleware.ts** (withLogging wrapper)
   ```typescript
   export function withLogging(handler: APIHandler) {
     return async (request: NextRequest, context?) => {
       const requestId = generateRequestId()
       const requestLogger = logger.child({ requestId, method, path })

       requestLogger.info('Request received')

       const startTime = performance.now()
       const response = await handler(request, requestLogger, context)
       const duration = Math.round(performance.now() - startTime)

       requestLogger.info({ status, duration }, 'Request completed')
       return response
     }
   }
   ```

### APIs Migradas

- ✅ `/api/payments` (GET, POST)
- ✅ `/api/projects` (GET, POST)
- ✅ `/api/customers` (GET, POST)
- ✅ `/api/cron/mark-installments-paid`

### Patrón de Uso

```typescript
// API Route con withLogging
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  // Child logger con contexto de negocio
  const paymentLogger = logger.child({
    customerId: body.customerId,
    amount: body.amount,
  })

  paymentLogger.info('Payment creation requested')
  paymentLogger.debug('Starting validations')

  // Validaciones...
  if (!customerId) {
    paymentLogger.warn('Missing customerId')
    return NextResponse.json({ error: '...' }, { status: 400 })
  }

  // Operación de negocio...
  paymentLogger.info({ paymentId }, 'Payment created successfully')

  return NextResponse.json(payment, { status: 201 })
})
```

### Log Levels

| Level   | Uso                                    | Ejemplo                                  |
| ------- | -------------------------------------- | ---------------------------------------- |
| `trace` | Debugging muy detallado (NO usado)     | -                                        |
| `debug` | Flow tracking, validaciones            | `'Starting validations'`                 |
| `info`  | Operaciones exitosas, milestones       | `'Payment created successfully'`         |
| `warn`  | Validaciones fallidas, estados inválidos | `'Missing customerId'`                  |
| `error` | Errores capturados, excepciones        | `'Error creating payment'`               |
| `fatal` | Errores críticos (NO usado)            | -                                        |

**Configuración por ambiente:**

- **Development**: `debug` (todo visible)
- **Production**: `info` (solo operaciones importantes)
- **Override**: `LOG_LEVEL` env var

### Sensitive Data Redaction

Campos redactados automáticamente:

```typescript
redact: {
  paths: [
    'password', 'token', 'apiKey', 'api_key',
    'accessToken', 'access_token',
    'refreshToken', 'refresh_token',
    'secret', 'creditCard', 'credit_card',
    'cardNumber', 'card_number', 'cvv', 'ssn',
  ],
  censor: '[REDACTED]',
}
```

**Ejemplo:**

```typescript
logger.info({
  userId: '123',
  password: 'secret123' // ❌ Sensible
})

// Output:
// { userId: '123', password: '[REDACTED]' } ✅
```

## Referencias

- [Pino Documentation](https://getpino.io)
- [Pino GitHub](https://github.com/pinojs/pino)
- [pino-pretty](https://github.com/pinojs/pino-pretty)
- [Pino Benchmarks](https://github.com/pinojs/pino#benchmarks)
- [Vercel Logging Best Practices](https://vercel.com/docs/observability/runtime-logs)

## Notas Adicionales

### Próximos Pasos

1. ✅ **Migración completada** para APIs críticas (payments, projects, customers, cron)
2. ⏳ **Pendiente**: Migrar API routes restantes cuando se implementen
3. ⏳ **Considerar**: Integración con log aggregator (Datadog, LogRocket) cuando escale

### Métricas de Éxito

**Antes (console.log):**
- ❌ Sin formato estructurado
- ❌ Sin request correlation
- ❌ Sin niveles de log
- ❌ Difícil debugging en producción

**Después (Pino):**
- ✅ JSON estructurado (queryable)
- ✅ Request correlation automática (requestId)
- ✅ Niveles de log configurables
- ✅ Context inheritance (child loggers)
- ✅ Performance óptima (~30ns per log)
- ✅ Production-ready

### Performance Benchmark

Benchmark comparativo (source: Pino GitHub):

```
benchBunyan*10000: 2496.613ms
benchWinston*10000: 2994.308ms
benchPino*10000: 303.419ms ← 10x más rápido
```

**Conclusión:** Pino es 8-10x más rápido que alternativas, crítico para serverless.

---

**Última actualización:** 2025-10-30
**Versión del proyecto:** 0.1.0
**Sprint:** Mejoras 30-10 (Sprint 2)
