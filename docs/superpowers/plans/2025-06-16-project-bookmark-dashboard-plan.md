# Bookmark de atención + celda destacada en Panel Principal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar un icono bookmark inline en la tabla de proyectos para marcar proyectos que necesitan atención, y mostrar el proyecto marcado más reciente en la celda C del Panel Principal.

**Architecture:** Se agrega un campo `flagStatus` string al modelo `Project` (no boolean para permitir estados futuros). Se reutiliza `PUT /api/projects/[id]` para actualizarlo. En el frontend se agrega una columna oculta sin header en la tabla de proyectos y una card en el dashboard que consume el dato desde el server component.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Prisma, PostgreSQL, TanStack Table, TanStack Query, Lucide React, Vitest.

---

## File Map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Agregar campo `flagStatus` al modelo `Project` |
| `prisma/migrations/...` | Crear migración de base de datos |
| `lib/validations/project-validations.ts` | Validar `flagStatus` en schema de API |
| `app/api/projects/[id]/route.ts` | Manejar `flagStatus` en PUT |
| `app/api/projects/[id]/__tests__/route.test.ts` | Test de API para actualización de flag |
| `app/projects/types.ts` | Agregar `flagStatus` a tipos y meta de tabla |
| `app/projects/columns.tsx` | Nueva columna bookmark |
| `hooks/queries/use-projects.ts` | Hook `useUpdateProjectFlag` |
| `app/projects/page-client.tsx` | Integrar mutación en tabla |
| `app/page.tsx` | Cargar y mostrar proyecto destacado en celda C |
| `app/projects/components/project-flag-cell.tsx` | Componente reutilizable de celda bookmark |

---

## Task 1: Migración de base de datos

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20250616120000_add_project_flag_status/migration.sql`

- [ ] **Step 1: Agregar campo al schema**

```prisma
model Project {
  // ... existing fields
  flagStatus String @default("none")
  flaggedAt DateTime?
  // ... rest of fields
}
```

- [ ] **Step 2: Generar migración SQL**

Run:
```bash
npx prisma migrate dev --name add_project_flag_status --create-only
```

Expected: migration file created with `ALTER TABLE "Project" ADD COLUMN "flagStatus" TEXT NOT NULL DEFAULT 'none'`.

- [ ] **Step 3: Aplicar migración**

Run:
```bash
npx prisma migrate dev
```

- [ ] **Step 4: Regenerar cliente Prisma**

Run:
```bash
npx prisma generate
```

---

## Task 2: Validación de API

**Files:**
- Modify: `lib/validations/project-validations.ts`

- [ ] **Step 1: Agregar flagStatus al schema de API**

```ts
export const createProjectApiSchema = projectBaseSchema.extend({
  projectStatusId: z.string().min(1).nullable().default(null),
  date: z.coerce.date({
    required_error: 'La fecha de ingreso es requerida',
  }),
  totalAmount: z.number().positive().optional(),
  flagStatus: z.enum(['none', 'flagged']).optional(),
})

export const updateProjectApiSchema = createProjectApiSchema.partial()
```

---

## Task 3: Actualizar API route

**Files:**
- Modify: `app/api/projects/[id]/route.ts`

- [ ] **Step 1: Manejar flagStatus en PUT**

Agregar después de `if (body.description !== undefined)`:

```ts
if (body.flagStatus !== undefined) updateData.flagStatus = body.flagStatus
```

---

## Task 4: Tipos de frontend

**Files:**
- Modify: `app/projects/types.ts`

- [ ] **Step 1: Agregar flagStatus a Project**

```ts
export interface Project {
  // ... existing fields
  flagStatus: 'none' | 'flagged'
}
```

- [ ] **Step 2: Agregar props y meta**

```ts
export interface ColumnsProps {
  // ... existing
  updatingFlagProjectId?: string | null
}

export interface ProjectsTableMeta {
  // ... existing
  handleFlagToggle?: (projectId: string, flagStatus: 'none' | 'flagged') => Promise<void>
}
```

---

## Task 5: Componente de celda bookmark

**Files:**
- Create: `app/projects/components/project-flag-cell.tsx`

- [ ] **Step 1: Crear componente**

```tsx
'use client'

