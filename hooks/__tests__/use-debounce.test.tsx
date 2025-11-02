import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
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

  it('debe debounce cambios de valor con delay default (300ms)', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    })

    expect(result.current).toBe('initial')

    rerender({ value: 'changed' })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('changed')
  })

  it('debe usar delay personalizado', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'changed', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('changed')
  })

  it('debe cancelar timeout anterior cuando valor cambia rápidamente', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'change1' })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'change2' })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'final' })

    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('final')
  })

  it('debe manejar diferentes tipos de valores', () => {
    // String
    const { result: stringResult, rerender: stringRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'test' } }
    )
    stringRerender({ value: 'updated' })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(stringResult.current).toBe('updated')

    // Number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 123 } }
    )
    numberRerender({ value: 456 })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(numberResult.current).toBe(456)

    // Object
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { name: 'initial' } } }
    )
    const newObj = { name: 'updated' }
    objectRerender({ value: newObj })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(objectResult.current).toEqual(newObj)

    // Array
    const { result: arrayResult, rerender: arrayRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: [1, 2, 3] } }
    )
    const newArray = [4, 5, 6]
    arrayRerender({ value: newArray })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(arrayResult.current).toEqual(newArray)
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

  it('debe manejar delay de 0ms', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'immediate' })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(result.current).toBe('immediate')
  })

  it('debe manejar null y undefined', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce<string | null | undefined>(value, 100),
      { initialProps: { value: 'initial' as string | null | undefined } }
    )

    rerender({ value: null })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBeNull()

    rerender({ value: undefined })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBeUndefined()
  })

  it('debe manejar caso de uso real: búsqueda con debounce', () => {
    const { result, rerender } = renderHook(({ searchTerm }) => useDebounce(searchTerm, 300), {
      initialProps: { searchTerm: '' },
    })

    rerender({ searchTerm: 'r' })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    rerender({ searchTerm: 're' })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    rerender({ searchTerm: 'rea' })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    rerender({ searchTerm: 'reac' })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    rerender({ searchTerm: 'react' })

    expect(result.current).toBe('')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('react')
  })
})
