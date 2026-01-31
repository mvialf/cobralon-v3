---
paths: ["app/api/**/*.ts"]
---

# Patrones de API Routes

## Estructura Estándar

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// Schema de validación
const createSchema = z.object({
  name: z.string().min(1),
  // ...
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)

    const result = await prisma.entity.create({
      data: validated,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}
```

## Reglas

1. **Siempre validar con Zod** antes de usar datos
2. **Usar transacciones** para operaciones multi-tabla
3. **Retornar códigos HTTP apropiados**: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Error
4. **Manejar errores específicos** (ZodError, PrismaError, etc.)

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
- **Generación CRUD**: usar skill `cobralon-crud-generator` para nuevas entidades
