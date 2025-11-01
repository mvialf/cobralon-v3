# Decisión: Mantener Campo Legacy durante Migración

Mantener `projectStatusLegacy` + nuevo FK `projectStatusId` durante migración progresiva.

---

## Contexto

El sistema inicialmente usaba un campo String para estados:

```prisma
// Sistema legacy
model Project {
  projectStatusLegacy String @default("") // "En Proceso", "Finalizado", etc.
}
```

**Problemas:**

- ❌ No configurable desde UI (hardcoded)
- ❌ Sin colores personalizables
- ❌ Sin flags (isInitial, isFinal)
- ❌ Sin ordenamiento custom

**Nuevo requisito:**

- Sistema de estados configurable desde Settings
- Colores personalizables (BadgeColor)
- Drag & drop para reordenar
- Flags de comportamiento (isInitial, isFinal, isActive)

---

## Decisión

Migración progresiva con **dual-field strategy**:

```prisma
model Project {
  // Campo legacy (mantener temporalmente)
  projectStatusLegacy String @default("")

  // Nueva relación FK (opcional durante migración)
  projectStatusId String?
  projectStatus   ProjectStatus? @relation(fields: [projectStatusId], references: [id], onDelete: Restrict)

  @@index([projectStatusId])
}
```

---

## Alternativas Consideradas

### Alternativa 1: Big Bang Migration

```sql
-- Migración única
ALTER TABLE projects DROP COLUMN project_status_legacy;
ALTER TABLE projects ADD COLUMN project_status_id UUID NOT NULL;
```

**Pros:**

- ✅ Clean schema inmediatamente
- ✅ Sin deuda técnica

**Contras:**

- ❌ **Breaking change** (downtime)
- ❌ **Migración compleja** (mapear strings legacy → UUIDs)
- ❌ **Riesgo alto** (rollback difícil)
- ❌ **Requiere pausa operacional** (no crear proyectos durante migración)

**Por qué NO:** Alto riesgo para producción.

---

### Alternativa 2: Computed Field

```prisma
model Project {
  projectStatusLegacy String @default("")

  // Computed (no persistido)
  get projectStatus() {
    return this.projectStatusLegacy ? legacyMap[this.projectStatusLegacy] : null
  }
}
```

**Pros:**

- ✅ Sin cambio de schema
- ✅ Backward compatible

**Contras:**

- ❌ **No queryable** (no índices en computed)
- ❌ **Performance pobre** (calcular en cada read)
- ❌ **Complejidad en validaciones**

**Por qué NO:** No escala. Necesitamos queries eficientes.

---

### Alternativa 3: Immediate Deletion

```prisma
// Solo nuevo campo
model Project {
  projectStatusId String // Required inmediatamente
  projectStatus   ProjectStatus @relation(...)
}
```

**Pros:**

- ✅ Schema limpio
- ✅ No confusión

**Contras:**

- ❌ **Proyectos legacy sin status** (datos legacy se pierden)
- ❌ **Breaking change** (código legacy falla)

**Por qué NO:** Pérdida de datos legacy.

---

## Razones

### 1. ✅ Migración Sin Downtime

Código funciona en ambos escenarios:

```typescript
// Proyectos legacy (usan string)
const legacyProject = {
  projectStatusLegacy: 'En Proceso', // ✅ Sigue funcionando
  projectStatusId: null, // ← Nullable
}

// Proyectos nuevos (usan FK)
const newProject = {
  projectStatusLegacy: '', // ← Default vacío
  projectStatusId: 'uuid-123', // ✅ FK a ProjectStatus
}
```

---

### 2. ✅ Backward Compatibility

UI renderiza correctamente:

```typescript
// components/columns/project-status-column.tsx
function ProjectStatusColumn({ project }) {
  // Prioridad: FK > legacy > default
  if (project.projectStatus) {
    return (
      <Badge
        className={project.projectStatus.color.bgClass}
        style={{ color: project.projectStatus.color.textClass }}
      >
        {project.projectStatus.name}
      </Badge>
    )
  }

  // Fallback a legacy
  if (project.projectStatusLegacy) {
    return <Badge variant="secondary">{project.projectStatusLegacy}</Badge>
  }

  return <Badge variant="outline">Sin estado</Badge>
}
```

