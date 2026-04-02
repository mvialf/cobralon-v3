/**
 * Tests para lib/validations/payment-method-validations.ts
 *
 * Valida:
 * - paymentMethodSchema con refine para cuotas
 * - formValuesToPayload helper
 * - methodToFormValues helper
 */

import { describe, it, expect } from 'vitest'
import {
  paymentMethodSchema,
  formValuesToPayload,
  methodToFormValues,
  type PaymentMethod,
  type PaymentMethodFormValues,
} from '../payment-method-validations'

describe('paymentMethodSchema', () => {
  describe('name', () => {
    it('debe aceptar nombre válido', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Efectivo',
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar nombre vacío', () => {
      const result = paymentMethodSchema.safeParse({
        name: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatorio')
      }
    })

    // NOTA: En Zod, trim() se aplica DESPUÉS de min().
    // Esto significa que '   ' pasa min(1) y luego se convierte a ''.
    // Es un edge case del schema actual - considerarlo para futuras mejoras.
    it('debe aceptar nombre con solo espacios (trim se aplica después de min)', () => {
      const result = paymentMethodSchema.safeParse({
        name: '   ',
      })
      // Comportamiento actual: acepta y convierte a ''
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('')
      }
    })

    it('debe rechazar nombre demasiado largo', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'a'.repeat(51),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('50')
      }
    })

    it('debe aceptar nombre en el límite (50 chars)', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'a'.repeat(50),
      })
      expect(result.success).toBe(true)
    })

    it('debe aplicar trim al nombre', () => {
      const result = paymentMethodSchema.safeParse({
        name: '  Efectivo  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Efectivo')
      }
    })
  })

  describe('icon', () => {
    it('debe aceptar sin icono', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Efectivo',
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar icono null', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Efectivo',
        icon: null,
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar icono válido', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Efectivo',
        icon: 'cash',
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar icono demasiado largo', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Efectivo',
        icon: 'a'.repeat(51),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('hasInstallments y maxInstallments (refine)', () => {
    it('debe aceptar sin cuotas (default)', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Efectivo',
        hasInstallments: false,
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar sin hasInstallments (undefined)', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Efectivo',
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar cuotas habilitadas con maxInstallments', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Tarjeta de Crédito',
        hasInstallments: true,
        maxInstallments: 12,
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar cuotas habilitadas sin maxInstallments', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Tarjeta de Crédito',
        hasInstallments: true,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cuotas')
        expect(result.error.issues[0].path).toContain('maxInstallments')
      }
    })

    it('debe rechazar cuotas habilitadas con maxInstallments null', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Tarjeta de Crédito',
        hasInstallments: true,
        maxInstallments: null,
      })
      expect(result.success).toBe(false)
    })

    it('debe rechazar maxInstallments menor a 2', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Tarjeta de Crédito',
        hasInstallments: true,
        maxInstallments: 1,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('2')
      }
    })

    it('debe rechazar maxInstallments mayor a 36', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Tarjeta de Crédito',
        hasInstallments: true,
        maxInstallments: 37,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('36')
      }
    })

    it('debe aceptar maxInstallments en límite mínimo (2)', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Tarjeta de Crédito',
        hasInstallments: true,
        maxInstallments: 2,
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar maxInstallments en límite máximo (36)', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Tarjeta de Crédito',
        hasInstallments: true,
        maxInstallments: 36,
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar maxInstallments decimal', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Tarjeta de Crédito',
        hasInstallments: true,
        maxInstallments: 12.5,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('entero')
      }
    })

    it('debe aceptar maxInstallments sin hasInstallments (sin efecto)', () => {
      const result = paymentMethodSchema.safeParse({
        name: 'Efectivo',
        hasInstallments: false,
        maxInstallments: 12,
      })
      expect(result.success).toBe(true)
    })
  })
})

