# Componentes UI (shadcn/ui)

El template incluye **50 componentes UI** preconstruidos basados en shadcn/ui estilo "New York".

## Ubicación

[components/ui/](../../../components/ui/)

## Componentes Disponibles

### Forms & Inputs

- **button** - Botones con variants (default, destructive, outline, etc.)
- **input** - Input text estándar
- **textarea** - Textarea multi-línea
- **select** - Select dropdown
- **checkbox** - Checkbox con label
- **radio-group** - Radio buttons
- **switch** - Toggle switch
- **slider** - Range slider
- **form** - Wrapper de React Hook Form + Zod
- **input-otp** - One-time password input
- **label** - Label para form fields

### Data Display

- **card** - Card con header, content, footer
- **table** - Table HTML estilizada
- **badge** - Badge para status/tags
- **avatar** - Avatar con imagen/fallback
- **separator** - Línea divisora horizontal/vertical
- **skeleton** - Loading skeleton
- **progress** - Progress bar
- **chart** - Componentes de charts (Recharts)

### Feedback & Overlays

- **alert** - Alert messages (info, warning, error)
- **alert-dialog** - Modal de confirmación
- **dialog** - Modal genérico
- **sheet** - Slide-in panel
- **drawer** - Bottom drawer (mobile-friendly)
- **toast** / **sonner** - Toast notifications
- **popover** - Popover overlay
- **tooltip** - Tooltip on hover
- **hover-card** - Card que aparece en hover

### Navigation

- **tabs** - Tabs navigation
- **breadcrumb** - Breadcrumb navigation
- **pagination** - Pagination controls
- **command** - Command palette (Cmd+K)
- **menubar** - Menu bar horizontal
- **navigation-menu** - Navigation menu complejo

### Menus

- **dropdown-menu** - Dropdown con items, separators, sub-menus
- **context-menu** - Right-click context menu
- **select** - Select dropdown

### Layout & Structure

- **accordion** - Collapsible sections
- **collapsible** - Single collapsible section
- **resizable** - Resizable panels
- **scroll-area** - Custom scrollbar
- **sidebar** - Sidebar component (Radix)
- **aspect-ratio** - Mantiene aspect ratio

### Date & Time

- **calendar** - Date picker calendar
- **date-picker** - Date picker input (react-day-picker)

### Data Visualization

- **carousel** - Image/content carousel (Embla)
- **chart** - Line, Bar, Area, Pie charts (Recharts)

### Otros

- **sonner** - Toast system (Sonner library)
- **toggle** - Toggle button
- **toggle-group** - Toggle button group

## Agregar Componentes

```bash
# Ver lista disponible
npx shadcn@latest add

# Agregar componente específico
npx shadcn@latest add calendar
npx shadcn@latest add form

# Agregar múltiples
npx shadcn@latest add calendar form data-table
```

## Uso Básico

Todos los componentes se importan desde `@/components/ui/`:

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function MyForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" />
          </div>
          <Button>Enviar</Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Customización

Los componentes son **tu código** (copy-paste architecture). Edítalos directamente:

```tsx
// components/ui/button.tsx

const buttonVariants = cva('inline-flex items-center justify-center rounded-md...', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      destructive: 'bg-destructive text-destructive-foreground',
      // Agrega tu variant custom aquí:
      custom: 'bg-purple-500 text-white hover:bg-purple-600',
    },
    size: {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
      // Agrega tamaño custom:
      xl: 'h-14 px-10 text-lg',
    },
  },
})
```

## Componentes Custom Adicionales

El template incluye componentes custom adicionales NO oficiales de shadcn/ui:

### DataTable

**Ubicación:** [components/data-table/](../../../components/data-table/)

Sistema completo de tablas avanzadas con TanStack Table v8:

- ✅ Sorting multi-columna
- ✅ Búsqueda global y filtros facetados
- ✅ Paginación y visibilidad de columnas
- ✅ Row selection y acciones por fila
- ✅ Type-safe y extensible

**📖 Documentación completa:** [data-table.md](data-table.md)

**Uso básico:**

```tsx
import { DataTable } from "@/components/data-table"

<DataTable
  columns={columns}
  data={data}
  searchKey="name"
  filterableColumns={[...]}
/>
```

### Combobox (Command + Popover)

**Ubicación:** Patrón que combina [command.tsx](../../../components/ui/command.tsx) + [popover.tsx](../../../components/ui/popover.tsx)

Componente de selección con búsqueda. Usa el patrón oficial de shadcn/ui basado en cmdk (Vercel).

**Instalación:**

```bash
npx shadcn@latest add command popover
```

**Uso Básico:**

```tsx
import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

function ComboboxDemo() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}>
          {value ? items.find((item) => item.value === value)?.label : 'Select...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === item.value ? 'opacity-100' : 'opacity-0')}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

**Features:**

- ✅ Búsqueda en tiempo real
- ✅ Basado en cmdk (Vercel)
- ✅ Compatible con React 19 + Next.js 15
- ✅ Teclado accesible (flechas, Enter, Esc)
- ✅ ARIA compliant
- ✅ Sin bugs de pérdida de caracteres

**Demo:** Ver [/ejemplos](../../../app/ejemplos/page.tsx) para ejemplo completo con debounce

## Documentación Completa

Cada componente tiene documentación detallada en:

- **shadcn/ui oficial**: https://ui.shadcn.com/docs/components
- **Radix UI** (primitives subyacentes): https://www.radix-ui.com/primitives

## Ver También

- [ADR-003: shadcn/ui New York Style](../decisions/003-shadcn-ui-new-york.md)
- [Tailwind CSS](https://tailwindcss.com/docs) - Para styling
- [Lucide Icons](https://lucide.dev/icons/) - Iconos usados
