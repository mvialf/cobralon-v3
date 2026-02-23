import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  chilePhoneSchema,
  optionalChilePhoneSchema,
  addressFieldsSchema,
  addressFieldsOptionalStreetSchema,
  addressWithOptionalApartmentSchema,
  addressWithNullableApartmentSchema,
  addressWithNullableOnlyApartmentSchema,
  CHILE_PHONE_REGEX,
} from '../common'

describe('Phone Schemas', () => {
  describe('chilePhoneSchema (requerido)', () => {
    describe('validación exitosa', () => {
      it('debe aceptar teléfono móvil válido (+56912345678)', () => {
        const result = chilePhoneSchema.safeParse('+56912345678')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('+56912345678')
        }
      })

      it('debe aceptar teléfono fijo válido (+56223456789)', () => {
        const result = chilePhoneSchema.safeParse('+56223456789')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('+56223456789')
        }
      })

      it('debe aceptar todos los prefijos válidos (2-9)', () => {
        const validPrefixes = ['2', '3', '4', '5', '6', '7', '8', '9']

        validPrefixes.forEach((prefix) => {
          const result = chilePhoneSchema.safeParse(`+56${prefix}12345678`)
          expect(result.success).toBe(true)
        })
      })
    })

    describe('normalización automática', () => {
      it('debe normalizar teléfono sin +56', () => {
        const result = chilePhoneSchema.safeParse('912345678')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('+56912345678')
        }
      })

      it('debe normalizar teléfono con espacios', () => {
        const result = chilePhoneSchema.safeParse('+56 9 1234 5678')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('+56912345678')
        }
      })

      it('debe normalizar teléfono con guiones', () => {
        const result = chilePhoneSchema.safeParse('+56-9-1234-5678')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('+56912345678')
        }
      })

      it('debe normalizar teléfono con paréntesis', () => {
        const result = chilePhoneSchema.safeParse('+56 (9) 1234 5678')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('+56912345678')
        }
      })
    })

    describe('validación de errores', () => {
      it('debe rechazar teléfono vacío', () => {
        const result = chilePhoneSchema.safeParse('')

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('requerido')
        }
      })

      it('debe rechazar teléfono que comienza con 0', () => {
        const result = chilePhoneSchema.safeParse('+56012345678')

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('teléfono chileno válido')
        }
      })

      it('debe rechazar teléfono que comienza con 1', () => {
        const result = chilePhoneSchema.safeParse('+56112345678')

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('teléfono chileno válido')
        }
      })

      it('debe rechazar teléfono muy corto', () => {
        const result = chilePhoneSchema.safeParse('123')

        expect(result.success).toBe(false)
      })

      it('debe rechazar teléfono muy largo', () => {
        const result = chilePhoneSchema.safeParse('+569123456789999')

        expect(result.success).toBe(false)
      })

      it('debe rechazar teléfono con prefijo internacional no chileno', () => {
        const result = chilePhoneSchema.safeParse('+54911234567')

        expect(result.success).toBe(false)
      })
    })
  })

  describe('optionalChilePhoneSchema (opcional)', () => {
    describe('validación exitosa', () => {
      it('debe aceptar teléfono válido', () => {
        const result = optionalChilePhoneSchema.safeParse('+56912345678')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('+56912345678')
        }
      })

      it('debe aceptar undefined', () => {
        const result = optionalChilePhoneSchema.safeParse(undefined)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBeUndefined()
        }
      })

      it('debe aceptar string vacío y retornar undefined', () => {
        const result = optionalChilePhoneSchema.safeParse('')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBeUndefined()
        }
      })
    })

    describe('normalización automática', () => {
      it('debe normalizar teléfono sin +56', () => {
        const result = optionalChilePhoneSchema.safeParse('912345678')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('+56912345678')
        }
      })
    })

    describe('validación de errores', () => {
      it('debe rechazar teléfono inválido cuando hay valor', () => {
        const result = optionalChilePhoneSchema.safeParse('+56012345678')

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('teléfono chileno válido')
        }
      })
    })
  })

  describe('CHILE_PHONE_REGEX', () => {
    it('debe coincidir con teléfonos válidos', () => {
      expect(CHILE_PHONE_REGEX.test('+56912345678')).toBe(true)
      expect(CHILE_PHONE_REGEX.test('+56223456789')).toBe(true)
    })

    it('no debe coincidir con teléfonos inválidos', () => {
      expect(CHILE_PHONE_REGEX.test('+56012345678')).toBe(false)
      expect(CHILE_PHONE_REGEX.test('+54912345678')).toBe(false)
      expect(CHILE_PHONE_REGEX.test('912345678')).toBe(false)
    })
  })
})

