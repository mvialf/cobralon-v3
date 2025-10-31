# UI Components Layer

Sistema de componentes UI construido con shadcn/ui + componentes custom del proyecto.

---

## Estructura

```
components/
├── forms/              → React Hook Form + Zod
│   ├── customer/
│   ├── projects/
│   ├── payments/
│   └── settings/
├── dialogs/            → Modal forms
├── data-table/         → TanStack Table wrapper
├── ui/                 → shadcn/ui base (50+ components)
│   ├── combobox.tsx        (wrapper)
│   ├── currency-input.tsx   (regional)
│   ├── phone-input.tsx      (E.164)
│   └── rut-input.tsx        (Chilean RUT)
└── layout/            → AppLayout, AppSidebar
```

---

## Componentes por Categoría

### Forms (React Hook Form + Zod)

Todos los formularios usan el mismo patrón:

```tsx
// components/forms/*/form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { schema } from '@/lib/validations'

export function EntityForm({ initialData, onSubmit }) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData
  })

  return (
    <Form {...form}>
      {/* Form fields */}
    </Form>
  )
}
```

**Forms implementados:**
- `CustomerForm` - Crear/editar cliente
- `ProjectForm` - Crear/editar proyecto
- `PaymentToProjectForm` - Pago 1:1
- `PaymentToCustomerForm` - Pago 1:N con FIFO
- `ProjectStatusForm` - Estados de proyecto

### Dialogs (Modal Forms)

Pattern: Dialog + Form encapsulado

```tsx
// components/dialogs/*/dialog.tsx
export function NewEntityDialog({ trigger }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent>
        <EntityForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
```

### DataTable (TanStack Table)

Sistema de tablas reutilizable con:
- Sorting
- Filtering
- Pagination
- Column visibility
- Row selection

**Implementado en:**
- `app/customer/page.tsx`
- `app/projects/page.tsx`
- `app/payments/page.tsx`
- `app/payments/installments/page.tsx`

Ver: [DataTable Pattern](../../template/components/data-table-pattern.md)

### UI Shadcn/ui (50+ componentes)

Base de componentes reutilizables:

**Inputs:**
- `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`
- `CurrencyInput` (custom con formato regional)
- `PhoneInput` (custom con E.164)
- `RutInput` (custom para Chile)

**Display:**
- `Card`, `Table`, `Badge`, `Avatar`, `Separator`

**Feedback:**
- `Alert`, `Toast`, `Dialog`, `Sheet`, `Drawer`

**Navigation:**
- `Tabs`, `Breadcrumb`, `Pagination`, `Command`

### Componentes Regionales

Componentes que consumen `ConfigurationContext`:

#### CurrencyInput

```tsx
<CurrencyInput
  value={amount}
  onChange={setAmount}
  currency="CLP" // O derivado de context
/>
```

Formatea con:
- Separador de miles: `.`
- Separador decimal: `,`
- Símbolo: `$`, `USD`, etc.

#### PhoneInput

```tsx
<PhoneInput
  value={phone}
  onChange={setPhone}
  defaultCountry="CL"
/>
```

Valida formato E.164 internacional.

#### RutInput

```tsx
<RutInput
  value={rut}
  onChange={setRut}
/>
```

Solo para Chile:
- Formato: `12.345.678-9`
- Validación dígito verificador

---

## Pattern: Component Composition

Preferimos composición sobre configuración:

```tsx
// ✅ BIEN: Composición
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>Contenido</CardContent>
</Card>

// ❌ EVITAR: Props config
<Card
  title="Título"
  content="Contenido"
  showHeader={true}
/>
```

---

## Ver También

- [Presentation Layer](presentation.md) - Cómo se usan en páginas
- [shadcn/ui Components](../../template/components/ui-components.md) - Lista completa

**Última actualización:** 2025-10-30
