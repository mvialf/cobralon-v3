import { useEffect, useState } from 'react'

/**
 * Hook que debounce un valor
 *
 * @param value - Valor a debounce
 * @param delay - Delay en milisegundos (default: 300ms)
 * @returns Valor debounced
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 300)
 *
 * // Solo ejecuta query cuando el usuario para de escribir por 300ms
 * const { data } = useQuery({
 *   queryKey: ['search', debouncedSearch],
 *   queryFn: () => fetch(`/api/search?q=${debouncedSearch}`)
 * })
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set timeout para actualizar el valor
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup: cancela el timeout si value cambia antes del delay
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