describe('Address Schemas', () => {
  const validAddressBase = {
    street: 'Av. Providencia 1234',
    comuna: 'Providencia',
    region: 'Metropolitana',
  }

  describe('addressFieldsSchema (base)', () => {
    it('debe contener los campos esperados', () => {
      expect(addressFieldsSchema).toHaveProperty('street')
      expect(addressFieldsSchema).toHaveProperty('comuna')
      expect(addressFieldsSchema).toHaveProperty('region')
    })

    it('street debe ser requerido', () => {
      const schema = z.object(addressFieldsSchema)
      const result = schema.safeParse({ ...validAddressBase, street: '' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoria')
      }
    })

    it('comuna debe ser requerida', () => {
      const schema = z.object(addressFieldsSchema)
      const result = schema.safeParse({ ...validAddressBase, comuna: '' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoria')
      }
    })

    it('region debe ser requerida', () => {
      const schema = z.object(addressFieldsSchema)
      const result = schema.safeParse({ ...validAddressBase, region: '' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoria')
      }
    })
  })

  describe('addressFieldsOptionalStreetSchema (street opcional)', () => {
    const schema = z.object(addressFieldsOptionalStreetSchema)

    it('debe aceptar sin street (solo comuna + region)', () => {
      const result = schema.safeParse({
        comuna: 'Providencia',
        region: 'Metropolitana',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.street).toBe('')
      }
    })

    it('debe aceptar con street vacío', () => {
      const result = schema.safeParse({
        street: '',
        comuna: 'Providencia',
        region: 'Metropolitana',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.street).toBe('')
      }
    })

    it('debe aceptar con street lleno', () => {
      const result = schema.safeParse({
        street: 'Av. Providencia 1234',
        comuna: 'Providencia',
        region: 'Metropolitana',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.street).toBe('Av. Providencia 1234')
      }
    })

    it('comuna sigue siendo obligatorio', () => {
      const result = schema.safeParse({
        street: 'Av. Providencia 1234',
        region: 'Metropolitana',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('comuna')
      }
    })

    it('region sigue siendo obligatorio', () => {
      const result = schema.safeParse({
        street: 'Av. Providencia 1234',
        comuna: 'Providencia',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('region')
      }
    })
  })

  describe('addressWithOptionalApartmentSchema', () => {
    const schema = z.object(addressWithOptionalApartmentSchema)

    it('debe aceptar dirección completa con apartment', () => {
      const result = schema.safeParse({
        ...validAddressBase,
        apartment: 'Depto 501',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apartment).toBe('Depto 501')
      }
    })

    it('debe aceptar dirección sin apartment', () => {
      const result = schema.safeParse(validAddressBase)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apartment).toBeUndefined()
      }
    })

    it('debe aceptar apartment undefined', () => {
      const result = schema.safeParse({
        ...validAddressBase,
        apartment: undefined,
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar apartment vacío', () => {
      const result = schema.safeParse({
        ...validAddressBase,
        apartment: '',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apartment).toBe('')
      }
    })
  })

  describe('addressWithNullableApartmentSchema', () => {
    const schema = z.object(addressWithNullableApartmentSchema)

    it('debe aceptar apartment con valor', () => {
      const result = schema.safeParse({
        ...validAddressBase,
        apartment: 'Oficina 201',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apartment).toBe('Oficina 201')
      }
    })

    it('debe aceptar apartment null', () => {
      const result = schema.safeParse({
        ...validAddressBase,
        apartment: null,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apartment).toBeNull()
      }
    })

    it('debe aceptar apartment undefined', () => {
      const result = schema.safeParse({
        ...validAddressBase,
        apartment: undefined,
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar sin campo apartment', () => {
      const result = schema.safeParse(validAddressBase)

      expect(result.success).toBe(true)
    })
  })

  describe('addressWithNullableOnlyApartmentSchema', () => {
    const schema = z.object(addressWithNullableOnlyApartmentSchema)

    it('debe aceptar apartment con valor', () => {
      const result = schema.safeParse({
        ...validAddressBase,
        apartment: 'Local 3',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apartment).toBe('Local 3')
      }
    })

    it('debe aceptar apartment null', () => {
      const result = schema.safeParse({
        ...validAddressBase,
        apartment: null,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apartment).toBeNull()
      }
    })

    it('apartment es requerido (nullable pero no optional)', () => {
      const result = schema.safeParse(validAddressBase)

      // Sin el campo apartment, debería fallar porque es nullable pero no optional
      expect(result.success).toBe(false)
    })
  })

  describe('integración con schemas de validaciones', () => {
    it('addressWithOptionalApartmentSchema debe usarse en forms de creación', () => {
      // Simula uso en project-validations y visit-validations
      const createFormSchema = z.object({
        name: z.string(),
        ...addressWithOptionalApartmentSchema,
      })

      const result = createFormSchema.safeParse({
        name: 'Test Project',
        street: 'Calle Test 123',
        comuna: 'Santiago',
        region: 'Metropolitana',
      })

      expect(result.success).toBe(true)
    })

    it('addressWithNullableApartmentSchema debe usarse en forms de edición', () => {
      // Simula uso en aftersale-validations y visit-event-validations
      const editFormSchema = z.object({
        id: z.string(),
        ...addressWithNullableApartmentSchema,
      })

      const result = editFormSchema.safeParse({
        id: '123',
        street: 'Calle Editada 456',
        apartment: null, // Puede ser null desde la DB
        comuna: 'Ñuñoa',
        region: 'Metropolitana',
      })

      expect(result.success).toBe(true)
    })

    it('addressWithNullableOnlyApartmentSchema debe usarse en eventos de calendario', () => {
      // Simula uso en calendar-validations y aftersale-event-validations
      const eventSchema = z.object({
        scheduledDate: z.string(),
        ...addressWithNullableOnlyApartmentSchema,
      })

      const result = eventSchema.safeParse({
        scheduledDate: '2025-01-16',
        street: 'Av. Las Condes 789',
        apartment: null,
        comuna: 'Las Condes',
        region: 'Metropolitana',
      })

      expect(result.success).toBe(true)
    })
  })
})
