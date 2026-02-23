import { describe, it, expect } from 'vitest'
import {
  projectFormSchema,
  projectSchema,
  projectFormToPayload,
  projectStateValues,
  type ProjectFormData,
  type ProjectData,
} from '../project-validations'

describe('projectFormSchema', () => {
  const validInput: ProjectFormData = {
    customerId: '123e4567-e89b-12d3-a456-426614174000',
    projectNumber: 'PROJ-2025-001',
    projectName: 'Instalación Ventanas',
    phone: '+56912345678',
    street: 'Av. Providencia 123',
    apartment: 'Depto 45',
    comuna: 'Providencia',
    region: '13', // ✅ Formato canonical (código de región)
    projectStatusId: '123e4567-e89b-12d3-a456-426614174001',
    date: new Date('2025-12-01T10:00:00Z'),
    subtotal: 1000000,
    taxRate: 19,
    currency: 'CLP',
    windowsCount: 5,
    squareMeters: 25.5,
    description: 'Proyecto de ventanas nuevas',
    uninstallTagIds: [
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
    ],
  }

  describe('campos requeridos', () => {
    it('debe validar input completo válido', () => {
      const result = projectFormSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('debe rechazar sin customerId', () => {
      const { customerId, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('customerId')
      }
    })

    it('debe rechazar sin projectNumber', () => {
      const { projectNumber, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('projectNumber')
      }
    })

    it('debe rechazar sin phone', () => {
      const { phone, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('phone')
      }
    })

    it('debe aceptar sin street (opcional)', () => {
      const { street, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.street).toBe('')
      }
    })

    it('debe aceptar con street lleno', () => {
      const result = projectFormSchema.safeParse(validInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.street).toBe('Av. Providencia 123')
      }
    })

    it('debe rechazar sin comuna', () => {
      const { comuna, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('comuna')
      }
    })

    it('debe rechazar sin region', () => {
      const { region, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('region')
      }
    })

    it('debe rechazar sin projectStatusId', () => {
      const { projectStatusId, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('projectStatusId')
      }
    })

    it('debe rechazar sin date', () => {
      const { date, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('date')
      }
    })

    it('debe rechazar sin subtotal', () => {
      const { subtotal, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('subtotal')
      }
    })
  })

  describe('campos opcionales', () => {
    it('debe aceptar sin projectName', () => {
      const { projectName, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('debe aceptar sin apartment', () => {
      const { apartment, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('debe aceptar sin description', () => {
      const { description, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('valores por defecto', () => {
    it('debe usar taxRate = 19 por defecto', () => {
      const { taxRate, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.taxRate).toBe(19)
      }
    })

    it('debe usar currency = CLP por defecto', () => {
      const { currency, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.currency).toBe('CLP')
      }
    })

    it('debe usar windowsCount = 0 por defecto', () => {
      const { windowsCount, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.windowsCount).toBe(0)
      }
    })

    it('debe usar squareMeters = 0 por defecto', () => {
      const { squareMeters, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.squareMeters).toBe(0)
      }
    })

    it('debe usar uninstallTagIds = [] por defecto', () => {
      const { uninstallTagIds, ...input } = validInput
      const result = projectFormSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.uninstallTagIds).toEqual([])
      }
    })
  })

  describe('validación de phone', () => {
    it('debe normalizar teléfono sin +56', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        phone: '912345678',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('+56912345678')
      }
    })

    it('debe normalizar teléfono con espacios', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        phone: '+56 9 1234 5678',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('+56912345678')
      }
    })

    it('debe rechazar teléfono inválido', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        phone: '123', // Muy corto
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('teléfono chileno válido')
      }
    })

    it('debe rechazar teléfono vacío', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        phone: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('requerido')
      }
    })
  })

  describe('validación de date', () => {
    it('debe aceptar Date object válido', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        date: new Date('2025-12-01'),
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar fecha en el pasado', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        date: new Date('2020-01-01'),
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar fecha en el futuro', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        date: new Date('2030-12-31'),
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar string en lugar de Date', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        date: '2025-12-01', // String en lugar de Date
      })
      expect(result.success).toBe(false)
    })

    it('debe rechazar Date inválido', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        date: new Date('invalid'),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validación de subtotal', () => {
    it('debe aceptar subtotal positivo', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        subtotal: 1000000,
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar subtotal cero', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        subtotal: 0,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mayor a 0')
      }
    })

    it('debe rechazar subtotal negativo', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        subtotal: -100,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mayor a 0')
      }
    })

    it('debe rechazar string como subtotal', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        subtotal: '1000000',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validación de taxRate', () => {
    it('debe aceptar 0%', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        taxRate: 0,
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar 19%', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        taxRate: 19,
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar 100%', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        taxRate: 100,
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar negativo', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        taxRate: -1,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no puede ser negativo')
      }
    })

    it('debe rechazar mayor a 100', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        taxRate: 101,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no puede ser mayor a 100')
      }
    })
  })

  describe('validación de currency', () => {
    it('debe aceptar CLP', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        currency: 'CLP',
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar USD', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        currency: 'USD',
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar código de 2 letras', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        currency: 'US',
      })
      expect(result.success).toBe(false)
    })

    it('debe rechazar código de 4 letras', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        currency: 'CLPP',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validación de windowsCount', () => {
    it('debe aceptar 0', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        windowsCount: 0,
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar número positivo', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        windowsCount: 10,
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar número negativo', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        windowsCount: -1,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no pueden ser negativos')
      }
    })

    it('debe rechazar decimal', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        windowsCount: 5.5,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('número entero')
      }
    })
  })

  describe('validación de squareMeters', () => {
    it('debe aceptar 0', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        squareMeters: 0,
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar número positivo', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        squareMeters: 25.5,
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar decimal', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        squareMeters: 25.75,
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar número negativo', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        squareMeters: -1,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no pueden ser negativos')
      }
    })
  })

  describe('validación de uninstallTagIds', () => {
    it('debe aceptar array vacío', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        uninstallTagIds: [],
      })
      expect(result.success).toBe(true)
    })

    it('debe aceptar array con UUIDs válidos', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        uninstallTagIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      })
      expect(result.success).toBe(true)
    })

    it('debe rechazar array con strings no-UUID', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        uninstallTagIds: ['not-a-uuid', 'another-invalid'],
      })
      expect(result.success).toBe(false)
    })

    it('debe rechazar string en lugar de array', () => {
      const result = projectFormSchema.safeParse({
        ...validInput,
        uninstallTagIds: 'tag-123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('backward compatibility: nombres de regiones', () => {
    it('debe aceptar códigos de región (formato canonical)', () => {
      const dataWithCode = {
        ...validInput,
        region: '13',
      }

      const result = projectFormSchema.safeParse(dataWithCode)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.region).toBe('13')
      }
    })

    it('debe aceptar nombres completos de regiones (backward compatibility)', () => {
      const dataWithFullName = {
        ...validInput,
        region: 'Región Metropolitana de Santiago',
      }

      const result = projectFormSchema.safeParse(dataWithFullName)
      expect(result.success).toBe(true)
      if (result.success) {
        // Nombres se aceptan sin conversión en validación
        // La conversión ocurre en el parser (normalizeRegionValue)
        expect(result.data.region).toBe('Región Metropolitana de Santiago')
      }
    })

    it('debe aceptar nombres cortos de regiones', () => {
      const dataWithShortName = {
        ...validInput,
        region: 'Metropolitana',
      }

      const result = projectFormSchema.safeParse(dataWithShortName)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.region).toBe('Metropolitana')
      }
    })

    it('debe aceptar nombres sin acentos (edge case de imports)', () => {
      const dataWithoutAccent = {
        ...validInput,
        region: 'Región de Valparaiso', // sin tilde
      }

      const result = projectFormSchema.safeParse(dataWithoutAccent)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.region).toBe('Región de Valparaiso')
      }
    })
  })
})

