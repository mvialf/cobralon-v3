import { describe, it, expect } from 'vitest'
import {
  paymentToProjectSchema,
  paymentToCustomerSchema,
  parseProjectsWithBalance,
  paymentToProjectToPayload,
  paymentToCustomerToPayload,
  type PaymentToProjectFormValues,
  type PaymentToCustomerFormValues,
  type ProjectWithBalance,
  type ProjectWithBalanceSerialized,
} from '../payment-validations'

describe('paymentToProjectSchema (flujo 1:1)', () => {
  const validPayment: PaymentToProjectFormValues = {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 1000000,
    date: new Date('2025-01-15T10:00:00Z'),
    paymentMethodId: '550e8400-e29b-41d4-a716-446655440001',
    selectedInstallments: null,
    creditApplied: 0,
    notes: null,
  }

  describe('validación completa', () => {
    it('debe validar pago completo válido', () => {
      const result = paymentToProjectSchema.safeParse(validPayment)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBe(validPayment.projectId)
        expect(result.data.amount).toBe(validPayment.amount)
        expect(result.data.date).toEqual(validPayment.date)
        expect(result.data.paymentMethodId).toBe(validPayment.paymentMethodId)
      }
    })

    it('debe validar pago con cuotas', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        selectedInstallments: 6,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.selectedInstallments).toBe(6)
      }
    })

    it('debe validar pago con crédito aplicado', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        creditApplied: 50000,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.creditApplied).toBe(50000)
      }
    })

    it('debe validar pago con notas', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        notes: 'Pago parcial del cliente',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.notes).toBe('Pago parcial del cliente')
      }
    })
  })

  describe('validación de projectId', () => {
    it('debe rechazar sin projectId', () => {
      const { projectId, ...payment } = validPayment
      const result = paymentToProjectSchema.safeParse(payment)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('seleccionar un proyecto')
      }
    })

    it('debe rechazar projectId inválido (no UUID)', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        projectId: 'invalid-id',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('ID de proyecto inválido')
      }
    })

    it('debe rechazar projectId vacío', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        projectId: '',
      })

      expect(result.success).toBe(false)
    })

    it('debe aceptar UUID válido', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validación de amount', () => {
    it('debe aceptar monto positivo', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        amount: 500000,
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar monto decimal con 2 decimales', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        amount: 1234.56,
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar monto 0', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        amount: 0,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mayor a 0')
      }
    })

    it('debe rechazar monto negativo', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        amount: -100,
      })

      expect(result.success).toBe(false)
    })

    it('debe rechazar sin el campo amount', () => {
      const { amount, ...payment } = validPayment
      const result = paymentToProjectSchema.safeParse(payment)

      expect(result.success).toBe(false)
      if (!result.success) {
        // z.coerce.number() usa invalid_type_error cuando falta el campo
        expect(result.error.issues[0].message).toBe('El monto debe ser un número')
      }
    })

    it('debe rechazar monto con más de 2 decimales', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        amount: 1234.567, // 3 decimales
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('máximo 2 decimales')
      }
    })

    it('debe coerce string numérico a number', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        amount: '1000000',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.amount).toBe(1000000)
        expect(typeof result.data.amount).toBe('number')
      }
    })
  })

  describe('validación de date', () => {
    it('debe aceptar Date object válido', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        date: new Date('2025-12-25'),
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar string en lugar de Date', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        date: '2025-01-15',
      })

      expect(result.success).toBe(false)
    })

    it('debe rechazar sin date', () => {
      const { date, ...payment } = validPayment
      const result = paymentToProjectSchema.safeParse(payment)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoria')
      }
    })

    it('debe rechazar Date inválido', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        date: new Date('invalid'),
      })

      expect(result.success).toBe(false)
    })

    it('debe aceptar fechas en el pasado', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        date: new Date('2020-01-01'),
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar fechas en el futuro', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        date: new Date('2030-12-31'),
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validación de paymentMethodId', () => {
    it('debe rechazar sin paymentMethodId', () => {
      const { paymentMethodId, ...payment } = validPayment
      const result = paymentToProjectSchema.safeParse(payment)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('método de pago')
      }
    })

    it('debe rechazar paymentMethodId no UUID', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        paymentMethodId: 'not-a-uuid',
      })

      expect(result.success).toBe(false)
    })

    it('debe aceptar UUID válido', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        paymentMethodId: '123e4567-e89b-12d3-a456-426655440001',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validación de selectedInstallments', () => {
    it('debe aceptar null', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        selectedInstallments: null,
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar cuotas válidas (1-12)', () => {
      const validInstallments = [1, 3, 6, 9, 12]

      validInstallments.forEach((installments) => {
        const result = paymentToProjectSchema.safeParse({
          ...validPayment,
          selectedInstallments: installments,
        })

        expect(result.success).toBe(true)
      })
    })

    it('debe rechazar cuotas 0', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        selectedInstallments: 0,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Mínimo 1 cuota')
      }
    })

    it('debe rechazar cuotas negativas', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        selectedInstallments: -3,
      })

      expect(result.success).toBe(false)
    })

    it('debe rechazar cuotas decimales', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        selectedInstallments: 3.5,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('número entero')
      }
    })

    it('debe coerce string a number', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        selectedInstallments: '6',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.selectedInstallments).toBe(6)
      }
    })
  })

  describe('validación de creditApplied', () => {
    it('debe aceptar 0 (default)', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        creditApplied: 0,
      })

      expect(result.success).toBe(true)
    })

    it('debe usar 0 como default si se omite', () => {
      const { creditApplied, ...payment } = validPayment
      const result = paymentToProjectSchema.safeParse(payment)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.creditApplied).toBe(0)
      }
    })

    it('debe aceptar crédito positivo', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        creditApplied: 50000,
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar crédito negativo', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        creditApplied: -100,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no puede ser negativo')
      }
    })

    it('debe coerce string a number', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        creditApplied: '25000',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.creditApplied).toBe(25000)
      }
    })
  })

  describe('validación de notes', () => {
    it('debe aceptar null', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        notes: null,
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar string vacío', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        notes: '',
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar notas normales', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        notes: 'Pago con tarjeta de crédito',
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar notas > 500 caracteres', () => {
      const longNotes = 'a'.repeat(501)
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        notes: longNotes,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 caracteres')
      }
    })

    it('debe aceptar notas de exactamente 500 caracteres', () => {
      const notes = 'a'.repeat(500)
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        notes: notes,
      })

      expect(result.success).toBe(true)
    })

    it('debe trim notas con espacios', () => {
      const result = paymentToProjectSchema.safeParse({
        ...validPayment,
        notes: '  Nota con espacios  ',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.notes).toBe('Nota con espacios')
      }
    })
  })
})

