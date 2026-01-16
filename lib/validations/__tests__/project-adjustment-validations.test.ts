/**
 * Tests para lib/validations/project-adjustment-validations.ts
 *
 * Valida:
 * - createProjectAdjustmentSchema
 * - projectAdjustmentFormSchema
 * - ADJUSTMENT_REASONS constantes
 */

import { describe, it, expect } from 'vitest'
import {
  createProjectAdjustmentSchema,
  projectAdjustmentFormSchema,
  ADJUSTMENT_REASONS,
  defaultProjectAdjustmentValues,
} from '../project-adjustment-validations'

describe('createProjectAdjustmentSchema', () => {
  describe('amount', () => {
    it('debe aceptar monto positivo válido', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 50000,
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar monto 0', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 0,
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positivo')
      }
    })

    it('debe rechazar monto negativo', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: -1000,
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(false)
    })

    it('debe rechazar monto demasiado grande', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 9999999999.99, // > 999999999.99
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('grande')
      }
    })

    it('debe aceptar monto en el límite máximo', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 999999999.99,
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar monto decimal válido', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 12345.67,
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar sin monto', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('reason', () => {
    it('debe aceptar razón válida', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: 'Condonación de saldo menor',
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar razón vacía', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('requerida')
      }
    })

    it('debe rechazar sin razón', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
      })
      expect(result.success).toBe(false)
    })

    it('debe aceptar razón personalizada (Otro)', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: 'Ajuste especial por reclamo del cliente',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('description', () => {
    it('debe aceptar sin descripción', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar descripción vacía', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: 'Descuento comercial',
        description: '',
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar descripción null', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: 'Descuento comercial',
        description: null,
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar descripción con texto', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: 'Descuento comercial',
        description: 'Cliente preferencial con historial de pagos a tiempo',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('appliedAt', () => {
    it('debe aceptar sin fecha (usa default)', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar fecha válida como Date', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: 'Descuento comercial',
        appliedAt: new Date('2024-01-15'),
      })
      expect(result.success).toBe(true)
    })

    it('debe coercionar string a Date', () => {
      const result = createProjectAdjustmentSchema.safeParse({
        amount: 1000,
        reason: 'Descuento comercial',
        appliedAt: '2024-01-15',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.appliedAt).toBeInstanceOf(Date)
      }
    })
  })
})

describe('projectAdjustmentFormSchema', () => {
  describe('coerción de amount', () => {
    it('debe coercionar string a number', () => {
      const result = projectAdjustmentFormSchema.safeParse({
        amount: '50000',
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.amount).toBe(50000)
        expect(typeof result.data.amount).toBe('number')
      }
    })

    it('debe coercionar string decimal a number', () => {
      const result = projectAdjustmentFormSchema.safeParse({
        amount: '12345.67',
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.amount).toBe(12345.67)
      }
    })

    it('debe rechazar string no numérica', () => {
      const result = projectAdjustmentFormSchema.safeParse({
        amount: 'abc',
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validaciones idénticas al schema base', () => {
    it('debe rechazar monto 0', () => {
      const result = projectAdjustmentFormSchema.safeParse({
        amount: 0,
        reason: 'Descuento comercial',
      })
      expect(result.success).toBe(false)
    })

    it('debe rechazar razón vacía', () => {
      const result = projectAdjustmentFormSchema.safeParse({
        amount: 1000,
        reason: '',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('ADJUSTMENT_REASONS', () => {
  it('debe contener las 5 razones predefinidas', () => {
    expect(ADJUSTMENT_REASONS).toHaveLength(5)
  })

  it('debe incluir las razones esperadas', () => {
    expect(ADJUSTMENT_REASONS).toContain('Condonación de saldo menor')
    expect(ADJUSTMENT_REASONS).toContain('Descuento por pronto pago')
    expect(ADJUSTMENT_REASONS).toContain('Descuento comercial')
    expect(ADJUSTMENT_REASONS).toContain('Ajuste por error administrativo')
    expect(ADJUSTMENT_REASONS).toContain('Otro')
  })

  it('debe tener Otro como última opción', () => {
    expect(ADJUSTMENT_REASONS[ADJUSTMENT_REASONS.length - 1]).toBe('Otro')
  })
})

describe('defaultProjectAdjustmentValues', () => {
  it('debe tener valores por defecto apropiados', () => {
    expect(defaultProjectAdjustmentValues.amount).toBeUndefined()
    expect(defaultProjectAdjustmentValues.reason).toBe('')
    expect(defaultProjectAdjustmentValues.description).toBe('')
  })
})