describe('projectSchema', () => {
  const validProjectData: ProjectData = {
    customerId: '123e4567-e89b-12d3-a456-426614174000',
    projectNumber: 'PROJ-2025-001',
    projectName: 'Instalación Ventanas',
    phone: '+56912345678',
    street: 'Av. Providencia 123',
    apartment: 'Depto 45',
    comuna: 'Providencia',
    region: '13', // ✅ Formato canonical (código de región)
    projectStatusId: '123e4567-e89b-12d3-a456-426614174001',
    date: new Date('2025-12-01T10:00:00Z'),
    subtotal: 1000000,
    taxRate: 19,
    totalAmount: 1190000, // subtotal + (subtotal * taxRate / 100)
    currency: 'CLP',
    windowsCount: 5,
    squareMeters: 25.5,
    description: 'Proyecto de ventanas nuevas',
    uninstallTagIds: [
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
    ],
  }

  it('debe validar ProjectData con totalAmount', () => {
    const result = projectSchema.safeParse(validProjectData)
    expect(result.success).toBe(true)
  })

  it('debe rechazar sin totalAmount', () => {
    const { totalAmount, ...input } = validProjectData
    const result = projectSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('totalAmount')
    }
  })

  it('debe rechazar totalAmount cero', () => {
    const result = projectSchema.safeParse({
      ...validProjectData,
      totalAmount: 0,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('mayor a 0')
    }
  })

  it('debe rechazar totalAmount negativo', () => {
    const result = projectSchema.safeParse({
      ...validProjectData,
      totalAmount: -100,
    })
    expect(result.success).toBe(false)
  })
})

