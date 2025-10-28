# Team Tags System

Sistema completo de gestión de tags (etiquetas) estilo Trello con soporte CRUD, colores personalizables desde BD, y UI interactiva tipo popover. Diseñado para clasificar cualquier entidad (proyectos, usuarios, tareas, etc.) con tags reutilizables.

## 📸 Vista Previa

**TagSelector (Popover abierto):**
```
┌─────────────────────────────────┐
│ Tags                          [+]│  ← Label + botón
├─────────────────────────────────┤
│ [DV] Desarrollador              │  ← Tags seleccionadas
│ [DS] Diseñador                  │     (removibles con X)
└─────────────────────────────────┘

        Popover ↓
┌──────────────────────────────────┐
│ 2 tags seleccionadas             │
├──────────────────────────────────┤
│ ☑ [DV] Desarrollador        [⋮]  │ ← Checkbox + Badge + Menu
│ ☑ [DS] Diseñador            [⋮]  │
│ ☐ [PM] Project Manager      [⋮]  │
├──────────────────────────────────┤
│ [+] Crear nueva tag              │
└──────────────────────────────────┘
```

**CreateTagModal / EditTagModal:**
```
┌─────────────────────────────────┐
│ Crear Team Tag              [X] │
├─────────────────────────────────┤
│ Nombre: [Desarrollador        ] │
│ Abreviatura: [DV]               │
│                                 │
│ Color:                          │
│ [●][●][●][●][●][●]              │ ← 7 colores de BD
│                                 │
│ Vista previa:                   │
│    ┌───────────────┐            │
│    │ [DV]          │            │ ← Preview live
│    └───────────────┘            │
│                                 │
│      [Cancelar]  [✓ Crear]      │
└─────────────────────────────────┘
```

---

## ✨ Features

- ✅ **Componentes UI completos** (TagBadge, TagSelector, CreateModal, EditModal)
- ✅ **CRUD completo** con hook `useTeamTags` (Create, Read, Update, Delete)
- ✅ **Colores desde BD** (tabla `BadgeColor` con Tailwind classes)
- ✅ **Aplicación inmediata** (sin botón "Aceptar", cambios en tiempo real)
- ✅ **Multi-selección** con checkboxes
- ✅ **Menu contextual** (editar/eliminar por tag)
- ✅ **Preview en vivo** en modales
- ✅ **Validaciones Zod** (frontend + backend)
- ✅ **Auto-generación** de abreviaturas (2 letras)
- ✅ **Type-safe** (TypeScript completo)
- ✅ **Accesible** (ARIA labels, keyboard navigation)
- ✅ **Responsive** (mobile-friendly)

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
├─────────────────────────────────────────────────────────┤
│  components/custom/tag-system/                          │
│  ├─ TagSelector.tsx        → Selector principal         │
│  ├─ TagBadge.tsx           → Badge individual           │
│  ├─ CreateTagModal.tsx     → Modal crear                │
│  ├─ EditTagModal.tsx       → Modal editar               │
│  ├─ types.ts               → Types compartidos          │
│  └─ index.ts               → Exports                    │
└─────────────────────────────────────────────────────────┘
                          ↓ consume
┌─────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                      │
├─────────────────────────────────────────────────────────┤
│  hooks/use-team-tags.ts                                 │
│  ├─ Fetch tags + colors desde APIs                      │
│  ├─ CRUD operations (create, edit, delete)              │
│  ├─ Selection state (selectedTags)                      │
│  ├─ Loading + error handling                            │
│  └─ Helpers (toggleTag, isTagSelected, etc.)            │
└─────────────────────────────────────────────────────────┘
                          ↓ valida con
┌─────────────────────────────────────────────────────────┐
│                    VALIDATION LAYER                      │
├─────────────────────────────────────────────────────────┤
│  lib/validations/team-tag-validations.ts                │
│  ├─ Zod schemas (teamTagSchema)                         │
│  ├─ Types (TeamTag, CreateTeamTagPayload)               │
│  └─ Helpers (generateAbbreviation, normalize)           │
└─────────────────────────────────────────────────────────┘
                          ↓ persiste en
