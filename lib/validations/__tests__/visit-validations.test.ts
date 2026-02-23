import { describe, it, expect } from 'vitest'
import {
  createVisitSchema,
  updateVisitSchema,
  createVisitApiSchema,
  formValuesToPayload,
  visitToFormValues,
  type CreateVisitInput,
  type Visit,
} from '../visit-validations'

describe('createVisitSchema', () => {
  const validInput: CreateVisitInput = {
    name: 'Juan Pérez',
    phone: '+56912345678',
    street: 'Av. Providencia 123',
    apartment: 'Depto 45',
    comuna: 'Providencia',
    region: 'Región Metropolitana',
    visitStatusId: '123e4567-e89b-12d3-a456-426614174000',
    date: new Date('2025-12-01T10:00:00Z'),
    observations: 'Cliente prefiere mañana',
  }

  describe('campos requeridos', () => {
    it('debe validar input completo válido', () => {
      const result = createVisitSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('debe rechazar sin name', () => {
      const { name, ...input } = validInput
      const result = createVisitSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })

    it('debe rechazar name muy corto (< 3 caracteres)', () => {
      const result = createVisitSchema.safeParse({ ...validInput, name: 'AB' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos 3 caracteres')
      }
    })

    it('debe aceptar sin street (opcional)', () => {
      const { street, ...input } = validInput
      const result = createVisitSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.street).toBe('')
      }
    })

    it('debe rechazar sin comuna', () => {
      const { comuna, ...input } = validInput
      const result = createVisitSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('comuna')
      }
    })

    it('debe rechazar sin region', () => {
      const { region, ...input } = validInput
      const result = createVisitSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('region')
      }
    })

    it('debe rechazar sin visitStatusId', () => {
      const { visitStatusId, ...input } = validInput
      const result = createVisitSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('visitStatusId')
      }
    })

    it('debe rechazar sin date', () => {
      const { date, ...input } = validInput
      const result = createVisitSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('date')
      }
    })
  })

  describe('campos opcionales', () => {
    it('debe aceptar sin phone', () => {
      const { phone, ...input } = validInput
      const result = createVisitSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('debe aceptar sin apartment', () => {
      const { apartment, ...input } = validInput
      const result = createVisitSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('debe aceptar sin observations', () => {
      const { observations, ...input } = validInput
      const result = createVisitSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('validación de phone', () => {
    it('debe normalizar teléfono sin +56', () => {
      const result = createVisitSchema.safeParse({
        ...validInput,
        phone: '912345678',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('+56912345678')
      }
    })

    it('debe normalizar teléfono con espacios', () => {
      const result = createVisitSchema.safeParse({
        ...validInput,
        phone: '+56 9 1234 5678',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('+56912345678')
      }
    })

    it('debe rechazar teléfono inválido', () => {
      const result = createVisitSchema.safeParse({
        ...validInput,
        phone: '123', // Muy corto
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('teléfono chileno válido')
      }
    })

    it('debe rechazar teléfono con prefijo +56 y menos de 9 dígitos', () => {
      const result = createVisitSchema.safeParse({
        ...validInput,
        phone: '+5691234567', // 8 dígitos en lugar de 9
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validación de date', () => {
    it('debe aceptar Date object válido', () => {
      const result = createVisitSchema.safeParse({
        ...validInput,
        date: new Date('2025-12-01'),
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar fecha en el pasado', () => {
      const result = createVisitSchema.safeParse({
        ...validInput,
        date: new Date('2020-01-01'),
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar fecha en el futuro', () => {
      const result = createVisitSchema.safeParse({
        ...validInput,
        date: new Date('2030-12-31'),
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar string en lugar de Date', () => {
      const result = createVisitSchema.safeParse({
        ...validInput,
        date: '2025-12-01', // String en lugar de Date
      })
      expect(result.success).toBe(false)
    })

    it('debe rechazar Date inválido', () => {
      const result = createVisitSchema.safeParse({
        ...validInput,
        date: new Date('invalid'),
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('updateVisitSchema', () => {
  it('debe aceptar objeto vacío (todos los campos opcionales)', () => {
    const result = updateVisitSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('debe aceptar actualización parcial (solo name)', () => {
    const result = updateVisitSchema.safeParse({ name: 'Nuevo Nombre' })
    expect(result.success).toBe(true)
  })

  it('debe aceptar actualización parcial (solo date)', () => {
    const result = updateVisitSchema.safeParse({
      date: new Date('2025-12-15'),
    })
    expect(result.success).toBe(true)
  })

  it('debe validar name si está presente', () => {
    const result = updateVisitSchema.safeParse({ name: 'AB' }) // Muy corto
    expect(result.success).toBe(false)
  })

  it('debe validar phone si está presente', () => {
    const result = updateVisitSchema.safeParse({ phone: '123' }) // Inválido
    expect(result.success).toBe(false)
  })
})

describe('formValuesToPayload', () => {
  it('debe convertir Date a ISO string', () => {
    const input: CreateVisitInput = {
      name: 'Juan Pérez',
      street: 'Av. Providencia 123',
      comuna: 'Providencia',
      region: 'Región Metropolitana',
      visitStatusId: '123e4567-e89b-12d3-a456-426614174000',
      date: new Date('2025-12-01T10:00:00Z'),
    }

    const payload = formValuesToPayload(input)

    expect(payload.date).toBe('2025-12-01T10:00:00.000Z')
    expect(typeof payload.date).toBe('string')
  })

  it('debe preservar todos los campos requeridos', () => {
    const input: CreateVisitInput = {
      name: 'Juan Pérez',
      street: 'Av. Providencia 123',
      comuna: 'Providencia',
      region: 'Región Metropolitana',
      visitStatusId: '123e4567-e89b-12d3-a456-426614174000',
      date: new Date('2025-12-01T10:00:00Z'),
    }

    const payload = formValuesToPayload(input)

    expect(payload.name).toBe(input.name)
    expect(payload.street).toBe(input.street)
    expect(payload.comuna).toBe(input.comuna)
    expect(payload.region).toBe(input.region)
    expect(payload.visitStatusId).toBe(input.visitStatusId)
  })

  it('debe preservar campos opcionales', () => {
    const input: CreateVisitInput = {
      name: 'Juan Pérez',
      phone: '+56912345678',
      street: 'Av. Providencia 123',
      apartment: 'Depto 45',
      comuna: 'Providencia',
      region: 'Región Metropolitana',
      visitStatusId: '123e4567-e89b-12d3-a456-426614174000',
      date: new Date('2025-12-01T10:00:00Z'),
      observations: 'Cliente prefiere mañana',
    }

    const payload = formValuesToPayload(input)

    expect(payload.phone).toBe(input.phone)
    expect(payload.apartment).toBe(input.apartment)
    expect(payload.observations).toBe(input.observations)
  })

  it('debe manejar undefined en campos opcionales', () => {
    const input: CreateVisitInput = {
      name: 'Juan Pérez',
      street: 'Av. Providencia 123',
      comuna: 'Providencia',
      region: 'Región Metropolitana',
      visitStatusId: '123e4567-e89b-12d3-a456-426614174000',
      date: new Date('2025-12-01T10:00:00Z'),
    }

    const payload = formValuesToPayload(input)

    expect(payload.phone).toBeUndefined()
    expect(payload.apartment).toBeUndefined()
    expect(payload.observations).toBeUndefined()
  })
})

describe('visitToFormValues', () => {
  const mockVisit: Visit = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Juan Pérez',
    phone: '+56912345678',
    street: 'Av. Providencia 123',
    apartment: 'Depto 45',
    comuna: 'Providencia',
    region: 'Región Metropolitana',
    visitStatusId: '123e4567-e89b-12d3-a456-426614174001',
    date: new Date('2025-12-01T10:00:00Z'),
    scheduledTime: '10:30',
    observations: 'Cliente prefiere mañana',
    createdAt: new Date('2025-11-01T10:00:00Z'),
    updatedAt: new Date('2025-11-01T10:00:00Z'),
    visitStatus: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Agendada',
      isInitial: true,
      isFinal: false,
      color: {
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-800',
      },
    },
  }

  it('debe convertir Visit a CreateVisitInput', () => {
    const formValues = visitToFormValues(mockVisit)

    expect(formValues.name).toBe(mockVisit.name)
    expect(formValues.phone).toBe(mockVisit.phone)
    expect(formValues.street).toBe(mockVisit.street)
    expect(formValues.apartment).toBe(mockVisit.apartment)
    expect(formValues.comuna).toBe(mockVisit.comuna)
    expect(formValues.region).toBe(mockVisit.region)
    expect(formValues.visitStatusId).toBe(mockVisit.visitStatusId)
    expect(formValues.observations).toBe(mockVisit.observations)
  })

  it('debe convertir date a Date object', () => {
    const formValues = visitToFormValues(mockVisit)

    expect(formValues.date).toBeInstanceOf(Date)
    expect(formValues.date.toISOString()).toBe(mockVisit.date.toISOString())
  })

  it('debe manejar null en phone', () => {
    const visitWithoutPhone = { ...mockVisit, phone: null }
    const formValues = visitToFormValues(visitWithoutPhone)

    expect(formValues.phone).toBeUndefined()
  })

  it('debe manejar null en apartment', () => {
    const visitWithoutApartment = { ...mockVisit, apartment: null }
    const formValues = visitToFormValues(visitWithoutApartment)

    expect(formValues.apartment).toBeUndefined()
  })

  it('debe manejar null en observations', () => {
    const visitWithoutObservations = { ...mockVisit, observations: null }
    const formValues = visitToFormValues(visitWithoutObservations)

    expect(formValues.observations).toBeUndefined()
  })

  it('debe manejar null en street', () => {
    const visitWithoutStreet = { ...mockVisit, street: null }
    const formValues = visitToFormValues(visitWithoutStreet)

    expect(formValues.street).toBe('')
  })

  it('debe NO incluir campos de sistema (id, createdAt, updatedAt)', () => {
    const formValues = visitToFormValues(mockVisit) as any

    expect(formValues.id).toBeUndefined()
    expect(formValues.createdAt).toBeUndefined()
    expect(formValues.updatedAt).toBeUndefined()
    expect(formValues.visitStatus).toBeUndefined()
  })
})

describe('integración Form → API → Form', () => {
  it('debe mantener consistencia en ciclo completo', () => {
    // 1. Form values originales
    const originalFormValues: CreateVisitInput = {
      name: 'Juan Pérez',
      phone: '+56912345678',
      street: 'Av. Providencia 123',
      apartment: 'Depto 45',
      comuna: 'Providencia',
      region: 'Región Metropolitana',
      visitStatusId: '123e4567-e89b-12d3-a456-426614174000',
      date: new Date('2025-12-01T10:00:00Z'),
      observations: 'Cliente prefiere mañana',
    }

    // 2. Convertir a API payload
    const payload = formValuesToPayload(originalFormValues)
    expect(payload.date).toBe('2025-12-01T10:00:00.000Z')

    // 3. Simular respuesta de API (Visit object)
    const visitFromAPI: Visit = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: originalFormValues.name,
      phone: originalFormValues.phone || null,
      street: originalFormValues.street,
      apartment: originalFormValues.apartment || null,
      comuna: originalFormValues.comuna,
      region: originalFormValues.region,
      visitStatusId: originalFormValues.visitStatusId,
      date: new Date(payload.date), // API devuelve Date
      scheduledTime: null, // Hora agendada (opcional)
      observations: originalFormValues.observations || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      visitStatus: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Agendada',
        isInitial: true,
        isFinal: false,
        color: {
          bgClass: 'bg-blue-100',
          textClass: 'text-blue-800',
        },
      },
    }

    // 4. Convertir de vuelta a form values
    const formValuesFromAPI = visitToFormValues(visitFromAPI)

    // 5. Verificar que los datos son consistentes
    expect(formValuesFromAPI.name).toBe(originalFormValues.name)
    expect(formValuesFromAPI.phone).toBe(originalFormValues.phone)
    expect(formValuesFromAPI.street).toBe(originalFormValues.street)
    expect(formValuesFromAPI.apartment).toBe(originalFormValues.apartment)
    expect(formValuesFromAPI.comuna).toBe(originalFormValues.comuna)
    expect(formValuesFromAPI.region).toBe(originalFormValues.region)
    expect(formValuesFromAPI.visitStatusId).toBe(originalFormValues.visitStatusId)
    expect(formValuesFromAPI.observations).toBe(originalFormValues.observations)
    expect(formValuesFromAPI.date.toISOString()).toBe(originalFormValues.date.toISOString())
  })
})

describe('createVisitApiSchema', () => {
  const validApiInput = {
    name: 'Juan Pérez',
    phone: '+56912345678',
    street: 'Av. Providencia 123',
    apartment: 'Depto 45',
    comuna: 'Providencia',
    region: 'Región Metropolitana',
    visitStatusId: '123e4567-e89b-12d3-a456-426614174000',
    date: '2025-12-01T10:00:00.000Z',
    scheduledTime: '10:30',
    observations: 'Cliente prefiere mañana',
  }

  it('debe validar input completo válido', () => {
    const result = createVisitApiSchema.safeParse(validApiInput)
    expect(result.success).toBe(true)
  })

  it('debe rechazar name muy corto (< 3 caracteres)', () => {
    const result = createVisitApiSchema.safeParse({ ...validApiInput, name: 'AB' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('al menos 3 caracteres')
    }
  })

  describe('date como string', () => {
    it('debe aceptar ISO string datetime válido', () => {
      const result = createVisitApiSchema.safeParse(validApiInput)
      expect(result.success).toBe(true)
    })

    it('debe rechazar string no datetime', () => {
      const result = createVisitApiSchema.safeParse({
        ...validApiInput,
        date: 'not-a-date',
      })
      expect(result.success).toBe(false)
    })

    it('debe rechazar Date object (solo acepta string)', () => {
      const result = createVisitApiSchema.safeParse({
        ...validApiInput,
        date: new Date('2025-12-01'),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('phone', () => {
    it('debe aceptar sin phone', () => {
      const { phone, ...input } = validApiInput
      const result = createVisitApiSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('debe normalizar teléfono sin prefijo', () => {
      const result = createVisitApiSchema.safeParse({
        ...validApiInput,
        phone: '912345678',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('+56912345678')
      }
    })
  })

  describe('dirección', () => {
    it('debe aceptar sin street (opcional)', () => {
      const { street, ...input } = validApiInput
      const result = createVisitApiSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.street).toBe('')
      }
    })

    it('debe rechazar sin comuna', () => {
      const { comuna, ...input } = validApiInput
      const result = createVisitApiSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('debe rechazar sin region', () => {
      const { region, ...input } = validApiInput
      const result = createVisitApiSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('debe aceptar sin apartment', () => {
      const { apartment, ...input } = validApiInput
      const result = createVisitApiSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('scheduledTime', () => {
    it('debe aceptar formato HH:mm válido', () => {
      const result = createVisitApiSchema.safeParse({
        ...validApiInput,
        scheduledTime: '14:30',
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar sin scheduledTime', () => {
      const { scheduledTime, ...input } = validApiInput
      const result = createVisitApiSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('debe rechazar formato inválido', () => {
      const result = createVisitApiSchema.safeParse({
        ...validApiInput,
        scheduledTime: '25:00',
      })
      expect(result.success).toBe(false)
    })
  })

  it('debe rechazar sin visitStatusId', () => {
    const { visitStatusId, ...input } = validApiInput
    const result = createVisitApiSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})