describe('projectFormToPayload', () => {
  const projectData: ProjectData = {
    customerId: '123e4567-e89b-12d3-a456-426614174000',
    projectNumber: 'PROJ-2025-001',
    projectName: 'Instalación Ventanas',
    phone: '+56912345678',
    street: 'Av. Providencia 123',
    apartment: 'Depto 45',
    comuna: 'Providencia',
    region: 'Región Metropolitana',
    projectStatusId: '123e4567-e89b-12d3-a456-426614174001',
    date: new Date('2025-12-01T10:00:00Z'),
    subtotal: 1000000,
    taxRate: 19,
    totalAmount: 1190000,
    currency: 'CLP',
    windowsCount: 5,
    squareMeters: 25.5,
    description: 'Proyecto de ventanas nuevas',
    uninstallTagIds: [
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
    ],
  }

  it('debe convertir Date a ISO string', () => {
    const payload = projectFormToPayload(projectData)

    expect(payload.date).toBe('2025-12-01T10:00:00.000Z')
    expect(typeof payload.date).toBe('string')
  })

  it('debe preservar todos los campos', () => {
    const payload = projectFormToPayload(projectData)

    expect(payload.customerId).toBe(projectData.customerId)
    expect(payload.projectNumber).toBe(projectData.projectNumber)
    expect(payload.projectName).toBe(projectData.projectName)
    expect(payload.phone).toBe(projectData.phone)
    expect(payload.street).toBe(projectData.street)
    expect(payload.apartment).toBe(projectData.apartment)
    expect(payload.comuna).toBe(projectData.comuna)
    expect(payload.region).toBe(projectData.region)
    expect(payload.projectStatusId).toBe(projectData.projectStatusId)
    expect(payload.subtotal).toBe(projectData.subtotal)
    expect(payload.taxRate).toBe(projectData.taxRate)
    expect(payload.totalAmount).toBe(projectData.totalAmount)
    expect(payload.currency).toBe(projectData.currency)
    expect(payload.windowsCount).toBe(projectData.windowsCount)
    expect(payload.squareMeters).toBe(projectData.squareMeters)
    expect(payload.description).toBe(projectData.description)
    expect(payload.uninstallTagIds).toEqual(projectData.uninstallTagIds)
  })

  it('debe manejar campos opcionales undefined', () => {
    const minimalProjectData: ProjectData = {
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      projectNumber: 'PROJ-2025-001',
      phone: '+56912345678',
      street: 'Av. Providencia 123',
      comuna: 'Providencia',
      region: 'Región Metropolitana', // ⚠️ Backward compatibility: nombres aún funcionan
      projectStatusId: '123e4567-e89b-12d3-a456-426614174001',
      date: new Date('2025-12-01T10:00:00Z'),
      subtotal: 1000000,
      taxRate: 19,
      totalAmount: 1190000,
      currency: 'CLP',
      windowsCount: 0,
      squareMeters: 0,
      uninstallTagIds: [],
    }

    const payload = projectFormToPayload(minimalProjectData)

    expect(payload.projectName).toBeUndefined()
    expect(payload.apartment).toBeUndefined()
    expect(payload.description).toBeUndefined()
  })

  it('debe preservar arrays vacíos', () => {
    const projectWithEmptyTags = {
      ...projectData,
      uninstallTagIds: [],
    }

    const payload = projectFormToPayload(projectWithEmptyTags)

    expect(payload.uninstallTagIds).toEqual([])
  })
})

