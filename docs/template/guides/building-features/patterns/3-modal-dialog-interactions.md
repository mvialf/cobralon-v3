# Pattern 3: Modal/Dialog Interactions

## Pattern 3: Modal/Dialog Interactions

### When to Use

- Confirmaciones (delete, cancel)
- Forms pequeños (quick create)
- Detalles adicionales (view more)
- Actions destructivas

**Ejemplos:**

- Confirm delete
- Quick add note
- View order details

---

### Architecture

```
┌─────────────────────────┐
│  Trigger Component      │
│  (Button, MenuItem)     │
└────────────┬────────────┘
             ↓ opens
┌─────────────────────────┐
│  Dialog Component       │
│                         │
│  ├─ Header (title)      │
│  ├─ Content (body)      │
│  └─ Footer (actions)    │
└────────────┬────────────┘
             ↓ action
┌─────────────────────────┐
│  Callback / API call    │
└─────────────────────────┘
```

---

### Example 1: Confirm Delete

```typescript
// components/dialogs/confirm-delete-dialog.tsx
'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface ConfirmDeleteDialogProps {
  onConfirm: () => void | Promise<void>
  children: React.ReactNode  // Trigger button
  title?: string
  description?: string
}

export function ConfirmDeleteDialog({
  onConfirm,
  children,
  title = 'Are you sure?',
  description = 'This action cannot be undone.'
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Uso
<ConfirmDeleteDialog
  onConfirm={async () => {
    await deleteProduct(product.id)
    toast.success('Product deleted')
  }}
>
  <Button variant="destructive">Delete</Button>
</ConfirmDeleteDialog>
```

---

### Example 2: View Details Dialog

```typescript
// components/dialogs/products/view-product-dialog.tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Product } from '@/lib/types/product.types'

interface ViewProductDialogProps {
  product: Product
  children: React.ReactNode
}

export function ViewProductDialog({ product, children }: ViewProductDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p>{product.description || 'No description'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="font-semibold">{formatCurrency(product.price)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stock</p>
              <p className="font-semibold">{product.stock} units</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Uso
<ViewProductDialog product={product}>
  <Button variant="ghost">View Details</Button>
</ViewProductDialog>
```

---

\n---

## Related

- [Pattern 2: CRUD Operations](2-crud-operations.md)
- [Pattern 4: Complex Relations](4-complex-relations-nm.md)

---

**Next:** [Pattern 4: Complex Relations](4-complex-relations-nm.md)
