import { describe, it, expect } from 'vitest'
import {
  aftersaleSchema,
  formValuesToPayload,
  aftersaleToFormValues,
  type AftersaleFormValues,
  type Aftersale,
} from '../aftersale-validations'

describe('aftersaleSchema', () => {
  const validAftersale: AftersaleFormValues = {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    aftersaleStatusId: '550e8400-e29b-41d4-a716-446655440001',
    contactPhone: '+56912345678',
    description: 'Problema con instalación',
    reportedAt: new Date('2025-02-15'),
    tasks: [
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        text: 'Revisar instalación',
        completed: false,
      },
    ],
    // Campos de dirección
    street: 'Av. Providencia 1234',
    apartment: 'Depto 501',
    comuna: 'Providencia',
    region: '13',
  }

  describe('validación completa', () => {
    it('debe validar aftersale completo válido', () => {
      const result = aftersaleSchema.safeParse(validAftersale)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBe(validAftersale.projectId)
        expect(result.data.contactPhone).toBe('+56912345678')
        expect(result.data.tasks).toHaveLength(1)
      }
    })

    it('debe aceptar aftersale sin description', () => {
      const { description, ...aftersale } = validAftersale
      const result = aftersaleSchema.safeParse(aftersale)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('')
      }
    })

    it('debe aceptar aftersale con tasks array vacío', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        tasks: [],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tasks).toEqual([])
      }
    })
  })

  describe('validación de projectId', () => {
    it('debe aceptar UUID válido', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        projectId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar projectId inválido (no UUID)', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        projectId: 'invalid-id',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('proyecto válido')
      }
    })

    it('debe rechazar sin el campo projectId', () => {
      const { projectId, ...aftersale } = validAftersale
      const result = aftersaleSchema.safeParse(aftersale)

      expect(result.success).toBe(false)
    })
  })

  describe('validación de aftersaleStatusId', () => {
    it('debe aceptar UUID válido', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        aftersaleStatusId: '550e8400-e29b-41d4-a716-446655440088',
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar aftersaleStatusId inválido', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        aftersaleStatusId: 'invalid-id',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('estado válido')
      }
    })

    it('debe rechazar sin el campo aftersaleStatusId', () => {
      const { aftersaleStatusId, ...aftersale } = validAftersale
      const result = aftersaleSchema.safeParse(aftersale)

      expect(result.success).toBe(false)
    })
  })

  describe('validación de contactPhone (teléfono chileno)', () => {
    it('debe aceptar teléfono chileno válido con +56', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        contactPhone: '+56987654321',
      })

      expect(result.success).toBe(true)
    })

    it('debe normalizar teléfono sin +56', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        contactPhone: '912345678',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contactPhone).toBe('+56912345678')
      }
    })

    it('debe normalizar teléfono con espacios', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        contactPhone: '+56 9 1234 5678',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contactPhone).toBe('+56912345678')
      }
    })

    it('debe normalizar teléfono con guiones', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        contactPhone: '+56-9-1234-5678',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contactPhone).toBe('+56912345678')
      }
    })

    it('debe rechazar teléfono que comienza con 0', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        contactPhone: '+56012345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('teléfono chileno válido')
      }
    })

    it('debe rechazar teléfono que comienza con 1', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        contactPhone: '+56112345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('teléfono chileno válido')
      }
    })

    it('debe rechazar teléfono vacío', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        contactPhone: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatorio')
      }
    })

    it('debe rechazar sin el campo contactPhone', () => {
      const { contactPhone, ...aftersale } = validAftersale
      const result = aftersaleSchema.safeParse(aftersale)

      expect(result.success).toBe(false)
    })
  })

  describe('validación de description', () => {
    it('debe aceptar description corta', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        description: 'Descripción breve',
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar description de 1000 caracteres (límite)', () => {
      const descripcionLarga = 'A'.repeat(1000)
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        description: descripcionLarga,
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar description > 1000 caracteres', () => {
      const descripcionExcesiva = 'A'.repeat(1001)
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        description: descripcionExcesiva,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('1000 caracteres')
      }
    })

    it('debe aceptar description vacía', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        description: '',
      })

      expect(result.success).toBe(true)
    })

    it('debe trimear description con espacios', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        description: '  Descripción con espacios  ',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('Descripción con espacios')
      }
    })

    it('debe usar string vacío como default', () => {
      const { description, ...aftersale } = validAftersale
      const result = aftersaleSchema.safeParse(aftersale)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('')
      }
    })
  })

  describe('validación de reportedAt', () => {
    it('debe aceptar Date object', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        reportedAt: new Date('2025-12-31'),
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar fecha inválida', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        reportedAt: 'not-a-date',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Fecha inválida')
      }
    })

    it('debe rechazar sin el campo reportedAt', () => {
      const { reportedAt, ...aftersale } = validAftersale
      const result = aftersaleSchema.safeParse(aftersale)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('La fecha de reporte es obligatoria')
      }
    })
  })

  describe('validación de tasks', () => {
    it('debe aceptar tasks array vacío', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        tasks: [],
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar múltiples tasks', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        tasks: [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            text: 'Tarea 1',
            completed: false,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            text: 'Tarea 2',
            completed: true,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440004',
            text: 'Tarea 3',
            completed: false,
          },
        ],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tasks).toHaveLength(3)
      }
    })

    it('debe rechazar más de 50 tasks', () => {
      const muchasTasks = Array.from({ length: 51 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
        text: `Tarea ${i + 1}`,
        completed: false,
      }))

      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        tasks: muchasTasks,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('50 tareas')
      }
    })

    it('debe rechazar task sin text', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        tasks: [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            text: '',
            completed: false,
          },
        ],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('tarea no puede estar vacía')
      }
    })

    it('debe rechazar task con text > 200 caracteres', () => {
      const textoLargo = 'A'.repeat(201)
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        tasks: [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            text: textoLargo,
            completed: false,
          },
        ],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('200 caracteres')
      }
    })

    it('debe rechazar task con id inválido (no UUID)', () => {
      const result = aftersaleSchema.safeParse({
        ...validAftersale,
        tasks: [
          {
            id: 'invalid-id',
            text: 'Tarea válida',
            completed: false,
          },
        ],
      })

      expect(result.success).toBe(false)
    })
  })
})

