import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn utility function', () => {
  it('debe combinar clases simples', () => {
    const result = cn('class1', 'class2')
    expect(result).toBe('class1 class2')
  })

  it('debe manejar clases condicionales', () => {
    const result = cn('base', true && 'conditional', false && 'ignored')
    expect(result).toBe('base conditional')
  })

  it('debe combinar Tailwind classes sin conflictos', () => {
    const result = cn('px-2 py-1', 'px-4')
    // twMerge debe resolver el conflicto, quedándose con px-4
    expect(result).toBe('py-1 px-4')
  })

  it('debe manejar undefined y null', () => {
    const result = cn('base', undefined, null, 'other')
    expect(result).toBe('base other')
  })

  it('debe manejar arrays de clases', () => {
    const result = cn(['class1', 'class2'], 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('debe retornar string vacío si no hay clases', () => {
    const result = cn()
    expect(result).toBe('')
  })
})