---

### 3. ✅ Migración Progresiva

Nuevos proyectos usan FK automáticamente:

```typescript
// components/forms/projects/project-form.tsx
const form = useForm({
  defaultValues: {
    projectStatusId: initialStatusId || '', // ← FK
    projectStatusLegacy: '', // ← Ignorado
  },
})

// Al submit
await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({
    ...data,
    projectStatusId: data.projectStatusId, // ✅ FK
    // projectStatusLegacy NO se envía
  }),
})
```

---

### 4. ✅ Rollback Fácil

Si hay problemas con nueva lógica:

```typescript
// Volver temporalmente a legacy
const project = await prisma.project.findUnique({
  where: { id },
  select: {
    projectStatusLegacy: true, // ← Datos legacy preservados
    projectStatusId: true,
  },
})

// Siempre hay fallback
const status = project.projectStatusId
  ? await prisma.projectStatus.findUnique({ where: { id: project.projectStatusId } })
  : { name: project.projectStatusLegacy }
```

---

## Trade-offs

### ⚠️ Deuda Técnica Temporal

Mantener dual-field crea:

- 2 campos en schema (confusión)
- Lógica de fallback en UI
- Documentación de transición

**Mitigación:**

- ✅ Documentar claramente en código:

```typescript
// ⚠️ LEGACY FIELD - TO BE REMOVED
// Mantener hasta migración completa de proyectos históricos
projectStatusLegacy: z.string().optional()
```

- ✅ Plan de eliminación:

1. **Phase 1** (actual): Dual-field, nuevos proyectos usan FK
2. **Phase 2** (futuro): Script batch migra proyectos legacy → FK
3. **Phase 3** (cleanup): Eliminar `projectStatusLegacy`

---

### ⚠️ Queries Más Complejas

Filtrar por estado requiere considerar ambos campos:

```typescript
// ❌ INCOMPLETO (solo FK)
const projects = await prisma.project.findMany({
  where: { projectStatusId: statusId },
})

// ✅ COMPLETO (FK + legacy)
const projects = await prisma.project.findMany({
  where: {
    OR: [
      { projectStatusId: statusId },
      { projectStatusLegacy: statusName }, // ← Fallback
    ],
  },
})
```

**Mitigación:**

- Función helper centralizada:

```typescript
// lib/helpers/project-filters.ts
export function buildStatusFilter(statusId: string, statusName: string) {
  return {
    OR: [{ projectStatusId: statusId }, { projectStatusLegacy: statusName }],
  }
}
```

---

## Implementación

### Schema Actual

```prisma
model Project {
  id                  String   @id @default(uuid())
  projectNumber       String
  projectName         String?

  // ⚠️ LEGACY FIELD - Migración en progreso
  projectStatusLegacy String   @default("")

  // ✅ NUEVO SISTEMA - Usar para proyectos nuevos
  projectStatusId     String?
  projectStatus       ProjectStatus? @relation(fields: [projectStatusId], references: [id], onDelete: Restrict)

  customer            Customer @relation(...)
  // ... otros campos

  @@index([projectStatusId])
}

model ProjectStatus {
  id       String  @id @default(uuid())
  name     String  @unique
  order    Int
  colorId  String
  color    BadgeColor @relation(...)

  isInitial Boolean @default(false)
  isFinal   Boolean @default(false)
  isActive  Boolean @default(true)

  projects Project[]  // ← Relación inversa
}
```

---

### Validación Zod

```typescript
// lib/validations/project-validations.ts
export const projectFormSchema = z.object({
  projectName: z.string().optional(),

  // Legacy (opcional, deprecated)
  projectStatusLegacy: z.string().optional().default(''),

  // Nuevo (requerido para proyectos nuevos)
  projectStatusId: z.string().min(1, 'Estado es requerido'),

  // ... otros campos
})
```

---

### Form Component

