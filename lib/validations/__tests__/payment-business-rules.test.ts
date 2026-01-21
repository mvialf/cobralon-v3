/**
 * Tests para lib/validations/payment-business-rules.ts
 *
 * Valida las reglas de negocio centralizadas para pagos
 */

import { describe, it, expect } from 'vitest'
import {
  validatePaymentType,
  validateAllocationsSum,
  validateNoDuplicateProjects,
  validatePositiveAllocations,
  validatePaymentAllocations,
  validateSameCustomer,
  validateSameCurrency,
} from '../payment-business-rules'

describe('validatePaymentType', () => {
  describe('tipo Project', () => {
    it('debe aceptar exactamente 1 allocation', () => {
      const result = validatePaymentType('Project', [{ projectId: 'abc', allocatedAmount: 1000 }])
      expect(result.valid).toBe(true)
    })

    it('debe rechazar 0 allocations', () => {
      const result = validatePaymentType('Project', [])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exactamente 1 asignación')
    })

    it('debe rechazar múltiples allocations', () => {
      const result = validatePaymentType('Project', [
        { projectId: 'abc', allocatedAmount: 500 },
        { projectId: 'def', allocatedAmount: 500 },
      ])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exactamente 1 asignación')
    })
  })

  describe('tipo Customer', () => {
    it('debe aceptar 1 allocation', () => {
      const result = validatePaymentType('Customer', [{ projectId: 'abc', allocatedAmount: 1000 }])
      expect(result.valid).toBe(true)
    })

    it('debe aceptar múltiples allocations', () => {
      const result = validatePaymentType('Customer', [
        { projectId: 'abc', allocatedAmount: 500 },
        { projectId: 'def', allocatedAmount: 500 },
      ])
      expect(result.valid).toBe(true)
    })

    it('debe rechazar 0 allocations', () => {
      const result = validatePaymentType('Customer', [])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('al menos 1 asignación')
    })
  })
})

describe('validateAllocationsSum', () => {
  it('debe aceptar suma exacta', () => {
    const result = validateAllocationsSum(1000, [
      { projectId: 'abc', allocatedAmount: 600 },
      { projectId: 'def', allocatedAmount: 400 },
    ])
    expect(result.valid).toBe(true)
  })

  it('debe aceptar diferencia dentro de tolerancia (0.01)', () => {
    const result = validateAllocationsSum(1000, [{ projectId: 'abc', allocatedAmount: 1000.005 }])
    expect(result.valid).toBe(true)
  })

  it('debe rechazar diferencia fuera de tolerancia', () => {
    const result = validateAllocationsSum(1000, [{ projectId: 'abc', allocatedAmount: 500 }])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('no suman el monto total')
  })

  it('debe manejar allocation única', () => {
    const result = validateAllocationsSum(1000, [{ projectId: 'abc', allocatedAmount: 1000 }])
    expect(result.valid).toBe(true)
  })

  it('debe manejar múltiples allocations con decimales', () => {
    const result = validateAllocationsSum(100, [
      { projectId: 'a', allocatedAmount: 33.33 },
      { projectId: 'b', allocatedAmount: 33.33 },
      { projectId: 'c', allocatedAmount: 33.34 },
    ])
    expect(result.valid).toBe(true)
  })
})

