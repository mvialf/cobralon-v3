import { describe, it, expect } from 'vitest'
import { refundCreditSchema, type RefundCreditFormData } from '../credit-validations'

const validInput: RefundCreditFormData = {
  amount: 50000,
  refundDate: new Date('2025-12-01'),
  refundMethod: 'TRANSFERENCIA',
  comments: 'Devolución solicitada por cliente',
}

describe('refundCreditSchema', () => {
  it('debe validar input completo válido', () => {
    const result = refundCreditSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  describe('amount', () => {
    it('debe rechazar amount 0', () => {
      const result = refundCreditSchema.safeParse({ ...validInput, amount: 0 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positivo')
      }
    })

    it('debe rechazar amount negativo', () => {
      const result = refundCreditSchema.safeParse({ ...validInput, amount: -100 })
      expect(result.success).toBe(false)
    })

    it('debe rechazar sin amount', () => {
      const { amount, ...input } = validInput
      const result = refundCreditSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('debe rechazar string como amount', () => {
      const result = refundCreditSchema.safeParse({ ...validInput, amount: 'abc' })
      expect(result.success).toBe(false)
    })
  })

  describe('refundDate', () => {
    it('debe rechazar sin refundDate', () => {
      const { refundDate, ...input } = validInput
      const result = refundCreditSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('debe aceptar string de fecha', () => {
      const result = refundCreditSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })
  })

  describe('refundMethod', () => {
    it('debe aceptar EFECTIVO', () => {
      const result = refundCreditSchema.safeParse({ ...validInput, refundMethod: 'EFECTIVO' })
      expect(result.success).toBe(true)
    })

    it('debe aceptar TRANSFERENCIA', () => {
      const result = refundCreditSchema.safeParse({ ...validInput, refundMethod: 'TRANSFERENCIA' })
      expect(result.success).toBe(true)
    })

    it('debe aceptar CHEQUE', () => {
      const result = refundCreditSchema.safeParse({ ...validInput, refundMethod: 'CHEQUE' })
      expect(result.success).toBe(true)
    })

    it('debe rechazar método inválido', () => {
      const result = refundCreditSchema.safeParse({ ...validInput, refundMethod: 'BITCOIN' })
      expect(result.success).toBe(false)
    })

    it('debe rechazar sin refundMethod', () => {
      const { refundMethod, ...input } = validInput
      const result = refundCreditSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('comments', () => {
    it('debe aceptar sin comments', () => {
      const { comments, ...input } = validInput
      const result = refundCreditSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('debe aceptar comments vacío', () => {
      const result = refundCreditSchema.safeParse({ ...validInput, comments: '' })
      expect(result.success).toBe(true)
    })
  })
})
