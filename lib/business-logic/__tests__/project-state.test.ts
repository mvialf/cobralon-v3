import { describe, it, expect } from 'vitest'
import { calculateProjectState, matchesProjectState } from '../project-state'

describe('calculateProjectState', () => {
  describe('estado "Finalizado"', () => {
    it('debe retornar "Finalizado" cuando balance=0 y isFinal=true', () => {
      const result = calculateProjectState(0, true)

      expect(result).toBe('Finalizado')
    })

    it('debe retornar "Finalizado" con balance 0.00 (float)', () => {
      const result = calculateProjectState(0.0, true)

      expect(result).toBe('Finalizado')
    })
  })

  describe('estado "Activo"', () => {
    it('debe retornar "Activo" cuando balance > 0 (con deuda)', () => {
      const result = calculateProjectState(1000, true)

      expect(result).toBe('Activo')
    })

    it('debe retornar "Activo" cuando isFinal=false (proyecto en progreso)', () => {
      const result = calculateProjectState(0, false)

      expect(result).toBe('Activo')
    })

    it('debe retornar "Activo" cuando balance > 0 y isFinal=false', () => {
      const result = calculateProjectState(5000, false)

      expect(result).toBe('Activo')
    })

    it('debe retornar "Activo" cuando isFinal=null', () => {
      const result = calculateProjectState(0, null)

      expect(result).toBe('Activo')
    })

    it('debe retornar "Activo" cuando isFinal=undefined', () => {
      const result = calculateProjectState(0, undefined)

      expect(result).toBe('Activo')
    })
  })

  describe('edge cases', () => {
    it('debe manejar balance negativo (crédito a favor) como "Activo"', () => {
      // Balance negativo significa que el cliente tiene crédito a favor
      const result = calculateProjectState(-500, true)

      expect(result).toBe('Activo')
    })

    it('debe manejar balances muy grandes', () => {
      const result = calculateProjectState(999999999, true)

      expect(result).toBe('Activo')
    })

    it('debe manejar balances decimales exactos', () => {
      const result = calculateProjectState(0.01, true)

      expect(result).toBe('Activo')
    })

    it('debe manejar balance 0 con múltiples decimales (.00)', () => {
      const result = calculateProjectState(0.0, true)

      expect(result).toBe('Finalizado')
    })
  })

  describe('casos de negocio', () => {
    it('proyecto completado con deuda pendiente', () => {
      const balance = 250000
      const isFinal = true

      const result = calculateProjectState(balance, isFinal)

      expect(result).toBe('Activo')
    })

    it('proyecto en progreso totalmente pagado por adelantado', () => {
      const balance = 0
      const isFinal = false

      const result = calculateProjectState(balance, isFinal)

      expect(result).toBe('Activo')
    })

    it('proyecto completado y pagado completamente', () => {
      const balance = 0
      const isFinal = true

      const result = calculateProjectState(balance, isFinal)

      expect(result).toBe('Finalizado')
    })
  })
})

describe('matchesProjectState', () => {
  describe('filtro "all" (sin filtro)', () => {
    it('debe incluir proyecto finalizado', () => {
      const result = matchesProjectState(0, true, 'all')

      expect(result).toBe(true)
    })

    it('debe incluir proyecto activo', () => {
      const result = matchesProjectState(1000, false, 'all')

      expect(result).toBe(true)
    })

    it('debe incluir proyecto con cualquier combinación', () => {
      expect(matchesProjectState(0, false, 'all')).toBe(true)
      expect(matchesProjectState(500, true, 'all')).toBe(true)
      expect(matchesProjectState(-100, null, 'all')).toBe(true)
    })
  })

  describe('filtro "Activo"', () => {
    it('debe incluir proyecto con deuda', () => {
      const result = matchesProjectState(1000, true, 'Activo')

      expect(result).toBe(true)
    })

    it('debe incluir proyecto en progreso', () => {
      const result = matchesProjectState(0, false, 'Activo')

      expect(result).toBe(true)
    })

    it('debe incluir proyecto con isFinal=null', () => {
      const result = matchesProjectState(0, null, 'Activo')

      expect(result).toBe(true)
    })

    it('debe EXCLUIR proyecto finalizado', () => {
      const result = matchesProjectState(0, true, 'Activo')

      expect(result).toBe(false)
    })
  })

  describe('filtro "Finalizado"', () => {
    it('debe incluir proyecto finalizado', () => {
      const result = matchesProjectState(0, true, 'Finalizado')

      expect(result).toBe(true)
    })

    it('debe EXCLUIR proyecto con deuda', () => {
      const result = matchesProjectState(1000, true, 'Finalizado')

      expect(result).toBe(false)
    })

    it('debe EXCLUIR proyecto en progreso', () => {
      const result = matchesProjectState(0, false, 'Finalizado')

      expect(result).toBe(false)
    })

    it('debe EXCLUIR proyecto con isFinal=null', () => {
      const result = matchesProjectState(0, null, 'Finalizado')

      expect(result).toBe(false)
    })
  })

  describe('casos de negocio', () => {
    it('filtrar solo proyectos activos con deuda', () => {
      const proyectos = [
        { balance: 1000, isFinal: true }, // Activo (deuda)
        { balance: 0, isFinal: true }, // Finalizado
        { balance: 0, isFinal: false }, // Activo (en progreso)
        { balance: 500, isFinal: false }, // Activo (deuda + en progreso)
      ]

      const activos = proyectos.filter((p) => matchesProjectState(p.balance, p.isFinal, 'Activo'))

      expect(activos).toHaveLength(3)
    })

    it('filtrar solo proyectos finalizados', () => {
      const proyectos = [
        { balance: 1000, isFinal: true },
        { balance: 0, isFinal: true }, // ✅ Único finalizado
        { balance: 0, isFinal: false },
      ]

      const finalizados = proyectos.filter((p) =>
        matchesProjectState(p.balance, p.isFinal, 'Finalizado')
      )

      expect(finalizados).toHaveLength(1)
      expect(finalizados[0].balance).toBe(0)
      expect(finalizados[0].isFinal).toBe(true)
    })

    it('no filtrar cuando se selecciona "all"', () => {
      const proyectos = [
        { balance: 1000, isFinal: true },
        { balance: 0, isFinal: true },
        { balance: 0, isFinal: false },
        { balance: 500, isFinal: false },
      ]

      const todos = proyectos.filter((p) => matchesProjectState(p.balance, p.isFinal, 'all'))

      expect(todos).toHaveLength(4)
    })
  })
})
