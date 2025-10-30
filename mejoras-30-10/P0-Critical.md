# P0 - Problemas Críticos (Bloquean Producción)

## 🚨 Prioridad: MÁXIMA

Estos problemas deben resolverse ANTES de cualquier deploy a producción o escala significativa del sistema.

---

## 1. Tests Inexistentes (Score: 2/10)

### 📊 Estado Actual

**Evidencia:**

```bash
$ npm test
Test Files  1 passed (1)
     Tests  1 passed (1)

# Archivo único encontrado:
node_modules/@tanstack/react-table/build/lib/__tests__/xxx.test.js
```

**Análisis:**

- ✅ **Configuración presente**: Vitest, Playwright, Testing Library instalados
- ✅ **Scripts configurados**: `npm test`, `npm test:ui`, `npm test:coverage`
- ❌ **Tests de proyecto**: 0 tests propios
- ❌ **Coverage**: 0% del código del proyecto

**Archivos críticos sin tests:**

1. **`lib/transformers/payment-transformers.ts`** (104 líneas)
   - Pure functions que procesan datos financieros
   - Lógica crítica de negocio
   - Bugs aquí = datos incorrectos en tablas

2. **`lib/business-logic/payment-fifo.ts`**
   - Asignación FIFO de pagos
   - Afecta balance de proyectos

3. **`lib/business-logic/project-balance.ts`**
   - Cálculo de balances
   - Errores = reportes incorrectos

4. **`app/api/projects/route.ts`** (288 líneas)
   - API sin tests de integración
   - Validaciones manuales sin cobertura

5. **`app/api/payments/route.ts`** (384 líneas)
   - Transacciones complejas
   - Sin tests de edge cases

### 🔥 Impacto Real

**Escenario 1: Bug en `processProjectPayments`**

Código actual:

```typescript
// lib/transformers/payment-transformers.ts:91-104
export function processProjectPayments(
  payments: PaymentFromAPI[],
  projectId: string,
  order: SortOrder = 'asc'
): PaymentAllocation[] {
  const allocations = extractProjectAllocations(payments, projectId)
  return sortAllocationsByDate(allocations, order)
}
```

**¿Qué pasa si hay un bug aquí?**

1. Tabla de pagos muestra montos incorrectos
2. Cliente ve balance equivocado
3. Decisiones de negocio basadas en datos erróneos
4. Bug se descubre DESPUÉS de afectar a usuarios

**Sin tests:**

- ⚠️ No sabes si funciona con pagos múltiples
- ⚠️ No sabes si ordena correctamente
- ⚠️ No sabes qué pasa con allocations vacías
- ⚠️ Cada cambio es "deploy and pray"

**Escenario 2: Refactoring de `projectForm.tsx`**

- Archivo tiene 471 líneas
- Quieres refactorizar (es P1)
- Sin tests: ¿cómo sabes que no rompiste nada?
- Resultado: miedo a refactorizar = deuda técnica crece

### 💡 Solución

#### **Fase 1: Tests de Pure Functions (1 día)**

**Target: `lib/transformers/payment-transformers.ts`**

