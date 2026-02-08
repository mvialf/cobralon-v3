import { describe, it, expect } from 'vitest'
import {
  baseStatusSchema,
  formValuesToPayload,
  statusToFormValues,
  type BaseStatus,
  type BaseStatusFormValues,
} from '../base-status-validations'

const validUUID = '123e4567-e89b-12d3-a456-426614174000'

const validInput: BaseStatusFormValues = {
  name: 'En Progreso',
  colorId: validUUID,
}

describe('baseStatusSchema', () => {
  it('debe validar input completo válido', () => {
    const result = baseStatusSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  describe('name', () => {
    it('debe rechazar name vacío', () => {
      const result = baseStatusSchema.safeParse({ ...validInput, name: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })

    it('debe rechazar sin name', () => {
      const { name, ...input } = validInput
      const result = baseStatusSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('debe rechazar name mayor a 50 caracteres', () => {
      const result = baseStatusSchema.safeParse({
        ...validInput,
        name: 'A'.repeat(51),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('50 caracteres')
      }
    })

    it('debe aceptar name de exactamente 50 caracteres', () => {
      const result = baseStatusSchema.safeParse({
        ...validInput,
        name: 'A'.repeat(50),
      })
      expect(result.success).toBe(true)
    })

    it('debe hacer trim al name', () => {
      const result = baseStatusSchema.safeParse({
        ...validInput,
        name: '  En Progreso  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('En Progreso')
      }
    })

    it('debe aceptar caracteres especiales (ñ, tildes)', () => {
      const result = baseStatusSchema.safeParse({
        ...validInput,
        name: 'Año Ñuñoa Último',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('colorId', () => {
    it('debe rechazar sin colorId', () => {
      const { colorId, ...input } = validInput
      const result = baseStatusSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('debe rechazar colorId no UUID', () => {
      const result = baseStatusSchema.safeParse({
        ...validInput,
        colorId: 'no-es-uuid',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('color válido')
      }
    })

    it('debe aceptar UUID válido', () => {
      const result = baseStatusSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })
  })
})

describe('formValuesToPayload', () => {
  it('debe convertir form values a payload con isInitial/isFinal', () => {
    const payload = formValuesToPayload(validInput, true, false)

    expect(payload).toEqual({
      name: 'En Progreso',
      colorId: validUUID,
      isInitial: true,
      isFinal: false,
    })
  })

  it('debe manejar isFinal=true', () => {
    const payload = formValuesToPayload(validInput, false, true)

    expect(payload.isInitial).toBe(false)
    expect(payload.isFinal).toBe(true)
  })
})

describe('statusToFormValues', () => {
  it('debe extraer name y colorId de un status completo', () => {
    const status: BaseStatus = {
      id: validUUID,
      name: 'Completado',
      order: 3,
      colorId: validUUID,
      color: {
        id: validUUID,
        name: 'green',
        key: 'green',
        bgClass: 'bg-green-100',
        textClass: 'text-green-800',
      },
      isInitial: false,
      isFinal: true,
      isActive: true,
      _count: { projects: 5 },
    }

    const formValues = statusToFormValues(status)

    expect(formValues).toEqual({
      name: 'Completado',
      colorId: validUUID,
    })
  })
})
