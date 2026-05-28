---
name: cobralon-api-route-testing
description: Usar para escribir o actualizar tests Vitest de API routes en app/api/**/__tests__/route.test.ts, incluyendo withApiHandler, withLogging, NextRequest, Prisma mocks, transacciones, side effects financieros, CreditTransaction y validaciones Zod en Cobralon.
---

<!-- USAR CUANDO: escribir tests nuevos para API routes, testear rutas con
transacciones, testear rutas con withApiHandler, verificar side-effects
(ProjectFinancials, CreditTransaction, creditBalance), o generar test completo para ruta existente.

NO DUPLICA: mocking básico de Prisma/withLogging (ver cobralon-testing-strategy).
COMPLEMENTA: cobralon-testing-strategy (estrategia general) y
cobralon-financial-logic (invariantes de negocio a verificar). -->

# API Route Testing

## Decisión rápida: qué template usar

| Ruta tiene...                   | Template                                                    |
| ------------------------------- | ----------------------------------------------------------- |
| GET lista + POST crear          | **Collection Route** (abajo)                                |
| GET/PUT/DELETE por `[id]`       | **Item Route** (abajo)                                      |
| `prisma.$transaction`           | Agregar **Transaction Verification**                        |
| Side-effects (balance, crédito) | Agregar **Side-Effect Verification**                        |
| CreditTransaction / reversión   | Ver [advanced-patterns.md](references/advanced-patterns.md) |

## Template: Collection Route (GET lista + POST)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// 1. Mocks ANTES de imports
vi.mock('@/lib/logger-middleware') // Auto-mock: usa lib/__mocks__/logger-middleware.ts

vi.mock('@/lib/db', () => ({
  prisma: {
    ENTITY: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// 2. Imports DESPUÉS
import { prisma } from '@/lib/db'
import { GET, POST } from '../route'

// 3. Helpers
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/ENTITY')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/ENTITY', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

async function callGET(request: NextRequest) {
  return (GET as any)(request, { params: Promise.resolve({}) })
}

async function callPOST(request: NextRequest) {
  return (POST as any)(request, { params: Promise.resolve({}) })
}

// 4. Tests
describe('GET /api/ENTITY', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar lista vacía', async () => {
    vi.mocked(prisma.ENTITY.count).mockResolvedValue(0)
    vi.mocked(prisma.ENTITY.findMany).mockResolvedValue([])
    const response = await callGET(createGetRequest())
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.ENTITIES).toEqual([])
  })

  it('debe respetar paginación', async () => {
    vi.mocked(prisma.ENTITY.count).mockResolvedValue(50)
    vi.mocked(prisma.ENTITY.findMany).mockResolvedValue([] as never)
    const response = await callGET(createGetRequest({ page: '2', limit: '10' }))
    const data = await response.json()
    expect(data.pagination.page).toBe(2)
  })

  it('debe buscar con OR conditions', async () => {
    vi.mocked(prisma.ENTITY.count).mockResolvedValue(1)
    vi.mocked(prisma.ENTITY.findMany).mockResolvedValue([{ id: '1' }] as never)
    await callGET(createGetRequest({ search: 'test' }))
    expect(prisma.ENTITY.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
    )
  })
})

describe('POST /api/ENTITY', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe rechazar sin campos requeridos', async () => {
    const response = await callPOST(createPostRequest({}))
    expect(response.status).toBe(400)
  })

  it('debe crear recurso → 201', async () => {
    vi.mocked(prisma.ENTITY.create).mockResolvedValue({ id: '1', name: 'Nuevo' } as never)
    vi.mocked(prisma.ENTITY.findFirst).mockResolvedValue(null)
    const response = await callPOST(createPostRequest({ name: 'Nuevo' }))
    expect(response.status).toBe(201)
  })

  it('debe retornar 500 cuando DB falla', async () => {
    vi.mocked(prisma.ENTITY.create).mockRejectedValue(new Error('DB Error'))
    const response = await callPOST(createPostRequest({ name: 'Test' }))
    expect(response.status).toBe(500)
  })
})
```

## Template: Item Route (GET/PUT/DELETE por [id])

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mocks ANTES de imports
vi.mock('@/lib/logger-middleware') // Auto-mock
vi.mock('@/lib/db', () => ({
  prisma: {
    ENTITY: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))
// + business logic si aplica:
// vi.mock('@/lib/business-logic/project-financials', () => ({
//   getProjectFinancials: vi.fn(),
//   getProjectsFinancials: vi.fn(),
// }))

import { prisma } from '@/lib/db'
import { GET, PUT, DELETE } from '../route'

function createParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function createRequest(method: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/ENTITY/test-id', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

describe('GET /api/ENTITY/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 404', async () => {
    vi.mocked(prisma.ENTITY.findUnique).mockResolvedValue(null)
    const response = await GET(createRequest('GET'), createParams('x'))
    expect(response.status).toBe(404)
  })

  it('debe retornar recurso', async () => {
    vi.mocked(prisma.ENTITY.findUnique).mockResolvedValue({ id: '1' } as never)
    const response = await GET(createRequest('GET'), createParams('1'))
    expect(response.status).toBe(200)
  })
})

describe('PUT /api/ENTITY/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.ENTITY.findUnique).mockResolvedValue({ id: '1' } as never)
  })

  it('debe retornar 404 si no existe', async () => {
    vi.mocked(prisma.ENTITY.findUnique).mockResolvedValue(null)
    const response = await PUT(createRequest('PUT', { name: 'X' }), createParams('x'))
    expect(response.status).toBe(404)
  })

  it('debe actualizar → 200', async () => {
    vi.mocked(prisma.ENTITY.update).mockResolvedValue({ id: '1', name: 'New' } as never)
    const response = await PUT(createRequest('PUT', { name: 'New' }), createParams('1'))
    expect(response.status).toBe(200)
  })
})

describe('DELETE /api/ENTITY/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.ENTITY.findUnique).mockResolvedValue({ id: '1' } as never)
  })

  it('debe retornar 404 si no existe', async () => {
    vi.mocked(prisma.ENTITY.findUnique).mockResolvedValue(null)
    const response = await DELETE(createRequest('DELETE'), createParams('x'))
    expect(response.status).toBe(404)
  })

  it('debe eliminar → 200', async () => {
    vi.mocked(prisma.ENTITY.delete).mockResolvedValue({ id: '1' } as never)
    const response = await DELETE(createRequest('DELETE'), createParams('1'))
    expect(response.status).toBe(200)
  })
})
```