```typescript
// lib/transformers/__tests__/payment-transformers.test.ts
import { describe, it, expect } from 'vitest'
import {
  extractProjectAllocations,
  sortAllocationsByDate,
  processProjectPayments,
} from '../payment-transformers'

describe('extractProjectAllocations', () => {
  it('debe extraer solo allocations del proyecto especificado', () => {
    const payments = [
      {
        id: 'p1',
        date: new Date('2025-01-15'),
        allocations: [
          { id: 'a1', projectId: 'proj-1', allocatedAmount: 1000 },
          { id: 'a2', projectId: 'proj-2', allocatedAmount: 500 },
        ],
      },
    ]

    const result = extractProjectAllocations(payments, 'proj-1')

    expect(result).toHaveLength(1)
    expect(result[0].allocatedAmount).toBe(1000)
    expect(result[0].projectId).toBe('proj-1')
  })

  it('debe devolver array vacío si no hay allocations', () => {
    const payments = [
      {
        id: 'p1',
        date: new Date('2025-01-15'),
        allocations: [
          { id: 'a1', projectId: 'proj-2', allocatedAmount: 500 },
        ],
      },
    ]

    const result = extractProjectAllocations(payments, 'proj-1')

    expect(result).toEqual([])
  })

  it('debe manejar múltiples pagos con múltiples allocations', () => {
    const payments = [
      {
        id: 'p1',
        date: new Date('2025-01-15'),
        allocations: [
          { id: 'a1', projectId: 'proj-1', allocatedAmount: 1000 },
          { id: 'a2', projectId: 'proj-2', allocatedAmount: 500 },
        ],
      },
      {
        id: 'p2',
        date: new Date('2025-01-20'),
        allocations: [
          { id: 'a3', projectId: 'proj-1', allocatedAmount: 2000 },
        ],
      },
    ]

    const result = extractProjectAllocations(payments, 'proj-1')

    expect(result).toHaveLength(2)
    expect(result[0].allocatedAmount).toBe(1000)
    expect(result[1].allocatedAmount).toBe(2000)
  })
})

describe('sortAllocationsByDate', () => {
  it('debe ordenar ascendente por default', () => {
    const allocations = [
      { paymentDate: new Date('2025-01-20'), allocatedAmount: 2000 },
      { paymentDate: new Date('2025-01-10'), allocatedAmount: 1000 },
      { paymentDate: new Date('2025-01-15'), allocatedAmount: 1500 },
    ]

    const result = sortAllocationsByDate(allocations, 'asc')

    expect(result[0].paymentDate.getDate()).toBe(10)
    expect(result[1].paymentDate.getDate()).toBe(15)
    expect(result[2].paymentDate.getDate()).toBe(20)
  })

  it('debe ordenar descendente cuando se especifica', () => {
    const allocations = [
      { paymentDate: new Date('2025-01-10'), allocatedAmount: 1000 },
      { paymentDate: new Date('2025-01-20'), allocatedAmount: 2000 },
    ]

    const result = sortAllocationsByDate(allocations, 'desc')

    expect(result[0].paymentDate.getDate()).toBe(20)
    expect(result[1].paymentDate.getDate()).toBe(10)
  })
})

describe('processProjectPayments (integration)', () => {
  it('debe extraer y ordenar allocations correctamente', () => {
    const payments = [
      {
        id: 'p1',
        date: new Date('2025-01-20'),
        allocations: [
          { id: 'a1', projectId: 'proj-1', allocatedAmount: 2000 },
        ],
      },
      {
        id: 'p2',
        date: new Date('2025-01-10'),
        allocations: [
          { id: 'a2', projectId: 'proj-1', allocatedAmount: 1000 },
          { id: 'a3', projectId: 'proj-2', allocatedAmount: 500 },
        ],
      },
    ]

    const result = processProjectPayments(payments, 'proj-1', 'asc')

    expect(result).toHaveLength(2)
    expect(result[0].allocatedAmount).toBe(1000) // Fecha más antigua primero
    expect(result[1].allocatedAmount).toBe(2000)
  })
})
```

**Beneficios inmediatos:**

- ✅ Confianza: sabes que la lógica funciona
- ✅ Refactoring seguro: tests te avisan si rompes algo
- ✅ Documentación viva: tests muestran cómo usar las funciones
- ✅ Rápido: pure functions se testean en <1ms cada una

**Esfuerzo:** 2-3 horas para el archivo completo

---

#### **Fase 2: Tests de API Routes (2-3 días)**

**Target: `app/api/payments/route.ts`**

