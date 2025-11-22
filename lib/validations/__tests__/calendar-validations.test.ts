import { describe, it, expect } from 'vitest'
import {
  createProjectEventSchema,
  updateProjectEventSchema,
  createProjectEventWithProjectUpdateSchema,
  calendarQuerySchema,
} from '../calendar-validations'

describe('createProjectEventSchema', () => {
  const validEvent = {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    scheduledDate: new Date('2025-02-15'),
  }

  describe('validación completa', () => {
    it('debe validar un evento completo válido', () => {
      const result = createProjectEventSchema.safeParse(validEvent)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBe(validEvent.projectId)
        expect(result.data.scheduledDate).toEqual(validEvent.scheduledDate)
      }
    })
  })

  describe('validación de projectId', () => {
    it('debe aceptar UUID válido', () => {
      const result = createProjectEventSchema.safeParse({
        ...validEvent,
        projectId: '550e8400-e29b-41d4-a716-446655440001',
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar projectId inválido (no UUID)', () => {
      const result = createProjectEventSchema.safeParse({
        ...validEvent,
        projectId: 'invalid-id',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('ID de proyecto inválido')
      }
    })

    it('debe rechazar sin el campo projectId', () => {
      const { projectId, ...event } = validEvent
      const result = createProjectEventSchema.safeParse(event)

      expect(result.success).toBe(false)
    })
  })

  describe('validación de scheduledDate', () => {
    it('debe aceptar Date object', () => {
      const result = createProjectEventSchema.safeParse({
        ...validEvent,
        scheduledDate: new Date('2025-12-31'),
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar fecha como string y coercionar a Date', () => {
      const result = createProjectEventSchema.safeParse({
        ...validEvent,
        scheduledDate: '2025-03-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scheduledDate).toBeInstanceOf(Date)
      }
    })

    it('debe rechazar fecha inválida', () => {
      const result = createProjectEventSchema.safeParse({
        ...validEvent,
        scheduledDate: 'not-a-date',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        // z.coerce.date() usa "Invalid date" cuando no puede parsear
        expect(result.error.issues[0].message).toBe('Invalid date')
      }
    })

    it('debe rechazar sin el campo scheduledDate', () => {
      const { scheduledDate, ...event } = validEvent
      const result = createProjectEventSchema.safeParse(event)

      expect(result.success).toBe(false)
      if (!result.success) {
        // z.coerce.date() usa "Invalid date" cuando el campo falta
        expect(result.error.issues[0].message).toBe('Invalid date')
      }
    })
  })
})

describe('updateProjectEventSchema', () => {
  it('debe permitir actualización parcial (solo scheduledDate)', () => {
    const result = updateProjectEventSchema.safeParse({
      scheduledDate: new Date('2025-06-20'),
    })

    expect(result.success).toBe(true)
  })

  it('debe permitir actualización sin campos', () => {
    const result = updateProjectEventSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('debe aplicar mismas validaciones a scheduledDate cuando presente', () => {
    const result = updateProjectEventSchema.safeParse({
      scheduledDate: 'invalid-date',
    })

    expect(result.success).toBe(false)
  })
})

describe('createProjectEventWithProjectUpdateSchema', () => {
  const validEventWithProject = {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    scheduledDate: '2025-02-15',
    phone: '+56912345678',
    street: 'Av. Principal 123',
    apartment: null,
    comuna: 'Santiago',
    region: 'Región Metropolitana',
    windowsCount: 8,
    squareMeters: 85.5,
    description: null,
  }

  describe('validación completa', () => {
    it('debe validar evento con datos de proyecto completos', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse(validEventWithProject)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('+56912345678')
        expect(result.data.windowsCount).toBe(8)
        expect(result.data.squareMeters).toBe(85.5)
      }
    })

    it('debe aceptar apartment como string', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        apartment: 'Depto 301',
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar description como string', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        description: 'Descripción del proyecto',
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar projectStatusId como opcional (undefined)', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        projectStatusId: undefined,
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar projectStatusId con UUID válido', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        projectStatusId: '550e8400-e29b-41d4-a716-446655440001',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validación de phone (teléfono chileno)', () => {
    it('debe aceptar teléfono chileno válido con +56', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        phone: '+56987654321',
      })

      expect(result.success).toBe(true)
    })

    it('debe normalizar teléfono sin +56', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        phone: '912345678',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('+56912345678')
      }
    })

    it('debe normalizar teléfono con espacios', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        phone: '+56 9 1234 5678',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('+56912345678')
      }
    })

    it('debe rechazar teléfono que comienza con 0', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        phone: '+56012345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('teléfono chileno válido')
      }
    })

    it('debe rechazar teléfono sin el campo phone', () => {
      const { phone, ...event } = validEventWithProject
      const result = createProjectEventWithProjectUpdateSchema.safeParse(event)

      expect(result.success).toBe(false)
      if (!result.success) {
        // z.string().min() usa "Required" por defecto cuando falta el campo
        expect(result.error.issues[0].message).toBe('Required')
      }
    })
  })

  describe('validación de dirección', () => {
    it('debe rechazar sin calle (street)', () => {
      const { street, ...event } = validEventWithProject
      const result = createProjectEventWithProjectUpdateSchema.safeParse(event)

      expect(result.success).toBe(false)
      if (!result.success) {
        // z.string() usa "Required" por defecto cuando falta el campo
        expect(result.error.issues[0].message).toBe('Required')
      }
    })

    it('debe rechazar sin comuna', () => {
      const { comuna, ...event } = validEventWithProject
      const result = createProjectEventWithProjectUpdateSchema.safeParse(event)

      expect(result.success).toBe(false)
      if (!result.success) {
        // z.string() usa "Required" por defecto cuando falta el campo
        expect(result.error.issues[0].message).toBe('Required')
      }
    })

    it('debe rechazar sin región', () => {
      const { region, ...event } = validEventWithProject
      const result = createProjectEventWithProjectUpdateSchema.safeParse(event)

      expect(result.success).toBe(false)
      if (!result.success) {
        // z.string() usa "Required" por defecto cuando falta el campo
        expect(result.error.issues[0].message).toBe('Required')
      }
    })

    it('debe rechazar calle vacía', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        street: '',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('validación de windowsCount', () => {
    it('debe aceptar windowsCount = 0', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        windowsCount: 0,
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar windowsCount positivo', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        windowsCount: 25,
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar windowsCount negativo', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        windowsCount: -5,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no pueden ser negativos')
      }
    })

    it('debe rechazar windowsCount decimal', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        windowsCount: 5.5,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('número entero')
      }
    })

    it('debe rechazar windowsCount no numérico', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        windowsCount: 'invalid',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('validación de squareMeters', () => {
    it('debe aceptar squareMeters = 0', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        squareMeters: 0,
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar squareMeters decimal', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        squareMeters: 125.75,
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar squareMeters muy grande', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        squareMeters: 9999.99,
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar squareMeters negativo', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        squareMeters: -50,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no pueden ser negativos')
      }
    })

    it('debe rechazar squareMeters no numérico', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        squareMeters: 'invalid',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('validación de scheduledDate (como string)', () => {
    it('debe aceptar scheduledDate como string ISO', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        scheduledDate: '2025-12-31',
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar scheduledDate vacío', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        scheduledDate: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('La fecha es requerida')
      }
    })

    it('debe rechazar sin el campo scheduledDate', () => {
      const { scheduledDate, ...event } = validEventWithProject
      const result = createProjectEventWithProjectUpdateSchema.safeParse(event)

      expect(result.success).toBe(false)
    })
  })

  describe('validación de tasks', () => {
    it('debe aceptar tasks vacío (array vacío)', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        tasks: [],
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar tasks con TodoItems válidos', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        tasks: [
          { id: crypto.randomUUID(), text: 'Medir ventanas', completed: false },
          { id: crypto.randomUUID(), text: 'Tomar fotos', completed: true },
          { id: crypto.randomUUID(), text: 'Confirmar material', completed: false },
        ],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tasks).toHaveLength(3)
        expect(result.data.tasks![0].text).toBe('Medir ventanas')
        expect(result.data.tasks![1].completed).toBe(true)
      }
    })

    it('debe aceptar tasks como undefined (campo opcional)', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        tasks: undefined,
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar tasks con más de 50 items', () => {
      const tooManyTasks = Array.from({ length: 51 }, (_, i) => ({
        id: crypto.randomUUID(),
        text: `Tarea ${i + 1}`,
        completed: false,
      }))

      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        tasks: tooManyTasks,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Máximo 50')
      }
    })

    it('debe rechazar tasks con item sin id', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        tasks: [{ text: 'Tarea sin ID', completed: false }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('tasks')
      }
    })

    it('debe rechazar tasks con item sin text', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        tasks: [{ id: crypto.randomUUID(), completed: false }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('tasks')
      }
    })

    it('debe rechazar tasks con text vacío', () => {
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        tasks: [{ id: crypto.randomUUID(), text: '', completed: false }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('tarea no puede estar vacía')
      }
    })

    it('debe rechazar tasks con text muy largo (más de 200 caracteres)', () => {
      const longText = 'a'.repeat(201)
      const result = createProjectEventWithProjectUpdateSchema.safeParse({
        ...validEventWithProject,
        tasks: [{ id: crypto.randomUUID(), text: longText, completed: false }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('200')
      }
    })
  })
})