describe('paymentToCustomerSchema (flujo 1:N)', () => {
  const validPayment: PaymentToCustomerFormValues = {
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 1000000,
    date: new Date('2025-01-15T10:00:00Z'),
    paymentMethodId: '550e8400-e29b-41d4-a716-446655440001',
    selectedInstallments: null,
    notes: null,
    allocations: [
      {
        projectId: '550e8400-e29b-41d4-a716-446655440002',
        allocatedAmount: 600000,
      },
      {
        projectId: '550e8400-e29b-41d4-a716-446655440003',
        allocatedAmount: 400000,
      },
    ],
  }

  describe('validación completa', () => {
    it('debe validar pago 1:N válido', () => {
      const result = paymentToCustomerSchema.safeParse(validPayment)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.customerId).toBe(validPayment.customerId)
        expect(result.data.amount).toBe(validPayment.amount)
        expect(result.data.allocations).toHaveLength(2)
      }
    })

    it('debe validar pago con un solo proyecto', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 500000,
        allocations: [
          {
            projectId: '550e8400-e29b-41d4-a716-446655440002',
            allocatedAmount: 500000,
          },
        ],
      })

      expect(result.success).toBe(true)
    })

    it('debe validar pago con múltiples proyectos', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1000000,
        allocations: [
          { projectId: '550e8400-e29b-41d4-a716-446655440002', allocatedAmount: 300000 },
          { projectId: '550e8400-e29b-41d4-a716-446655440003', allocatedAmount: 250000 },
          { projectId: '550e8400-e29b-41d4-a716-446655440004', allocatedAmount: 450000 },
        ],
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validación de allocations', () => {
    it('debe rechazar array vacío', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        allocations: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos un proyecto')
      }
    })

    it('debe rechazar sin allocations', () => {
      const { allocations, ...payment } = validPayment
      const result = paymentToCustomerSchema.safeParse(payment)

      expect(result.success).toBe(false)
    })

    it('debe rechazar allocation con projectId inválido', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        allocations: [
          {
            projectId: 'invalid-uuid',
            allocatedAmount: 1000000,
          },
        ],
      })

      expect(result.success).toBe(false)
    })

    it('debe rechazar allocation con monto 0', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 0,
        allocations: [
          {
            projectId: '550e8400-e29b-41d4-a716-446655440002',
            allocatedAmount: 0,
          },
        ],
      })

      expect(result.success).toBe(false)
    })

    it('debe rechazar allocation con monto negativo', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        allocations: [
          {
            projectId: '550e8400-e29b-41d4-a716-446655440002',
            allocatedAmount: -100,
          },
        ],
      })

      expect(result.success).toBe(false)
    })
  })

  describe('validación de suma de allocations', () => {
    it('debe aceptar cuando suma = amount exacto', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1000000,
        allocations: [
          { projectId: '550e8400-e29b-41d4-a716-446655440002', allocatedAmount: 600000 },
          { projectId: '550e8400-e29b-41d4-a716-446655440003', allocatedAmount: 400000 },
        ],
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar diferencia mayor a tolerancia CLP ($1)', () => {
      // El schema usa tolerancia laxa CLP=$1. Diferencia de $2 debe rechazarse.
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1000002,
        allocations: [
          { projectId: '550e8400-e29b-41d4-a716-446655440002', allocatedAmount: 600000 },
          { projectId: '550e8400-e29b-41d4-a716-446655440003', allocatedAmount: 400000 },
        ],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'La suma de los montos asignados debe ser igual al monto total del pago'
        )
      }
    })

    it('debe rechazar cuando suma < amount (diferencia > TOLERANCE)', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1000000,
        allocations: [
          { projectId: '550e8400-e29b-41d4-a716-446655440002', allocatedAmount: 500000 },
          { projectId: '550e8400-e29b-41d4-a716-446655440003', allocatedAmount: 400000 },
        ],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('suma de los montos asignados')
      }
    })

    it('debe rechazar cuando suma > amount (diferencia > TOLERANCE)', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1000000,
        allocations: [
          { projectId: '550e8400-e29b-41d4-a716-446655440002', allocatedAmount: 600000 },
          { projectId: '550e8400-e29b-41d4-a716-446655440003', allocatedAmount: 500000 },
        ],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('suma de los montos asignados')
      }
    })

    it('debe validar suma con 3 proyectos', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1500000,
        allocations: [
          { projectId: '550e8400-e29b-41d4-a716-446655440002', allocatedAmount: 500000 },
          { projectId: '550e8400-e29b-41d4-a716-446655440003', allocatedAmount: 600000 },
          { projectId: '550e8400-e29b-41d4-a716-446655440004', allocatedAmount: 400000 },
        ],
      })

      expect(result.success).toBe(true)
    })

    it('debe manejar decimales correctamente en la suma', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1000.5,
        allocations: [
          { projectId: '550e8400-e29b-41d4-a716-446655440002', allocatedAmount: 600.25 },
          { projectId: '550e8400-e29b-41d4-a716-446655440003', allocatedAmount: 400.25 },
        ],
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validación de projectIds duplicados', () => {
    it('debe rechazar projectIds duplicados', () => {
      const duplicateId = '550e8400-e29b-41d4-a716-446655440002'
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1000000,
        allocations: [
          { projectId: duplicateId, allocatedAmount: 500000 },
          { projectId: duplicateId, allocatedAmount: 500000 },
        ],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mismo proyecto dos veces')
      }
    })

    it('debe aceptar projectIds diferentes', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1000000,
        allocations: [
          { projectId: '550e8400-e29b-41d4-a716-446655440002', allocatedAmount: 600000 },
          { projectId: '550e8400-e29b-41d4-a716-446655440003', allocatedAmount: 400000 },
        ],
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar múltiples duplicados', () => {
      const id1 = '550e8400-e29b-41d4-a716-446655440002'
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 1500000,
        allocations: [
          { projectId: id1, allocatedAmount: 500000 },
          { projectId: id1, allocatedAmount: 500000 },
          { projectId: id1, allocatedAmount: 500000 },
        ],
      })

      expect(result.success).toBe(false)
    })
  })

  describe('orden de validaciones', () => {
    it('debe validar estructura de allocations antes que suma', () => {
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        allocations: [
          {
            projectId: 'invalid-uuid',
            allocatedAmount: 1000000,
          },
        ],
      })

      expect(result.success).toBe(false)
      // Error de UUID, no de suma
    })

    it('debe validar duplicados antes que suma', () => {
      const duplicateId = '550e8400-e29b-41d4-a716-446655440002'
      const result = paymentToCustomerSchema.safeParse({
        ...validPayment,
        amount: 900000, // Suma incorrecta
        allocations: [
          { projectId: duplicateId, allocatedAmount: 500000 },
          { projectId: duplicateId, allocatedAmount: 400000 }, // Duplicado
        ],
      })

      expect(result.success).toBe(false)
      // Debería fallar por duplicados primero
    })
  })
})

