# Sistema de Logging Estructurado

Sistema de logging basado en **Pino 9.7.0** para debugging eficiente, auditoría y monitoring en producción.

---

## ⚡ Quick Overview

**¿Por qué Pino?**

- ✅ **10x más rápido** que Winston/Bunyan (~30ns per log)
- ✅ **Bundle size mínimo** (~10KB)
- ✅ **Zero blocking I/O** (ideal para serverless/Vercel)
- ✅ **Structured JSON** (parseable, queryable)

**Features principales:**

- Request correlation (requestId UUID v4)
- Child loggers con contexto de negocio
- Automatic sensitive data redaction
- Performance tracking (duration en ms)
- Environment-aware (pretty dev, JSON prod)

---

## 📚 Navegación

### 1. [Arquitectura](architecture.md)

Diagrama de capas y integración con APIs:

```
Logging Layer (Pino)
    ↓
Logger Singleton + Middleware
    ↓
API Routes (Next.js)
```

### 2. [Logger Singleton](logger-singleton.md)

Configuración centralizada de Pino:

- Level por ambiente
- Pretty-print vs JSON
- Redaction de campos sensibles

### 3. [Middleware Pattern](middleware-pattern.md)

`withLogging()` wrapper para APIs:

- Request correlation automática
- Duration tracking
- Error handling

### 4. [Niveles de Log](log-levels.md)

| Nivel   | Uso                 | Ambiente    |
| ------- | ------------------- | ----------- |
| `debug` | Flow tracking       | Development |
| `info`  | Milestones          | Production  |
| `warn`  | Validaciones failed | Todos       |
| `error` | Excepciones         | Todos       |

### 5. [Patrones de Uso](usage-patterns.md)

Ejemplos prácticos:

- API route con child logger
- Cron job tracking
- Error handling

### 6. [Output Examples](output-examples.md)

Comparativa de outputs:

- Development: pino-pretty (colored, readable)
- Production: JSON (Vercel-compatible)

### 7. [Data Redaction](data-redaction.md)

Protección automática de campos sensibles:

- `password`, `token`, `apiKey`
- `creditCard`, `ssn`, etc.

### 8. [Performance](performance.md)

Benchmarks vs alternativas:

- Pino: **303ms** para 10,000 logs
- Winston: 2,994ms (10x más lento)
- Bunyan: 2,497ms (8x más lento)

---

## 🚀 Quick Start

### 1. Logger básico

```typescript
import { logger } from '@/lib/logger'

logger.info('Operation started')
logger.warn('Invalid data detected')
logger.error({ err }, 'Operation failed')
```

### 2. Con contexto (Child Logger)

```typescript
const paymentLogger = logger.child({
  customerId: 'abc',
  amount: 1500000,
})

paymentLogger.info('Payment creation requested')
// Output incluye customerId y amount en todos los logs
```

### 3. En API Routes

```typescript
import { withLogging } from '@/lib/logger-middleware'

export const POST = withLogging(async (request, logger) => {
  logger.info('Request started')
  // logger ya tiene requestId automático
})
```

---

## 📁 Archivos Principales

```
lib/
├── logger.ts               # Singleton Pino instance ⭐
└── logger-middleware.ts    # withLogging() wrapper ⭐

app/api/
├── payments/route.ts       # ✅ Migrated
├── projects/route.ts       # ✅ Migrated
├── customers/route.ts      # ✅ Migrated
└── cron/mark-installments-paid/ # ✅ Migrated
```

---

## 🔗 Ver También

- **Decisión completa:** [ADR-012: Pino Structured Logging](../decisions/012-pino-structured-logging.md)
- **Pino Docs:** https://getpino.io
- **Vercel Logging:** https://vercel.com/docs/observability/runtime-logs

---

**Última actualización:** 2025-10-30
