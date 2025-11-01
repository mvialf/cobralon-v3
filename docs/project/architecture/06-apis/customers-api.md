# Customers API

API REST para gestión de clientes con búsqueda, paginación y validaciones.

---

## Endpoints

```
GET    /api/customers           → Listar con paginación + search
POST   /api/customers           → Crear cliente
GET    /api/customers/[id]      → Detalle de cliente
PUT    /api/customers/[id]      → Actualizar cliente
DELETE /api/customers/[id]      → Eliminar cliente (CASCADE a projects)
GET    /api/customers/list      → Lista simple para dropdowns
```

---

## GET /api/customers

Listar clientes con paginación y búsqueda.

### Query Parameters

| Parámetro | Tipo   | Default | Descripción                                     |
| --------- | ------ | ------- | ----------------------------------------------- |
| `page`    | number | 1       | Número de página                                |
| `limit`   | number | 10      | Items por página (max: 100)                     |
| `search`  | string | -       | Buscar en name, email, phone (case-insensitive) |

### Request Example

```bash
GET /api/customers?page=1&limit=20&search=juan
```

### Response

```json
{
  "data": [
    {
      "id": "uuid-123",
      "name": "Juan Pérez",
      "phone": "+56912345678",
      "email": "juan@example.com",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Implementación

```typescript
// app/api/customers/route.ts
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const search = searchParams.get('search') || ''

  logger.info({ page, limit, search }, 'Listing customers')

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }
    : {}

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ])

  logger.info({ count: customers.length, total }, 'Customers retrieved')

  return NextResponse.json({
    data: customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})
```

---

## POST /api/customers

Crear nuevo cliente.

### Request Body

```json
{
  "name": "María González",
  "phone": "+56987654321",
  "email": "maria@example.com" // Opcional
}
```

### Validation Schema (Zod)

```typescript
// lib/validations/customer-validations.ts
export const customerFormSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  phone: z.string().min(1, 'Teléfono es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
})
```

### Response (201 Created)

```json
{
  "id": "uuid-456",
  "name": "María González",
  "phone": "+56987654321",
  "email": "maria@example.com",
  "createdAt": "2025-01-20T14:30:00Z",
  "updatedAt": "2025-01-20T14:30:00Z"
}
```

### Implementación

```typescript
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  logger.info('Creating customer')

  try {
    const validatedData = customerFormSchema.parse(body)

    const customer = await prisma.customer.create({
      data: validatedData,
    })

    logger.info({ customerId: customer.id }, 'Customer created')

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ errors: error.errors }, 'Validation failed')
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    logger.error({ err: error }, 'Failed to create customer')
    throw error
  }
})
```

---

## GET /api/customers/[id]

Obtener detalle de cliente específico.

### Path Parameters

| Parámetro | Tipo | Descripción    |
| --------- | ---- | -------------- |
| `id`      | UUID | ID del cliente |

### Request Example

```bash
GET /api/customers/uuid-123
```

### Response (200 OK)

```json
{
  "id": "uuid-123",
  "name": "Juan Pérez",
  "phone": "+56912345678",
  "email": "juan@example.com",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### Response (404 Not Found)

```json
{
  "error": "Customer not found"
}
```

### Implementación

```typescript
// app/api/customers/[id]/route.ts
export const GET = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}

  if (!id) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
  }

  logger.info({ customerId: id }, 'Fetching customer')

  const customer = await prisma.customer.findUnique({
    where: { id },
  })

  if (!customer) {
    logger.warn({ customerId: id }, 'Customer not found')
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  logger.info({ customerId: id }, 'Customer retrieved')

  return NextResponse.json(customer)
})
```

---

## PUT /api/customers/[id]

Actualizar cliente existente.

### Path Parameters

| Parámetro | Tipo | Descripción    |
| --------- | ---- | -------------- |
| `id`      | UUID | ID del cliente |

### Request Body

```json
{
  "name": "Juan Pérez Actualizado",
  "phone": "+56912345678",
  "email": "juan.nuevo@example.com"
}
```

### Response (200 OK)

```json
{
  "id": "uuid-123",
  "name": "Juan Pérez Actualizado",
  "phone": "+56912345678",
  "email": "juan.nuevo@example.com",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T15:45:00Z"
}
```

### Implementación

```typescript
export const PUT = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}
  const body = await request.json()

  logger.info({ customerId: id }, 'Updating customer')

  try {
    const validatedData = customerFormSchema.parse(body)

    const customer = await prisma.customer.update({
      where: { id },
      data: validatedData,
    })

    logger.info({ customerId: id }, 'Customer updated')

    return NextResponse.json(customer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ errors: error.errors }, 'Validation failed')
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error.code === 'P2025') {
      logger.warn({ customerId: id }, 'Customer not found')
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    logger.error({ err: error }, 'Failed to update customer')
    throw error
  }
})
```

---

## DELETE /api/customers/[id]

Eliminar cliente (CASCADE: también elimina sus proyectos).

### Path Parameters

| Parámetro | Tipo | Descripción    |
| --------- | ---- | -------------- |
| `id`      | UUID | ID del cliente |

### Response (200 OK)

```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

### ⚠️ Importante

```prisma
model Project {
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
}
```

**Eliminar cliente también elimina TODOS sus proyectos** (política CASCADE).

### Implementación

```typescript
export const DELETE = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}

  logger.info({ customerId: id }, 'Deleting customer')

  try {
    await prisma.customer.delete({
      where: { id },
    })

    logger.info({ customerId: id }, 'Customer deleted')

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    })
  } catch (error) {
    if (error.code === 'P2025') {
      logger.warn({ customerId: id }, 'Customer not found')
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    logger.error({ err: error }, 'Failed to delete customer')
    throw error
  }
})
```

---

## GET /api/customers/list

Lista simple de clientes para dropdowns (sin paginación).

### Response

```json
[
  {
    "id": "uuid-123",
    "name": "Juan Pérez",
    "phone": "+56912345678"
  },
  {
    "id": "uuid-456",
    "name": "María González",
    "phone": "+56987654321"
  }
]
```

### Implementación

```typescript
// app/api/customers/list/route.ts
export const GET = withLogging(async (request, logger) => {
  logger.info('Fetching customer list')

  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
    },
    orderBy: { name: 'asc' },
  })

  logger.info({ count: customers.length }, 'Customer list retrieved')

  return NextResponse.json(customers)
})
```

---

## Errores Comunes

### 400 Bad Request - Validación Fallida

```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["email"],
      "message": "Email inválido"
    }
  ]
}
```

### 404 Not Found - Cliente No Existe

```json
{
  "error": "Customer not found"
}
```

### 409 Conflict - Email Duplicado

```json
{
  "error": "Email already exists"
}
```

---

## Ver También

- [Customer Model](../01-data-model/customers.md) - Modelo de datos
- [Customer Validations](../03-layers/business-logic.md#validaciones-zod-schemas) - Schemas Zod
- [API Layer](../03-layers/api-layer.md) - Arquitectura general

**Última actualización:** 2025-10-30