describe('calendarQuerySchema', () => {
  describe('validación de rango de fechas', () => {
    it('debe validar rango válido', () => {
      const result = calendarQuerySchema.safeParse({
        start: '2025-02-01',
        end: '2025-02-28',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.start).toBeInstanceOf(Date)
        expect(result.data.end).toBeInstanceOf(Date)
      }
    })

    it('debe aceptar Date objects', () => {
      const result = calendarQuerySchema.safeParse({
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31'),
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar end antes de start (sin validación de orden)', () => {
      // El schema solo valida que sean fechas válidas, no el orden
      const result = calendarQuerySchema.safeParse({
        start: '2025-12-31',
        end: '2025-01-01',
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar sin start', () => {
      const result = calendarQuerySchema.safeParse({
        end: '2025-02-28',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        // z.coerce.date() usa "Invalid date" cuando el campo falta
        expect(result.error.issues[0].message).toBe('Invalid date')
      }
    })

    it('debe rechazar sin end', () => {
      const result = calendarQuerySchema.safeParse({
        start: '2025-02-01',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        // z.coerce.date() usa "Invalid date" cuando el campo falta
        expect(result.error.issues[0].message).toBe('Invalid date')
      }
    })

    it('debe rechazar start inválido', () => {
      const result = calendarQuerySchema.safeParse({
        start: 'invalid-date',
        end: '2025-02-28',
      })

      expect(result.success).toBe(false)
    })

    it('debe rechazar end inválido', () => {
      const result = calendarQuerySchema.safeParse({
        start: '2025-02-01',
        end: 'invalid-date',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('casos de uso del calendario', () => {
    it('debe validar consulta por mes completo', () => {
      const result = calendarQuerySchema.safeParse({
        start: '2025-03-01',
        end: '2025-03-31',
      })

      expect(result.success).toBe(true)
    })

    it('debe validar consulta por semana', () => {
      const result = calendarQuerySchema.safeParse({
        start: '2025-03-10',
        end: '2025-03-16',
      })

      expect(result.success).toBe(true)
    })

    it('debe validar consulta de un solo día', () => {
      const result = calendarQuerySchema.safeParse({
        start: '2025-03-15',
        end: '2025-03-15',
      })

      expect(result.success).toBe(true)
    })
  })
})
