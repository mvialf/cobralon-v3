# Función cn() para Clases Condicionales

## Regla

**Usa `cn()` de `@/lib/utils` para merge de clases Tailwind condicionales.**

## ✅ Correcto

```tsx
import { cn } from '@/lib/utils'

<div
  className={cn(
    'base-classes',
    condition && 'conditional-classes',
    className
  )}
/>
```

## ❌ Incorrecto

```tsx
// NO usar template literals manuales
<div
  className={`base-classes ${condition ? 'conditional-classes' : ''} ${className}`}
/>

// NO concatenar strings
<div
  className={
    'base-classes ' +
    (condition ? 'conditional-classes ' : '') +
    className
  }
/>
```

## Qué es cn()

La función `cn()` combina:

1. **clsx** - Manejo de clases condicionales
2. **tailwind-merge** - Merge inteligente de clases Tailwind

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Por Qué

### Ventajas

1. **Type-safe** - TypeScript detecta errores
2. **Merge inteligente** - Resuelve conflictos de Tailwind
3. **Limpio** - Código más legible
4. **Flexible** - Acepta arrays, objetos, condicionales

### Problema que Resuelve

**Sin `cn()`:**

```tsx
// ❌ Conflicto: bg-blue-500 se aplica, bg-red-500 se ignora
<div className="bg-blue-500 bg-red-500">...</div>
```

**Con `cn()`:**

```tsx
// ✅ Solo se aplica bg-red-500 (último gana)
<div className={cn('bg-blue-500', 'bg-red-500')}>...</div>
```

## Ejemplos

### Clases Condicionales

```tsx
<Button
  className={cn(
    'rounded-md px-4 py-2',
    isLoading && 'opacity-50 cursor-not-allowed',
    variant === 'primary' && 'bg-blue-500 text-white',
    variant === 'secondary' && 'bg-gray-200 text-gray-900'
  )}
/>
```

### Merge con Props className

```tsx
interface CardProps {
  className?: string
  children: React.ReactNode
}

function Card({ className, children }: CardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      {children}
    </div>
  )
}

// Uso
<Card className="shadow-lg">
  {/* className se mergea con las clases base */}
</Card>
```

### Con Objetos (clsx syntax)

```tsx
<div
  className={cn({
    'text-green-500': isSuccess,
    'text-red-500': isError,
    'text-gray-500': !isSuccess && !isError,
  })}
/>
```

### Con Arrays

```tsx
const baseClasses = ['flex', 'items-center', 'gap-2']
const conditionalClasses = [
  isCompact && 'text-sm',
  isDisabled && 'opacity-50',
]

<div className={cn(baseClasses, conditionalClasses)} />
```

### Merge Inteligente de Tailwind

```tsx
// ✅ CORRECTO: cn() resuelve conflictos
function Button({ size = 'md', className }) {
  return (
    <button
      className={cn(
        // Base
        'rounded px-4 py-2',
        // Size (puede ser sobrescrito por className)
        size === 'sm' && 'text-sm px-2 py-1',
        size === 'lg' && 'text-lg px-6 py-3',
        // User override (gana sobre size)
        className
      )}
    />
  )
}

// Si pasas className="px-8" solo se aplica px-8 (no px-4, px-2 o px-6)
<Button size="sm" className="px-8" />
```

## Patrón Común: Component Variants

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  className?: string
  children: React.ReactNode
}

export function Button({ variant, size, className, children }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </button>
  )
}
```

## Anti-Patrones

### ❌ No Usar Template Literals

```tsx
// ❌ INCORRECTO
<div className={`flex ${isActive ? 'bg-blue-500' : ''}`} />

// ✅ CORRECTO
<div className={cn('flex', isActive && 'bg-blue-500')} />
```

### ❌ No Concatenar Manualmente

```tsx
// ❌ INCORRECTO
<div className={'flex ' + (isActive ? 'bg-blue-500' : '')} />

// ✅ CORRECTO
<div className={cn('flex', isActive && 'bg-blue-500')} />
```

### ❌ No Resolver Conflictos Manualmente

```tsx
// ❌ INCORRECTO - Conflictos no resueltos
<div className={baseClass + ' ' + (override || '')} />

// ✅ CORRECTO - cn() resuelve automáticamente
<div className={cn(baseClass, override)} />
```

## Referencias

- [clsx Documentation](https://github.com/lukeed/clsx)
- [tailwind-merge Documentation](https://github.com/dcastil/tailwind-merge)
- [class-variance-authority](https://cva.style/docs) - Para variants avanzadas

---

[← Anterior: Path Aliases](path-aliases.md) | [Volver al índice](../README.md) | [Siguiente: Composición de Componentes →](component-composition.md)
