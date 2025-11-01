# Patrón Avanzado: Form + Dialog con Edición Asíncrona

## El Problema

Cuando necesitas un formulario que funcione tanto para **crear** como para **editar** registros, surge un desafío técnico: los datos de edición se cargan **asincrónicamente** (fetch API), pero React Hook Form solo usa `defaultValues` en la **inicialización** del formulario.

**Flujo problemático:**

```
1. Modal abre → Form se monta con defaultValues=undefined
2. Form se inicializa con valores vacíos
3. DESPUÉS fetch completa → defaultValues se actualiza
4. ❌ Form NO se actualiza (defaultValues es ignored después del mount)
```

## Arquitectura de 3 Capas

El patrón correcto usa una arquitectura de 3 capas:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Controlled Dialog (Edit/New)                 │
│  - Maneja open/onOpenChange state                       │
│  - Carga datos asincrónicamente (modo edit)             │
│  - Pasa defaultValues a Layer 2                         │
│                                                         │
│  Ejemplo: EditProjectDialog, NewProjectDialog          │
└─────────────────────────────────────────────────────────┘
                    ↓ defaultValues
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Generic Dialog (Reusable)                    │
│  - Envuelve el formulario en Dialog UI                 │
│  - Maneja submit/cancel buttons                        │
│  - Pasa defaultValues + mode a Layer 1                 │
│                                                         │
│  Ejemplo: ProjectDialog                                │
└─────────────────────────────────────────────────────────┘
                    ↓ defaultValues + mode
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Form Component (Pure Logic)                  │
│  - React Hook Form + Zod validation                    │
│  - useEffect detecta cambios en defaultValues           │
│  - form.reset() cuando defaultValues cambian            │
│                                                         │
│  Ejemplo: ProjectForm                                  │
└─────────────────────────────────────────────────────────┘
```

## Layer 1: Form Component con Reset

```typescript
// components/forms/projects/project-form.tsx
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void | Promise<void>
  defaultValues?: Partial<ProjectFormData>
  isSubmitting?: boolean
  showSubmitButton?: boolean
}

export const ProjectForm = React.forwardRef<ProjectFormHandle, ProjectFormProps>(
  ({ onSubmit, defaultValues, isSubmitting, showSubmitButton = true }, ref) => {
    const form = useForm<ProjectFormData>({
      resolver: zodResolver(projectFormSchema),
      defaultValues: {
        // Valores por defecto estáticos
        name: '',
        email: '',
        phone: '',
        // Sobrescribir con defaultValues si existen
        ...defaultValues,
      },
    })

    // ⭐ CLAVE: Reset form cuando defaultValues cambian (modo edición)
    React.useEffect(() => {
      if (defaultValues) {
        form.reset({
          name: defaultValues.name || '',
          email: defaultValues.email || '',
          phone: defaultValues.phone || '',
          // ... todos los campos
        })
      }
    }, [defaultValues, form])

    // Exponer métodos al padre via ref
    React.useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onSubmit)(),
      reset: () => form.reset(),
    }))

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Campos del formulario */}
          <FormField control={form.control} name="name" {...} />
          <FormField control={form.control} name="email" {...} />

          {showSubmitButton && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </form>
      </Form>
    )
  }
)
```

**Por qué el useEffect es necesario:**

- React Hook Form **NO** reacciona automáticamente a cambios en el prop `defaultValues`
- Los `defaultValues` solo se usan durante la inicialización (primera vez que se monta)
- Para actualizar el form después de montado, **DEBES** usar `form.reset(newValues)`

## Layer 2: Generic Dialog

```typescript
// components/dialogs/projects/project-dialog.tsx
'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProjectForm, ProjectFormHandle } from '@/components/forms/projects/project-form'

interface ProjectDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => void | Promise<void>
  defaultValues?: Partial<ProjectFormData>
  mode?: 'create' | 'edit'
}

