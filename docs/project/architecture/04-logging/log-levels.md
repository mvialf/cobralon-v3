# Niveles de Log

Configuración de niveles de logging por ambiente.

---

## Niveles Disponibles

| Nivel   | Valor | Uso                                          | Ambiente    |
| ------- | ----- | -------------------------------------------- | ----------- |
| `debug` | 20    | Flow tracking, validaciones detalladas       | Development |
| `info`  | 30    | Operaciones exitosas, milestones importantes | Production  |
| `warn`  | 40    | Validaciones fallidas, estados inválidos     | Todos       |
| `error` | 50    | Errores capturados, excepciones              | Todos       |
| `fatal` | 60    | Errores críticos (raramente usado)           | Todos       |

---

## Configuración por Ambiente

### Development

```typescript
// NODE_ENV=development
level: 'debug'
```

**Output:** TODO visible (debug, info, warn, error)

**Ejemplo:**

```typescript
logger.debug('Starting validation') // ✅ Visible
logger.info('Validation completed') // ✅ Visible
logger.warn('Invalid field') // ✅ Visible
logger.error({ err }, 'Failed') // ✅ Visible
```

### Production

```typescript
// NODE_ENV=production
level: 'info'
```

**Output:** Solo info, warn, error (debug no visible)

**Ejemplo:**

```typescript
logger.debug('Starting validation') // ❌ No visible
logger.info('Validation completed') // ✅ Visible
logger.warn('Invalid field') // ✅ Visible
logger.error({ err }, 'Failed') // ✅ Visible
```

---

## Override con Environment Variable

```bash
# .env.local
LOG_LEVEL=debug

# .env.production
LOG_LEVEL=info
```

**Prioridad:**

1. `process.env.LOG_LEVEL` (override)
2. Default por `NODE_ENV`

**Código:**

```typescript
// lib/logger.ts
function getLogLevel(): string {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL // Override
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}
```

---

## Cuándo Usar Cada Nivel

### `debug` - Flow Tracking

Para debugging temporal o desarrollo:

```typescript
logger.debug('Validating payment data')
logger.debug({ allocations }, 'FIFO allocation calculated')
logger.debug('Saving to database')
```

**Características:**

- ❌ NO visible en producción
- ✅ Útil para debugging local
- ✅ Puede ser verbose

### `info` - Milestones Importantes

Para operaciones exitosas de negocio:

```typescript
logger.info('Payment creation requested')
logger.info({ paymentId, amount }, 'Payment created successfully')
logger.info({ count: 5 }, 'Installments marked as paid')
```

**Características:**

- ✅ Visible en producción
- ✅ Métricas y auditoría
- ✅ Siempre útil en logs

### `warn` - Validaciones Fallidas

Para estados inesperados pero no críticos:

```typescript
logger.warn('Missing optional email field')
logger.warn({ customerId }, 'Customer has no active projects')
logger.warn('Payment method does not support installments')
```

**Características:**

- ✅ Visible en producción
- ⚠️ Requiere atención eventual
- ⚠️ No bloquea operación

### `error` - Errores Críticos

Para excepciones y errores que bloquean operación:

```typescript
logger.error({ err: error }, 'Payment creation failed')
logger.error({ customerId }, 'Customer not found')
logger.error('Database connection failed')
```

**Características:**

- ✅ Visible en producción
- 🚨 Requiere atención inmediata
- 🚨 Operación falló

---

## Best Practices

### ✅ DO: Usar Nivel Apropiado

```typescript
// ✅ BIEN: info para milestone
logger.info({ paymentId }, 'Payment created')

// ❌ EVITAR: debug para milestone
logger.debug({ paymentId }, 'Payment created')
```

### ✅ DO: Loggear Errores con Contexto

```typescript
// ✅ BIEN: Contexto completo
try {
  await createPayment(data)
} catch (error) {
  logger.error(
    { err: error, customerId: data.customerId, amount: data.amount },
    'Payment creation failed'
  )
}
```

### ❌ DON'T: Debug Logs en Producción

```typescript
// ❌ EVITAR: debug nunca se verá en prod
export const POST = withLogging(async (request, logger) => {
  logger.debug('Processing request') // ❌ Inútil en prod

  // ✅ MEJOR:
  logger.info('Payment creation requested') // ✅ Se ve en prod
})
```

### ✅ DO: Usar warn para "Soft Failures"

```typescript
// ✅ BIEN: warn cuando operación continúa
if (!email) {
  logger.warn({ customerId }, 'Customer has no email, skipping notification')
  // Operación continúa sin email
}

// ✅ BIEN: error cuando operación falla
if (!customerId) {
  logger.error('Missing required customerId')
  return NextResponse.json({ error: '...' }, { status: 400 })
}
```

---

## Filtering en Vercel Logs

En Vercel Logs UI puedes filtrar por nivel:

```
level:error              # Solo errores
level:warn OR level:error  # Warnings y errores
level:info               # Info y superiores
```

---

## Ver También

- [Logger Singleton](logger-singleton.md) - Configuración de niveles
- [Output Examples](output-examples.md) - Cómo se ven los logs

**Última actualización:** 2025-10-30