describe('parseProjectsWithBalance', () => {
  it('debe convertir ISO strings a Date objects', () => {
    const serialized: ProjectWithBalanceSerialized[] = [
      {
        id: '1',
        projectNumber: 'PROJ-001',
        projectName: 'Test Project',
        totalAmount: 1000000,
        currency: 'CLP',
        balance: 500000,
        createdAt: '2025-01-15T10:00:00.000Z',
        customer: {
          id: 'c1',
          name: 'Customer 1',
        },
      },
    ]

    const result = parseProjectsWithBalance(serialized)

    expect(result[0].createdAt).toBeInstanceOf(Date)
    expect(result[0].createdAt.toISOString()).toBe('2025-01-15T10:00:00.000Z')
  })

  it('debe preservar todos los demás campos', () => {
    const serialized: ProjectWithBalanceSerialized[] = [
      {
        id: '1',
        projectNumber: 'PROJ-001',
        projectName: 'Test',
        totalAmount: 1000000,
        currency: 'CLP',
        balance: 500000,
        createdAt: '2025-01-15T10:00:00.000Z',
        customer: { id: 'c1', name: 'Customer 1' },
      },
    ]

    const result = parseProjectsWithBalance(serialized)

    expect(result[0].id).toBe('1')
    expect(result[0].projectNumber).toBe('PROJ-001')
    expect(result[0].projectName).toBe('Test')
    expect(result[0].totalAmount).toBe(1000000)
    expect(result[0].currency).toBe('CLP')
    expect(result[0].balance).toBe(500000)
    expect(result[0].customer).toEqual({ id: 'c1', name: 'Customer 1' })
  })

  it('debe manejar múltiples proyectos', () => {
    const serialized: ProjectWithBalanceSerialized[] = [
      {
        id: '1',
        projectNumber: 'P1',
        projectName: null,
        totalAmount: 1000000,
        currency: 'CLP',
        balance: 500000,
        createdAt: '2025-01-15T10:00:00.000Z',
        customer: { id: 'c1', name: 'Customer 1' },
      },
      {
        id: '2',
        projectNumber: 'P2',
        projectName: 'Project 2',
        totalAmount: 2000000,
        currency: 'CLP',
        balance: 1000000,
        createdAt: '2025-01-20T10:00:00.000Z',
        customer: { id: 'c2', name: 'Customer 2' },
      },
    ]

    const result = parseProjectsWithBalance(serialized)

    expect(result).toHaveLength(2)
    expect(result[0].createdAt).toBeInstanceOf(Date)
    expect(result[1].createdAt).toBeInstanceOf(Date)
  })

  it('debe manejar array vacío', () => {
    const result = parseProjectsWithBalance([])
    expect(result).toEqual([])
  })
})