describe('integración completa', () => {
  it('debe mantener consistencia en flujo Form → API', () => {
    // 1. Form values originales (sin totalAmount)
    const formData: ProjectFormData = {
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      projectNumber: 'PROJ-2025-001',
      projectName: 'Instalación Ventanas',
      phone: '+56912345678',
      street: 'Av. Providencia 123',
      apartment: 'Depto 45',
      comuna: 'Providencia',
      region: '13', // ✅ Formato canonical (código de región)
      projectStatusId: '123e4567-e89b-12d3-a456-426614174001',
      date: new Date('2025-12-01T10:00:00Z'),
      subtotal: 1000000,
      taxRate: 19,
      currency: 'CLP',
      windowsCount: 5,
      squareMeters: 25.5,
      description: 'Proyecto de ventanas nuevas',
      uninstallTagIds: [
        '123e4567-e89b-12d3-a456-426614174002',
        '123e4567-e89b-12d3-a456-426614174003',
      ],
    }

    // 2. Calcular totalAmount (en el form submit handler)
    const totalAmount = formData.subtotal * (1 + formData.taxRate / 100)
    const projectData: ProjectData = {
      ...formData,
      totalAmount,
    }

    // 3. Validar con projectSchema
    const validationResult = projectSchema.safeParse(projectData)
    expect(validationResult.success).toBe(true)

    // 4. Convertir a API payload
    const payload = projectFormToPayload(projectData)

    // 5. Verificar transformaciones
    expect(payload.date).toBe('2025-12-01T10:00:00.000Z') // Date → ISO string
    expect(typeof payload.date).toBe('string')
    expect(payload.totalAmount).toBe(1190000)

    // 6. Verificar que todos los campos se preservan
    expect(payload.projectNumber).toBe(formData.projectNumber)
    expect(payload.subtotal).toBe(formData.subtotal)
    expect(payload.taxRate).toBe(formData.taxRate)
  })
})

describe('projectStateValues', () => {
  it('debe aceptar "Activo"', () => {
    const result = projectStateValues.safeParse('Activo')
    expect(result.success).toBe(true)
  })

  it('debe aceptar "Finalizado"', () => {
    const result = projectStateValues.safeParse('Finalizado')
    expect(result.success).toBe(true)
  })

  it('debe aceptar "all"', () => {
    const result = projectStateValues.safeParse('all')
    expect(result.success).toBe(true)
  })

  it('debe rechazar valores no válidos', () => {
    const result = projectStateValues.safeParse('Pendiente')
    expect(result.success).toBe(false)
  })

  it('debe rechazar string vacío', () => {
    const result = projectStateValues.safeParse('')
    expect(result.success).toBe(false)
  })
})
