# Anti-Patrón: Estilos Inline Complejos

## El Problema

Usar estilos inline verbosos o lógica de styling compleja directamente en componentes dificulta mantenimiento y reutilización.

## ❌ Incorrecto

```tsx
export function StatusBadge({ status, priority, isUrgent }) {
  // ❌ Lógica de estilos inline compleja
  return (
    <span
      style={{
        backgroundColor:
          status === 'completed'
            ? '#10b981'
            : status === 'pending'
              ? '#f59e0b'
              : status === 'error'
                ? '#ef4444'
                : '#6b7280',
        color: status === 'completed' || status === 'error' ? '#ffffff' : '#000000',
        padding: priority === 'high' ? '8px 16px' : '6px 12px',
        borderRadius: priority === 'high' ? '8px' : '4px',
        fontWeight: isUrgent ? 'bold' : 'normal',
        border: isUrgent ? '2px solid red' : 'none',
        fontSize: priority === 'high' ? '14px' : '12px',
      }}
    >
      {status}
    </span>
  )
}
```

**Problemas:**

- ❌ Difícil de leer y mantener
- ❌ No reutilizable (valores hardcodeados)
- ❌ Difícil testear estilos
- ❌ No aprovecha Tailwind utilities

## ✅ Correcto: Tailwind Classes + cn()

```tsx
import { cn } from '@/lib/utils'

export function StatusBadge({ status, priority, isUrgent }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        // Base classes
        'inline-flex items-center rounded font-medium',

        // Status variants
        status === 'completed' && 'bg-green-500 text-white',
        status === 'pending' && 'bg-amber-500 text-white',
        status === 'error' && 'bg-red-500 text-white',
        !['completed', 'pending', 'error'].includes(status) && 'bg-gray-500 text-white',

        // Priority variants
        priority === 'high' ? 'px-4 py-2 text-sm rounded-lg' : 'px-3 py-1.5 text-xs rounded',

        // Urgent modifier
        isUrgent && 'border-2 border-red-600 font-bold'
      )}
    >
      {status}
    </span>
  )
}
```

**Ventajas:**

- ✅ Legible y mantenible
- ✅ Aprovecha Tailwind utilities
- ✅ Autocomplete en VSCode
- ✅ PurgeCSS funciona correctamente

## ✅ Mejor: Class Variance Authority (CVA)

Para componentes con muchas variantes, usa CVA:

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  // Base classes (siempre aplicadas)
  'inline-flex items-center font-medium',
  {
    variants: {
      status: {
        completed: 'bg-green-500 text-white',
        pending: 'bg-amber-500 text-white',
        error: 'bg-red-500 text-white',
        default: 'bg-gray-500 text-white',
      },
      priority: {
        high: 'px-4 py-2 text-sm rounded-lg',
        normal: 'px-3 py-1.5 text-xs rounded',
        low: 'px-2 py-1 text-xs rounded-sm',
      },
      urgent: {
        true: 'border-2 border-red-600 font-bold',
        false: '',
      },
    },
    defaultVariants: {
      status: 'default',
      priority: 'normal',
      urgent: false,
    },
  }
)

interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode
  className?: string
}

export function StatusBadge({ status, priority, urgent, className, children }: StatusBadgeProps) {
  return <span className={cn(badgeVariants({ status, priority, urgent }), className)}>{children}</span>
}

// Uso
<StatusBadge status="completed" priority="high" urgent>
  Completado
</StatusBadge>
```

**Ventajas de CVA:**

- ✅ Type-safe variants
- ✅ Default values
- ✅ Compound variants (combinaciones)
- ✅ Usado por shadcn/ui internamente

## ✅ Mejor aún: Componente Reutilizable

Si el patrón se repite, crea un componente:

```tsx
// components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      destructive: 'border-transparent bg-destructive text-destructive-foreground',
      outline: 'text-foreground',
      success: 'border-transparent bg-green-500 text-white',
      warning: 'border-transparent bg-amber-500 text-white',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

// Uso simple en múltiples lugares
<Badge variant="success">Aprobado</Badge>
<Badge variant="warning">Pendiente</Badge>
<Badge variant="destructive">Rechazado</Badge>
```

## Cuándo Usar Cada Enfoque

### Tailwind + cn() (Simple)

- ✅ Componente con 2-3 variants
- ✅ Usado en 1-2 lugares
- ✅ Lógica de styling simple

### CVA (Intermedio)

- ✅ Componente con 4+ variants
- ✅ Combinaciones de variants (compound)
- ✅ Necesitas type safety

### Componente Reutilizable (Complejo)

- ✅ Usado en 5+ lugares
- ✅ Parte del design system
- ✅ Necesita ser consistente en toda la app

## Anti-Patrón: Estilos en global.css sin Razón

```css
/* ❌ INCORRECTO: Crear clase custom innecesaria */
.status-badge-completed {
  background-color: #10b981;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
}
```

**Por qué está mal:**

- ❌ Reinventa Tailwind utilities
- ❌ No reutilizable (valores hardcodeados)
- ❌ Dificulta mantenimiento

**Excepción:** Estilos que NO se pueden lograr con Tailwind:

```css
/* ✅ CORRECTO: Animación custom compleja */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton-shimmer {
  animation: shimmer 2s infinite linear;
  background: linear-gradient(to right, #f0f0f0 4%, #e0e0e0 25%, #f0f0f0 36%);
  background-size: 1000px 100%;
}
```

## Regla de Oro

> **Usa Tailwind utilities primero. Solo crea CSS custom cuando Tailwind no pueda lograrlo.**

## Referencias

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [class-variance-authority](https://cva.style/docs)
- [cn() Function Pattern](../fundamentals/cn-function.md)
- [shadcn/ui Badge](https://ui.shadcn.com/docs/components/badge)

---

[← Anterior: Lógica de Negocio en Componentes](business-logic-in-components.md) | [Volver al índice](README.md) | [Siguiente: Conditional Styling Hardcodeado →](conditional-styling-hardcoded.md)