describe('paymentToProjectToPayload', () => {
  const formValues: PaymentToProjectFormValues = {
    projectId: 'proj-123',
    amount: 1000000,
    date: new Date('2025-01-15T10:00:00Z'),
    paymentMethodId: 'pm-123',
    selectedInstallments: 3,
    creditApplied: 50000,
    notes: 'Test notes',
  }

  const project: ProjectWithBalance = {
    id: 'proj-123',
    projectNumber: 'PROJ-001',
    projectName: 'Test Project',
    totalAmount: 2000000,
    currency: 'CLP',
    balance: 1000000,
    createdAt: new Date('2025-01-01'),
    customer: {
      id: 'cust-123',
      name: 'Test Customer',
    },
  }

  it('debe crear payload correcto', () => {
    const payload = paymentToProjectToPayload(formValues, project)

    expect(payload.type).toBe('Project')
    expect(payload.customerId).toBe('cust-123')
    expect(payload.amount).toBe(1000000)
    expect(payload.currency).toBe('CLP')
    expect(payload.date).toEqual(formValues.date)
    expect(payload.paymentMethodId).toBe('pm-123')
    expect(payload.reference).toBeNull()
    expect(payload.notes).toBe('Test notes')
    expect(payload.selectedInstallments).toBe(3)
  })

  it('debe crear allocation 1:1 con el monto completo', () => {
    const payload = paymentToProjectToPayload(formValues, project)

    expect(payload.allocations).toHaveLength(1)
    expect(payload.allocations[0].projectId).toBe('proj-123')
    expect(payload.allocations[0].allocatedAmount).toBe(1000000)
  })

  it('debe derivar customerId del proyecto', () => {
    const payload = paymentToProjectToPayload(formValues, project)
    expect(payload.customerId).toBe(project.customer.id)
  })

  it('debe derivar currency del proyecto', () => {
    const payload = paymentToProjectToPayload(formValues, project)
    expect(payload.currency).toBe(project.currency)
  })

  it('debe manejar notes null', () => {
    const payload = paymentToProjectToPayload({ ...formValues, notes: null }, project)
    expect(payload.notes).toBeNull()
  })

  it('debe manejar selectedInstallments null', () => {
    const payload = paymentToProjectToPayload(
      { ...formValues, selectedInstallments: null },
      project
    )
    expect(payload.selectedInstallments).toBeNull()
  })
})

