import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDebounce } from '../use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('debe retornar el valor inicial inmediatamente', () => {
    const { result } = renderHook(() => useDebounce('initial'))
    expect(result.current).toBe('initial')
  })

  it('debe debounce cambios de valor con delay default (300ms)', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    })

    // Valor inicial
    expect(result.current).toBe('initial')

    // Cambiar valor
    rerender({ value: 'changed' })

    // Aún no debería cambiar (antes del delay)
    expect(result.current).toBe('initial')

    // Avanzar timers 300ms
    vi.advanceTimersByTime(300)

    // Ahora sí debería cambiar
    await waitFor(() => {
      expect(result.current).toBe('changed')
    })
  })

  it('debe usar delay personalizado', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'changed', delay: 500 })

    // No debería cambiar a los 300ms
    vi.advanceTimersByTime(300)
    expect(result.current).toBe('initial')

    // Debería cambiar a los 500ms
    vi.advanceTimersByTime(200) // Total: 500ms
    await waitFor(() => {
      expect(result.current).toBe('changed')
    })
  })

  it('debe cancelar timeout anterior cuando valor cambia rápidamente', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    })

    // Primer cambio
    rerender({ value: 'change1' })
    vi.advanceTimersByTime(100)

    // Segundo cambio antes de que se complete el debounce
    rerender({ value: 'change2' })
    vi.advanceTimersByTime(100)

    // Tercer cambio
    rerender({ value: 'final' })

    // El valor debería seguir siendo 'initial'
    expect(result.current).toBe('initial')

    // Completar el último debounce
    vi.advanceTimersByTime(300)

    // Solo el último valor debería aplicarse
    await waitFor(() => {
      expect(result.current).toBe('final')
    })
  })

  it('debe manejar diferentes tipos de valores', async () => {
    // String
    const { result: stringResult, rerender: stringRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'test' } }
    )
    stringRerender({ value: 'updated' })
    vi.advanceTimersByTime(100)
    await waitFor(() => expect(stringResult.current).toBe('updated'))

    // Number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 123 } }
    )
    numberRerender({ value: 456 })
    vi.advanceTimersByTime(100)
    await waitFor(() => expect(numberResult.current).toBe(456))

    // Object
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { name: 'initial' } } }
    )
    const newObj = { name: 'updated' }
    objectRerender({ value: newObj })
    vi.advanceTimersByTime(100)
    await waitFor(() => expect(objectResult.current).toEqual(newObj))

    // Array
    const { result: arrayResult, rerender: arrayRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: [1, 2, 3] } }
    )
    const newArray = [4, 5, 6]
    arrayRerender({ value: newArray })
    vi.advanceTimersByTime(100)
    await waitFor(() => expect(arrayResult.current).toEqual(newArray))
  })

  it('debe limpiar timeout al desmontar componente', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'changed' })
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })

  it('debe manejar delay de 0ms', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'immediate' })
    vi.advanceTimersByTime(0)

    await waitFor(() => {
      expect(result.current).toBe('immediate')
    })
  })

  it('debe manejar null y undefined', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce<string | null | undefined>(value, 100),
      { initialProps: { value: 'initial' as string | null | undefined } }
    )

    rerender({ value: null })
    vi.advanceTimersByTime(100)
    await waitFor(() => expect(result.current).toBeNull())

    rerender({ value: undefined })
    vi.advanceTimersByTime(100)
    await waitFor(() => expect(result.current).toBeUndefined())
  })

  it('debe manejar caso de uso real: búsqueda con debounce', async () => {
    // Simular búsqueda de usuario
    const { result, rerender } = renderHook(({ searchTerm }) => useDebounce(searchTerm, 300), {
      initialProps: { searchTerm: '' },
    })

    // Usuario escribe rápidamente
    rerender({ searchTerm: 'r' })
    vi.advanceTimersByTime(50)
    rerender({ searchTerm: 're' })
    vi.advanceTimersByTime(50)
    rerender({ searchTerm: 'rea' })
    vi.advanceTimersByTime(50)
    rerender({ searchTerm: 'reac' })
    vi.advanceTimersByTime(50)
    rerender({ searchTerm: 'react' })

    // No debería haber cambiado aún
    expect(result.current).toBe('')

    // Esperar el debounce completo
    vi.advanceTimersByTime(300)

    // Ahora sí debería tener el valor final
    await waitFor(() => {
      expect(result.current).toBe('react')
    })
  })
})