export function ProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  mode = 'create',
}: ProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const formRef = React.useRef<ProjectFormHandle>(null)

  const handleSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange?.(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = mode === 'create' ? 'Crear Proyecto' : 'Editar Proyecto'
  const description =
    mode === 'create'
      ? 'Ingresa los datos del nuevo proyecto'
      : 'Actualiza la información del proyecto'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="py-4">
            <ProjectForm
              ref={formRef}
              showSubmitButton={false}
              onSubmit={handleSubmit}
              defaultValues={defaultValues}
              isSubmitting={isSubmitting}
            />
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={() => formRef.current?.submit()} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Características:**

- ✅ Genérico y reutilizable
- ✅ Maneja estado de submitting
- ✅ Usa ref para trigger submit desde footer
- ✅ Scrollable para formularios largos

## Layer 3: Edit Dialog (Asynchronous Loading)

> ⚠️ **LEGACY APPROACH:** Este ejemplo usa fetch manual con `useState`. Es funcional pero requiere más código y manejo manual de estados.
>
> **✨ Recomendación:** Ver [🚀 Evolución: Migración a React Query](#-evolución-migración-a-react-query) para el approach moderno que reduce código en ~27% y mejora UX con cache automático.

```typescript
// components/dialogs/projects/edit-project-dialog.tsx
'use client'

import * as React from 'react'
import { ProjectDialog } from '@/components/dialogs/projects/project-dialog'
import { toast } from 'sonner'

interface EditProjectDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectUpdated?: () => void
}

export function EditProjectDialog({
  projectId,
  open,
  onOpenChange,
  onProjectUpdated,
}: EditProjectDialogProps) {
  const [defaultValues, setDefaultValues] = React.useState<Partial<ProjectFormData>>()

  // Cargar datos cuando el dialog abre
  const loadProjectData = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) throw new Error('Error al cargar proyecto')

      const project = await response.json()

      // Transformar datos del API al formato del formulario
      setDefaultValues({
        customerId: project.customer.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName || '',
        phone: project.phone,
        street: project.street,
        // ... resto de campos
      })
    } catch (error) {
      console.error('Error al cargar proyecto:', error)
      toast.error('Error al cargar los datos del proyecto')
      onOpenChange(false)
    }
  }, [projectId, onOpenChange])

  // Trigger fetch cuando abre
  React.useEffect(() => {
    if (open && !defaultValues) {
      loadProjectData()
    }
  }, [open, defaultValues, loadProjectData])

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar')
      }

      toast.success('Proyecto actualizado exitosamente')
      onOpenChange(false)
      setDefaultValues(undefined) // Reset para forzar recarga en próxima apertura
      onProjectUpdated?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Limpiar state al cerrar
    if (!newOpen) {
      setDefaultValues(undefined)
    }
    onOpenChange(newOpen)
  }

  return (
    <ProjectDialog
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      mode="edit"
    />
  )
}
```

**Características:**

- ✅ Carga datos asincrónicamente
- ✅ Maneja loading state
- ✅ Transforma datos API → Form format
- ✅ Limpia state al cerrar (fuerza reload en próxima apertura)

## Layer 3: New Dialog (Simple)

```typescript
// components/dialogs/projects/new-project-dialog.tsx
'use client'

import * as React from 'react'
import { ProjectDialog } from '@/components/dialogs/projects/project-dialog'
import { toast } from 'sonner'

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated?: () => void
}

export function NewProjectDialog({ open, onOpenChange, onProjectCreated }: NewProjectDialogProps) {
  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear proyecto')
      }

      toast.success('Proyecto creado exitosamente')
      onOpenChange(false)
      onProjectCreated?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear proyecto')
    }
  }

  return <ProjectDialog open={open} onOpenChange={onOpenChange} onSubmit={handleSubmit} mode="create" />
}
```

---

## 🚀 Evolución: Migración a React Query

### El Problema con Fetch Manual

El código legacy (Layer 3 Edit Dialog mostrado arriba) funciona, pero tiene limitaciones significativas:

```typescript
// ❌ Problemas del approach legacy:
- 133 líneas de código (edit-project-dialog.tsx)
- Manejo manual de loading state (useState)
- Manejo manual de error handling (try/catch)
- Manejo manual de toasts (toast.success/error)
- Sin cache (refetch cada vez que se abre el dialog)
- Código duplicado entre create/edit
- State manual de defaultValues
```

### La Solución: React Query Hooks

React Query (TanStack Query) elimina todo el boilerplate de manejo de datos asincrónicos:

**Beneficios automáticos:**

- ✅ Cache inteligente (segunda apertura es instantánea)
- ✅ Loading/error states automáticos
- ✅ Invalidación automática de queries
- ✅ Retry automático en errores
- ✅ Toasts centralizados en hooks
- ✅ Menos líneas de código (-27% en nuestro caso)

### Comparación: Antes vs Después

| Aspecto               | Fetch Manual (ANTES) | React Query (DESPUÉS)  | Mejora |
| --------------------- | -------------------- | ---------------------- | ------ |
| **Líneas de código**  | 133                  | 97                     | -27%   |
| **Cache**             | ❌ Sin cache         | ✅ Automático          | ✅     |
| **Loading state**     | Manual (useState)    | Automático (isPending) | ✅     |
| **Error handling**    | try/catch manual     | Automático (onError)   | ✅     |
| **Toasts**            | Manual en component  | Automático en hooks    | ✅     |
| **Invalidación**      | Manual refetch       | Automática             | ✅     |
| **UX en re-apertura** | Refetch siempre      | Cache instant          | ✅     |

### Código Refactorizado (React Query)

```typescript
// components/dialogs/projects/edit-project-dialog.tsx
'use client'

import * as React from 'react'
import { ProjectDialog } from '@/components/dialogs/projects/project-dialog'
import { type ProjectFormData } from '@/lib/validations/project-validations'
import { useProject, useUpdateProject } from '@/hooks/queries/use-projects'

interface EditProjectDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectUpdated?: () => void
}

/**
 * Dialog controlado para editar un proyecto existente
 *
 * ✅ MODERN APPROACH: Usa React Query hooks para manejo automático de:
 * - Loading states (isPending)
 * - Error handling (onError)
 * - Cache (segunda apertura es instantánea)
 * - Invalidación (lista se actualiza automáticamente)
 * - Toasts (success/error automáticos)
 */
export function EditProjectDialog({
  projectId,
  open,
  onOpenChange,
  onProjectUpdated,
}: EditProjectDialogProps) {
  // ✅ React Query hook para GET - Reemplaza fetch + useState + useEffect
  const { data: project, isLoading } = useProject(open ? projectId : undefined)

  // ✅ React Query hook para PUT - Reemplaza fetch + try/catch + toast
  const updateMutation = useUpdateProject()

  // Transformar datos del API al formato del formulario
  const defaultValues = React.useMemo(() => {
    if (!project) return undefined

    return {
      customerId: project.customer.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName || '',
      phone: project.phone,
      street: project.street,
      apartment: project.apartment || '',
      comuna: project.comuna,
      region: project.region,
      projectStatusId: project.projectStatus?.id || '',
      date: new Date(project.date),
      subtotal: Number(project.subtotal),
      taxRate: Number(project.taxRate),
      currency: project.currency,
      windowsCount: project.windowsCount,
      squareMeters: Number(project.squareMeters),
      description: project.description || '',
    }
  }, [project])

  const handleSubmit = async (data: ProjectFormData) => {
    // Calcular total antes de enviar al backend
    const tax = data.subtotal * (data.taxRate / 100)
    const total = data.subtotal + tax

    // ✅ Mutation automáticamente:
    // - Muestra toast.success al completar
    // - Muestra toast.error en errores
    // - Invalida queries de projects (lista se actualiza sola)
    // - Maneja loading state (updateMutation.isPending)
    await updateMutation.mutateAsync({
      id: projectId,
      ...data,
      total,
      totalAmount: total,
    })

    onOpenChange(false)
    onProjectUpdated?.()
  }

  // No renderizar dialog hasta que los datos estén cargados
  if (open && isLoading) {
    return null // O mostrar skeleton loader
  }

  return (
    <ProjectDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      mode="edit"
    />
  )
}
```

**Reducción de código:**

- **ANTES:** 133 líneas (fetch manual)
- **DESPUÉS:** 97 líneas (React Query)
- **AHORRO:** -36 líneas (-27%)

### Hooks Necesarios

Para que este patrón funcione, necesitas crear hooks de React Query en `hooks/queries/use-{entity}.ts`:

```typescript
// hooks/queries/use-projects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Tipo completo con todos los campos (para GET /api/projects/:id)
export interface ProjectDetail extends Project {
  phone: string
  street: string
  apartment: string | null
  comuna: string
  region: string
  subtotal: number
  taxRate: number
  currency: string
  windowsCount: number
  squareMeters: number
  description: string | null
}

/**
 * Hook para obtener un proyecto específico por ID
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async (): Promise<ProjectDetail> => {
      if (!id) throw new Error('ID de proyecto requerido')

      const response = await fetch(`/api/projects/${id}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar proyecto')
      }

      return response.json()
    },
    enabled: !!id, // Solo ejecutar si hay ID
  })
}

