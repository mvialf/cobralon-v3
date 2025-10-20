import * as React from 'react'
import { cn } from '@/lib/utils'

interface FormGridProps {
  /** Contenido del grid */
  children: React.ReactNode
  /** Número de columnas o ratio (ej: 2, 3, "2-1", "3-1") */
  columns?: number | string
  /** Clase CSS personalizada */
  className?: string
}

/**
 * Grid para layouts de formulario con soporte responsive
 *
 * Soporta:
 * - Números: columns={2}, columns={3}
 * - Ratios: columns="2-1", columns="3-1"
 * - Responsive: colapsa a 1 columna en mobile
 *
 * @example Uso básico
 * ```tsx
 * <FormGrid columns={2}>
 *   <FormField name="firstName" />
 *   <FormField name="lastName" />
 * </FormGrid>
 * ```
 *
 * @example Con ratios
 * ```tsx
 * <FormGrid columns="2-1">
 *   <FormField name="projectName" />  // 2/3 del ancho
 *   <FormField name="phone" />        // 1/3 del ancho
 * </FormGrid>
 * ```
 */
function FormGrid({ children, columns = 1, className }: FormGridProps) {
  // Determinar las clases de grid según el tipo de columns
  const gridClass = React.useMemo(() => {
    if (typeof columns === 'number') {
      // Números simples: 1, 2, 3, etc.
      switch (columns) {
        case 1:
          return 'grid-cols-1'
        case 2:
          return 'grid-cols-1 md:grid-cols-2'
        case 3:
          return 'grid-cols-1 md:grid-cols-3'
        case 4:
          return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        default:
          return `grid-cols-1 md:grid-cols-${columns}`
      }
    }

    // Ratios personalizados: "2-1", "3-1", etc.
    if (typeof columns === 'string') {
      if (columns === '2-1') {
        return 'grid-cols-1 md:grid-cols-[2fr_1fr]'
      }
      if (columns === '3-1') {
        return 'grid-cols-1 md:grid-cols-[3fr_1fr]'
      }
      if (columns === '1-2') {
        return 'grid-cols-1 md:grid-cols-[1fr_2fr]'
      }
      if (columns === '1-3') {
        return 'grid-cols-1 md:grid-cols-[1fr_3fr]'
      }
    }

    // Default fallback
    return 'grid-cols-1'
  }, [columns])

  return <div className={cn('grid gap-4', gridClass, className)}>{children}</div>
}

export { FormGrid }
