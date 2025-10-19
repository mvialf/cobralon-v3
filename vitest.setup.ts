import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup después de cada test
afterEach(() => {
  cleanup()
})

// Mock de IntersectionObserver (usado por algunos componentes de Radix UI)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock de ResizeObserver (usado por react-resizable-panels)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock de window.matchMedia (usado por useMediaQuery y componentes responsive)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock de HTMLElement.prototype methods para Radix UI Popover/Select components
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  writable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  writable: true,
  value: vi.fn(),
})

// Mock de PointerEvent para testing de componentes con interacciones de pointer
class MockPointerEvent extends Event {
  button: number
  ctrlKey: boolean
  pointerType: string

  constructor(type: string, props: PointerEventInit) {
    super(type, props)
    this.button = props.button || 0
    this.ctrlKey = props.ctrlKey || false
    this.pointerType = props.pointerType || 'mouse'
  }
}

window.PointerEvent = MockPointerEvent as any
window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()

// Mock de DOMRect para componentes Radix UI que usan getBoundingClientRect
global.DOMRect = class DOMRect {
  bottom = 0
  left = 0
  right = 0
  top = 0
  x = 0
  y = 0
  height = 0
  width = 0

  constructor(x?: number, y?: number, width?: number, height?: number) {
    this.x = x || 0
    this.y = y || 0
    this.width = width || 0
    this.height = height || 0
    this.left = x || 0
    this.top = y || 0
    this.right = (x || 0) + (width || 0)
    this.bottom = (y || 0) + (height || 0)
  }

  toJSON() {
    return JSON.stringify(this)
  }
} as any

// Mock de getBoundingClientRect para elementos
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: () => '',
}))
