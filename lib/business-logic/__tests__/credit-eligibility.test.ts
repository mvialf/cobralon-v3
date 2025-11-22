import { describe, it, expect } from 'vitest'
import {
  checkCreditEligibility,
  shouldShowCreditOption,
  shouldShowRefundOption,
  getCreditTransactionTypeLabel,
  type CreditEligibilityCheck,
} from '../credit-eligibility'

describe('checkCreditEligibility', () => {
  const CUSTOMER_ID_1 = 'customer-123'
  const CUSTOMER_ID_2 = 'customer-456'

  describe('casos válidos - todos los requisitos cumplidos', () => {
    it('debe retornar eligible cuando todas las validaciones pasan', () => {
      const result = checkCreditEligibility(50000, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.reason).toBeUndefined()
      expect(result.maxApplicable).toBe(50000) // min(credit, balance)
    })

    it('debe calcular maxApplicable como min(credit, balance) - crédito limitante', () => {
      // Cliente: $30k crédito, Proyecto: $100k balance
      const result = checkCreditEligibility(30000, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(30000)
    })

    it('debe calcular maxApplicable como min(credit, balance) - balance limitante', () => {
      // Cliente: $100k crédito, Proyecto: $30k balance
      const result = checkCreditEligibility(100000, 30000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(30000)
    })

    it('debe manejar crédito y balance iguales', () => {
      const result = checkCreditEligibility(50000, 50000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(50000)
    })

    it('debe manejar números decimales correctamente', () => {
      const result = checkCreditEligibility(100.5, 200.75, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(100.5)
    })
  })

  describe('validación 1: cliente sin crédito', () => {
    it('debe rechazar cuando customerCredit es 0', () => {
      const result = checkCreditEligibility(0, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Cliente no tiene crédito disponible')
      expect(result.maxApplicable).toBe(0)
    })

    it('debe rechazar cuando customerCredit es negativo', () => {
      const result = checkCreditEligibility(-100, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Cliente no tiene crédito disponible')
      expect(result.maxApplicable).toBe(0)
    })

    it('debe rechazar incluso si otras validaciones pasarían', () => {
      // Credit: 0, Balance: OK, Customers: Match
      const result = checkCreditEligibility(0, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Cliente no tiene crédito disponible')
    })
  })

  describe('validación 2: proyecto sin balance pendiente', () => {
    it('debe rechazar cuando projectBalance es 0', () => {
      const result = checkCreditEligibility(50000, 0, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Proyecto no tiene balance pendiente')
      expect(result.maxApplicable).toBe(0)
    })

    it('debe rechazar cuando projectBalance es negativo', () => {
      const result = checkCreditEligibility(50000, -100, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Proyecto no tiene balance pendiente')
      expect(result.maxApplicable).toBe(0)
    })

    it('debe rechazar incluso si credit > 0 y customers match', () => {
      const result = checkCreditEligibility(100000, 0, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Proyecto no tiene balance pendiente')
    })
  })

  describe('validación 3: clientes no coinciden', () => {
    it('debe rechazar cuando paymentCustomerId !== projectCustomerId', () => {
      const result = checkCreditEligibility(50000, 100000, CUSTOMER_ID_1, CUSTOMER_ID_2)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('El crédito solo puede aplicarse a proyectos del mismo cliente')
      expect(result.maxApplicable).toBe(0)
    })

    it('debe rechazar incluso con crédito y balance válidos', () => {
      const result = checkCreditEligibility(100000, 200000, CUSTOMER_ID_1, CUSTOMER_ID_2)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('El crédito solo puede aplicarse a proyectos del mismo cliente')
    })

    it('debe validar con IDs UUID reales', () => {
      const customerId1 = '550e8400-e29b-41d4-a716-446655440000'
      const customerId2 = '550e8400-e29b-41d4-a716-446655440001'

      const result = checkCreditEligibility(50000, 100000, customerId1, customerId2)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('El crédito solo puede aplicarse a proyectos del mismo cliente')
    })
  })

  describe('múltiples validaciones fallando - orden de prioridad', () => {
    it('debe validar crédito primero (credit: 0, balance: 0, customers: different)', () => {
      const result = checkCreditEligibility(0, 0, CUSTOMER_ID_1, CUSTOMER_ID_2)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Cliente no tiene crédito disponible')
    })

    it('debe validar balance segundo (credit: OK, balance: 0, customers: different)', () => {
      const result = checkCreditEligibility(50000, 0, CUSTOMER_ID_1, CUSTOMER_ID_2)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Proyecto no tiene balance pendiente')
    })

    it('debe validar customers último (credit: OK, balance: OK, customers: different)', () => {
      const result = checkCreditEligibility(50000, 100000, CUSTOMER_ID_1, CUSTOMER_ID_2)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('El crédito solo puede aplicarse a proyectos del mismo cliente')
    })

    it('todas las validaciones fallan - muestra error de crédito', () => {
      const result = checkCreditEligibility(-100, -200, CUSTOMER_ID_1, CUSTOMER_ID_2)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Cliente no tiene crédito disponible')
    })
  })

  describe('escenarios de negocio reales', () => {
    it('caso 1: cliente con crédito pagando su propio proyecto', () => {
      // Cliente tiene $500k crédito, proyecto debe $1M
      const result = checkCreditEligibility(500000, 1000000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(500000)
    })

    it('caso 2: cliente intenta pagar proyecto de otro cliente', () => {
      // Cliente A tiene crédito, intenta pagar proyecto de Cliente B
      const result = checkCreditEligibility(300000, 500000, CUSTOMER_ID_1, CUSTOMER_ID_2)

      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('mismo cliente')
    })

    it('caso 3: cliente sin crédito ve opción de aplicar crédito', () => {
      // Cliente sin crédito no debería ver la opción
      const result = checkCreditEligibility(0, 200000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Cliente no tiene crédito disponible')
    })

    it('caso 4: proyecto ya pagado completo', () => {
      // Proyecto con balance 0 no permite aplicar crédito
      const result = checkCreditEligibility(100000, 0, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Proyecto no tiene balance pendiente')
    })

    it('caso 5: cliente con poco crédito, proyecto grande', () => {
      // Cliente: $50k crédito, Proyecto: $1M balance
      const result = checkCreditEligibility(50000, 1000000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(50000) // Puede aplicar sus $50k completos
    })

    it('caso 6: cliente con mucho crédito, proyecto pequeño', () => {
      // Cliente: $500k crédito, Proyecto: $100k balance
      const result = checkCreditEligibility(500000, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(100000) // Solo puede aplicar hasta el balance
    })
  })

  describe('edge cases', () => {
    it('debe manejar customerCredit muy pequeño pero > 0', () => {
      const result = checkCreditEligibility(0.01, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(0.01)
    })

    it('debe manejar projectBalance muy pequeño pero > 0', () => {
      const result = checkCreditEligibility(100000, 0.01, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(0.01)
    })

    it('debe manejar ambos valores muy pequeños', () => {
      const result = checkCreditEligibility(0.5, 0.3, CUSTOMER_ID_1, CUSTOMER_ID_1)

      expect(result.eligible).toBe(true)
      expect(result.maxApplicable).toBe(0.3)
    })

    it('debe manejar customer IDs vacíos como diferentes', () => {
      const result = checkCreditEligibility(50000, 100000, '', '')

      expect(result.eligible).toBe(true) // Ambos vacíos son iguales
      expect(result.maxApplicable).toBe(50000)
    })

    it('debe distinguir un ID vacío de uno no vacío', () => {
      const result = checkCreditEligibility(50000, 100000, '', CUSTOMER_ID_1)

      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('mismo cliente')
    })
  })
})

describe('shouldShowCreditOption', () => {
  const CUSTOMER_ID_1 = 'customer-123'
  const CUSTOMER_ID_2 = 'customer-456'

  describe('debe retornar true cuando todas las condiciones se cumplen', () => {
    it('caso básico válido', () => {
      const result = shouldShowCreditOption(50000, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)
      expect(result).toBe(true)
    })

    it('crédito y balance muy altos', () => {
      const result = shouldShowCreditOption(1000000, 5000000, CUSTOMER_ID_1, CUSTOMER_ID_1)
      expect(result).toBe(true)
    })

    it('crédito y balance muy bajos pero > 0', () => {
      const result = shouldShowCreditOption(0.01, 0.01, CUSTOMER_ID_1, CUSTOMER_ID_1)
      expect(result).toBe(true)
    })
  })

  describe('debe retornar false cuando alguna condición falla', () => {
    it('customerCredit = 0', () => {
      const result = shouldShowCreditOption(0, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)
      expect(result).toBe(false)
    })

    it('customerCredit < 0', () => {
      const result = shouldShowCreditOption(-100, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1)
      expect(result).toBe(false)
    })

    it('projectBalance = 0', () => {
      const result = shouldShowCreditOption(50000, 0, CUSTOMER_ID_1, CUSTOMER_ID_1)
      expect(result).toBe(false)
    })

    it('projectBalance < 0', () => {
      const result = shouldShowCreditOption(50000, -100, CUSTOMER_ID_1, CUSTOMER_ID_1)
      expect(result).toBe(false)
    })

    it('customers diferentes', () => {
      const result = shouldShowCreditOption(50000, 100000, CUSTOMER_ID_1, CUSTOMER_ID_2)
      expect(result).toBe(false)
    })

    it('múltiples condiciones fallando', () => {
      const result = shouldShowCreditOption(0, 0, CUSTOMER_ID_1, CUSTOMER_ID_2)
      expect(result).toBe(false)
    })
  })

  describe('consistencia con checkCreditEligibility', () => {
    it('debe retornar true cuando checkCreditEligibility retorna eligible: true', () => {
      const params: [number, number, string, string] = [50000, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1]

      const eligibilityResult = checkCreditEligibility(...params)
      const showOption = shouldShowCreditOption(...params)

      expect(eligibilityResult.eligible).toBe(true)
      expect(showOption).toBe(true)
    })

    it('debe retornar false cuando checkCreditEligibility retorna eligible: false', () => {
      const params: [number, number, string, string] = [0, 100000, CUSTOMER_ID_1, CUSTOMER_ID_1]

      const eligibilityResult = checkCreditEligibility(...params)
      const showOption = shouldShowCreditOption(...params)

      expect(eligibilityResult.eligible).toBe(false)
      expect(showOption).toBe(false)
    })
  })
})

describe('shouldShowRefundOption', () => {
  describe('debe retornar true cuando creditBalance > 0', () => {
    it('crédito normal', () => {
      expect(shouldShowRefundOption(100000)).toBe(true)
    })

    it('crédito muy alto', () => {
      expect(shouldShowRefundOption(10000000)).toBe(true)
    })

    it('crédito muy pequeño pero > 0', () => {
      expect(shouldShowRefundOption(0.01)).toBe(true)
    })

    it('crédito decimal', () => {
      expect(shouldShowRefundOption(123.45)).toBe(true)
    })
  })

  describe('debe retornar false cuando creditBalance <= 0', () => {
    it('crédito = 0', () => {
      expect(shouldShowRefundOption(0)).toBe(false)
    })

    it('crédito negativo', () => {
      expect(shouldShowRefundOption(-100)).toBe(false)
    })

    it('crédito muy negativo', () => {
      expect(shouldShowRefundOption(-1000000)).toBe(false)
    })
  })

  describe('escenarios de negocio', () => {
    it('cliente con crédito disponible debe ver opción', () => {
      // Cliente tiene $500k de sobrepago
      expect(shouldShowRefundOption(500000)).toBe(true)
    })

    it('cliente sin crédito no debe ver opción', () => {
      // Cliente sin crédito acumulado
      expect(shouldShowRefundOption(0)).toBe(false)
    })

    it('cliente con saldo negativo no debe ver opción', () => {
      // Escenario hipotético (no debería ocurrir en producción)
      expect(shouldShowRefundOption(-50000)).toBe(false)
    })
  })
})

describe('getCreditTransactionTypeLabel', () => {
  describe('labels de tipos válidos', () => {
    it('debe retornar label para OVERPAYMENT', () => {
      expect(getCreditTransactionTypeLabel('OVERPAYMENT')).toBe('Sobrepago generado')
    })

    it('debe retornar label para APPLIED', () => {
      expect(getCreditTransactionTypeLabel('APPLIED')).toBe('Crédito aplicado')
    })

    it('debe retornar label para REFUND', () => {
      expect(getCreditTransactionTypeLabel('REFUND')).toBe('Devolución recibida')
    })

    it('debe retornar label para WITHDRAWAL', () => {
      expect(getCreditTransactionTypeLabel('WITHDRAWAL')).toBe('Retiro solicitado')
    })

    it('debe retornar label para ADJUSTMENT', () => {
      expect(getCreditTransactionTypeLabel('ADJUSTMENT')).toBe('Ajuste manual')
    })
  })

  describe('casos de fallback', () => {
    it('debe retornar el tipo original si no está en el mapeo', () => {
      // @ts-expect-error - Testing invalid type
      expect(getCreditTransactionTypeLabel('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE')
    })

    it('debe retornar el tipo original para string vacío', () => {
      // @ts-expect-error - Testing invalid type
      expect(getCreditTransactionTypeLabel('')).toBe('')
    })
  })

  describe('verificar consistencia de labels', () => {
    it('todos los labels deben estar en español', () => {
      const types: Array<'OVERPAYMENT' | 'APPLIED' | 'REFUND' | 'WITHDRAWAL' | 'ADJUSTMENT'> = [
        'OVERPAYMENT',
        'APPLIED',
        'REFUND',
        'WITHDRAWAL',
        'ADJUSTMENT',
      ]

      types.forEach((type) => {
        const label = getCreditTransactionTypeLabel(type)
        expect(label).toBeTruthy()
        expect(label).not.toBe(type) // Label debe ser diferente del tipo
        expect(label.length).toBeGreaterThan(5) // Labels deben ser descriptivos
      })
    })

    it('labels no deben contener el tipo en inglés', () => {
      const types: Array<'OVERPAYMENT' | 'APPLIED' | 'REFUND' | 'WITHDRAWAL' | 'ADJUSTMENT'> = [
        'OVERPAYMENT',
        'APPLIED',
        'REFUND',
        'WITHDRAWAL',
        'ADJUSTMENT',
      ]

      types.forEach((type) => {
        const label = getCreditTransactionTypeLabel(type)
        expect(label.toUpperCase()).not.toContain(type)
      })
    })
  })

  describe('uso en UI', () => {
    it('labels deben ser apropiados para mostrar en tablas', () => {
      const label = getCreditTransactionTypeLabel('OVERPAYMENT')
      expect(label).toBe('Sobrepago generado')
      expect(label.length).toBeLessThan(50) // Razonablemente corto para UI
    })

    it('labels deben ser claros para el usuario final', () => {
      expect(getCreditTransactionTypeLabel('APPLIED')).toBe('Crédito aplicado')
      expect(getCreditTransactionTypeLabel('REFUND')).toBe('Devolución recibida')
      expect(getCreditTransactionTypeLabel('WITHDRAWAL')).toBe('Retiro solicitado')
    })
  })
})