```typescript
// app/api/payments/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findUnique: vi.fn(),
    },
    paymentMethod: {
      findUnique: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
  },
}))

describe('POST /api/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validación de tipo de pago', () => {
    it('debe rechazar pago tipo "Project" con múltiples allocations', async () => {
      const request = new Request('http://localhost/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          type: 'Project',
          customerId: 'cust-1',
          amount: 1000,
          currency: 'CLP',
          allocations: [
            { projectId: 'proj-1', allocatedAmount: 500 },
            { projectId: 'proj-2', allocatedAmount: 500 },
          ],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Project debe tener exactamente una asignación')
    })

    it('debe rechazar pago tipo "Customer" sin allocations', async () => {
      const request = new Request('http://localhost/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          type: 'Customer',
          customerId: 'cust-1',
          amount: 1000,
          currency: 'CLP',
          allocations: [],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('debe tener al menos una asignación')
    })
  })

  describe('Validación de suma de allocations', () => {
    it('debe rechazar si suma no coincide con monto total', async () => {
      vi.mocked(db.customer.findUnique).mockResolvedValue({
        id: 'cust-1',
        name: 'Cliente Test',
      })
      vi.mocked(db.paymentMethod.findUnique).mockResolvedValue({
        id: 'pm-1',
        name: 'Efectivo',
      })
      vi.mocked(db.project.findMany).mockResolvedValue([
        { id: 'proj-1', customerId: 'cust-1', currency: 'CLP' },
      ])

      const request = new Request('http://localhost/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          type: 'Project',
          customerId: 'cust-1',
          amount: 1000,
          currency: 'CLP',
          paymentMethodId: 'pm-1',
          allocations: [
            { projectId: 'proj-1', allocatedAmount: 900 }, // ❌ 900 ≠ 1000
          ],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('suma de asignaciones')
    })

    it('debe aceptar suma con tolerancia de centavos', async () => {
      vi.mocked(db.customer.findUnique).mockResolvedValue({
        id: 'cust-1',
        name: 'Cliente Test',
      })
      vi.mocked(db.paymentMethod.findUnique).mockResolvedValue({
        id: 'pm-1',
        name: 'Efectivo',
      })
      vi.mocked(db.project.findMany).mockResolvedValue([
        { id: 'proj-1', customerId: 'cust-1', currency: 'CLP' },
      ])
      vi.mocked(db.payment.create).mockResolvedValue({
        id: 'pay-1',
        amount: 1000.01,
      })

      const request = new Request('http://localhost/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          type: 'Project',
          customerId: 'cust-1',
          amount: 1000.01,
          currency: 'CLP',
          paymentMethodId: 'pm-1',
          date: new Date().toISOString(),
          allocations: [
            { projectId: 'proj-1', allocatedAmount: 1000.00 }, // ✅ diff < 0.01
          ],
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('Validación de proyectos', () => {
    it('debe rechazar si proyectos no pertenecen al cliente', async () => {
      vi.mocked(db.customer.findUnique).mockResolvedValue({
        id: 'cust-1',
        name: 'Cliente Test',
      })
      vi.mocked(db.paymentMethod.findUnique).mockResolvedValue({
        id: 'pm-1',
        name: 'Efectivo',
      })
      vi.mocked(db.project.findMany).mockResolvedValue([
        { id: 'proj-1', customerId: 'cust-2', currency: 'CLP' }, // ❌ customerId diferente
      ])

      const request = new Request('http://localhost/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          type: 'Project',
          customerId: 'cust-1',
          amount: 1000,
          currency: 'CLP',
          paymentMethodId: 'pm-1',
          date: new Date().toISOString(),
          allocations: [
            { projectId: 'proj-1', allocatedAmount: 1000 },
          ],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('no pertenecen al cliente')
    })
  })
})
```

**Coverage esperado:** 70%+ de las API routes

**Esfuerzo:**
- `POST /api/payments`: 1 día (es compleja)
- `GET /api/projects`: 4 horas
- `POST /api/projects`: 4 horas

---

#### **Fase 3: Tests E2E con Playwright (1-2 días)**

**Flujos críticos:**

```typescript
// e2e/payment-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Flujo de Pago a Proyecto', () => {
  test('debe crear pago y actualizar balance', async ({ page }) => {
    // 1. Navegar a proyectos
    await page.goto('/projects')

    // 2. Buscar proyecto con balance
    await page.fill('[placeholder="Buscar proyectos..."]', 'P 0001-2025')
    await page.waitForTimeout(500)

    // 3. Click en "Registrar Pago"
    await page.click('text=Registrar Pago')

    // 4. Llenar formulario
    await page.fill('[name="amount"]', '500000')
    await page.selectOption('[name="paymentMethodId"]', { label: 'Efectivo' })

    // 5. Submit
    await page.click('button:has-text("Registrar Pago")')

    // 6. Verificar toast de éxito
    await expect(page.locator('text=Pago registrado exitosamente')).toBeVisible()

    // 7. Verificar que balance se actualizó
    await page.waitForTimeout(1000)
    const balanceCell = page.locator('text=P 0001-2025')
      .locator('xpath=ancestor::tr')
      .locator('[data-column="balance"]')

    // Balance debe ser menor que antes
    await expect(balanceCell).not.toContainText('$1,500,000')
  })

  test('debe validar suma de allocations en pago a cliente', async ({ page }) => {
    await page.goto('/payments')
    await page.click('text=Nuevo Pago a Cliente')

    // Seleccionar cliente
    await page.click('[role="combobox"]')
    await page.click('text=Cliente Test')

    // Ingresar monto total
    await page.fill('[name="amount"]', '1000000')

    // Asignar mal: suma no coincide
    await page.fill('[data-project-allocation="proj-1"]', '500000')
    await page.fill('[data-project-allocation="proj-2"]', '400000')
    // Total asignado: 900,000 ≠ 1,000,000

    // Intentar submit
    await page.click('button:has-text("Registrar Pago")')

    // Debe mostrar error
    await expect(page.locator('text=suma debe ser igual')).toBeVisible()
  })
})
```