/**
 * Hook para actualizar un proyecto existente
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateProjectData): Promise<Project> => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar proyecto')
      }

      return response.json()
    },
    onSuccess: (updatedProject) => {
      // ✅ Invalidar automáticamente queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', updatedProject.id] })

      // ✅ Toast automático
      toast.success('Proyecto actualizado exitosamente')
    },
    onError: (error: Error) => {
      // ✅ Toast automático en errores
      toast.error(error.message)
    },
  })
}
```

### Guía de Migración Paso a Paso

**Checklist para migrar otros dialogs (customers, payments, etc.):**

1. **✅ Crear tipos completos**

   ```typescript
   // Si tu tipo base es simplificado (ej: para tabla)
   export interface EntityDetail extends Entity {
     // Agregar campos adicionales que vienen del API
     field1: string
     field2: number
   }
   ```

2. **✅ Crear hook useEntity(id)**
   - Copiar patrón de `useProject(id)`
   - Ajustar endpoint y tipo de retorno
   - `enabled: !!id` es crítico

3. **✅ Crear hook useUpdateEntity()**
   - Copiar patrón de `useUpdateProject()`
   - Ajustar endpoint y invalidación
   - onSuccess/onError con toasts

4. **✅ Refactorizar Edit Dialog**
   - Eliminar: `useState` de defaultValues
   - Eliminar: `useEffect` de loadData
   - Eliminar: `fetch` manual GET
   - Eliminar: `fetch` manual PUT
   - Eliminar: try/catch + toast manual
   - Agregar: `useEntity()` hook
   - Agregar: `useUpdateEntity()` hook
   - Agregar: `useMemo()` para defaultValues

5. **✅ Testing**
   - Abrir dialog → verifica loading state
   - Editar datos → verifica submit
   - Cerrar y reabrir → verifica cache (instantáneo)
   - Forzar error → verifica toast.error

6. **✅ Cleanup (opcional)**
   - Agregar skeleton loader mientras `isLoading`
   - Agregar optimistic updates si aplicable
   - Agregar retry logic customizado si necesario

### Beneficios Medibles del Refactor

**Caso real:** `edit-project-dialog.tsx`

| Métrica         | Antes             | Después        | Mejora |
| --------------- | ----------------- | -------------- | ------ |
| Líneas totales  | 133               | 97             | -27%   |
| Lógica de fetch | ~40 líneas        | 1 línea hook   | -97%   |
| Manejo errores  | try/catch manual  | Automático     | ✅     |
| Loading states  | useState manual   | isPending auto | ✅     |
| Toasts          | 2 llamadas manual | 0 (en hooks)   | ✅     |
| Cache UX        | Sin cache         | Cache instant  | ✅     |
| Invalidación    | Manual refetch    | Auto           | ✅     |

**Tiempo de desarrollo:**

- Crear 1er dialog con fetch: ~45 min
- Crear 1er dialog con RQ: ~30 min (una vez tienes hooks)
- Migrar dialog existente: ~15 min

### Cuándo Usar Este Approach

**✅ USA React Query cuando:**

- Tienes múltiples dialogs que hacen fetch similar
- Quieres cache automático (mejor UX)
- Quieres centralizar manejo de errores/loading
- Quieres reducir boilerplate
- El proyecto usa React Query en otros lugares

**⚠️ Stick con fetch manual cuando:**

- Dialog muy simple (1-2 campos, sin edición)
- Proyecto pequeño sin React Query
- Caso de uso único sin reutilización
- Prefer simplicidad sobre architecture

### Próximos Pasos

Después de migrar tus dialogs:

1. **Agregar optimistic updates** (opcional)

   ```typescript
   onMutate: async (newData) => {
     // Update cache inmediatamente antes de API response
     await queryClient.cancelQueries({ queryKey: ['projects'] })
     queryClient.setQueryData(['projects', id], newData)
   }
   ```

2. **Agregar skeleton loader** (mejor UX)

   ```typescript
   if (open && isLoading) {
     return <DialogSkeleton /> // En vez de `return null`
   }
   ```

3. **Centralizar configuración de React Query**
   ```typescript
   // lib/react-query-config.ts
   export const queryConfig = {
     defaultOptions: {
       queries: { staleTime: 5 * 60 * 1000 }, // 5 min
       mutations: { retry: 1 },
     },
   }
   ```

---

## Uso en Parent Component

```typescript
// app/projects/columns.tsx (ejemplo en DataTable)
function ProjectActionsCell({ project, onProjectUpdated }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>...</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog controlado por state local */}
      <EditProjectDialog
        projectId={project.id}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProjectUpdated={onProjectUpdated}
      />
    </>
  )
}
```

## Anti-Patrones a Evitar

### ❌ Anti-Pattern 1: Trigger Pattern con State Interno

```tsx
// ❌ INCORRECTO: Dialog con trigger interno y state interno
export function EditProjectDialog({ projectId, trigger }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* ... */}
      </Dialog>
    </>
  )
}