┌─────────────────────────────────────────────────────────┐
│                       API LAYER                          │
├─────────────────────────────────────────────────────────┤
│  API Routes (Next.js)                                   │
│  ├─ GET    /api/team-tags?includeColor=true             │
│  ├─ POST   /api/team-tags                               │
│  ├─ PUT    /api/team-tags/[id]                          │
│  ├─ DELETE /api/team-tags/[id]                          │
│  └─ GET    /api/badge-colors                            │
└─────────────────────────────────────────────────────────┘
                          ↓ guarda en
┌─────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                       │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL (Prisma ORM)                                │
│  ├─ TeamTag table (id, name, abbreviation, colorId)     │
│  └─ BadgeColor table (id, name, key, bgClass, textClass)│
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Requisitos Previos

### Dependencias UI (shadcn/ui)

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add checkbox
npx shadcn@latest add dialog
npx shadcn@latest add popover
npx shadcn@latest add dropdown-menu
npx shadcn@latest add separator
```

### Stack Técnico

- **Next.js 15+** (App Router)
- **React 19+**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (estilo "new-york")
- **Prisma 6+**
- **PostgreSQL** (cualquier provider)
- **Zod** (validaciones)

---

## 🗄️ Database Schema

### 1. Tabla `BadgeColor` (Colores disponibles)

```prisma
model BadgeColor {
  id        String   @id @default(uuid())
  name      String   // "Azul", "Verde", "Rojo", etc.
  key       String   @unique // "blue", "green", "red" (slug)
  bgClass   String   // "bg-blue-500" (Tailwind class)
  textClass String   @default("text-white") // "text-white", "text-black"
  order     Int      @default(0) // Para ordenar en UI

  // Relaciones
  teamTags       TeamTag[]
  projectStatuses ProjectStatus[] // Si usas system también para estados

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("badge_colors")
}
```

**Seed inicial (7 colores recomendados):**

```typescript
// prisma/seed.ts
const colors = [
  { name: 'Azul', key: 'blue', bgClass: 'bg-blue-500', textClass: 'text-white', order: 1 },
  { name: 'Verde', key: 'green', bgClass: 'bg-green-500', textClass: 'text-white', order: 2 },
  { name: 'Rojo', key: 'red', bgClass: 'bg-red-500', textClass: 'text-white', order: 3 },
  { name: 'Amarillo', key: 'yellow', bgClass: 'bg-yellow-500', textClass: 'text-black', order: 4 },
  { name: 'Púrpura', key: 'purple', bgClass: 'bg-purple-500', textClass: 'text-white', order: 5 },
  { name: 'Naranja', key: 'orange', bgClass: 'bg-orange-500', textClass: 'text-white', order: 6 },
  { name: 'Gris', key: 'gray', bgClass: 'bg-gray-500', textClass: 'text-white', order: 7 },
]

for (const color of colors) {
  await prisma.badgeColor.create({ data: color })
}
```

### 2. Tabla `TeamTag` (Tags creadas)

```prisma
model TeamTag {
  id           String   @id @default(uuid())
  name         String   @unique // "Desarrollador", "Diseñador"
  abbreviation String   // "DV", "DS" (2 letras)
  colorId      String
  color        BadgeColor @relation(fields: [colorId], references: [id])

  order        Int      @default(0) // Para drag & drop (opcional)
  isActive     Boolean  @default(true) // Soft delete

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relaciones con tus entidades
  // Ejemplo: si tags se asignan a proyectos
  // projects Project[] @relation("ProjectTags")

  @@index([colorId])
  @@index([isActive])
  @@map("team_tags")
}
```

**⚠️ IMPORTANTE:** Adapta las relaciones según tu caso de uso:
- Si tags → Proyectos: tabla intermedia `ProjectTag` (N:M)
- Si tags → Usuarios: tabla intermedia `UserTag` (N:M)
- Si tags → Tareas: tabla intermedia `TaskTag` (N:M)

### Migración

```bash
# 1. Agregar modelos a prisma/schema.prisma
# 2. Generar migración
npx prisma migrate dev --name add_team_tags_system

