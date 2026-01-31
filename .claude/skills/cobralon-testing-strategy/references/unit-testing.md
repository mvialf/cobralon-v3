# Unit Testing en Cobralon

## Mockear Prisma (`@/lib/db`)

El proyecto NO usa `__mocks__/` global. Cada test mockea inline:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Prisma — declarar ANTES de importar el módulo bajo test
vi.mock('@/lib/db', () => ({
  prisma: {
    customer: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    project: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
    paymentMethod: { findUnique: vi.fn() },
    creditTransaction: { create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}))

// Importar DESPUÉS del mock
import { prisma } from '@/lib/db'
import { POST } from '../route'
```

## Mockear `withLogging`

Todas las API routes usan `withLogging`. Mockearlo así:

```typescript
vi.mock('@/lib/logger-middleware', () => ({
  withLogging: (handler: Function) => {
    return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
      }
      const mockContext = context || { params: Promise.resolve({}) }
      return handler(request, mockLogger, mockContext)
    }
  },
}))
```

## Mockear `$transaction`

Para simular la transacción atómica de Prisma:

```typescript
vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
  const mockTx = {
    payment: { create: vi.fn().mockResolvedValue({ id: 'payment-1', allocations: [] }) },
    project: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'project-1', projectNumber: '1001', balance: 0, customerId: 'customer-1' },
      ]),
      update: vi.fn(),
    },
    customer: { update: vi.fn() },
    creditTransaction: { create: vi.fn() },
  }
  return (fn as (tx: typeof mockTx) => Promise<unknown>)(mockTx)
})
```

## Mockear business logic

Cuando el test es de API y no de lógica de negocio:

```typescript
vi.mock('@/lib/business-logic/update-project-balance', () => ({
  updateProjectBalance: vi.fn().mockResolvedValue(0),
  updateMultipleProjectBalances: vi.fn().mockResolvedValue(1),
}))

vi.mock('@/lib/business-logic/credit-management', () => ({
  canApplyCredit: vi.fn().mockReturnValue({ valid: true }),
}))
```

## Helpers para API route tests

```typescript
// Helper para crear NextRequest con body
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/payments', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Helper para invocar handler con context mock
async function callPOST(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  return (POST as any)(request, context)
}

// Helper para handler con param dinámico
async function callGET(id: string) {
  const request = new NextRequest(`http://localhost:3000/api/payments/${id}`)
  const context = { params: Promise.resolve({ id }) }
  return (GET as any)(request, context)
}
```

## Testing de hooks con React Query

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },     // No retry en tests
      mutations: { retry: false },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestQueryClientWrapper'
  return Wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()   // Mock fetch global
})

it('debe cargar datos exitosamente', async () => {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ customers: [{ id: '1', name: 'Test' }], pagination: { total: 1 } }),
  })

  const { result } = renderHook(() => useCustomers({ page: 1 }), {
    wrapper: createWrapper(),
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.customers).toHaveLength(1)
})
```

## Testing de funciones financieras

Tolerancia de punto flotante con `FINANCIAL.TOLERANCE`:

```typescript
import { FINANCIAL } from '@/lib/business-logic/constants'

it('debe calcular balance con tolerancia financiera', () => {
  const result = calculateBalance(100.005)
  // No usar toBe para floats
  expect(Math.abs(result - expected)).toBeLessThan(FINANCIAL.TOLERANCE)
})
```

## Validaciones Zod en tests

```typescript
import { createPaymentSchema } from '@/lib/validations/payment-validations'

it('debe rechazar monto negativo', () => {
  const result = createPaymentSchema.safeParse({ ...validPayload, amount: -100 })
  expect(result.success).toBe(false)
})

it('debe aceptar payload válido', () => {
  const result = createPaymentSchema.safeParse(validPayload)
  expect(result.success).toBe(true)
})
```

## Setup de Vitest (`vitest.setup.ts`)

El proyecto mockea estas APIs del browser globalmente:

- `IntersectionObserver` — Radix UI
- `ResizeObserver` — react-resizable-panels
- `window.matchMedia` — responsive components
- `HTMLElement.prototype.scrollIntoView`
- `PointerEvent`, `DOMRect` — Radix primitives

No necesitas repetir estos mocks en tests individuales.
