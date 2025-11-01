# Data Redaction

Protección automática de campos sensibles en logs.

---

## Configuración

```typescript
// lib/logger.ts
export const logger = pino({
  // ...
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'api_key',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'secret',
      'creditCard',
      'credit_card',
      'cardNumber',
      'card_number',
      'cvv',
      'ssn',
    ],
    censor: '[REDACTED]',
  },
})
```

---

## Campos Protegidos

### Authentication & Authorization

- `password` - Contraseñas
- `token` - Tokens genéricos
- `apiKey`, `api_key` - API keys
- `accessToken`, `access_token` - OAuth access tokens
- `refreshToken`, `refresh_token` - OAuth refresh tokens
- `secret` - Secrets genéricos

### Financial Data

- `creditCard`, `credit_card` - Números de tarjeta
- `cardNumber`, `card_number` - Números de tarjeta (alt)
- `cvv` - CVV de tarjeta

### Personal Identifiable Information (PII)

- `ssn` - Social Security Number (USA)

---

## Ejemplos

### ❌ Sin Redaction (Peligroso)

```typescript
logger.info(
  {
    userId: '123',
    password: 'super-secret-123',
    email: 'user@example.com',
  },
  'User logged in'
)
```

**Output:**

```json
{
  "userId": "123",
  "password": "super-secret-123",
  "email": "user@example.com",
  "msg": "User logged in"
}
```

🚨 **Password expuesta en logs!**

### ✅ Con Redaction (Seguro)

```typescript
logger.info(
  {
    userId: '123',
    password: 'super-secret-123', // ← Será censurado
    email: 'user@example.com',
  },
  'User logged in'
)
```

**Output:**

```json
{
  "userId": "123",
  "password": "[REDACTED]",
  "email": "user@example.com",
  "msg": "User logged in"
}
```

✅ **Password protegida automáticamente**

---

## Nested Objects

Redaction funciona en objetos anidados:

```typescript
logger.info(
  {
    user: {
      id: '123',
      credentials: {
        password: 'secret',
        apiKey: 'abc-xyz-123',
      },
    },
  },
  'User data'
)
```

**Output:**

```json
{
  "user": {
    "id": "123",
    "credentials": {
      "password": "[REDACTED]",
      "apiKey": "[REDACTED]"
    }
  },
  "msg": "User data"
}
```

---

## Arrays

Redaction funciona en arrays:

```typescript
logger.info(
  {
    tokens: [
      { type: 'access', token: 'abc-123' },
      { type: 'refresh', token: 'xyz-789' },
    ],
  },
  'Tokens issued'
)
```

**Output:**

```json
{
  "tokens": [
    { "type": "access", "token": "[REDACTED]" },
    { "type": "refresh", "token": "[REDACTED]" }
  ],
  "msg": "Tokens issued"
}
```

---

## Agregar Campos Custom

Extender la lista de campos protegidos:

```typescript
// lib/logger.ts
redact: {
  paths: [
    // Built-in
    'password',
    'token',
    // ...

    // Custom para este proyecto
    'rut',              // RUT chileno
    'bankAccount',      // Cuenta bancaria
    'internalApiKey',   // API keys internas
  ],
  censor: '[REDACTED]'
}
```

---

## Wildcard Patterns

Proteger todos los campos que coincidan con pattern:

```typescript
redact: {
  paths: [
    '*.password',      // password en cualquier nivel
    '*.token',         // token en cualquier nivel
    'credentials.*',   // Todos los campos dentro de credentials
  ],
  censor: '[REDACTED]'
}
```

**Ejemplo:**

```typescript
logger.info({
  user: { password: 'abc' }, // ← Redacted (*.password)
  admin: { password: 'xyz' }, // ← Redacted (*.password)
  credentials: {
    key: '123', // ← Redacted (credentials.*)
    secret: '456', // ← Redacted (credentials.*)
  },
})
```

---

## Custom Censor

Cambiar el texto de censura:

```typescript
redact: {
  paths: ['password', 'token'],
  censor: '***HIDDEN***' // ← Custom
}
```

**Output:**

```json
{
  "password": "***HIDDEN***",
  "token": "***HIDDEN***"
}
```

---

## Remove vs Censor

### Censor (Default)

Reemplaza el valor:

```typescript
redact: {
  paths: ['password'],
  censor: '[REDACTED]'
}
```

**Output:**

```json
{ "password": "[REDACTED]" }
```

### Remove

Elimina el campo completo:

```typescript
redact: {
  paths: ['password'],
  remove: true // ← Elimina el campo
}
```

**Output:**

```json
{}
```

---

## Limitaciones

### ⚠️ Solo Funciona en Objetos

```typescript
// ✅ FUNCIONA: Objeto
logger.info({ password: 'abc' }, 'Log')
// Output: { "password": "[REDACTED]", "msg": "Log" }

// ❌ NO FUNCIONA: String interpolation
logger.info(`Password is ${password}`)
// Output: "Password is abc" ← No redacted
```

**Solución:**

```typescript
// ✅ SIEMPRE usar objetos para data sensible
logger.info({ password }, 'User authenticated')
```

### ⚠️ Nombres de Campos Exactos

```typescript
// ✅ REDACTED: Campo exacto
logger.info({ password: 'abc' })

// ❌ NO REDACTED: Camel case diferente
logger.info({ Password: 'abc' })
logger.info({ PASSWORD: 'abc' })
```

**Solución:** Agregar variantes si es necesario:

```typescript
redact: {
  paths: ['password', 'Password', 'PASSWORD']
}
```

---

## Best Practices

### ✅ DO: Loggear Objetos, No Strings

```typescript
// ✅ BIEN: Objeto (protegido)
logger.info({ userId, password }, 'User login')

// ❌ EVITAR: String interpolation (no protegido)
logger.info(`User ${userId} logged in with password ${password}`)
```

### ✅ DO: Agregar Campos Específicos del Proyecto

```typescript
// ✅ BIEN: Extender con campos custom
redact: {
  paths: [
    ...DEFAULT_REDACT_PATHS,
    'rut',
    'bankAccount',
    'companyId', // Si es sensible
  ]
}
```

### ✅ DO: Revisar Logs Periódicamente

```bash
# Buscar posibles leaks
grep -i "password" logs.json | grep -v "REDACTED"
grep -i "token" logs.json | grep -v "REDACTED"
```

---

## Testing Redaction

```typescript
// test/logger.test.ts
import { logger } from '@/lib/logger'

describe('Logger redaction', () => {
  it('should redact password field', () => {
    const logSpy = vi.spyOn(process.stdout, 'write')

    logger.info({ password: 'secret123' }, 'Test log')

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'))
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('secret123'))
  })
})
```

---

## Ver También

- [Logger Singleton](logger-singleton.md) - Configuración completa
- [Output Examples](output-examples.md) - Ejemplos de redaction

**Última actualización:** 2025-10-30