**Esfuerzo:** 1-2 días para flujos críticos

---

### 📋 Plan de Acción

| Fase | Tiempo  | Archivos a Testear                       | Beneficio                        |
| ---- | ------- | ---------------------------------------- | -------------------------------- |
| 1    | 1 día   | Pure functions (transformers)            | Quick wins, base sólida          |
| 2    | 2-3 día | API routes (payments, projects)          | Backend confiable                |
| 3    | 1-2 día | E2E (flujos de pago, creación proyecto)  | Confianza en features completas  |
| 4    | Ongoing | Agregar tests con cada PR                | Mantener cobertura               |

**Target de Coverage:**

- Pure functions: 90%+
- API routes: 70%+
- Components: 50%+ (solo críticos)
- E2E: Flujos principales completos

---

## 2. Client-Side Filtering Rompe Paginación

### 📊 Estado Actual

**Archivo:** `app/api/projects/route.ts:117-130`

```typescript
// ❌ PROBLEMA: Fetch de DB con paginación, luego filtrar client-side
const skip = (page - 1) * limit
const totalProjects = await db.project.count({ where })

const projects = await db.project.findMany({
  where,
  include: { customer: true, projectStatus: true, paymentAllocations: true },
  orderBy: { date: 'desc' },
  skip,
  take: limit,
  relationLoadStrategy: 'join',
})

// 🔥 Aquí se rompe todo:
const filteredProjects = projectsWithCalculations.filter((project) => {
  const isFullyPaid = project.balance === 0
  const hasFinaleStatus = project.projectStatus?.isFinal ?? false

  // Filtrado client-side después de paginar
  if (hideFullyPaid && isFullyPaid) return false
  if (hideFinale && hasFinaleStatus) return false
  return true
})

return NextResponse.json({
  projects: filteredProjects,
  pagination: {
    total: totalProjects, // ❌ Count es incorrecto
    page,
    limit,
    totalPages: Math.ceil(totalProjects / limit), // ❌ Cálculo erróneo
  },
})
```

### 🔥 Impacto Real

**Escenario 1: Usuario con 100 proyectos**

1. Usuario configura: `hideFullyPaid: true`, `hideFinale: true`
2. Backend:
   - `totalProjects = 100` (count sin filtros)
   - Fetch primeros 10 proyectos (página 1)
   - Client-side filter: 3 proyectos pasan el filtro
3. **Frontend muestra:**
   - "Mostrando 3 proyectos de 100 total"
   - "10 páginas disponibles"
4. **Usuario va a página 2:**
   - Backend fetchea proyectos 11-20
   - Client-side filter: 1 proyecto pasa
   - "Mostrando 1 proyecto de 100 total"
5. **Usuario va a página 3:**
   - Backend fetchea proyectos 21-30
   - Client-side filter: 0 proyectos pasan
   - **Página vacía** (pero dice "3 de 10 páginas")

**Bugs resultantes:**

- ❌ Paginación muestra números incorrectos
- ❌ Páginas vacías
- ❌ Usuarios confundidos: "¿Por qué página 3 está vacía si dice que hay 100 proyectos?"
- ❌ Performance: fetcheas 100 proyectos pero solo muestras 10

### 💡 Solución

#### **Opción A: Filtrado Server-Side (Recomendado)**