## Tests para validaciones de `withApiHandler`

Rutas que usan `withApiHandler` deben testear las validaciones automáticas:

```typescript
// UUID inválido → 400
it('debe retornar 400 para UUID inválido', async () => {
  const response = await GET(
    createRequest('GET'),
    createParams('not-a-uuid')
  )
  expect(response.status).toBe(400)
  const data = await response.json()
  expect(data.error).toContain('UUID inválido')
})

// Body inválido (Zod) → 400
it('debe retornar 400 para body inválido', async () => {
  const response = await callPOST(createPostRequest({ invalid: true }))
  expect(response.status).toBe(400)
  const data = await response.json()
  expect(data.error).toBe('Datos inválidos')
  expect(data.details).toBeDefined()
})

// BusinessError → status code específico
it('debe retornar 404 cuando no existe', async () => {
  vi.mocked(prisma.ENTITY.findUnique).mockResolvedValue(null)
  const response = await GET(
    createRequest('GET'),
    createParams('550e8400-e29b-41d4-a716-446655440000')
  )
  expect(response.status).toBe(404)
})
```

## Checklist por tipo de ruta

### GET lista

- [ ] Lista vacía (count=0)
- [ ] Paginación default y custom
- [ ] Búsqueda (search → OR conditions)
- [ ] Sorting si aplica
- [ ] Error 500

### POST crear

- [ ] Body inválido (Zod) → 400 con "Datos inválidos"
- [ ] Campos requeridos faltantes → 400
- [ ] Validación de formato (email, phone)
- [ ] Duplicados → 409
- [ ] Creación exitosa → 201
- [ ] Error 500

### GET/PUT/DELETE por [id]

- [ ] UUID inválido → 400 con "UUID inválido"
- [ ] No existe → 404 (BusinessError)
- [ ] Body inválido → 400 con "Datos inválidos" (PUT con bodySchema)
- [ ] PUT: validaciones de campos
- [ ] PUT: actualización parcial
- [ ] PUT: duplicados en OTRO registro → 409
- [ ] PUT: side-effects (recálculo balance)
- [ ] DELETE: FK constraints
- [ ] DELETE: reversiones (créditos)
- [ ] Error 500

## Mock del logger: cuál elegir

Verificar qué importa la ruta bajo test:

| La ruta importa...                         | Mock necesario                                           |
| ------------------------------------------ | -------------------------------------------------------- |
| `withLogging` de `@/lib/logger-middleware` | `vi.mock('@/lib/logger-middleware')` (auto-mock)         |
| `withApiHandler` de `@/lib/api-handler`    | Mismo auto-mock (withApiHandler usa withLogging internamente) |
| `logger` de `@/lib/logger` directamente    | Mock manual de `@/lib/logger` (ver abajo)                |

### Auto-mock (opción principal — preferida)

El proyecto tiene `lib/__mocks__/logger-middleware.ts` que Vitest detecta automáticamente:

```typescript
vi.mock('@/lib/logger-middleware') // ← Usa auto-mock. Sin factory function.
```

Esto reemplaza `withLogging` con un passthrough que inyecta un mock logger. Funciona tanto para rutas con `withLogging` como con `withApiHandler`.

### Mock manual de `@/lib/logger` (para rutas que lo importan directamente)

```typescript
vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn().mockReturnThis(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))
```

## Patrones avanzados

Transacciones, reversiones de crédito, side-effects, business rules blocking:
ver [references/advanced-patterns.md](references/advanced-patterns.md).
