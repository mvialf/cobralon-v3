# Patrón de Diálogos

## Regla

**Los diálogos reutilizables o con lógica interna deben ser encapsulados en sus propios componentes dentro de `components/dialogs/`.**

## ✅ Correcto

```tsx
// components/dialogs/confirm-delete-dialog.tsx

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ConfirmDeleteDialogProps {
  onConfirm: () => void
  children: React.ReactNode
}

export function ConfirmDeleteDialog({ onConfirm, children }: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

Este enfoque permite que las páginas simplemente usen el diálogo sin conocer sus detalles de implementación:

```tsx
// app/users/page.tsx

import { ConfirmDeleteDialog } from '@/components/dialogs/confirm-delete-dialog'
import { Button } from '@/components/ui/button'

export default function UsersPage() {
  const handleDelete = () => {
    console.log('Registro eliminado')
  }

  return (
    <ConfirmDeleteDialog onConfirm={handleDelete}>
      <Button variant="destructive">Eliminar Registro</Button>
    </ConfirmDeleteDialog>
  )
}
```

## Por Qué

### Ventajas

1. **Reutilización** - Un solo componente usado en múltiples lugares
2. **Encapsulación** - La lógica del diálogo está contenida
3. **Props claras** - Interfaz simple y predecible
4. **Testabilidad** - Fácil de testear de forma aislada
5. **Consistencia** - UI uniforme en toda la aplicación

## Ubicación y Convenciones

- **Ubicación:** `components/dialogs/`
- **Convención:** El componente debe incluir el `AlertDialogTrigger` y el `AlertDialogContent`
- **Props:** Exponer interfaz simple (ej: `onConfirm`, `onCancel`, `children` para trigger)

## Estructura Recomendada

```
components/dialogs/
├── confirm-delete-dialog.tsx
├── customers/
│   ├── new-customer-dialog.tsx
│   └── edit-customer-dialog.tsx
├── projects/
│   ├── new-project-dialog.tsx
│   └── edit-project-dialog.tsx
└── payments/
    ├── new-payment-dialog.tsx
    └── payment-details-dialog.tsx
```

## Patrón: Dialog con Form

```tsx
// components/dialogs/customers/new-customer-dialog.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CustomerForm } from '@/components/forms/customer-form'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export function NewCustomerDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Cliente</DialogTitle>
        </DialogHeader>
        <CustomerForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
```

## Patrón: Dialog Controlado

Para casos donde el parent necesita controlar el estado del dialog:

```tsx
// components/dialogs/customers/edit-customer-dialog.tsx

interface EditCustomerDialogProps {
  customerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCustomerDialog({ customerId, open, onOpenChange }: EditCustomerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <CustomerForm customerId={customerId} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

// Uso en parent
function ParentComponent() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>Editar</Button>
      <EditCustomerDialog customerId="123" open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
```

## Cuándo Crear un Componente Dialog

**✅ Crea un componente separado cuando:**

- El diálogo se usa en múltiples lugares
- Tiene lógica interna compleja
- Contiene un formulario o vista compleja
- Necesitas consistencia en confirmaciones/alertas

**❌ NO crees componente separado cuando:**

- Diálogo trivial usado una sola vez
- No tiene lógica reutilizable
- Es específico de una sola vista

## Referencias

- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Radix UI Alert Dialog](https://www.radix-ui.com/primitives/docs/components/alert-dialog)
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog)
- [shadcn/ui Alert Dialog](https://ui.shadcn.com/docs/components/alert-dialog)

---

[← Anterior: Patrón de Formularios](form-pattern.md) | [Volver al índice](../README.md) | [Siguiente: Contenido Wide (Overflow) →](wide-content-overflow.md)
