# Patrones de Uso

Ejemplos prácticos de uso de logging en diferentes escenarios.

---

## 1. API Route con Child Logger

Pattern más común: crear child logger con contexto de negocio.

```typescript
// app/api/payments/route.ts
import { withLogging } from '@/lib/logger-middleware'
import { NextRequest, NextResponse } from 'next/server'

export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  // Child logger con contexto de negocio
  const paymentLogger = logger.child({
    customerId: body.customerId,
    amount: body.amount,
  })

  paymentLogger.info('Payment creation requested')
  paymentLogger.debug('Starting validations')

  // Validación
  if (!customerId) {
    paymentLogger.warn('Missing customerId')
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
  }

  try {
    // Business logic
    const payment = await createPayment(body)

    paymentLogger.info({ paymentId: payment.id }, 'Payment created successfully')

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    paymentLogger.error({ err: error }, 'Payment creation failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
```

**Beneficios:**

- ✅ Context inheritance (requestId + customerId + amount)
- ✅ Búsqueda fácil: `grep customerId=abc-123`
- ✅ No manual context passing

---

## 2. Cron Job Tracking

Pattern para jobs programados (Vercel Cron).

```typescript
// app/api/cron/mark-installments-paid/route.ts
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const runId = generateRunId() // run-2025-10-30T14-32-15-uuid

  const cronLogger = logger.child({
    job: 'mark-installments-paid',
    runId,
  })

  cronLogger.info('Cron job started')

  try {
    // Buscar installments pending
    const installments = await prisma.installment.findMany({
      where: {
        status: 'pending',
        dueDate: { lte: new Date() },
      },
    })

    cronLogger.debug({ count: installments.length }, 'Installments found')

    // Update batch
    const result = await prisma.installment.updateMany({
      where: {
        id: { in: installments.map((i) => i.id) },
      },
      data: {
        status: 'paid',
        paidDate: new Date(),
      },
    })

    cronLogger.info({ updated: result.count }, 'Cron job completed')

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    cronLogger.error({ err: error }, 'Cron job failed')
    return NextResponse.json({ error: 'Job failed' }, { status: 500 })
  }
}

function generateRunId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const shortUuid = randomUUID().split('-')[0]
  return `run-${timestamp}-${shortUuid}`
}
```

**Beneficios:**

- ✅ Cada run tiene ID único
- ✅ Tracking de performance (cuántos updates)
- ✅ Debugging de cron jobs fácil

---

## 3. Multiple Endpoints con Contexto Compartido

Reutilizar child logger en funciones helper.

```typescript
// app/api/projects/[id]/route.ts
export const GET = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}

  const projectLogger = logger.child({ projectId: id })

  // Helper que recibe el logger
  const project = await fetchProjectWithBalance(id, projectLogger)

  projectLogger.info('Project fetched successfully')
  return NextResponse.json(project)
})

// Helper function
async function fetchProjectWithBalance(
  projectId: string,
  logger: Logger // ← Pasar logger como parámetro
) {
  logger.debug('Fetching project')

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      paymentAllocations: true,
    },
  })

  if (!project) {
    logger.warn('Project not found')
    throw new Error('Project not found')
  }

  logger.debug({ allocations: project.paymentAllocations.length }, 'Calculating balance')

  const balance = calculateBalance(project)

  logger.debug({ balance }, 'Balance calculated')

  return { ...project, balance }
}
```

**Beneficios:**

- ✅ Logger propagado a helpers
- ✅ Contexto compartido (projectId en todos los logs)
- ✅ Testeable (mock logger fácilmente)

---

## 4. Error Handling con Contexto

Pattern para errors detallados.

```typescript
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  try {
    // Validación
    const validation = schema.safeParse(body)

    if (!validation.success) {
      logger.warn({ errors: validation.error.format() }, 'Validation failed')
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      )
    }

    // Business logic
    const result = await performOperation(validation.data)

    logger.info({ resultId: result.id }, 'Operation completed')
    return NextResponse.json(result)
  } catch (error) {
    // Error con contexto completo
    logger.error(
      {
        err: error,
        requestBody: body,
        userId: body.userId,
      },
      'Operation failed unexpectedly'
    )

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
```

**Beneficios:**

- ✅ Errores con contexto completo
- ✅ Stack trace automático (err serializer)
- ✅ Debugging simplificado

---

## 5. Performance Tracking Manual

Medir operaciones específicas.

```typescript
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  // Tracking manual de operación costosa
  const startTime = performance.now()

  const result = await expensiveOperation(body)

  const duration = Math.round(performance.now() - startTime)

  logger.info({ duration, recordsProcessed: result.count }, 'Expensive operation completed')

  return NextResponse.json(result)
})
```

**Beneficios:**

- ✅ Identificar operaciones lentas
- ✅ Métricas de performance
- ✅ Optimización data-driven

---

## 6. Conditional Logging (Debug Mode)

Logging verbose solo cuando se necesita.

```typescript
const DEBUG = process.env.DEBUG_PAYMENTS === 'true'

export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  if (DEBUG) {
    logger.debug({ requestBody: body }, 'Full request body')
  }

  // ... business logic ...

  if (DEBUG) {
    logger.debug({ response: result }, 'Full response')
  }

  return NextResponse.json(result)
})
```

**Uso:**

```bash
# Habilitar debug mode
DEBUG_PAYMENTS=true npm run dev
```

---

## Ver También

- [Middleware Pattern](middleware-pattern.md) - withLogging() detalle
- [Log Levels](log-levels.md) - Cuándo usar cada nivel
- [Output Examples](output-examples.md) - Cómo se ven los logs

**Última actualización:** 2025-10-30
