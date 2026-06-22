# Spec: Bookmark de atención en proyectos + celda destacada en Panel Principal

**Fecha:** 2025-06-16
**Estado:** Propuesta — pendiente de aprobación para implementación.

## Contexto

El usuario quiere marcar manualmente proyectos que necesitan atención directamente desde la tabla de proyectos, usando un icono bookmark inline entre las columnas "Estado" y "Estado Proyecto".

Además, quiere aprovechar la celda **C** del Panel Principal (actualmente un placeholder vacío) para mostrar información sintética del proyecto marcado más reciente.

## Objetivos

1. Permitir marcar/desmarcar proyectos para seguimiento con un click inline en la tabla.
2. No usar boolean en base de datos para permitir estados futuros.
3. Mostrar el proyecto marcado más reciente en el Panel Principal.
4. Mantener la UI minimalista: sin encabezado de columna para el bookmark, sin resaltar fila, usando variables globales del tema.

## Modelo de datos

Agregar un campo `flagStatus` al modelo `Project` en Prisma:

```prisma
model Project {
  // ... campos existentes
  flagStatus String @default("none") // "none" | "flagged"
  flaggedAt DateTime?
}
```

**Decisión:** usar `String` en lugar de `Boolean` o `Enum` de Prisma para mantener flexibilidad futura sin forzar migraciones de enum. Los valores permitidos se validan en la capa de aplicación.

**Valores actuales:**
- `"none"`: sin marca (default).
- `"flagged"`: marcado para atención.

## API

### Actualizar flag de un proyecto

Reutilizar el endpoint existente:

```
PUT /api/projects/[id]
```

Body:

```json
{
  "flagStatus": "flagged"
}
```

Validación con Zod en `updateProjectApiSchema`:

```ts
flagStatus: z.enum(['none', 'flagged']).optional()
```

Comportamiento:
- Actualiza `flagStatus` y mantiene `flaggedAt`: al marcar setea la fecha actual, al desmarcar la limpia.
- No dispara recálculos financieros ni lógica de negocio.
- Retorna el proyecto actualizado con sus financials.

### Obtener proyecto destacado para el Panel Principal

Función server-side en `app/page.tsx`:

```ts
async function getFeaturedProject() {
  const project = await prisma.project.findFirst({
    where: { flagStatus: 'flagged' },
    orderBy: { flaggedAt: 'desc' },
    include: {
      customer: { select: { name: true } },
      projectStatus: {
        select: { id: true, name: true, color: { select: { bgClass: true } } },
      },
    },
  })

  if (!project) return null

  const financials = await getProjectFinancials(project.id)

  return {
    ...project,
    totalAmount: moneyToNumber(project.totalAmount),
    ...(financials ?? {}),
  }
}
```

## Frontend

### Tabla de proyectos (`app/projects/columns.tsx`)

Agregar una columna `flagStatus` inmediatamente después de `projectStatus`:

```tsx
{
  id: 'flagStatus',
  size: 40,
  header: () => null,
  cell: ({ row, table }) => {
    const project = row.original
    const isFlagged = project.flagStatus === 'flagged'
    const { handleFlagToggle } = getTableMeta<ProjectsTableMeta>(table)
    const isPending = updatingFlagProjectId === project.id

    return (
      <button
        type="button"
        onClick={() => handleFlagToggle?.(project.id, isFlagged ? 'none' : 'flagged')}
        disabled={isPending}
        className="inline-flex items-center justify-center"
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
  },
  meta: {
    headerClassName: 'w-10',
    cellClassName: 'text-center',
  },
}
```

### Hook de mutación (`hooks/queries/use-projects.ts`)

Agregar:

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
    },
    onError: handleMutationError,
  })
}
```

**Decisión de UX:** cambio optimista. El icono cambia inmediatamente al hacer click; si falla la API, se revierte con toast de error.

### Page client (`app/projects/page-client.tsx`)

- Importar `useUpdateProjectFlag`.
- Pasar `updatingFlagProjectId` a `createColumns`.
- Agregar `handleFlagToggle` al meta de la tabla.
- Invalidar query key `['featured-project']` para actualizar el Panel Principal.

### Tipos (`app/projects/types.ts`)

Actualizar interfaces:

```ts
export interface Project {
  // ... campos existentes
  flagStatus: 'none' | 'flagged'
}

export interface ColumnsProps {
  // ... existentes
  updatingFlagProjectId?: string | null
}

export interface ProjectsTableMeta {
  // ... existentes
  handleFlagToggle?: (projectId: string, flagStatus: 'none' | 'flagged') => Promise<void>
}
```

### Panel Principal (`app/page.tsx`)

1. Llamar `getFeaturedProject()` junto a los demás loaders.
2. Renderizar la celda C:

```tsx
<Card className="gap-1.5" style={{ gridArea: 'c' }}>
  <CardHeader className="px-3 py-0">
    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
      <Bookmark className="h-3.5 w-3.5" />
      Destacado
    </CardTitle>
  </CardHeader>
  <CardContent className="px-3 py-0">
    {featuredProject ? (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-sm font-medium truncate">{featuredProject.projectNumber}</p>
          <p className="text-xs text-muted-foreground truncate">
            {featuredProject.customer.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{formatCurrency(featuredProject.balance)}</p>
          <p className="text-xs text-muted-foreground">
            Total {formatCurrency(featuredProject.totalAmount)}
          </p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bookmark className="h-4 w-4" />
        Sin proyectos destacados
      </div>
    )}
  </CardContent>
</Card>
```

**Query key para invalidación:** `['featured-project']` (aunque el Panel Principal es RSC, la invalidación forzará re-render cuando el usuario vuelva).

## UX e interacción

- **Click en bookmark:** toggle inmediato entre outline y relleno.
- **Color:** outline `text-muted-foreground`, relleno `text-primary`.
- **Tooltip nativo** con `title` para accesibilidad básica.
- **Sin header de columna** para no cargar visualmente la tabla.
- **Sin resaltar fila** para no distraer.
- **Celda C del dashboard:** muestra el proyecto marcado más reciente o un mensaje vacío.

## Tests

1. **Unitario del componente de celda:** verificar que el icono cambia entre outline y filled según `flagStatus` y que se llama al callback.
2. **API route test:** verificar que `PUT /api/projects/[id]` acepta y rechaza valores de `flagStatus`.
3. **Hook test:** verificar que `useUpdateProjectFlag` invalida las queries correctas.

## Notas y riesgos

- El campo `flagStatus` no afecta lógica financiera ni de negocio; es metadata pura.
- Para mantener la celda C actualizada, se invalida la query key `['featured-project']`. Como el Panel Principal usa `dynamic = 'force-dynamic'`, la próxima navegación a `/` recargará el dato.
- Si en el futuro se agrega un tercer estado (ej. `"blocked"`), solo hay que extender el enum de Zod y ajustar la UI del icono si es necesario.

## Pendientes de decisión

- ¿La celda C debe ser clickeable para navegar al proyecto? (Recomendado: sí, con un link a `/projects`.)
- ¿Se agrega filtro rápido en la tabla para ver solo proyectos marcados? (Fuera de scope inicial.)