# 3. Seed colores iniciales
npx prisma db seed
```

---

## 🚀 Setup Completo

### Paso 1: Copiar Archivos

```bash
# Componentes UI
mkdir -p components/custom/tag-system
cp -r /path/to/tag-system/* components/custom/tag-system/

# Hook
cp /path/to/use-team-tags.ts hooks/

# Validations
cp /path/to/team-tag-validations.ts lib/validations/
```

### Paso 2: Instalar Dependencias UI

```bash
# shadcn/ui components (si no los tienes)
npx shadcn@latest add button input label checkbox dialog popover dropdown-menu separator
```

### Paso 3: Crear Database Schema

Agregar modelos `BadgeColor` y `TeamTag` a `prisma/schema.prisma` (ver arriba).

```bash
npx prisma migrate dev --name add_team_tags_system
npx prisma db seed  # Seed colores iniciales
```

### Paso 4: Implementar APIs

#### 4.1. GET /api/badge-colors (Colores disponibles)

```typescript
// app/api/badge-colors/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const badgeColors = await prisma.badgeColor.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ badgeColors })
  } catch (error) {
    console.error('Error fetching badge colors:', error)
    return NextResponse.json(
      { error: 'Error al cargar colores' },
      { status: 500 }
    )
  }
}
```

#### 4.2. GET /api/team-tags (Listar tags)

```typescript
// app/api/team-tags/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeColor = searchParams.get('includeColor') === 'true'

    const teamTags = await prisma.teamTag.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: includeColor ? { color: true } : undefined,
    })

    return NextResponse.json({ teamTags })
  } catch (error) {
    console.error('Error fetching team tags:', error)
    return NextResponse.json(
      { error: 'Error al cargar team tags' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, abbreviation, colorId } = body

    // Validar con Zod
    const { teamTagSchema } = await import('@/lib/validations/team-tag-validations')
    const validatedData = teamTagSchema.parse({ name, abbreviation, colorId })

    // Verificar duplicados
    const existing = await prisma.teamTag.findUnique({
      where: { name: validatedData.name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una tag con este nombre' },
        { status: 409 }
      )
    }

    // Crear tag
    const teamTag = await prisma.teamTag.create({
      data: {
        name: validatedData.name,
        abbreviation: validatedData.abbreviation,
        colorId: validatedData.colorId,
      },
      include: { color: true },
    })

    return NextResponse.json({ teamTag }, { status: 201 })
  } catch (error) {
    console.error('Error creating team tag:', error)
    return NextResponse.json(
      { error: 'Error al crear tag' },
      { status: 500 }
    )
  }
}
```

#### 4.3. PUT /api/team-tags/[id] (Actualizar)

```typescript
// app/api/team-tags/[id]/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, abbreviation, colorId } = body

    // Validar con Zod
    const { teamTagSchema } = await import('@/lib/validations/team-tag-validations')
    const validatedData = teamTagSchema.parse({ name, abbreviation, colorId })

    // Verificar duplicados (excluyendo la tag actual)
    const existing = await prisma.teamTag.findFirst({
      where: {
        name: validatedData.name,
        id: { not: id },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una tag con este nombre' },
        { status: 409 }
      )
    }

    // Actualizar
    const teamTag = await prisma.teamTag.update({
      where: { id },
      data: {
        name: validatedData.name,
        abbreviation: validatedData.abbreviation,
        colorId: validatedData.colorId,
      },
      include: { color: true },
    })

    return NextResponse.json({ teamTag })
  } catch (error) {
    console.error('Error updating team tag:', error)
    return NextResponse.json(
      { error: 'Error al actualizar tag' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Soft delete (cambiar isActive a false)
    await prisma.teamTag.update({
      where: { id },
      data: { isActive: false },
    })

    // O hard delete si prefieres:
    // await prisma.teamTag.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team tag:', error)
    return NextResponse.json(
      { error: 'Error al eliminar tag' },
      { status: 500 }
    )
  }
}
```

### Paso 5: Usar en tu Componente

```tsx
// app/example/page.tsx
'use client'

import { TagSelector } from '@/components/custom/tag-system'
import { useTeamTags } from '@/hooks/use-team-tags'

export default function ExamplePage() {
  const {
    availableTags,
    availableColors,
    selectedTags,
    setSelectedTags,
    createTag,
    editTag,
    deleteTag,
    loading,
    error,
  } = useTeamTags()

  if (loading) return <div>Cargando tags...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Team Tags Demo</h1>

      <TagSelector
        label="Tags del Proyecto"
        selectedTags={selectedTags}
        availableTags={availableTags}
        availableColors={availableColors}
        onTagsChange={setSelectedTags}
        onCreateTag={createTag}
        onEditTag={editTag}
        onDeleteTag={deleteTag}
        placeholder="Seleccionar tags..."
      />

      {/* Debug: Ver tags seleccionadas */}
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">
          Tags seleccionadas: {selectedTags.map(t => t.name).join(', ')}
        </p>
      </div>
    </div>
  )
}
```

---

## 📖 API Reference

### `useTeamTags(options?)` Hook

Hook principal para manejo de estado y API calls.

#### Options

```typescript
interface UseTeamTagsOptions {
  initialSelected?: TeamTag[]  // Tags pre-seleccionadas (default: [])
  autoFetch?: boolean          // Auto-load al montar (default: true)
}
```

#### Returns

```typescript
interface UseTeamTagsReturn {
  // Estado
  availableTags: TeamTag[]      // Tags disponibles desde API
  availableColors: TagColor[]   // Colores desde API
  selectedTags: TeamTag[]       // Tags actualmente seleccionadas
  loading: boolean              // Cargando datos
  error: string | null          // Error si hay