describe('validateNoDuplicateProjects', () => {
  it('debe aceptar IDs únicos', () => {
    const result = validateNoDuplicateProjects([
      { projectId: 'abc', allocatedAmount: 500 },
      { projectId: 'def', allocatedAmount: 500 },
    ])
    expect(result.valid).toBe(true)
  })

  it('debe rechazar IDs duplicados', () => {
    const result = validateNoDuplicateProjects([
      { projectId: 'abc', allocatedAmount: 300 },
      { projectId: 'abc', allocatedAmount: 700 },
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('múltiples veces')
  })

  it('debe aceptar array vacío', () => {
    const result = validateNoDuplicateProjects([])
    expect(result.valid).toBe(true)
  })

  it('debe aceptar allocation única', () => {
    const result = validateNoDuplicateProjects([{ projectId: 'abc', allocatedAmount: 1000 }])
    expect(result.valid).toBe(true)
  })
})

describe('validatePositiveAllocations', () => {
  it('debe aceptar todos los montos positivos', () => {
    const result = validatePositiveAllocations([
      { projectId: 'abc', allocatedAmount: 500 },
      { projectId: 'def', allocatedAmount: 500 },
    ])
    expect(result.valid).toBe(true)
  })

  it('debe rechazar monto cero', () => {
    const result = validatePositiveAllocations([{ projectId: 'abc', allocatedAmount: 0 }])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('mayores a 0')
  })

  it('debe rechazar monto negativo', () => {
    const result = validatePositiveAllocations([{ projectId: 'abc', allocatedAmount: -100 }])
    expect(result.valid).toBe(false)
  })

  it('debe aceptar array vacío', () => {
    const result = validatePositiveAllocations([])
    expect(result.valid).toBe(true)
  })
})

describe('validatePaymentAllocations (función completa)', () => {
  it('debe aceptar pago Project válido', () => {
    const result = validatePaymentAllocations('Project', 1000, [
      { projectId: 'abc', allocatedAmount: 1000 },
    ])
    expect(result.valid).toBe(true)
  })

  it('debe aceptar pago Customer válido con múltiples allocations', () => {
    const result = validatePaymentAllocations('Customer', 1000, [
      { projectId: 'abc', allocatedAmount: 600 },
      { projectId: 'def', allocatedAmount: 400 },
    ])
    expect(result.valid).toBe(true)
  })

  it('debe fallar en primera validación que falla (tipo)', () => {
    const result = validatePaymentAllocations('Project', 1000, [
      { projectId: 'abc', allocatedAmount: 500 },
      { projectId: 'def', allocatedAmount: 500 },
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('exactamente 1 asignación')
  })

  it('debe fallar en validación de suma si tipo pasa', () => {
    const result = validatePaymentAllocations('Customer', 1000, [
      { projectId: 'abc', allocatedAmount: 100 },
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('no suman el monto total')
  })

  it('debe fallar en validación de duplicados si suma pasa', () => {
    const result = validatePaymentAllocations('Customer', 1000, [
      { projectId: 'abc', allocatedAmount: 500 },
      { projectId: 'abc', allocatedAmount: 500 },
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('múltiples veces')
  })

  it('debe fallar en validación de montos positivos', () => {
    const result = validatePaymentAllocations('Customer', 0, [
      { projectId: 'abc', allocatedAmount: 0 },
    ])
    // La validación de suma pasará (0 = 0), pero la de positivos fallará
    expect(result.valid).toBe(false)
  })
})

describe('validateSameCustomer', () => {
  it('debe aceptar todos los proyectos del mismo cliente', () => {
    const projects = [{ customerId: 'cust-1' }, { customerId: 'cust-1' }, { customerId: 'cust-1' }]
    const result = validateSameCustomer(projects, 'cust-1')
    expect(result.valid).toBe(true)
  })

  it('debe rechazar si algún proyecto tiene cliente diferente', () => {
    const projects = [{ customerId: 'cust-1' }, { customerId: 'cust-2' }]
    const result = validateSameCustomer(projects, 'cust-1')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('mismo cliente')
  })

  it('debe aceptar array vacío', () => {
    const result = validateSameCustomer([], 'cust-1')
    expect(result.valid).toBe(true)
  })
})

describe('validateSameCurrency', () => {
  it('debe aceptar todos los proyectos con la misma moneda', () => {
    const projects = [{ currency: 'CLP' }, { currency: 'CLP' }, { currency: 'CLP' }]
    const result = validateSameCurrency(projects, 'CLP')
    expect(result.valid).toBe(true)
  })

  it('debe rechazar si algún proyecto tiene moneda diferente', () => {
    const projects = [{ currency: 'CLP' }, { currency: 'USD' }]
    const result = validateSameCurrency(projects, 'CLP')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('misma moneda')
  })

  it('debe aceptar array vacío', () => {
    const result = validateSameCurrency([], 'CLP')
    expect(result.valid).toBe(true)
  })
})
