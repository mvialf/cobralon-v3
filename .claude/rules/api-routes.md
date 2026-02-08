---
paths: ["app/api/**/*.ts"]
---

# Patrones de API Routes

## Estructura Estándar

### POST → `withApiHandler` (en `route.ts`)

```typescript
// app/api/entities/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler } from '@/lib/api-handler'
import { createEntitySchema, type CreateEntityBody } from '@/lib/validations/entity-validations'

export const POST = withApiHandler<CreateEntityBody>(
  async (_request, logger, { body }) => {
    const entity = await prisma.entity.create({ data: body })
    logger.info({ entityId: entity.id }, 'Entity created')
    return NextResponse.json(entity, { status: 201 })
  },
  { bodySchema: createEntitySchema, fallbackError: 'Error al crear entidad' }
)
```

### GET / PUT / DELETE por ID → `withApiHandler` (en `[id]/route.ts`)

```typescript
// app/api/entities/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { updateEntitySchema, type UpdateEntityBody } from '@/lib/validations/entity-validations'

export const GET = withApiHandler(
  async (_request, logger, { params }) => {
    const entity = await prisma.entity.findUnique({ where: { id: params.id } })
    if (!entity) throw new BusinessError('Entidad no encontrada', 404)
    return NextResponse.json(entity)
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al obtener entidad' }
)

export const PUT = withApiHandler<UpdateEntityBody>(
  async (_request, logger, { params, body }) => {
    const existing = await prisma.entity.findUnique({ where: { id: params.id } })
    if (!existing) throw new BusinessError('Entidad no encontrada', 404)
    const updated = await prisma.entity.update({ where: { id: params.id }, data: body })
    return NextResponse.json(updated)
  },
  {
    bodySchema: updateEntitySchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar entidad',
  }
)

export const DELETE = withApiHandler(
  async (_request, logger, { params }) => {
    const existing = await prisma.entity.findUnique({ where: { id: params.id } })
    if (!existing) throw new BusinessError('Entidad no encontrada', 404)
    await prisma.entity.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Eliminado exitosamente' })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al eliminar entidad' }
)
```

### GET lista → `withLogging`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)

  try {
    const [total, items] = await Promise.all([
      prisma.entity.count(),
      prisma.entity.findMany({ skip: (page - 1) * limit, take: limit }),
    ])
    return NextResponse.json({ items, pagination: { page, limit, total } })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entities')
    return NextResponse.json({ error: 'Error al obtener entidades' }, { status: 500 })
  }
})
```

## Reglas

1. **POST/PUT/DELETE → `withApiHandler`**: validación Zod, UUID y error handling son automáticos
2. **GET lista → `withLogging`**: con try/catch manual (patrón vigente para listas)
3. **Usar `BusinessError`** para errores de negocio (not found, validación custom, etc.)
4. **Usar transacciones** para operaciones multi-tabla
5. **Retornar códigos HTTP apropiados**: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 409 Conflict, 500 Error
6. **Imports**: `prisma` desde `@/lib/db`, nunca `@/lib/prisma`

## Error Handling

`withApiHandler` integra `handleApiError` (`lib/api-handler.ts`) que maneja automáticamente:

| Tipo de error | Status HTTP | Respuesta |
|--------------|-------------|-----------|
| `BusinessError` | su `statusCode` | `{ error: message }` |
| `ZodError` | 400 | `{ error: 'Datos inválidos', details: [...] }` |
| Prisma P2002 | 409 | `{ error: 'Ya existe un registro con ese X' }` |
| Prisma P2025 | 404 | `{ error: 'Registro no encontrado' }` |
| Prisma P2003 | 400 | `{ error: 'Referencia a registro inexistente' }` |
| Otro | 500 | `{ error: fallbackMessage }` |

**Detalles completos:** Usar skill `cobralon-error-handling`

## Operaciones Financieras

Para pagos y créditos, usar transacciones atómicas:

```typescript
await prisma.$transaction(async (tx) => {
  // Todas las operaciones relacionadas
})
```

Ver `lib/business-logic/` para lógica de negocio pura.

## Skills relacionados

- **Lógica financiera** (pagos, créditos, FIFO): usar skill `cobralon-financial-logic`
- **Performance** (async waterfalls, Promise.all): usar skill `cobralon-best-practices`
- **Error handling** (patrones completos, Pino, toasts): usar skill `cobralon-error-handling`
- **Generación CRUD**: usar skill `cobralon-crud-generator` para nuevas entidades
- **Testing**: usar skill `cobralon-testing-strategy` para escribir tests de endpoints