// ❌ PROBLEMA: No puedes abrir el dialog desde el padre
// El click del trigger compite con el onClick del DropdownMenuItem
```

### ❌ Anti-Pattern 2: No Limpiar State al Cerrar

```tsx
// ❌ INCORRECTO: No limpiar defaultValues
const handleOpenChange = (newOpen: boolean) => {
  onOpenChange(newOpen)
  // Falta: limpiar defaultValues cuando se cierra
}

// ❌ PROBLEMA: Si abres el dialog con proyecto A, luego con proyecto B,
// verás brevemente los datos de A antes de cargar B
```

### ❌ Anti-Pattern 3: No Usar useEffect en el Form

```tsx
// ❌ INCORRECTO: Solo pasar defaultValues sin useEffect
const form = useForm({
  defaultValues: {
    ...defaultValues, // ❌ Solo se usa en mount inicial
  },
})

// ❌ PROBLEMA: Cuando defaultValues cambia después del mount,
// el form NO se actualiza automáticamente
```

### ❌ Anti-Pattern 4: Conditional Rendering

```tsx
// ❌ INCORRECTO: Conditional rendering del form
{
  defaultValues && <ProjectForm defaultValues={defaultValues} />
}

// ❌ PROBLEMA: El form se desmonta y remonta, perdiendo focus,
// estado de validación, y causando flash visual
```

## Ventajas de Este Patrón

1. **✅ Reutilización**
   - Layer 1 (Form) es 100% reutilizable
   - Layer 2 (Dialog) es reutilizable para create/edit
   - Layer 3 son wrappers delgados específicos

2. **✅ Separación de Responsabilidades**
   - Form: Lógica de validación y UI
   - Dialog: UI de modal y layout
   - Edit/New: Lógica de negocio (fetch, submit)

3. **✅ Type-Safe**
   - Zod schema compartido
   - Type inference automático
   - Props bien definidas

4. **✅ Testeable**
   - Cada layer se puede testear independientemente
   - Form puede testearse sin Dialog
   - Edit logic puede testearse con mock fetch

5. **✅ Mantenible**
   - Cambios en UI del form no afectan lógica de dialogs
   - Cambios en API solo afectan Layer 3
   - Fácil agregar nuevos dialogs (Layer 3)

## Cuándo Usar Este Patrón

**✅ USA este patrón cuando:**

- Necesitas create + edit del mismo formulario
- Los datos de edición se cargan asincrónicamente
- El formulario es complejo (>5 campos)
- Quieres reutilizar el formulario en múltiples lugares

**❌ NO uses este patrón cuando:**

- Formulario trivial (1-2 campos)
- No necesitas modo edición
- Los datos están disponibles sincrónicamente
- Prefer simplicity over architecture

## Referencias

### React Hook Form

- **defaultValues:** https://react-hook-form.com/docs/useform#defaultValues
- **reset:** https://react-hook-form.com/docs/useform/reset

### Radix UI

- **Dialog:** https://www.radix-ui.com/primitives/docs/components/dialog

### React Query (TanStack Query)

- **Documentación oficial:** https://tanstack.com/query/latest
- **useQuery hook:** https://tanstack.com/query/latest/docs/react/reference/useQuery
- **useMutation hook:** https://tanstack.com/query/latest/docs/react/reference/useMutation
- **Query Invalidation:** https://tanstack.com/query/latest/docs/react/guides/query-invalidation
- **Best Practices:** https://tkdodo.eu/blog/practical-react-query

---

[← Anterior: Capture Dialog](capture-dialog.md) | [Volver al índice](../README.md)