describe('paymentToCustomerToPayload', () => {
  const formValues: PaymentToCustomerFormValues = {
    customerId: 'cust-123',
    amount: 1000000,
    date: new Date('2025-01-15T10:00:00Z'),
    paymentMethodId: 'pm-123',
    selectedInstallments: 6,
    notes: 'Multiple projects',
    allocations: [
      { projectId: 'proj-1', allocatedAmount: 600000 },
      { projectId: 'proj-2', allocatedAmount: 400000 },
    ],
  }

  it('debe crear payload correcto', () => {
    const payload = paymentToCustomerToPayload(formValues, 'CLP')

    expect(payload.type).toBe('Customer')
    expect(payload.customerId).toBe('cust-123')
    expect(payload.amount).toBe(1000000)
    expect(payload.currency).toBe('CLP')
    expect(payload.date).toEqual(formValues.date)
    expect(payload.paymentMethodId).toBe('pm-123')
    expect(payload.reference).toBeNull()
    expect(payload.notes).toBe('Multiple projects')
    expect(payload.selectedInstallments).toBe(6)
  })

  it('debe preservar allocations sin modificar', () => {
    const payload = paymentToCustomerToPayload(formValues, 'CLP')

    expect(payload.allocations).toHaveLength(2)
    expect(payload.allocations[0]).toEqual({
      projectId: 'proj-1',
      allocatedAmount: 600000,
    })
    expect(payload.allocations[1]).toEqual({
      projectId: 'proj-2',
      allocatedAmount: 400000,
    })
  })

  it('debe usar currency proporcionada', () => {
    const payloadCLP = paymentToCustomerToPayload(formValues, 'CLP')
    const payloadUSD = paymentToCustomerToPayload(formValues, 'USD')

    expect(payloadCLP.currency).toBe('CLP')
    expect(payloadUSD.currency).toBe('USD')
  })

  it('debe manejar notes null', () => {
    const payload = paymentToCustomerToPayload({ ...formValues, notes: null }, 'CLP')
    expect(payload.notes).toBeNull()
  })

  it('debe manejar selectedInstallments null', () => {
    const payload = paymentToCustomerToPayload({ ...formValues, selectedInstallments: null }, 'CLP')
    expect(payload.selectedInstallments).toBeNull()
  })
})