  // Setters
  setSelectedTags: (tags: TeamTag[]) => void

  // CRUD Operations (async)
  createTag: (name: string, abbreviation: string, colorId: string) => Promise<void>
  editTag: (tagId: string, name: string, abbreviation: string, colorId: string) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>
  refreshTags: () => Promise<void>
  refreshColors: () => Promise<void>

  // Selection Helpers
  selectTag: (tag: TeamTag) => void
  unselectTag: (tagId: string) => void
  toggleTag: (tag: TeamTag) => void
  isTagSelected: (tagId: string) => boolean
  clearSelectedTags: () => void
}
```

#### Ejemplo

```tsx
const {
  availableTags,
  selectedTags,
  createTag,
} = useTeamTags({
  initialSelected: [/* tags pre-seleccionadas */],
  autoFetch: true,
})
```

---

### `<TagSelector />` Component

Selector principal con popover estilo Trello.

#### Props

```typescript
interface TagSelectorProps {
  // Estado (REQUERIDO)
  selectedTags: TeamTag[]        // Tags seleccionadas
  availableTags: TeamTag[]       // Tags disponibles
  availableColors: TagColor[]    // Colores disponibles

  // Callbacks (REQUERIDO)
  onTagsChange: (tags: TeamTag[]) => void

  // Callbacks CRUD (OPCIONAL)
  onCreateTag?: (name: string, abbreviation: string, colorId: string) => void | Promise<void>
  onEditTag?: (tagId: string, name: string, abbreviation: string, colorId: string) => void | Promise<void>
  onDeleteTag?: (tagId: string) => void | Promise<void>

  // UI (OPCIONAL)
  placeholder?: string           // Placeholder (default: "Seleccionar tags...")
  label?: string                 // Label del campo
  className?: string             // Clases adicionales
}
```

#### Ejemplo Básico

```tsx
<TagSelector
  selectedTags={selectedTags}
  availableTags={availableTags}
  availableColors={availableColors}
  onTagsChange={setSelectedTags}
/>
```

#### Ejemplo Completo (con CRUD)

```tsx
<TagSelector
  label="Tags del Equipo"
  placeholder="Seleccionar tags del equipo..."
  selectedTags={selectedTags}
  availableTags={availableTags}
  availableColors={availableColors}
  onTagsChange={setSelectedTags}
  onCreateTag={createTag}
  onEditTag={editTag}
  onDeleteTag={deleteTag}
/>
```

#### Ejemplo Solo Lectura (sin CRUD)

```tsx
<TagSelector
  selectedTags={selectedTags}
  availableTags={availableTags}
  availableColors={availableColors}
  onTagsChange={setSelectedTags}
  // Sin onCreateTag, onEditTag, onDeleteTag
  // → No muestra botones de crear/editar/eliminar
/>
```

---

### `<TagBadge />` Component

Badge individual para mostrar una tag.

#### Props

```typescript
interface TagBadgeProps {
  tag: TeamTag              // Tag a mostrar
  removable?: boolean       // Mostrar botón X (default: false)
  onRemove?: (tagId: string) => void  // Callback al remover
  className?: string        // Clases adicionales
}
```

#### Ejemplo

```tsx
<TagBadge
  tag={tag}
  removable
  onRemove={(tagId) => console.log('Removed:', tagId)}