describe('formValuesToPayload', () => {
  it('debe convertir valores básicos correctamente', () => {
    const values: PaymentMethodFormValues = {
      name: 'Efectivo',
      icon: null,
      hasInstallments: false,
      maxInstallments: null,
      commissionTiers: [],
    }

    const payload = formValuesToPayload(values)

    expect(payload.name).toBe('Efectivo')
    expect(payload.icon).toBeNull()
    expect(payload.hasInstallments).toBe(false)
    expect(payload.maxInstallments).toBeNull()
  })

  it('debe convertir valores con cuotas', () => {
    const values: PaymentMethodFormValues = {
      name: 'Tarjeta de Crédito',
      icon: 'credit-card',
      hasInstallments: true,
      maxInstallments: 12,
      commissionTiers: [],
    }

    const payload = formValuesToPayload(values)

    expect(payload.name).toBe('Tarjeta de Crédito')
    expect(payload.icon).toBe('credit-card')
    expect(payload.hasInstallments).toBe(true)
    expect(payload.maxInstallments).toBe(12)
  })

  it('debe convertir icon vacío a null', () => {
    const values: PaymentMethodFormValues = {
      name: 'Efectivo',
      icon: '',
      hasInstallments: false,
      maxInstallments: null,
      commissionTiers: [],
    }

    const payload = formValuesToPayload(values)

    expect(payload.icon).toBeNull()
  })

  it('debe convertir undefined hasInstallments a false', () => {
    const values: PaymentMethodFormValues = {
      name: 'Efectivo',
      icon: null,
      hasInstallments: undefined,
      maxInstallments: null,
      commissionTiers: [],
    }

    const payload = formValuesToPayload(values)

    expect(payload.hasInstallments).toBe(false)
  })

  it('debe convertir undefined maxInstallments a null', () => {
    const values: PaymentMethodFormValues = {
      name: 'Tarjeta',
      icon: null,
      hasInstallments: true,
      maxInstallments: undefined,
      commissionTiers: [],
    }

    const payload = formValuesToPayload(values)

    expect(payload.maxInstallments).toBeNull()
  })
})

describe('methodToFormValues', () => {
  it('debe convertir PaymentMethod a form values', () => {
    const method: PaymentMethod = {
      id: 'pm-1',
      name: 'Efectivo',
      active: true,
      order: 1,
      icon: 'cash',
      hasInstallments: false,
      maxInstallments: null,
      commissionTiers: [],
      _count: { payments: 10 },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const values = methodToFormValues(method)

    expect(values.name).toBe('Efectivo')
    expect(values.icon).toBe('cash')
    expect(values.hasInstallments).toBe(false)
    expect(values.maxInstallments).toBeNull()
  })

  it('debe preservar valores de cuotas', () => {
    const method: PaymentMethod = {
      id: 'pm-2',
      name: 'Tarjeta de Crédito',
      active: true,
      order: 2,
      icon: 'credit-card',
      hasInstallments: true,
      maxInstallments: 24,
      commissionTiers: [],
      _count: { payments: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const values = methodToFormValues(method)

    expect(values.hasInstallments).toBe(true)
    expect(values.maxInstallments).toBe(24)
  })

  it('debe manejar icon null', () => {
    const method: PaymentMethod = {
      id: 'pm-3',
      name: 'Transferencia',
      active: true,
      order: 3,
      icon: null,
      hasInstallments: false,
      maxInstallments: null,
      commissionTiers: [],
      _count: { payments: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const values = methodToFormValues(method)

    expect(values.icon).toBeNull()
  })
})

describe('roundtrip: method -> formValues -> payload', () => {
  it('debe preservar datos en conversión ida y vuelta', () => {
    const original: PaymentMethod = {
      id: 'pm-1',
      name: 'Tarjeta de Crédito',
      active: true,
      order: 1,
      icon: 'credit-card',
      hasInstallments: true,
      maxInstallments: 12,
      commissionTiers: [],
      _count: { payments: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const formValues = methodToFormValues(original)
    const payload = formValuesToPayload(formValues)

    expect(payload.name).toBe(original.name)
    expect(payload.icon).toBe(original.icon)
    expect(payload.hasInstallments).toBe(original.hasInstallments)
    expect(payload.maxInstallments).toBe(original.maxInstallments)
  })
})
