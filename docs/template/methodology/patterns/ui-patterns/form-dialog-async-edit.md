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

- **React Hook Form defaultValues:** https://react-hook-form.com/docs/useform#defaultValues
- **React Hook Form reset:** https://react-hook-form.com/docs/useform/reset
- **Radix UI Dialog:** https://www.radix-ui.com/primitives/docs/components/dialog

---

[← Anterior: Capture Dialog](capture-dialog.md) | [Volver al índice](../README.md)
