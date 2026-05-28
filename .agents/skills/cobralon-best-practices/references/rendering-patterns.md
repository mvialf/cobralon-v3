# Patrones de Rendering

Optimizaciones de rendering para listas, condicionales y JSX estático.

---

## content-visibility para listas largas

**Impacto:** MEDIUM
**Aplica a:** DataTable, listas con muchas filas
**Estado:** ⚠️ Pendiente — no se usa en el proyecto

`content-visibility: auto` permite al browser saltar el rendering de elementos fuera del viewport. Reduce significativamente el tiempo de layout en tablas con 50+ filas.

### Incorrecto

```css
/* ❌ Todas las filas se renderizan aunque estén fuera del viewport */
.data-table tbody tr {
  /* sin optimización */
}
```

### Correcto

```css
/* ✅ Filas fuera del viewport se saltan durante layout/paint */
.data-table tbody tr {
  content-visibility: auto;
  contain-intrinsic-size: auto 48px; /* Altura estimada de la fila */
}
```

**Dónde aplicar en Cobralon:** Agregar a `app/globals.css` para las filas de DataTable. El valor `48px` es la altura típica de una fila en las tablas del proyecto.

**Nota:** `contain-intrinsic-size` previene saltos de scroll al darle al browser una altura estimada para filas no renderizadas.

## Conditional render con ternarios

**Impacto:** MEDIUM
**Aplica a:** Todo JSX condicional
**Estado:** ⚠️ Pendiente

Usar ternarios `? ... : null` en vez de `&&` cuando la condición puede ser un valor falsy que no sea `false` (ej: `0`, `''`).

### Incorrecto

```typescript
// ❌ Si count es 0, renderiza "0" como texto en el DOM
function Badge({ count }: { count: number }) {
  return (
    <div>
      {count && <span className="badge">{count}</span>}
    </div>
  )
}
```

### Correcto

```typescript
// ✅ Ternario explícito — nunca renderiza valores inesperados
function Badge({ count }: { count: number }) {
  return (
    <div>
      {count > 0 ? <span className="badge">{count}</span> : null}
    </div>
  )
}
```

**Regla:**
- `{boolean && <Component />}` — OK si la condición es siempre boolean
- `{number && <Component />}` — PELIGROSO, puede renderizar `0`
- `{string && <Component />}` — PELIGROSO, puede renderizar `""`
- Preferir `{condition ? <Component /> : null}` para seguridad

## useTransition vs loading manual

**Impacto:** MEDIUM
**Aplica a:** Componentes con React Query + acciones costosas
**Estado:** ⚠️ Pendiente

Combinar `useTransition` con React Query para estados de loading que no bloquean la UI.

### Incorrecto

```typescript
// ❌ Estado de loading manual que bloquea todo el componente
function ProjectActions({ projectId }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await deleteProject(projectId)
    setIsDeleting(false)
  }

  return <Button disabled={isDeleting} onClick={handleDelete}>Eliminar</Button>
}
```

### Correcto

```typescript
// ✅ useTransition permite que React maneje el loading sin bloquear
function ProjectActions({ projectId }: Props) {
  const [isPending, startTransition] = useTransition()
  const { mutateAsync } = useDeleteProject()

  const handleDelete = () => {
    startTransition(async () => {
      await mutateAsync(projectId)
    })
  }

  return <Button disabled={isPending} onClick={handleDelete}>Eliminar</Button>
}
```

**Beneficio:** `startTransition` con async (React 19) permite que el UI siga respondiendo mientras la operación se completa.

## Hoist static JSX

**Impacto:** LOW
**Aplica a:** Componentes con JSX que nunca cambia
**Estado:** ⚠️ Pendiente

Extraer JSX estático fuera del componente para que React reutilice la misma referencia y salte la reconciliación.

### Incorrecto

```typescript
// ❌ emptyState se recrea en cada render
function ProjectsList({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <FileX className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No hay proyectos</p>
      </div>
    )
  }
  return <DataTable data={projects} />
}
```

### Correcto

```typescript
// ✅ Referencia estable — React la salta en reconciliación
const emptyState = (
  <div className="flex flex-col items-center gap-4 py-12">
    <FileX className="h-12 w-12 text-muted-foreground" />
    <p className="text-muted-foreground">No hay proyectos</p>
  </div>
)

function ProjectsList({ projects }: Props) {
  if (projects.length === 0) return emptyState
  return <DataTable data={projects} />
}
```

**Cuándo aplicar:** JSX que no depende de props, state, ni context. Típicamente empty states, headers fijos, footers.

**Cuándo NO aplicar:** Si el JSX usa `className` dinámico, props del componente, o callbacks. En esos casos, dejarlo inline.
