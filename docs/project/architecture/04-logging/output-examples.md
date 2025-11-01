# Output Examples

Comparativa de outputs de logging en Development vs Production.

---

## Development (pino-pretty)

**Configuración:**

```typescript
// lib/logger.ts
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

**Output:**

```
[14:32:15] INFO: Request received
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    method: "POST"
    path: "/api/payments"

[14:32:15] INFO: Payment creation requested
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    customerId: "customer-123"
    amount: 1500000

[14:32:15] DEBUG: Starting validations
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    customerId: "customer-123"
    amount: 1500000

[14:32:15] INFO: Payment created successfully
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    customerId: "customer-123"
    amount: 1500000
    paymentId: "payment-456"

[14:32:15] INFO: Request completed
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    status: 201
    duration: 342
```

**Características:**

- ✅ Coloreado por nivel (verde=info, amarillo=warn, rojo=error)
- ✅ Timestamp human-readable
- ✅ Indentación de objetos
- ✅ Fácil de leer en terminal

---

## Production (JSON)

**Configuración:**

```typescript
// lib/logger.ts
// Sin transport → JSON directo
```

**Output:**

```json
{"level":"info","time":1698765135000,"requestId":"550e8400-e29b-41d4-a716-446655440000","method":"POST","path":"/api/payments","msg":"Request received"}
{"level":"info","time":1698765135050,"requestId":"550e8400-e29b-41d4-a716-446655440000","customerId":"customer-123","amount":1500000,"msg":"Payment creation requested"}
{"level":"debug","time":1698765135100,"requestId":"550e8400-e29b-41d4-a716-446655440000","customerId":"customer-123","amount":1500000,"msg":"Starting validations"}
{"level":"info","time":1698765135250,"requestId":"550e8400-e29b-41d4-a716-446655440000","customerId":"customer-123","amount":1500000,"paymentId":"payment-456","msg":"Payment created successfully"}
{"level":"info","time":1698765135342,"requestId":"550e8400-e29b-41d4-a716-446655440000","status":201,"duration":342,"msg":"Request completed"}
```

**Características:**

- ✅ Parseable (jq, grep, log aggregators)
- ✅ Queryable en Vercel Logs UI
- ✅ Timestamp numérico (Unix epoch)
- ✅ Optimizado para máquinas

---

## Error Example

### Development (pino-pretty)

```
[14:32:15] ERROR: Payment creation failed
    requestId: "550e8400-..."
    customerId: "customer-123"
    amount: 1500000
    err: {
      "type": "ValidationError",
      "message": "Invalid allocation amount",
      "stack":
          ValidationError: Invalid allocation amount
              at validateAllocations (/app/lib/business-logic/payment-validations.ts:45:11)
              at createPayment (/app/api/payments/route.ts:32:5)
    }
```

### Production (JSON)

```json
{
  "level": "error",
  "time": 1698765135342,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "customer-123",
  "amount": 1500000,
  "err": {
    "type": "ValidationError",
    "message": "Invalid allocation amount",
    "stack": "ValidationError: Invalid allocation amount\n    at validateAllocations (/app/lib/business-logic/payment-validations.ts:45:11)\n    at createPayment (/app/api/payments/route.ts:32:5)"
  },
  "msg": "Payment creation failed"
}
```

---

## Cron Job Example

### Development

```
[02:00:00] INFO: Cron job started
    job: "mark-installments-paid"
    runId: "run-2025-10-30T02-00-00-a1b2c3d4"

[02:00:00] DEBUG: Installments found
    job: "mark-installments-paid"
    runId: "run-2025-10-30T02-00-00-a1b2c3d4"
    count: 15

[02:00:02] INFO: Cron job completed
    job: "mark-installments-paid"
    runId: "run-2025-10-30T02-00-00-a1b2c3d4"
    updated: 15
```

### Production

```json
{"level":"info","time":1698804000000,"job":"mark-installments-paid","runId":"run-2025-10-30T02-00-00-a1b2c3d4","msg":"Cron job started"}
{"level":"debug","time":1698804000100,"job":"mark-installments-paid","runId":"run-2025-10-30T02-00-00-a1b2c3d4","count":15,"msg":"Installments found"}
{"level":"info","time":1698804002000,"job":"mark-installments-paid","runId":"run-2025-10-30T02-00-00-a1b2c3d4","updated":15,"msg":"Cron job completed"}
```

---

## Redaction Example

### Sin Redaction (❌ Peligroso)

```json
{
  "level": "info",
  "userId": "123",
  "password": "super-secret-password",
  "token": "Bearer abc123xyz",
  "msg": "User login"
}
```

### Con Redaction (✅ Seguro)

```json
{
  "level": "info",
  "userId": "123",
  "password": "[REDACTED]",
  "token": "[REDACTED]",
  "msg": "User login"
}
```

Ver: [Data Redaction](data-redaction.md)

---

## Parsing JSON Logs

### Con `jq`

```bash
# Filtrar solo errores
cat logs.json | jq 'select(.level=="error")'

# Extraer campo específico
cat logs.json | jq '.requestId'

# Agrupar por status code
cat logs.json | jq -r '.status' | sort | uniq -c
```

### Con `grep`

```bash
# Buscar por requestId
grep "requestId=550e8400" logs.json

# Buscar por customerId
grep "customerId=customer-123" logs.json

# Buscar errores
grep "level=error" logs.json
```

---

## Vercel Logs UI

**Queries de ejemplo:**

```
# Por nivel
level:error

# Por campo custom
customerId:customer-123

# Por rango de tiempo
time:>2025-10-30T00:00:00

# Combinado
level:error AND customerId:customer-123
```

---

## Best Practices

### ✅ DO: JSON en Producción

```typescript
// ✅ BIEN: JSON parseable
{"level":"info","customerId":"123","msg":"Payment created"}

// ❌ EVITAR: String interpolation
"INFO: Payment created for customer 123"
```

### ✅ DO: Usar Pretty Print en Desarrollo

```bash
# .env.local
NODE_ENV=development

# Logs legibles:
[14:32:15] INFO: Payment created
    customerId: "123"
```

### ✅ DO: Incluir Contexto en Objetos

```typescript
// ✅ BIEN: Objeto con contexto
logger.info({ customerId, amount }, 'Payment created')

// ❌ EVITAR: Solo string
logger.info('Payment created')
```

---

## Ver También

- [Logger Singleton](logger-singleton.md) - Configuración de transport
- [Data Redaction](data-redaction.md) - Protección de datos sensibles

**Última actualización:** 2025-10-30
