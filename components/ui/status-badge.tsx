import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Mapeo estático de clases de Tailwind para compatibilidad con JIT
 * IMPORTANTE: No usar clases dinámicas desde DB, Tailwind JIT no las detecta
 */
const COLOR_CLASS_MAP: Record<string, { bg: string; text: string; border: string }> = {
  // Grises
  'bg-gray-500': { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-500' },

  // Rojos
  'bg-red-500': { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500' },

  // Naranjas
  'bg-orange-500': { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-500' },

  // Amarillos
  'bg-yellow-500': { bg: 'bg-yellow-500', text: 'text-white', border: 'border-yellow-500' },

  // Verdes
  'bg-green-500': { bg: 'bg-green-500', text: 'text-white', border: 'border-green-500' },

  // Azules
  'bg-blue-500': { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500' },

  // Índigos
  'bg-indigo-500': { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-500' },

  // Púrpuras
  'bg-purple-500': { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-500' },

  // Rosas
  'bg-pink-500': { bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-500' },
}

interface StatusBadgeProps {
  /**
   * Clase de background desde la BD (ej: "bg-blue-500")
   * Debe coincidir con una key en COLOR_CLASS_MAP
   */
  bgClass: string

  /**
   * Texto a mostrar en el badge
   */
  label: string

  /**
   * Clase CSS adicional (opcional)
   */
  className?: string

  /**
   * Variante del badge
   * - "default": Badge sólido con fondo de color
   * - "outline": Badge con borde de color y fondo transparente
   */
  variant?: 'default' | 'outline'
}

/**
 * StatusBadge - Badge de estado con color configurable
 *
 * Uso:
 * ```tsx
 * <StatusBadge bgClass="bg-blue-500" label="En Progreso" />
 * <StatusBadge bgClass="bg-green-500" label="Completado" variant="outline" />
 * ```
 *
 * IMPORTANTE: Este componente usa un mapeo estático de clases de Tailwind
 * para garantizar compatibilidad con JIT compilation. No intentes pasar
 * clases dinámicas directamente desde la BD sin mapearlas aquí.
 */
export function StatusBadge({ bgClass, label, className, variant = 'default' }: StatusBadgeProps) {
  // Obtener clases mapeadas o usar fallback
  const colorClasses = COLOR_CLASS_MAP[bgClass] || {
    bg: 'bg-gray-500',
    text: 'text-white',
    border: 'border-gray-500',
  }

  if (variant === 'outline') {
    return (
      <Badge
        variant="outline"
        className={cn(
          colorClasses.border,
          'border-2',
          // Text color: usar el color del border pero más oscuro
          bgClass.replace('bg-', 'text-'),
          className
        )}
      >
        {label}
      </Badge>
    )
  }

  // Variant "default" (sólido)
  return (
    <Badge className={cn(colorClasses.bg, colorClasses.text, 'border-0', className)}>{label}</Badge>
  )
}