describe('formValuesToPayload', () => {
  const validFormValues: AftersaleFormValues = {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    aftersaleStatusId: '550e8400-e29b-41d4-a716-446655440001',
    contactPhone: '+56912345678',
    description: 'Problema con instalación',
    reportedAt: new Date('2025-02-15T10:30:00Z'),
    tasks: [
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        text: 'Revisar instalación',
        completed: false,
      },
    ],
    // Campos de dirección
    street: 'Av. Providencia 1234',
    apartment: 'Depto 501',
    comuna: 'Providencia',
    region: '13',
  }

  it('debe convertir form values a payload API', () => {
    const payload = formValuesToPayload(validFormValues)

    expect(payload.projectId).toBe(validFormValues.projectId)
    expect(payload.aftersaleStatusId).toBe(validFormValues.aftersaleStatusId)
    expect(payload.contactPhone).toBe(validFormValues.contactPhone)
    expect(payload.description).toBe(validFormValues.description)
    expect(payload.reportedAt).toBe('2025-02-15T10:30:00.000Z')
    expect(payload.tasks).toEqual(validFormValues.tasks)
  })

  it('debe convertir Date a ISO string', () => {
    const payload = formValuesToPayload({
      ...validFormValues,
      reportedAt: new Date('2025-12-31T23:59:59Z'),
    })

    expect(typeof payload.reportedAt).toBe('string')
    expect(payload.reportedAt).toBe('2025-12-31T23:59:59.000Z')
  })

  it('debe incluir tasks vacíos', () => {
    const payload = formValuesToPayload({
      ...validFormValues,
      tasks: [],
    })

    expect(payload.tasks).toEqual([])
  })

  it('debe incluir description vacía', () => {
    const payload = formValuesToPayload({
      ...validFormValues,
      description: '',
    })

    expect(payload.description).toBe('')
  })
})

describe('aftersaleToFormValues', () => {
  const validAftersale: Aftersale = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    projectId: '550e8400-e29b-41d4-a716-446655440001',
    aftersaleStatusId: '550e8400-e29b-41d4-a716-446655440002',
    contactPhone: '+56912345678',
    description: 'Problema con instalación',
    reportedAt: new Date('2025-02-15'),
    tasks: [
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        text: 'Revisar instalación',
        completed: false,
      },
    ],
    createdAt: new Date('2025-02-10'),
    updatedAt: new Date('2025-02-14'),
    project: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      projectNumber: 'P-001',
      projectName: 'Proyecto Test',
      customer: {
        name: 'Cliente Test',
      },
      // Campos de dirección del proyecto
      street: 'Av. Providencia 1234',
      apartment: 'Depto 501',
      comuna: 'Providencia',
      region: 'Metropolitana de Santiago',
    },
    aftersaleStatus: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Pendiente',
      color: {
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-800',
      },
    },
  }

  it('debe convertir Aftersale a form values', () => {
    const formValues = aftersaleToFormValues(validAftersale)

    expect(formValues.projectId).toBe(validAftersale.projectId)
    expect(formValues.aftersaleStatusId).toBe(validAftersale.aftersaleStatusId)
    expect(formValues.contactPhone).toBe('+56912345678')
    expect(formValues.description).toBe(validAftersale.description)
    expect(formValues.reportedAt).toBeInstanceOf(Date)
    expect(formValues.tasks).toEqual(validAftersale.tasks)
  })

  it('debe normalizar contactPhone legacy (sin +56)', () => {
    const aftersaleConTelefonoLegacy = {
      ...validAftersale,
      contactPhone: '912345678',
    }

    const formValues = aftersaleToFormValues(aftersaleConTelefonoLegacy)

    expect(formValues.contactPhone).toBe('+56912345678')
  })

  it('debe normalizar contactPhone con espacios', () => {
    const aftersaleConEspacios = {
      ...validAftersale,
      contactPhone: '+56 9 1234 5678',
    }

    const formValues = aftersaleToFormValues(aftersaleConEspacios)

    expect(formValues.contactPhone).toBe('+56912345678')
  })

  it('debe manejar reportedAt como string ISO y convertir a Date', () => {
    const aftersaleConStringDate = {
      ...validAftersale,
      reportedAt: '2025-02-15T10:30:00Z' as any,
    }

    const formValues = aftersaleToFormValues(aftersaleConStringDate)

    expect(formValues.reportedAt).toBeInstanceOf(Date)
  })

  it('debe usar array vacío si no hay tasks', () => {
    const aftersaleSinTasks = {
      ...validAftersale,
      tasks: null as any,
    }

    const formValues = aftersaleToFormValues(aftersaleSinTasks)

    expect(formValues.tasks).toEqual([])
  })
})