import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectFlagCellProps {
  projectId: string
  flagStatus: 'none' | 'flagged'
  isPending?: boolean
  onToggle?: (projectId: string, flagStatus: 'none' | 'flagged') => void
}

export function ProjectFlagCell({
  projectId,
  flagStatus,
  isPending = false,
  onToggle,
}: ProjectFlagCellProps) {
  const isFlagged = flagStatus === 'flagged'

  return (
    <button
      type="button"
      disabled={isPending || !onToggle}
      onClick={() => onToggle?.(projectId, isFlagged ? 'none' : 'flagged')}
      className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
      title={isFlagged ? 'Desmarcar' : 'Marcar para seguimiento'}
    >
      <Bookmark
        className={cn(
          'h-4 w-4 transition-colors',
          isFlagged ? 'fill-primary text-primary' : 'text-muted-foreground'
        )}
      />
    </button>
  )
}
```

---

## Task 6: Columna bookmark en tabla

**Files:**
- Modify: `app/projects/columns.tsx`

- [ ] **Step 1: Importar componente y ajustar props**

```tsx
import { ProjectFlagCell } from './components/project-flag-cell'
```

Desestructurar `updatingFlagProjectId` en `createColumns`.

- [ ] **Step 2: Agregar columna después de projectStatus**

```tsx
{
  id: 'flagStatus',
  size: 40,
  header: () => null,
  cell: ({ row, table }) => {
    const project = row.original
    const { handleFlagToggle } = getTableMeta<ProjectsTableMeta>(table)
    const isPending = updatingFlagProjectId === project.id

    return (
      <ProjectFlagCell
        projectId={project.id}
        flagStatus={project.flagStatus}
        isPending={isPending}
        onToggle={handleFlagToggle}
      />
    )
  },
  meta: {
    headerClassName: 'w-10',
    cellClassName: 'text-center',
  },
}
```

---

## Task 7: Hook de mutación

**Files:**
- Modify: `hooks/queries/use-projects.ts`

- [ ] **Step 1: Agregar hook `useUpdateProjectFlag`**

```ts
export function useUpdateProjectFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      flagStatus,
    }: {
      projectId: string
      flagStatus: 'none' | 'flagged'
    }): Promise<Project> => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagStatus }),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar marcador')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['featured-project'] })
      toast.success('Marcador actualizado')
    },
    onError: (error) => {
      handleMutationError(error)
    },
  })
}
```

---

## Task 8: Integrar en page-client

**Files:**
- Modify: `app/projects/page-client.tsx`

- [ ] **Step 1: Importar hook**

```tsx
import { useUpdateProjectFlag } from '@/hooks/queries/use-projects'
```

- [ ] **Step 2: Usar mutación y handler**

```tsx
const updateFlagMutation = useUpdateProjectFlag()

const handleFlagToggle = async (projectId: string, flagStatus: 'none' | 'flagged') => {
  await updateFlagMutation.mutateAsync({ projectId, flagStatus })
}
```

- [ ] **Step 3: Pasar a columnas y meta**

```tsx
const columns = createColumns({
  // ... existing
  updatingFlagProjectId: updateFlagMutation.isPending
    ? updateFlagMutation.variables?.projectId
    : null,
})
```

Y en meta:

```tsx
meta={{
  // ... existing
  handleFlagToggle,
}}
```

---

## Task 9: Query de proyecto destacado

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Agregar función `getFeaturedProject`**

```tsx
async function getFeaturedProject() {
  const project = await prisma.project.findFirst({
    where: { flagStatus: 'flagged' },
    orderBy: { flaggedAt: 'desc' },
    include: {
      customer: { select: { name: true } },
    },
  })

  if (!project) return null

  const financials = await getProjectFinancials(project.id)

  return {
    id: project.id,
    projectNumber: project.projectNumber,
    projectName: project.projectName,
    customerName: project.customer.name,
    totalAmount: Number(project.totalAmount),
    balance: financials?.balance ?? Number(project.totalAmount),
  }
}
```

- [ ] **Step 2: Llamar en loader principal**

```tsx
const [sales, availableMonths, revenueChartData, installments, recentProjects, recentPayments, featuredProject] =
  await Promise.all([
    getMonthlySales(selectedMonth),
    getAvailableMonths(selectedMonth),
    getRevenueChartData(),
    getUpcomingInstallments(),
    getRecentProjects(),
    getRecentPayments(),
    getFeaturedProject(),
  ])
