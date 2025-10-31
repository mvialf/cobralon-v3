# Cron API

API para jobs automatizados (Vercel Cron) que marcan cuotas vencidas como pagadas.

---

## Endpoints

```
POST   /api/cron/mark-installments-paid
```

**Autenticación:** Bearer token (CRON_SECRET)

**Trigger:** Vercel Cron (diario a medianoche UTC)

---

## POST /api/cron/mark-installments-paid

Marcar cuotas vencidas como "paid" automáticamente.

### Autenticación

```bash
POST /api/cron/mark-installments-paid
Authorization: Bearer <CRON_SECRET>
```

**Variable de entorno requerida:**

```env
# .env.local
CRON_SECRET=your-secret-key-here
```

### Request Example

```bash
curl -X POST https://your-domain.com/api/cron/mark-installments-paid \
  -H "Authorization: Bearer your-secret-key-here"
```

### Response (200 OK)

```json
{
  "success": true,
  "updated": 12,
  "message": "12 installments marked as paid",
  "runId": "run-2025-01-20T00-00-15-uuid-abc",
  "timestamp": "2025-01-20T00:00:15Z"
}
```

### Response (401 Unauthorized)

```json
{
  "error": "Unauthorized"
}
```

---

## Implementación

```typescript
// app/api/cron/mark-installments-paid/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

function generateRunId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const uuid = crypto.randomUUID().slice(0, 8)
  return `run-${timestamp}-${uuid}`
}

export async function POST(request: NextRequest) {
  const runId = generateRunId()

  const cronLogger = logger.child({
    job: 'mark-installments-paid',
    runId
  })

  // 1. Autenticación
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    cronLogger.error('CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    cronLogger.warn({ authHeader }, 'Unauthorized cron request')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  cronLogger.info('Cron job started')

  try {
    const today = new Date()

    // 2. Batch update
    const result = await prisma.installment.updateMany({
      where: {
        status: 'pending',
        dueDate: {
          lte: today
        }
      },
      data: {
        status: 'paid',
        paidDate: today
      }
    })

    cronLogger.info(
      { updated: result.count, date: today.toISOString() },
      'Installments marked as paid'
    )

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `${result.count} installments marked as paid`,
      runId,
      timestamp: today.toISOString()
    })
  } catch (error) {
    cronLogger.error({ err: error }, 'Cron job failed')

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Configuración Vercel Cron

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/mark-installments-paid",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Schedule Format (Cron Expression):**

```
 ┌───────────── minute (0 - 59)
 │ ┌───────────── hour (0 - 23)
 │ │ ┌───────────── day of month (1 - 31)
 │ │ │ ┌───────────── month (1 - 12)
 │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
 │ │ │ │ │
 │ │ │ │ │
 * * * * *
```

**Ejemplos:**

| Schedule    | Descripción                  |
| ----------- | ---------------------------- |
| `0 0 * * *` | Diario a medianoche UTC      |
| `0 12 * * *`| Diario a mediodía UTC        |
| `0 0 1 * *` | Primer día de cada mes       |
| `0 0 * * 1` | Cada lunes a medianoche      |

---

## Lógica de Negocio

### Condiciones para Marcar como "Paid"

```sql
WHERE status = 'pending'
  AND due_date <= CURRENT_DATE
```

**Cuotas afectadas:**

1. ✅ Cuota con `dueDate = 2025-01-15` y hoy es `2025-01-20` → Marcada
2. ✅ Cuota con `dueDate = 2025-01-20` y hoy es `2025-01-20` → Marcada (mismo día)
3. ❌ Cuota con `dueDate = 2025-01-25` y hoy es `2025-01-20` → No afectada (futura)
4. ❌ Cuota con `status = 'paid'` → No afectada (ya pagada)

---

## Logging Estructurado

### Child Logger con Contexto

```typescript
const cronLogger = logger.child({
  job: 'mark-installments-paid',
  runId: 'run-2025-01-20T00-00-15-abc'
})
```

**Beneficios:**

- Todos los logs del cron tienen `job` y `runId`
- Fácil buscar logs de una ejecución específica: `grep runId=run-2025-01-20`

---

### Logs de Ejemplo

**Development (pino-pretty):**

```
[00:00:15] INFO: Cron job started
    job: "mark-installments-paid"
    runId: "run-2025-01-20T00-00-15-abc"

