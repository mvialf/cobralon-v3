# Projects API

API REST para gestión de proyectos con filtros avanzados, includes complejos y cálculo de balance.

---

## Endpoints

```
GET    /api/projects            → Listar con filtros + includes
POST   /api/projects            → Crear proyecto
GET    /api/projects/[id]       → Detalle con allocations
PUT    /api/projects/[id]       → Actualizar
DELETE /api/projects/[id]       → Eliminar
```

---

## GET /api/projects

Listar proyectos con paginación, filtros y datos relacionados.

### Query Parameters

| Parámetro         | Tipo   | Default | Descripción                       |
| ----------------- | ------ | ------- | --------------------------------- |
| `page`            | number | 1       | Número de página                  |
| `limit`           | number | 20      | Items por página (max: 100)       |
| `customerId`      | UUID   | -       | Filtrar por cliente               |
| `projectStatusId` | UUID   | -       | Filtrar por estado                |
| `startDate`       | string | -       | Fecha inicio (ISO 8601)           |
| `endDate`         | string | -       | Fecha fin (ISO 8601)              |

### Request Example

```bash
GET /api/projects?page=1&limit=20&customerId=uuid-123&startDate=2025-01-01
```

### Response

```json
{
  "data": [
    {
      "id": "uuid-proj-1",
      "projectNumber": "P 0001-2025",
      "projectName": "Instalación Ventanas Depto 401",
      "customerId": "uuid-123",
      "customer": {
        "id": "uuid-123",
        "name": "Juan Pérez",
        "phone": "+56912345678"
      },
      "projectStatusId": "uuid-status-1",
      "projectStatus": {
        "id": "uuid-status-1",
        "name": "En Proceso",
        "order": 1,
        "color": {
          "bgClass": "bg-blue-500",
          "textClass": "text-white"
        }
      },
      "date": "2025-01-15T00:00:00Z",
      "subtotal": 1500000.00,
      "taxRate": 19.00,
      "total": 1785000.00,
      "currency": "CLP",
      "windowsCount": 4,
      "squareMeters": 12.50,
      "street": "Av. Providencia 1234",
      "apartment": "Depto 401",
      "comuna": "Providencia",
      "region": "Metropolitana (RM)",
      "phone": "+56912345678",
      "paymentAllocations": [
        {
          "allocatedAmount": 500000.00
        }
      ],
      "balance": 1285000.00,  // Calculado: total - SUM(allocations)
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

### Implementación

```typescript
// app/api/projects/route.ts
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const customerId = searchParams.get('customerId')
  const projectStatusId = searchParams.get('projectStatusId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  logger.info(
    { page, limit, customerId, projectStatusId, startDate, endDate },
    'Listing projects'
  )

  // Build filters
  const where: any = {}

  if (customerId) where.customerId = customerId
  if (projectStatusId) where.projectStatusId = projectStatusId
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = new Date(startDate)
    if (endDate) where.date.lte = new Date(endDate)
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      relationLoadStrategy: 'join',  // ← Fix N+1
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        projectStatus: {
          select: {
            id: true,
            name: true,
            order: true,
            color: {
              select: { bgClass: true, textClass: true }
            }
          }
        },
        paymentAllocations: {
          select: { allocatedAmount: true }
        }
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.project.count({ where })
  ])

  // Calcular balance para cada proyecto
  const projectsWithBalance = projects.map(project => {
    const totalPaid = project.paymentAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.allocatedAmount),
      0
    )
    const balance = Number(project.total) - totalPaid

    return {
      ...project,
      balance
    }
  })

  logger.info({ count: projects.length, total }, 'Projects retrieved')

  return NextResponse.json({
    data: projectsWithBalance,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})