```

---

## Task 10: Celda C del dashboard

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Reemplazar placeholder Card C**

```tsx
<Card className="gap-1.5 overflow-hidden" style={{ gridArea: 'c' }}>
  <CardHeader className="px-3 py-0">
    <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <Bookmark className="h-3.5 w-3.5" />
      Destacado
    </CardTitle>
  </CardHeader>
  <CardContent className="px-3 py-0">
    {featuredProject ? (
      <Link href={`/projects`} className="block hover:opacity-80 transition-opacity">
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{featuredProject.projectNumber}</p>
            <p className="text-xs text-muted-foreground truncate">
              {featuredProject.customerName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold leading-tight">{formatCurrency(featuredProject.balance)}</p>
            <p className="text-xs text-muted-foreground">
              Total {formatCurrency(featuredProject.totalAmount)}
            </p>
          </div>
        </div>
      </Link>
    ) : (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bookmark className="h-4 w-4" />
        Sin proyectos destacados
      </div>
    )}
  </CardContent>
</Card>
```

- [ ] **Step 2: Importar `Bookmark` y `Link`**

```tsx
import { Bookmark } from 'lucide-react'
import Link from 'next/link'
import { getProjectFinancials } from '@/lib/business-logic/project-financials'
```

---

## Task 11: Test de API

**Files:**
- Modify: `app/api/projects/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Agregar test de actualización de flagStatus**

```ts
it('updates project flagStatus', async () => {
  const project = await prisma.project.create({
    data: {
      customerId: customer.id,
      projectNumber: 'FLAG-001',
      phone: '+56912345678',
      comuna: 'Santiago',
      region: 'Metropolitana',
      subtotal: 100000,
      totalAmount: 119000,
      date: new Date(),
    },
  })

  const request = new NextRequest(`http://localhost/api/projects/${project.id}`, {
    method: 'PUT',
    body: JSON.stringify({ flagStatus: 'flagged' }),
  })

  const response = await PUT(request, { params: Promise.resolve({ id: project.id }) })
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data.flagStatus).toBe('flagged')
})

it('rejects invalid flagStatus', async () => {
  const project = await prisma.project.create({
    data: {
      customerId: customer.id,
      projectNumber: 'FLAG-002',
      phone: '+56912345678',
      comuna: 'Santiago',
      region: 'Metropolitana',
      subtotal: 100000,
      totalAmount: 119000,
      date: new Date(),
    },
  })

  const request = new NextRequest(`http://localhost/api/projects/${project.id}`, {
    method: 'PUT',
    body: JSON.stringify({ flagStatus: 'invalid' }),
  })

  const response = await PUT(request, { params: Promise.resolve({ id: project.id }) })

  expect(response.status).toBe(400)
})
```

---

## Task 12: Verificación final

- [ ] **Step 1: Lint y typecheck**

Run:
```bash
npm run lint && npm run typecheck
```

Expected: no errors.

- [ ] **Step 2: Tests**

Run:
```bash
npm run test -- app/api/projects/[id]/__tests__/route.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Actualizar implementation docs**

Append to `docs/project/implementation/2025-current.md`:

```markdown
## 2025-06-16
- Agregado bookmark inline en tabla de proyectos para marcar proyectos que necesitan atención.
- Campo `Project.flagStatus` (string: "none" | "flagged") para permitir estados futuros.
- Celda C del Panel Principal muestra el proyecto marcado más reciente.
```

---

## Self-Review

- **Spec coverage:** DB (Task 1), API validation (Task 2), API route (Task 3), types (Task 4), cell component (Task 5), column (Task 6), mutation hook (Task 7), page-client integration (Task 8), dashboard query (Task 9), dashboard UI (Task 10), API tests (Task 11), verification (Task 12). All covered.
- **Placeholders:** None.
- **Type consistency:** `flagStatus` typed as `'none' | 'flagged'` consistently across DB validation, types, and components.