```typescript
// app/api/projects/route.ts (CORREGIDO)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const hideFullyPaid = searchParams.get('hideFullyPaid') === 'true'
  const hideFinale = searchParams.get('hideFinale') === 'true'

  // ✅ Construir where dinámicamente
  const where: Prisma.ProjectWhereInput = {}

  // Filtros básicos (ya existentes)
  if (customerId) where.customerId = customerId
  if (projectStatusId) where.projectStatusId = projectStatusId

  // ✅ Nuevo: Filtrado de proyectos pagados completamente
  if (hideFullyPaid) {
    // Para saber si está pagado completamente, necesitamos comparar:
    // total vs SUM(paymentAllocations.allocatedAmount)
    // Esto requiere una subquery o raw SQL

    // Opción 1: Raw SQL (más performante)
    const fullyPaidProjectIds = await db.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM "Project" p
      LEFT JOIN "PaymentAllocation" pa ON pa."projectId" = p.id
      GROUP BY p.id, p.total
      HAVING p.total <= COALESCE(SUM(pa."allocatedAmount"), 0)
    `

    where.id = {
      notIn: fullyPaidProjectIds.map(p => p.id)
    }
  }

  // ✅ Nuevo: Filtrado de proyectos finalizados
  if (hideFinale) {
    where.projectStatus = {
      isFinal: false
    }
  }

  // ✅ Count DESPUÉS de filtros
  const totalProjects = await db.project.count({ where })

  // ✅ Fetch DESPUÉS de filtros
  const skip = (page - 1) * limit
  const projects = await db.project.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      projectStatus: {
        select: {
          id: true,
          name: true,
          order: true,
          isFinal: true,
          color: { select: { bgClass: true, textClass: true } },
        },
      },
      paymentAllocations: {
        select: { allocatedAmount: true },
      },
    },
    orderBy: { date: 'desc' },
    skip,
    take: limit,
    relationLoadStrategy: 'join',
  })

  // ✅ Calcular balance (ya no filtramos aquí)
  const projectsWithBalance = projects.map((project) => {
    const totalPaid = project.paymentAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.allocatedAmount),
      0
    )
    const balance = Number(project.total) - totalPaid

    return {
      ...project,
      balance,
    }
  })

  return NextResponse.json({
    projects: projectsWithBalance,
    pagination: {
      total: totalProjects, // ✅ Correcto
      page,
      limit,
      totalPages: Math.ceil(totalProjects / limit), // ✅ Correcto
    },
  })
}
```

**Cambios en frontend:**

```typescript
// app/projects/page.tsx (actualizar)
const fetchProjects = async () => {
  setIsLoadingPage(true)
  try {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: pageSize.toString(),
      hideFullyPaid: hideFullyPaid.toString(), // ✅ Pasar al backend
      hideFinale: hideFinale.toString(),       // ✅ Pasar al backend
      ...(customerFilter && { customerId: customerFilter }),
      ...(statusFilter && { projectStatusId: statusFilter }),
    })

    const response = await fetch(`/api/projects?${params}`)
    const data = await response.json()

    setProjects(data.projects)
    setTotalProjects(data.pagination.total) // ✅ Ahora es correcto
  } finally {
    setIsLoadingPage(false)
  }
}
```

**Beneficios:**

- ✅ Paginación correcta
- ✅ Count correcto
- ✅ Performance: solo fetcheas lo que necesitas
- ✅ No hay páginas vacías

**Performance:**

- Raw SQL es rápido con índices
- Si escala mucho (>10k proyectos), agregar campo `balance` denormalizado (ver P2)

---

#### **Opción B: Filtrado Client-Only (Rápido pero limitado)**

Si necesitas una solución temporal mientras implementas server-side:

```typescript
// app/projects/page.tsx (temporal)
const [allProjects, setAllProjects] = useState([])
const [displayedProjects, setDisplayedProjects] = useState([])

// Fetch TODO (sin paginación)
const fetchAllProjects = async () => {
  const response = await fetch('/api/projects?limit=10000') // Max todos
  const data = await response.json()
  setAllProjects(data.projects)
}

// Filtrar y paginar client-side
useEffect(() => {
  let filtered = allProjects

  if (hideFullyPaid) {
    filtered = filtered.filter(p => p.balance > 0)
  }

  if (hideFinale) {
    filtered = filtered.filter(p => !p.projectStatus?.isFinal)
  }

  // Paginar client-side
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  setDisplayedProjects(filtered.slice(start, end))
  setTotalProjects(filtered.length) // ✅ Correcto
}, [allProjects, hideFullyPaid, hideFinale, currentPage, pageSize])
```

**Trade-offs:**

- ✅ Rápido de implementar (30 min)
- ❌ Fetches TODOS los proyectos (malo con >1000 proyectos)
- ❌ No escalable
- ⚠️ Solo usar como temporal

---

### 📋 Plan de Acción

| Paso | Acción                                        | Tiempo | Prioridad |
| ---- | --------------------------------------------- | ------ | --------- |
| 1    | Implementar Opción B (temporal)               | 30 min | P0        |
| 2    | Implementar Opción A (server-side correcto)   | 4 hrs  | P0        |
| 3    | Tests de API con filtros                      | 2 hrs  | P0        |
| 4    | Tests E2E de paginación con filtros           | 2 hrs  | P1        |

---

## 🎯 Resumen P0

| Problema                  | Impacto                      | Solución                       | Esfuerzo |
| ------------------------- | ---------------------------- | ------------------------------ | -------- |
| Tests inexistentes        | Bugs en producción           | Vitest + Playwright (fases)    | 4-6 días |
| Client-side filtering     | Paginación rota, UX confusa  | Server-side filtering          | 4 hrs    |

**Total estimado:** 5-7 días de trabajo

**Bloqueante para:** Deploy a producción, escalar usuarios, refactorings seguros
