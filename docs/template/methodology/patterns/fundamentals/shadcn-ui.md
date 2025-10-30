# Componentes shadcn/ui

## Regla

**Reutiliza componentes de shadcn/ui en lugar de reinventar la rueda.**

## ✅ Correcto

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

<Card>
  <CardHeader>Título</CardHeader>
  <CardContent>
    <Input placeholder="Email" />
    <Button>Enviar</Button>
  </CardContent>
</Card>
```

## ❌ Incorrecto

```tsx
// NO crear tu propio Button si shadcn/ui ya lo provee
function MyButton({ children, onClick }) {
  return (
    <button
      className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// NO crear componentes que ya existen
function MyCard({ children }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      {children}
    </div>
  )
}
```

## Por Qué shadcn/ui

### Ventajas

1. **40+ componentes** pre-construidos y probados
2. **Accesibilidad** (ARIA compliant vía Radix UI)
3. **Customizable** - Código en tu proyecto, no en node_modules
4. **Type-safe** - TypeScript de primera clase
5. **Consistencia** - Mismo look & feel en todo el proyecto

### Componentes Más Usados

| Categoría        | Componentes                                      |
| ---------------- | ------------------------------------------------ |
| **Forms**        | Input, Select, Checkbox, Radio, Textarea, Switch |
| **Data Display** | Card, Table, Badge, Avatar, Separator            |
| **Feedback**     | Alert, Toast, Dialog, Sheet, Drawer              |
| **Navigation**   | Tabs, Breadcrumb, Pagination, Command            |
| **Overlays**     | Popover, Tooltip, HoverCard, DropdownMenu        |

## Instalación de Componentes

### CLI de shadcn/ui

```bash
# Instalar componente individual
npx shadcn@latest add button

# Instalar múltiples
npx shadcn@latest add card input button

# Ver lista completa
npx shadcn@latest add
```

### Ubicación

Todos los componentes instalados van a `components/ui/`:

```
components/ui/
├── button.tsx
├── card.tsx
├── input.tsx
├── dialog.tsx
└── ...
```

## Customización

### Los Componentes Son TU Código

**shadcn/ui NO es una librería** - Es copy-paste architecture:

- ✅ Código copiado a tu proyecto
- ✅ Ownership completo
- ✅ Puedes modificar lo que quieras
- ✅ No hay `node_modules/shadcn` oculto

### Ejemplo: Customizar Button

```tsx
// components/ui/button.tsx (tu código)
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // ✅ AGREGAR nueva variant
        custom: 'bg-purple-500 text-white hover:bg-purple-600',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        // ✅ AGREGAR nuevo size
        xs: 'h-8 px-2 text-xs',
      },
    },
  }
)

// Uso
<Button variant="custom" size="xs">Mi Botón</Button>
```

## Ejemplos de Uso

### Card Component

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

<Card>
  <CardHeader>
    <CardTitle>Proyecto ABC</CardTitle>
    <CardDescription>Cliente: Acme Corp</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Total: $1,500,000 CLP</p>
    <p>Estado: En Proceso</p>
  </CardContent>
  <CardFooter>
    <Button>Ver Detalles</Button>
  </CardFooter>
</Card>
```

### Dialog Component

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>¿Confirmar acción?</DialogTitle>
      <DialogDescription>
        Esta acción no se puede deshacer.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button variant="destructive">Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form Components

```tsx
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" placeholder="tu@email.com" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Enviar</Button>
  </form>
</Form>
```

## Cuándo Crear Componentes Custom

### ✅ Crea Custom Cuando

1. **No existe en shadcn/ui**
   - CurrencyInput, PhoneInput, RutInput (específicos del proyecto)
   - Componentes de negocio (ProjectCard, PaymentSummary)

2. **Necesitas lógica específica**
   - DataTable (TanStack Table wrapper)
   - CaptureDialog (screenshot + clipboard)

3. **Wrapper con defaults**
   - FormattedDatePicker (date-fns + config regional)

### ❌ NO Crees Custom Cuando

- ❌ Ya existe en shadcn/ui (Button, Input, Card, etc.)
- ❌ Es solo styling diferente (usa variants en su lugar)
- ❌ "No me gusta el default" → Modifica el componente de shadcn/ui

## Componentes Custom del Template

El template incluye algunos componentes custom en `components/ui/`:

```
components/ui/
├── combobox.tsx         # Wrapper sobre Command + Popover
├── currency-input.tsx   # Input con formato de moneda
├── phone-input.tsx      # Input con validación E.164
└── rut-input.tsx        # Input chileno (RUT)
```

Estos existen porque NO están en shadcn/ui base pero son comunes en el proyecto.

## Referencias

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Radix UI Primitives](https://www.radix-ui.com) (base de shadcn/ui)
- [ADR-003: shadcn/ui New York](../../../decisions/003-shadcn-ui-new-york.md)

---

[← Anterior: Composición de Componentes](component-composition.md) | [Volver al índice](../README.md)
