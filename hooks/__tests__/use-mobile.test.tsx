import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../use-mobile'

describe('useIsMobile', () => {
  // Helper para simular cambio de ancho de ventana
  const _setWindowWidth = (width: number) => {
    global.innerWidth = width
    // Disparar evento resize
    act(() => {
      global.dispatchEvent(new Event('resize'))
    })
  }

  beforeEach(() => {
    // Configurar tamaño inicial de ventana desktop
    global.innerWidth = 1024
  })

  afterEach(() => {
    // Limpiar timers y listeners
    vi.clearAllTimers()
  })

  describe('Estado inicial', () => {
    it('debe retornar false en desktop (>= 768px)', () => {
      global.innerWidth = 1024
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(false)
    })

    it('debe retornar true en mobile (< 768px)', () => {
      global.innerWidth = 375
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(true)
    })

    it('debe retornar false exactamente en 768px (breakpoint)', () => {
      global.innerWidth = 768
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(false)
    })

    it('debe retornar true en 767px (justo antes del breakpoint)', () => {
      global.innerWidth = 767
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(true)
    })
  })

  // jsdom no simula correctamente los eventos 'change' de MediaQueryList
  it.todo('debe actualizarse cuando la ventana cambia de desktop a mobile (requiere browser real)')

  describe('Cleanup', () => {
    it('debe ejecutar cleanup al desmontarse', () => {
      const { unmount } = renderHook(() => useIsMobile())

      // Verificar que el hook se desmonta sin errores
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Tamaños de viewport comunes', () => {
    const testCases = [
      { width: 320, device: 'iPhone SE', expected: true },
      { width: 375, device: 'iPhone 12/13', expected: true },
      { width: 390, device: 'iPhone 14 Pro', expected: true },
      { width: 428, device: 'iPhone 14 Pro Max', expected: true },
      { width: 768, device: 'iPad (portrait)', expected: false },
      { width: 1024, device: 'iPad (landscape)', expected: false },
      { width: 1280, device: 'Laptop', expected: false },
      { width: 1920, device: 'Desktop', expected: false },
    ]

    testCases.forEach(({ width, device, expected }) => {
      it(`debe retornar ${expected} para ${device} (${width}px)`, () => {
        global.innerWidth = width
        const { result } = renderHook(() => useIsMobile())
        expect(result.current).toBe(expected)
      })
    })
  })

  describe('Integración con MediaQueryList', () => {
    it('debe usar matchMedia con breakpoint correcto', () => {
      const matchMediaSpy = vi.spyOn(window, 'matchMedia')

      renderHook(() => useIsMobile())

      expect(matchMediaSpy).toHaveBeenCalledWith('(max-width: 767px)')
    })
  })
})