/>
```

---

### `<CreateTagModal />` Component

Modal para crear nuevas tags.

#### Props

```typescript
interface CreateTagModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreateTag: (name: string, abbreviation: string, colorId: string) => void | Promise<void>
  existingTags: TeamTag[]      // Para validar duplicados
  availableColors: TagColor[]  // Selector de colores
}
```

#### Ejemplo

```tsx
<CreateTagModal
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  onCreateTag={async (name, abbr, colorId) => {
    await fetch('/api/team-tags', {
      method: 'POST',
      body: JSON.stringify({ name, abbreviation: abbr, colorId }),
    })
  }}
  existingTags={availableTags}
  availableColors={availableColors}
/>
```

---

### `<EditTagModal />` Component

Modal para editar tags existentes.

#### Props

```typescript
interface EditTagModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onEditTag: (tagId: string, name: string, abbreviation: string, colorId: string) => void | Promise<void>
  tag: TeamTag | null          // Tag a editar
  existingTags: TeamTag[]      // Para validar duplicados
  availableColors: TagColor[]  // Selector de colores
}
```

#### Ejemplo

```tsx
<EditTagModal
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  onEditTag={async (tagId, name, abbr, colorId) => {
    await fetch(`/api/team-tags/${tagId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, abbreviation: abbr, colorId }),
    })
  }}
  tag={tagToEdit}
  existingTags={availableTags}
  availableColors={availableColors}
/>
```

---

## 🎨 Customización

### 1. Agregar Más Colores

```typescript
// prisma/seed.ts
const newColors = [
  { name: 'Rosa', key: 'pink', bgClass: 'bg-pink-500', textClass: 'text-white', order: 8 },
  { name: 'Cyan', key: 'cyan', bgClass: 'bg-cyan-500', textClass: 'text-white', order: 9 },
]

for (const color of newColors) {
  await prisma.badgeColor.create({ data: color })
}
```

### 2. Cambiar Estilo de Badges

```typescript
// components/custom/tag-system/TagBadge.tsx
// Línea 26-32: Modificar clases Tailwind

className={cn(
  // Estilos personalizados aquí
  'inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold', // ← Cambiar aquí
  'rounded-full transition-all', // ← Cambiar border-radius
  tag.color.bgClass,
  tag.color.textClass,
  className
)}
```

### 3. Validaciones Personalizadas

```typescript
// lib/validations/team-tag-validations.ts
export const teamTagSchema = z.object({
  name: z
    .string()
    .min(3, 'Mínimo 3 caracteres')  // ← Cambiar min length
    .max(30, 'Máximo 30 caracteres') // ← Cambiar max length
    .trim(),
  abbreviation: z
    .string()
    .length(3, '3 caracteres')       // ← Cambiar a 3 letras en lugar de 2
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Solo letras mayúsculas'),
  colorId: z.string().uuid(),
})
```

### 4. Agregar Campo "Descripción" a Tags

```prisma
// prisma/schema.prisma
model TeamTag {
  id           String   @id @default(uuid())
  name         String   @unique
  abbreviation String
  description  String?  // ← NUEVO CAMPO
  colorId      String
  color        BadgeColor @relation(fields: [colorId], references: [id])
  // ...resto
}
```

Luego actualizar:
1. Validations: agregar `description: z.string().optional()`
2. Modales: agregar campo `<Textarea />` para descripción
3. API: incluir `description` en CREATE/UPDATE

---

## 🔧 Troubleshooting

### Error: "Cannot find module '@/components/custom/tag-system'"

**Causa:** Path alias `@/` no configurado.

**Solución:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

### Error: "Tailwind classes not applied (bg-blue-500, etc.)"

**Causa:** Tailwind no detecta clases dinámicas desde BD.

**Solución:** Agregar safelist en `tailwind.config.ts`:

```typescript
// tailwind.config.ts
export default {
  safelist: [
    // Badge colors
    'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-orange-500', 'bg-gray-500',
    'text-white', 'text-black',
    // O usar regex
    {
      pattern: /bg-(blue|green|red|yellow|purple|orange|gray)-(500)/,
    },
  ],
}
```

---

### Error: "Tag created but not showing in selector"

**Causa:** No se llama `refreshTags()` después de crear.

**Solución:** El hook `useTeamTags` ya hace auto-refresh:

```typescript
// hooks/use-team-tags.ts (línea 99)
await onCreateTag(name, abbreviation, colorId)
await refreshTags() // ← Auto-refresh
```

Si usas callbacks custom, debes llamar `refreshTags()` manualmente:

```typescript
const handleCreate = async (name, abbr, colorId) => {
  await myCustomCreateFunction(name, abbr, colorId)
  await refreshTags() // ← Llamar manualmente
}
```

---

### Error: "Duplicate tag name" al editar sin cambiar nombre

**Causa:** Validación de duplicados incluye la tag actual.

**Solución:** Ya implementado en API (línea 4.3):

```typescript
// api/team-tags/[id]/route.ts
const existing = await prisma.teamTag.findFirst({
  where: {
    name: validatedData.name,
    id: { not: id }, // ← Excluir tag actual
  },
})
```

---

## 📝 Notas de Migración desde CalReact

Este sistema fue adaptado de CalReact `uninstall-tags` con los siguientes cambios:

### Cambios Principales

| Aspecto          | CalReact (Original)               | Cobralon (Actual)                       |
|------------------|-----------------------------------|-----------------------------------------|
| **Backend**      | Firebase Firestore                | Next.js API Routes + Prisma + PostgreSQL|
| **Colores**      | Hardcoded hex colors en código    | BD (`BadgeColor` table) con Tailwind    |
| **Aplicación**   | Botón "Aceptar" en popover        | Aplicación inmediata (sin botón)        |
| **Estilo**       | Inline styles (`style={{...}}`)   | Tailwind classes (`className`)          |
| **Validación**   | Frontend only                     | Frontend (Zod) + Backend (Zod)          |
| **Auto-abbreviation** | No tenía                     | Genera automáticamente de primeras 2 letras |

### Código Equivalente

#### CalReact (Firebase)
```typescript
// CalReact: Firebase listener
const unsubscribe = onSnapshot(collection(db, 'uninstallTags'), (snapshot) => {
  const tags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  setTags(tags)
})
```

#### Cobralon (API)
```typescript
// Cobralon: API fetch
const res = await fetch('/api/team-tags?includeColor=true')
const data = await res.json()
setAvailableTags(data.teamTags)
```

### Breaking Changes

Si migras desde CalReact:

1. ✅ **Colores:** Cambiar `color: { hex: '#3b82f6' }` → `color: { bgClass: 'bg-blue-500', textClass: 'text-white' }`
2. ✅ **Tag structure:** Agregar campo `abbreviation: string` (obligatorio)
3. ✅ **API:** Implementar endpoints REST (ver sección Setup)
4. ✅ **Database:** Crear tablas `BadgeColor` + `TeamTag` en Prisma

---

## 🚢 Production Checklist

Antes de usar en producción, verifica:

- [ ] ✅ Tablas `BadgeColor` y `TeamTag` creadas en BD
- [ ] ✅ Seed de colores ejecutado (`npx prisma db seed`)
- [ ] ✅ APIs implementadas (`/api/team-tags`, `/api/badge-colors`)
- [ ] ✅ Validaciones Zod en backend
- [ ] ✅ Tailwind safelist configurado para colores dinámicos
- [ ] ✅ CORS configurado si frontend/backend separados
- [ ] ✅ Rate limiting en APIs (opcional pero recomendado)
- [ ] ✅ Índices de BD creados (ver schema Prisma)
- [ ] ✅ Soft delete (`isActive: false`) o hard delete según preferencia
- [ ] ✅ Error boundaries en componentes que usan tags
- [ ] ✅ Loading states manejados en UI

---

## 📚 Recursos Adicionales

- **shadcn/ui Docs:** https://ui.shadcn.com
- **Prisma Docs:** https://www.prisma.io/docs
- **Zod Docs:** https://zod.dev
- **Tailwind Safelist:** https://tailwindcss.com/docs/content-configuration#safelisting-classes

---

## 🤝 Contribuciones

Si mejoras este sistema, considera:

1. Documentar cambios en este README
2. Actualizar `types.ts` si agregas campos
3. Versionar schemas Zod si hay breaking changes
4. Agregar tests (Vitest recomendado)

---

## 📄 Licencia

Adaptado de CalReact `uninstall-tags` para uso en proyectos Cobralon.
Libre de usar y modificar según necesidades del proyecto.

---

**Última actualización:** 2025-10-28
**Versión:** 1.0.0
**Autor:** Equipo Cobralon
**Origen:** Adaptado de CalReact → Cobralon
