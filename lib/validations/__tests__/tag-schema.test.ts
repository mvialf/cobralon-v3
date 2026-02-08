import { describe, it, expect } from 'vitest'
import {
  baseTagSchema,
  baseTagWithOptionalAbbreviationSchema,
  generateAbbreviation,
  tagToFormValues,
  normalizeTagPayload,
  type BaseTag,
  type BaseTagFormValues,
} from '../common/tag-schema'

const validUUID = '123e4567-e89b-12d3-a456-426614174000'

const validInput: BaseTagFormValues = {
  name: 'Aluminio',
  abbreviation: 'AL',
  colorId: validUUID,
}

describe('baseTagSchema', () => {
  it('debe validar input completo válido', () => {
    const result = baseTagSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  describe('name', () => {
    it('debe rechazar name vacío', () => {
      const result = baseTagSchema.safeParse({ ...validInput, name: '' })
      expect(result.success).toBe(false)
    })

    it('debe rechazar name mayor a 50 caracteres', () => {
      const result = baseTagSchema.safeParse({
        ...validInput,
        name: 'A'.repeat(51),
      })
      expect(result.success).toBe(false)
    })

    it('debe hacer trim al name', () => {
      const result = baseTagSchema.safeParse({
        ...validInput,
        name: '  Aluminio  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Aluminio')
      }
    })
  })

  describe('abbreviation', () => {
    it('debe rechazar abbreviation de 1 caracter', () => {
      const result = baseTagSchema.safeParse({
        ...validInput,
        abbreviation: 'A',
      })
      expect(result.success).toBe(false)
    })

    it('debe rechazar abbreviation de 3 caracteres', () => {
      const result = baseTagSchema.safeParse({
        ...validInput,
        abbreviation: 'ALU',
      })
      expect(result.success).toBe(false)
    })

    it('debe convertir a uppercase', () => {
      const result = baseTagSchema.safeParse({
        ...validInput,
        abbreviation: 'al',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.abbreviation).toBe('AL')
      }
    })

    it('debe rechazar caracteres no alfabéticos', () => {
      const result = baseTagSchema.safeParse({
        ...validInput,
        abbreviation: 'A1',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('colorId', () => {
    it('debe rechazar colorId no UUID', () => {
      const result = baseTagSchema.safeParse({
        ...validInput,
        colorId: 'no-uuid',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('baseTagWithOptionalAbbreviationSchema', () => {
  it('debe aceptar sin abbreviation', () => {
    const { abbreviation, ...input } = validInput
    const result = baseTagWithOptionalAbbreviationSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('debe aceptar abbreviation de 1-2 chars', () => {
    const result = baseTagWithOptionalAbbreviationSchema.safeParse({
      ...validInput,
      abbreviation: 'A',
    })
    expect(result.success).toBe(true)
  })

  it('debe rechazar abbreviation mayor a 2 chars', () => {
    const result = baseTagWithOptionalAbbreviationSchema.safeParse({
      ...validInput,
      abbreviation: 'ALU',
    })
    expect(result.success).toBe(false)
  })
})

describe('generateAbbreviation', () => {
  it('debe tomar las primeras 2 letras en uppercase', () => {
    expect(generateAbbreviation('aluminio')).toBe('AL')
  })

  it('debe manejar 1 caracter con padding X', () => {
    expect(generateAbbreviation('A')).toBe('AX')
  })

  it('debe retornar string vacío para input vacío', () => {
    expect(generateAbbreviation('')).toBe('')
  })

  it('debe hacer trim antes de procesar', () => {
    expect(generateAbbreviation('  aluminio  ')).toBe('AL')
  })

  it('debe retornar vacío para solo espacios', () => {
    expect(generateAbbreviation('   ')).toBe('')
  })
})

describe('tagToFormValues', () => {
  it('debe extraer name, abbreviation y colorId', () => {
    const tag: BaseTag = {
      id: validUUID,
      name: 'Aluminio',
      abbreviation: 'AL',
      colorId: validUUID,
      color: {
        id: validUUID,
        name: 'blue',
        key: 'blue',
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-800',
      },
      order: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const formValues = tagToFormValues(tag)

    expect(formValues).toEqual({
      name: 'Aluminio',
      abbreviation: 'AL',
      colorId: validUUID,
    })
  })
})

describe('normalizeTagPayload', () => {
  it('debe usar abbreviation proporcionada', () => {
    const payload = normalizeTagPayload({
      name: 'Aluminio',
      abbreviation: 'AL',
      colorId: validUUID,
    })

    expect(payload.abbreviation).toBe('AL')
  })

  it('debe auto-generar abbreviation cuando no se proporciona', () => {
    const payload = normalizeTagPayload({
      name: 'Aluminio',
      colorId: validUUID,
    })

    expect(payload.abbreviation).toBe('AL')
  })

  it('debe auto-generar abbreviation cuando es string vacío', () => {
    const payload = normalizeTagPayload({
      name: 'Vidrio',
      abbreviation: '',
      colorId: validUUID,
    })

    expect(payload.abbreviation).toBe('VI')
  })
})
