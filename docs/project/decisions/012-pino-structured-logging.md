# ADR-012: Pino Structured Logging

## Estado

**Aceptado** | **Fecha:** 2025-10-30

## Decisión

Usar **Pino 9.7.0** como sistema de logging estructurado del proyecto Cobralon con:

- Singleton logger configurado por ambiente
- Middleware `withLogging` para API routes
- Request correlation automática (UUID requestId)
- Automatic redaction de campos sensibles

## Contexto

Cobralon requiere logging robusto para producción:

- Debugging eficiente en serverless (Vercel)
- Auditoría de operaciones críticas (pagos, proyectos, cron jobs)
- Request correlation para rastrear flujos completos
- Structured JSON para querying en producción
- Performance óptima (bajo overhead)

**Situación anterior:** console.log dispersos, sin formato estructurado, sin contexto, no production-ready.

## Alternativa Principal

**Winston:** Logger más popular en Node.js, flexible pero ~10x más lento que Pino (~300ns vs ~30ns per log) y mayor bundle size (~50KB vs ~10KB). NO elegido por performance crítica en serverless.

## Consecuencias

### Positivas ✅

1. **Performance óptima:** ~30ns per log (10x más rápido que Winston), ideal para serverless
2. **Request correlation automática:** requestId en todos los logs vía child loggers
3. **DX superior:** Pretty-print en dev, JSON estructurado en prod
4. **Security built-in:** Redaction automática de passwords, tokens, creditCard, etc.
5. **Production-ready:** Compatible con Vercel logging, parseable para log aggregators

### Negativas ⚠️

1. **JSON no human-readable en prod:** Requiere Vercel UI o log aggregator
   - **Mitigación:** Vercel proporciona UI nativa para visualización
2. **Curva de aprendizaje:** Child loggers, log levels, serializers
   - **Mitigación:** Documentación + pattern establecido en codebase

## Quick Start

```bash
# Ya instalado en el proyecto
npm install pino pino-pretty
```

```typescript
// API Route con withLogging middleware
import { withLogging } from '@/lib/logger-middleware'

export const POST = withLogging(async (request, logger) => {
  // logger incluye requestId automáticamente
  logger.info('Processing payment')

  // Child logger con contexto de negocio
  const paymentLogger = logger.child({ customerId, amount })
  paymentLogger.info('Payment created successfully')

  return NextResponse.json({ success: true })
})
```

**Archivos clave:**

- `lib/logger.ts` - Singleton Pino instance con config
- `lib/logger-middleware.ts` - withLogging wrapper para API routes
- Migradas: `/api/payments`, `/api/projects`, `/api/customers`, `/api/cron/*`

**Logs en desarrollo:**

```
[14:32:15] INFO: Payment created successfully
    paymentId: "abc-123"
    customerId: "customer-456"
    amount: 1500000
```

**Logs en producción:**

```json
{
  "level": "info",
  "time": 1698765135000,
  "msg": "Payment created successfully",
  "requestId": "uuid-123",
  "paymentId": "abc-123"
}
```

## Referencias

- [Pino Documentation](https://getpino.io)
- [Pino Benchmarks](https://github.com/pinojs/pino#benchmarks)
- [Vercel Logging Best Practices](https://vercel.com/docs/observability/runtime-logs)
- [Template ADR-007: ESLint + Code Quality](../../template/decisions/007-eslint-prettier.md)

---

**Última actualización:** 2025-10-30