```

---

## POST /api/projects

Crear nuevo proyecto.

### Request Body

```json
{
  "projectName": "Instalación Ventanas Depto 401",
  "customerId": "uuid-123",
  "projectStatusId": "uuid-status-1",
  "date": "2025-01-15T00:00:00Z",
  "subtotal": 1500000.00,
  "taxRate": 19.00,
  "currency": "CLP",
  "windowsCount": 4,
  "squareMeters": 12.50,
  "street": "Av. Providencia 1234",
  "apartment": "Depto 401",
  "comuna": "Providencia",
  "region": "Metropolitana (RM)",
  "phone": "+56912345678",
  "description": "Ventanas termopanel doble vidrio"
}
```

### Validation Schema (Zod)

```typescript
// lib/validations/project-validations.ts
export const projectFormSchema = z.object({
  projectName: z.string().optional(),
  customerId: z.string().min(1, "Cliente es requerido"),
  projectStatusId: z.string().min(1, "Estado es requerido"),
  date: z.coerce.date(),
  subtotal: z.number().positive("Subtotal debe ser mayor a 0"),
  taxRate: z.number().min(0).max(100).default(19),
  currency: z.string().default("CLP"),
  windowsCount: z.number().int().min(0),
  squareMeters: z.number().positive(),
  street: z.string().min(1, "Calle es requerida"),
  apartment: z.string().optional(),
  comuna: z.string().min(1, "Comuna es requerida"),
  region: z.string().min(1, "Región es requerida"),
  phone: z.string().min(1, "Teléfono es requerido"),
  description: z.string().optional()
})
```

### Response (201 Created)

```json
{
  "id": "uuid-proj-1",
  "projectNumber": "P 0001-2025",  // Auto-generado
  "projectName": "Instalación Ventanas Depto 401",
  "customerId": "uuid-123",
  "customer": {
    "id": "uuid-123",
    "name": "Juan Pérez",
    "phone": "+56912345678"
  },
  "projectStatusId": "uuid-status-1",
  "projectStatus": {
    "id": "uuid-status-1",
    "name": "En Proceso",
    "color": {
      "bgClass": "bg-blue-500",
      "textClass": "text-white"
    }
  },
  "date": "2025-01-15T00:00:00Z",
  "subtotal": 1500000.00,
  "taxRate": 19.00,
  "total": 1785000.00,  // Auto-calculado: subtotal * (1 + taxRate/100)
  "totalAmount": 1785000.00,
  "currency": "CLP",
  // ... resto de campos
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### Implementación

```typescript
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  logger.info('Creating project')

  try {
    const validatedData = projectFormSchema.parse(body)

    // Calcular total
    const total = validatedData.subtotal * (1 + validatedData.taxRate / 100)

    // Generar projectNumber
    const projectNumber = await generateProjectNumber()

    const project = await prisma.project.create({
      data: {
        projectNumber,
        total,
        totalAmount: total,  // Redundante por razones legacy
        ...validatedData
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        projectStatus: {
          include: { color: true }
        }
      }
    })

    logger.info({ projectId: project.id, projectNumber }, 'Project created')

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ errors: error.errors }, 'Validation failed')
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    logger.error({ err: error }, 'Failed to create project')
    throw error
  }
})
```

### Helper: Generar Project Number

```typescript
// lib/helpers/generate-project-number.ts
export async function generateProjectNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()

  // Contar proyectos del año actual
  const count = await prisma.project.count({
    where: {
      projectNumber: {
        contains: `-${currentYear}`
      }
    }
  })

  const sequence = (count + 1).toString().padStart(4, '0')

  return `P ${sequence}-${currentYear}`  // "P 0001-2025"
}
```

---

## GET /api/projects/[id]

Obtener detalle de proyecto con todas las allocations.

### Response

```json
{
  "id": "uuid-proj-1",
  "projectNumber": "P 0001-2025",
  "projectName": "Instalación Ventanas Depto 401",
  "customer": {
    "id": "uuid-123",
    "name": "Juan Pérez",
    "phone": "+56912345678"
  },
  "projectStatus": {
    "id": "uuid-status-1",
    "name": "En Proceso",
    "color": {
      "bgClass": "bg-blue-500",
      "textClass": "text-white"
    }
  },
  "date": "2025-01-15T00:00:00Z",
  "subtotal": 1500000.00,
  "taxRate": 19.00,
  "total": 1785000.00,
  "currency": "CLP",
  "paymentAllocations": [
    {
      "id": "uuid-alloc-1",
      "paymentId": "uuid-pay-1",
      "allocatedAmount": 500000.00,
      "payment": {
        "id": "uuid-pay-1",
        "amount": 500000.00,
        "date": "2025-01-16T00:00:00Z",
        "reference": "TRF-001"
      }
    }
  ],
  "balance": 1285000.00
}
```

### Implementación

```typescript
// app/api/projects/[id]/route.ts
export const GET = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}

  logger.info({ projectId: id }, 'Fetching project')

  const project = await prisma.project.findUnique({
    where: { id },
    relationLoadStrategy: 'join',
    include: {
      customer: {
        select: { id: true, name: true, phone: true }
      },
      projectStatus: {
        select: {
          id: true,
          name: true,
          order: true,
          color: {
            select: { bgClass: true, textClass: true }
          }
        }
      },
      paymentAllocations: {
        select: {
          id: true,
          paymentId: true,
          allocatedAmount: true,
          payment: {
            select: {
              id: true,
              amount: true,
              date: true,
              reference: true
            }
          }
        },
        orderBy: { payment: { date: 'desc' } }
      }
    }
  })

  if (!project) {
    logger.warn({ projectId: id }, 'Project not found')
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    )
  }

  // Calcular balance
  const totalPaid = project.paymentAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.allocatedAmount),
    0
  )
  const balance = Number(project.total) - totalPaid

  logger.info({ projectId: id, balance }, 'Project retrieved')

  return NextResponse.json({
    ...project,
    balance
  })
})
```

---

## PUT /api/projects/[id]

Actualizar proyecto existente.

### Request Body

Similar a POST (todos los campos actualizables).

### Response (200 OK)

Proyecto actualizado con includes.

### Implementación

```typescript
export const PUT = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}
  const body = await request.json()

  logger.info({ projectId: id }, 'Updating project')

  try {
    const validatedData = projectFormSchema.parse(body)

    // Recalcular total
    const total = validatedData.subtotal * (1 + validatedData.taxRate / 100)

    const project = await prisma.project.update({
      where: { id },
      data: {
        total,
        totalAmount: total,
        ...validatedData
      },
      include: {
        customer: true,
        projectStatus: { include: { color: true } }
      }
    })

    logger.info({ projectId: id }, 'Project updated')

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ errors: error.errors }, 'Validation failed')
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error.code === 'P2025') {
      logger.warn({ projectId: id }, 'Project not found')
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    logger.error({ err: error }, 'Failed to update project')
    throw error
  }
})
```

---

## DELETE /api/projects/[id]

Eliminar proyecto.

### Response (200 OK)

```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### Implementación

```typescript
export const DELETE = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}

  logger.info({ projectId: id }, 'Deleting project')

  try {
    await prisma.project.delete({
      where: { id }
    })

    logger.info({ projectId: id }, 'Project deleted')

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    if (error.code === 'P2025') {
      logger.warn({ projectId: id }, 'Project not found')
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    logger.error({ err: error }, 'Failed to delete project')
    throw error
  }
})
```

---

## Performance Optimization

### relationLoadStrategy: 'join'

Previene N+1 query problem:

```typescript
// ❌ SIN optimization (3 queries)
const projects = await prisma.project.findMany({
  include: {
    customer: true,
    projectStatus: { include: { color: true } }
  }
})
// Query 1: SELECT * FROM projects
// Query 2: SELECT * FROM customers WHERE id IN (...)
// Query 3: SELECT * FROM project_status WHERE id IN (...)

// ✅ CON optimization (1 query)
const projects = await prisma.project.findMany({
  relationLoadStrategy: 'join',  // ← Single JOIN query
  include: {
    customer: true,
    projectStatus: { include: { color: true } }
  }
})
```

### Índices Compuestos

```prisma
model Project {
  @@index([customerId, projectStatusId])
  @@index([projectStatusId, date])
  @@index([date])
}
```

**Beneficio:** Queries con filtros combinados son rápidas.

---

## Ver También

- [Project Model](../01-data-model/projects.md) - Modelo de datos
- [Project Status](../01-data-model/project-status.md) - Estados configurables
- [Balance Calculation](../03-layers/business-logic.md#project-balance) - Lógica de balance

**Última actualización:** 2025-10-30