[00:00:16] INFO: Installments marked as paid
    job: "mark-installments-paid"
    runId: "run-2025-01-20T00-00-15-abc"
    updated: 12
    date: "2025-01-20T00:00:15.000Z"
```

**Production (JSON):**

```json
{"level":"info","time":1737331215000,"job":"mark-installments-paid","runId":"run-2025-01-20T00-00-15-abc","msg":"Cron job started"}
{"level":"info","time":1737331216000,"job":"mark-installments-paid","runId":"run-2025-01-20T00-00-15-abc","updated":12,"date":"2025-01-20T00:00:15.000Z","msg":"Installments marked as paid"}
```

---

## Testing

### Testing Manual Local

```bash
# Crear .env.local con CRON_SECRET
echo 'CRON_SECRET=test-secret-123' > .env.local

# Ejecutar endpoint manualmente
curl -X POST http://localhost:3000/api/cron/mark-installments-paid \
  -H "Authorization: Bearer test-secret-123"
```

---

### Testing en Vercel

**Trigger manual desde Vercel Dashboard:**

1. Ir a **Project Settings** → **Cron Jobs**
2. Click en "Run now" para `mark-installments-paid`
3. Ver logs en **Deployment Logs**

---

## Monitoreo

### Vercel Logs

Buscar logs del cron job:

```
job:"mark-installments-paid"
```

Filtrar por run específico:

```
runId:"run-2025-01-20T00-00-15-abc"
```

---

### Alertas Recomendadas

**1. Cron Failure Alert**

Si el cron falla 2 veces consecutivas → Enviar alerta.

**2. Zero Updates Alert**

Si `updated: 0` por 7 días consecutivos → Revisar (¿no hay cuotas venciendo?).

**3. Unauthorized Attempts**

Si hay requests 401 → Posible ataque.

---

## Seguridad

### 1. Environment Variable Obligatoria

```typescript
if (!cronSecret) {
  cronLogger.error('CRON_SECRET not configured')
  return NextResponse.json(
    { error: 'Server configuration error' },
    { status: 500 }
  )
}
```

**Previene:** Cron ejecutándose sin autenticación.

---

### 2. Bearer Token Validation

```typescript
if (authHeader !== `Bearer ${cronSecret}`) {
  cronLogger.warn({ authHeader }, 'Unauthorized cron request')
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
```

**Previene:** Ejecución no autorizada.

---

### 3. Secret Rotation

**Recomendación:** Rotar `CRON_SECRET` cada 3-6 meses.

**Proceso:**

1. Generar nuevo secret: `openssl rand -hex 32`
2. Actualizar en Vercel Environment Variables
3. Redeployar proyecto

---

## Limitaciones

### Timezone: UTC

Vercel Cron ejecuta en UTC, no en timezone local (ej: Chile UTC-3).

**Ejemplo:**

- Cron: `0 0 * * *` (medianoche UTC)
- En Chile (UTC-3): Ejecuta a las 21:00 horas del día anterior

**Ajuste si es necesario:**

```json
{
  "schedule": "0 3 * * *"  // 3 AM UTC = medianoche Chile
}
```

---

### Execution Time Limit

Vercel Cron tiene límite de ejecución (10 segundos en Hobby, 300s en Pro).

**Si batch update toma >300s:**

Implementar paginación:

```typescript
// Actualizar en lotes de 1000
const BATCH_SIZE = 1000
let updated = 0

while (true) {
  const result = await prisma.installment.updateMany({
    where: { /* ... */ },
    data: { /* ... */ },
    take: BATCH_SIZE
  })

  updated += result.count

  if (result.count < BATCH_SIZE) break
}
```

---

## Expansión Futura

### Múltiples Cron Jobs

Agregar más crons en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/mark-installments-paid",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/send-overdue-notifications",
      "schedule": "0 12 * * *"
    },
    {
      "path": "/api/cron/cleanup-old-logs",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

---

## Ver También

- [Installments API](installments-api.md) - API de cuotas
- [Installments Decision](../05-technical-decisions/installments-separate.md) - Por qué tabla separada
- [Logging System](../04-logging/) - Sistema de logging estructurado
- [Vercel Cron Docs](https://vercel.com/docs/cron-jobs) - Documentación oficial

**Última actualización:** 2025-10-30