```typescript
// components/forms/projects/project-form.tsx
export function ProjectForm({ initialData, onSuccess }: ProjectFormProps) {
  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectName: initialData?.projectName || "",

      // Prioridad: FK > legacy
      projectStatusId: initialData?.projectStatusId ||
                       (initialData?.projectStatusLegacy ? "" : initialStatusId),

      projectStatusLegacy: "",  // ← Siempre vacío para nuevos
      // ... otros campos
    }
  })

  async function onSubmit(data: z.infer<typeof projectFormSchema>) {
    const payload = {
      ...data,
      projectStatusId: data.projectStatusId,  // ✅ Enviar FK
      // projectStatusLegacy omitido (default backend: "")
    }

    const response = await fetch(url, {
      method,
      body: JSON.stringify(payload)
    })
    // ...
  }

  return (
    <Form {...form}>
      {/* Solo mostrar combobox de ProjectStatus (no legacy string) */}
      <FormField
        control={form.control}
        name="projectStatusId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estado del Proyecto</FormLabel>
            <ProjectStatusCombobox
              value={field.value}
              onValueChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  )
}
```

---

### API Route: Crear Proyecto

```typescript
// app/api/projects/route.ts
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  // Validar (Zod require projectStatusId)
  const validatedData = projectFormSchema.parse(body)

  const project = await prisma.project.create({
    data: {
      projectNumber: await generateProjectNumber(),
      projectName: validatedData.projectName,

      // Nuevo: FK (required por Zod)
      projectStatusId: validatedData.projectStatusId,

      // Legacy: default vacío
      projectStatusLegacy: validatedData.projectStatusLegacy || '',

      customerId: validatedData.customerId,
      // ... otros campos
    },
    include: {
      customer: true,
      projectStatus: {
        include: { color: true },
      },
    },
  })

  logger.info(
    { projectId: project.id, statusId: project.projectStatusId },
    'Project created with new status system'
  )

  return NextResponse.json(project, { status: 201 })
})
```

---

## Plan de Eliminación (Futuro)

### Phase 2: Migración Batch

```typescript
// scripts/migrate-legacy-status.ts (a futuro)
async function migrateLegacyStatuses() {
  // 1. Obtener proyectos legacy
  const legacyProjects = await prisma.project.findMany({
    where: {
      projectStatusId: null,
      projectStatusLegacy: { not: '' },
    },
  })

  console.log(`Found ${legacyProjects.length} legacy projects`)

  // 2. Mapear legacy strings → ProjectStatus UUIDs
  const statusMap = new Map<string, string>()
  const statuses = await prisma.projectStatus.findMany()

  for (const status of statuses) {
    statusMap.set(status.name.toLowerCase(), status.id)
  }

  // 3. Migrar en batch
  for (const project of legacyProjects) {
    const statusId = statusMap.get(project.projectStatusLegacy.toLowerCase())

    if (statusId) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          projectStatusId: statusId,
          projectStatusLegacy: '', // ← Limpiar
        },
      })
      console.log(`Migrated project ${project.projectNumber}`)
    } else {
      console.warn(`No status match for: "${project.projectStatusLegacy}"`)
    }
  }

  console.log('Migration complete')
}
```

---

### Phase 3: Cleanup Schema

```prisma
// prisma/schema.prisma (futuro)
model Project {
  // ❌ ELIMINAR campo legacy
  // projectStatusLegacy String @default("")

  // ✅ HACER REQUIRED
  projectStatusId String
  projectStatus   ProjectStatus @relation(fields: [projectStatusId], references: [id], onDelete: Restrict)
}
```

**Migration SQL:**

```sql
-- Remover campo legacy
ALTER TABLE projects DROP COLUMN project_status_legacy;

-- Hacer NOT NULL (solo después de migración 100%)
ALTER TABLE projects ALTER COLUMN project_status_id SET NOT NULL;
```

---

## Ver También

- [Project Status Model](../01-data-model/project-status.md) - Nuevo modelo configurable
- [Settings: Project Status](../02-business-flows/project-status-settings.md) - UI de configuración
- [CASCADE vs RESTRICT](cascade-vs-restrict.md) - Por qué RESTRICT en ProjectStatus

**Última actualización:** 2025-10-30
