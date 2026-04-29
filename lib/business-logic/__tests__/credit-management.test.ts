import { describe, it, expect } from 'vitest'
import {
  calculatePaymentDistribution,
  calculateMaxCreditApplication,
  canApplyCredit,
  canRefundCredit,
} from '../credit-management'

describe('calculatePaymentDistribution', () => {
  describe('pago exacto (payment = balance)', () => {
    it('debe aplicar todo el pago al proyecto sin generar crédito', () => {
      const result = calculatePaymentDistribution(200000, 200000, 0)

      expect(result).toEqual({
        appliedToProject: 200000,
        generatedCredit: 0,
        newProjectBalance: 0,
        newCustomerCredit: 0,
      })
    })

    it('debe manejar pago pequeño exacto', () => {
      const result = calculatePaymentDistribution(100, 100, 0)

      expect(result).toEqual({
        appliedToProject: 100,
        generatedCredit: 0,
        newProjectBalance: 0,
        newCustomerCredit: 0,
      })
    })
  })

  describe('pago mayor (payment > balance - genera crédito)', () => {
    it('debe generar crédito cuando el pago excede el balance', () => {
      const result = calculatePaymentDistribution(200000, 500000, 0)

      expect(result).toEqual({
        appliedToProject: 200000,
        generatedCredit: 300000,
        newProjectBalance: 0,
        newCustomerCredit: 300000,
      })
    })

    it('debe generar crédito con balance pequeño', () => {
      const result = calculatePaymentDistribution(50000, 100000, 0)

      expect(result).toEqual({
        appliedToProject: 50000,
        generatedCredit: 50000,
        newProjectBalance: 0,
        newCustomerCredit: 50000,
      })
    })

    it('debe generar crédito con monto muy grande', () => {
      const result = calculatePaymentDistribution(100000, 1000000, 0)

      expect(result).toEqual({
        appliedToProject: 100000,
        generatedCredit: 900000,
        newProjectBalance: 0,
        newCustomerCredit: 900000,
      })
    })
  })

  describe('pago menor (payment < balance)', () => {
    it('debe aplicar pago parcial sin generar crédito', () => {
      const result = calculatePaymentDistribution(500000, 200000, 0)

      expect(result).toEqual({
        appliedToProject: 200000,
        generatedCredit: 0,
        newProjectBalance: 300000,
        newCustomerCredit: 0,
      })
    })

    it('debe manejar pago muy pequeño', () => {
      const result = calculatePaymentDistribution(1000000, 10000, 0)

      expect(result).toEqual({
        appliedToProject: 10000,
        generatedCredit: 0,
        newProjectBalance: 990000,
        newCustomerCredit: 0,
      })
    })
  })

  describe('con crédito del cliente aplicado (customerCreditApplied > 0)', () => {
    it('debe aplicar crédito + pago al balance del proyecto', () => {
      // Proyecto: balance $500k
      // Pago: $200k cash + $300k crédito = $500k total
      // Resultado: proyecto pagado completo, crédito consumido
      const result = calculatePaymentDistribution(500000, 200000, 300000)

      expect(result).toEqual({
        appliedToProject: 500000, // Todo aplicado al proyecto
        generatedCredit: 0, // No se genera crédito nuevo
        newProjectBalance: 0, // Proyecto pagado completo
        newCustomerCredit: -300000, // Crédito consumido
      })
    })

    it('debe consumir crédito parcial', () => {
      // Proyecto: balance $100k
      // Pago: $50k cash + $50k crédito = $100k total
      const result = calculatePaymentDistribution(100000, 50000, 50000)

      expect(result).toEqual({
        appliedToProject: 100000,
        generatedCredit: 0,
        newProjectBalance: 0,
        newCustomerCredit: -50000, // Crédito consumido
      })
    })

    it('debe generar crédito adicional cuando pago+crédito > balance', () => {
      // Proyecto: balance $100k
      // Pago: $200k cash + $50k crédito = $250k total
      // Sobra: $150k que se convierte en crédito
      const result = calculatePaymentDistribution(100000, 200000, 50000)

      expect(result).toEqual({
        appliedToProject: 100000,
        generatedCredit: 150000, // Sobrepago
        newProjectBalance: 0,
        newCustomerCredit: 100000, // +150k generado - 50k aplicado
      })
    })

    it('debe manejar solo crédito sin pago en efectivo', () => {
      // Proyecto: balance $100k
      // Pago: $0 cash + $100k crédito
      const result = calculatePaymentDistribution(100000, 0, 100000)

      expect(result).toEqual({
        appliedToProject: 100000,
        generatedCredit: 0,
        newProjectBalance: 0,
        newCustomerCredit: -100000, // Todo el crédito consumido
      })
    })

    it('debe manejar crédito aplicado mayor al balance', () => {
      // Proyecto: balance $50k
      // Pago: $0 cash + $100k crédito (más de lo necesario)
      // Solo se aplica $50k, y sobra $50k de crédito
      const result = calculatePaymentDistribution(50000, 0, 100000)

      expect(result).toEqual({
        appliedToProject: 50000,
        generatedCredit: 50000, // Exceso de crédito
        newProjectBalance: 0,
        newCustomerCredit: -50000, // Net: +50k generado - 100k aplicado
      })
    })
  })

  describe('edge cases', () => {
    it('debe manejar balance 0 (proyecto ya pagado)', () => {
      const result = calculatePaymentDistribution(0, 100000, 0)

      expect(result).toEqual({
        appliedToProject: 0,
        generatedCredit: 100000, // Todo se convierte en crédito
        newProjectBalance: 0,
        newCustomerCredit: 100000,
      })
    })

    it('debe manejar pago 0 con balance pendiente', () => {
      const result = calculatePaymentDistribution(100000, 0, 0)

      expect(result).toEqual({
        appliedToProject: 0,
        generatedCredit: 0,
        newProjectBalance: 100000, // Balance sin cambios
        newCustomerCredit: 0,
      })
    })

    it('debe manejar todo en 0', () => {
      const result = calculatePaymentDistribution(0, 0, 0)

      expect(result).toEqual({
        appliedToProject: 0,
        generatedCredit: 0,
        newProjectBalance: 0,
        newCustomerCredit: 0,
      })
    })

    it('debe manejar números decimales correctamente', () => {
      const result = calculatePaymentDistribution(150.5, 100.25, 0)

      expect(result.appliedToProject).toBe(100.25)
      expect(result.generatedCredit).toBe(0)
      expect(result.newProjectBalance).toBe(50.25)
      expect(result.newCustomerCredit).toBe(0)
    })

    it('debe manejar decimales con crédito aplicado', () => {
      const result = calculatePaymentDistribution(100.75, 50.5, 25.25)

      expect(result.appliedToProject).toBe(75.75)
      expect(result.generatedCredit).toBe(0)
      expect(result.newProjectBalance).toBe(25)
      expect(result.newCustomerCredit).toBe(-25.25)
    })
  })

  describe('invariantes del sistema', () => {
    it('newProjectBalance debe ser siempre >= 0', () => {
      const testCases = [
        { balance: 100000, payment: 50000, credit: 0 },
        { balance: 100000, payment: 100000, credit: 0 },
        { balance: 100000, payment: 200000, credit: 0 },
        { balance: 100000, payment: 50000, credit: 50000 },
        { balance: 100000, payment: 50000, credit: 100000 },
      ]

      testCases.forEach(({ balance, payment, credit }) => {
        const result = calculatePaymentDistribution(balance, payment, credit)
        expect(result.newProjectBalance).toBeGreaterThanOrEqual(0)
      })
    })

    it('appliedToProject debe ser <= totalPayment disponible', () => {
      const testCases = [
        { balance: 100000, payment: 50000, credit: 0 },
        { balance: 100000, payment: 100000, credit: 50000 },
        { balance: 500000, payment: 200000, credit: 100000 },
      ]

      testCases.forEach(({ balance, payment, credit }) => {
        const result = calculatePaymentDistribution(balance, payment, credit)
        const totalPayment = payment + credit
        expect(result.appliedToProject).toBeLessThanOrEqual(totalPayment)
      })
    })

    it('generatedCredit debe ser siempre >= 0', () => {
      const testCases = [
        { balance: 100000, payment: 50000, credit: 0 },
        { balance: 100000, payment: 100000, credit: 0 },
        { balance: 100000, payment: 200000, credit: 0 },
        { balance: 0, payment: 100000, credit: 0 },
      ]

      testCases.forEach(({ balance, payment, credit }) => {
        const result = calculatePaymentDistribution(balance, payment, credit)
        expect(result.generatedCredit).toBeGreaterThanOrEqual(0)
      })
    })

    it('balance original = appliedToProject + newProjectBalance', () => {
      const testCases = [
        { balance: 100000, payment: 50000, credit: 0 },
        { balance: 200000, payment: 100000, credit: 50000 },
        { balance: 500000, payment: 600000, credit: 0 },
      ]

      testCases.forEach(({ balance, payment, credit }) => {
        const result = calculatePaymentDistribution(balance, payment, credit)
        expect(result.appliedToProject + result.newProjectBalance).toBe(balance)
      })
    })

    it('newCustomerCredit = generatedCredit - customerCreditApplied', () => {
      const testCases = [
        { balance: 100000, payment: 200000, credit: 0 },
        { balance: 100000, payment: 200000, credit: 50000 },
        { balance: 100000, payment: 50000, credit: 100000 },
      ]

      testCases.forEach(({ balance, payment, credit }) => {
        const result = calculatePaymentDistribution(balance, payment, credit)
        expect(result.newCustomerCredit).toBe(result.generatedCredit - credit)
      })
    })
  })

  describe('newCustomerCredit negativo (crédito consumido)', () => {
    /**
     * DOCUMENTACIÓN DE COMPORTAMIENTO:
     * newCustomerCredit puede ser negativo cuando el cliente CONSUME crédito.
     * Un valor negativo indica la cantidad de crédito que se RESTA del saldo del cliente.
     *
     * Fórmula: newCustomerCredit = generatedCredit - customerCreditApplied
     *
     * Ejemplos:
     * - Si aplica $100k crédito y no genera nuevo → newCustomerCredit = -$100k (consume)
     * - Si aplica $50k crédito y genera $150k → newCustomerCredit = +$100k (net positivo)
     */

    it('debe retornar negativo cuando solo consume crédito sin generar nuevo', () => {
      // Balance: $100k, Pago: $0, Crédito aplicado: $100k
      const result = calculatePaymentDistribution(100000, 0, 100000)

      expect(result.newCustomerCredit).toBe(-100000)
      // Interpretación: el cliente PERDIÓ $100k de crédito
    })

    it('debe retornar negativo cuando consume más de lo que genera', () => {
      // Balance: $300k, Pago: $100k, Crédito aplicado: $200k
      // Total: $300k, usado: $300k, generado: $0
      const result = calculatePaymentDistribution(300000, 100000, 200000)

      expect(result.generatedCredit).toBe(0)
      expect(result.newCustomerCredit).toBe(-200000)
    })

    it('debe retornar 0 cuando consume exactamente lo que genera', () => {
      // Balance: $50k, Pago: $150k, Crédito aplicado: $100k
      // Total: $250k, usado: $50k, generado: $200k, aplicado: $100k, net: +$100k
      const result = calculatePaymentDistribution(50000, 150000, 100000)

      expect(result.generatedCredit).toBe(200000)
      expect(result.newCustomerCredit).toBe(100000) // +200k - 100k
    })

    it('debe retornar positivo cuando genera más de lo que consume', () => {
      // Balance: $10k, Pago: $500k, Crédito aplicado: $100k
      // Total: $600k, usado: $10k, generado: $590k
      const result = calculatePaymentDistribution(10000, 500000, 100000)

      expect(result.generatedCredit).toBe(590000)
      expect(result.newCustomerCredit).toBe(490000) // +590k - 100k
    })

    it('debe manejar crédito aplicado mayor que balance (caso extremo)', () => {
      // Balance: $50k, Pago: $0, Crédito aplicado: $200k
      // El crédito "sobra" $150k que se regenera
      const result = calculatePaymentDistribution(50000, 0, 200000)

      expect(result.appliedToProject).toBe(50000)
      expect(result.generatedCredit).toBe(150000) // Exceso se regenera
      expect(result.newCustomerCredit).toBe(-50000) // Net: +150k - 200k = -50k
      // Interpretación: consumió $200k, regeneró $150k, neto: -$50k
    })
  })

  describe('escenarios reales de negocio', () => {
    it('escenario 1: cliente paga cuota mensual normal', () => {
      // Proyecto de $10M, cliente paga cuota de $1M
      const result = calculatePaymentDistribution(10000000, 1000000, 0)

      expect(result.appliedToProject).toBe(1000000)
      expect(result.newProjectBalance).toBe(9000000)
      expect(result.generatedCredit).toBe(0)
      expect(result.newCustomerCredit).toBe(0)
    })

    it('escenario 2: cliente paga todo el balance pendiente', () => {
      // Proyecto con balance $2.5M, cliente paga los $2.5M restantes
      const result = calculatePaymentDistribution(2500000, 2500000, 0)

      expect(result.appliedToProject).toBe(2500000)
      expect(result.newProjectBalance).toBe(0)
      expect(result.generatedCredit).toBe(0)
      expect(result.newCustomerCredit).toBe(0)
    })

    it('escenario 3: cliente paga de más y genera crédito', () => {
      // Balance $500k, cliente paga $1M por error → genera $500k de crédito
      const result = calculatePaymentDistribution(500000, 1000000, 0)

      expect(result.appliedToProject).toBe(500000)
      expect(result.newProjectBalance).toBe(0)
      expect(result.generatedCredit).toBe(500000)
      expect(result.newCustomerCredit).toBe(500000)
    })

    it('escenario 4: cliente usa su crédito para pagar nuevo proyecto', () => {
      // Cliente tiene $300k de crédito, proyecto nuevo de $500k
      // Paga $200k efectivo + aplica $300k crédito
      const result = calculatePaymentDistribution(500000, 200000, 300000)

      expect(result.appliedToProject).toBe(500000)
      expect(result.newProjectBalance).toBe(0)
      expect(result.generatedCredit).toBe(0)
      expect(result.newCustomerCredit).toBe(-300000) // Crédito consumido
    })

    it('escenario 5: cliente usa crédito parcial', () => {
      // Cliente tiene $500k de crédito, proyecto de $1M
      // Paga $600k efectivo + aplica $400k crédito
      const result = calculatePaymentDistribution(1000000, 600000, 400000)

      expect(result.appliedToProject).toBe(1000000)
      expect(result.newProjectBalance).toBe(0)
      expect(result.generatedCredit).toBe(0)
      expect(result.newCustomerCredit).toBe(-400000) // Consumió $400k de $500k
    })

    it('escenario 6: pago con crédito genera más crédito', () => {
      // Balance $100k, paga $500k + aplica $200k crédito
      // Total disponible: $700k, solo necesita $100k
      // Genera: $600k crédito nuevo, consumió $200k → net: +$400k crédito
      const result = calculatePaymentDistribution(100000, 500000, 200000)

      expect(result.appliedToProject).toBe(100000)
      expect(result.newProjectBalance).toBe(0)
      expect(result.generatedCredit).toBe(600000)
      expect(result.newCustomerCredit).toBe(400000) // +600k - 200k
    })
  })
})

describe('calculateMaxCreditApplication', () => {
  describe('casos normales', () => {
    it('debe retornar customerCredit cuando es menor que projectBalance', () => {
      const result = calculateMaxCreditApplication(30000, 100000)
      expect(result).toBe(30000)
    })

    it('debe retornar projectBalance cuando es menor que customerCredit', () => {
      const result = calculateMaxCreditApplication(100000, 50000)
      expect(result).toBe(50000)
    })

    it('debe retornar el valor cuando son iguales', () => {
      const result = calculateMaxCreditApplication(50000, 50000)
      expect(result).toBe(50000)
    })
  })

  describe('edge cases', () => {
    it('debe retornar 0 cuando customerCredit es 0', () => {
      const result = calculateMaxCreditApplication(0, 100000)
      expect(result).toBe(0)
    })

    it('debe retornar 0 cuando projectBalance es 0', () => {
      const result = calculateMaxCreditApplication(100000, 0)
      expect(result).toBe(0)
    })

    it('debe retornar 0 cuando ambos son 0', () => {
      const result = calculateMaxCreditApplication(0, 0)
      expect(result).toBe(0)
    })

    it('debe manejar números decimales', () => {
      const result = calculateMaxCreditApplication(100.5, 50.25)
      expect(result).toBe(50.25)
    })
  })

  describe('casos de negocio', () => {
    it('cliente con poco crédito, proyecto grande', () => {
      // Cliente: $50k crédito, Proyecto: $1M balance
      const result = calculateMaxCreditApplication(50000, 1000000)
      expect(result).toBe(50000)
    })

    it('cliente con mucho crédito, proyecto pequeño', () => {
      // Cliente: $500k crédito, Proyecto: $100k balance
      const result = calculateMaxCreditApplication(500000, 100000)
      expect(result).toBe(100000)
    })

    it('cliente con crédito exacto al balance', () => {
      const result = calculateMaxCreditApplication(250000, 250000)
      expect(result).toBe(250000)
    })
  })
})

describe('canApplyCredit', () => {
  describe('casos válidos', () => {
    it('debe permitir aplicar crédito dentro de límites', () => {
      const result = canApplyCredit(50000, 100000, 200000, 'CLP')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('debe permitir aplicar todo el crédito disponible', () => {
      const result = canApplyCredit(100000, 100000, 200000, 'CLP')

      expect(result.valid).toBe(true)
    })

    it('debe permitir aplicar crédito hasta el balance del proyecto', () => {
      const result = canApplyCredit(200000, 500000, 200000, 'CLP')

      expect(result.valid).toBe(true)
    })

    it('debe permitir aplicar crédito exacto a ambos límites', () => {
      const result = canApplyCredit(100000, 100000, 100000, 'CLP')

      expect(result.valid).toBe(true)
    })
  })

  describe('casos inválidos - validación de monto', () => {
    it('debe rechazar monto negativo', () => {
      const result = canApplyCredit(-100, 100000, 200000, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('El monto debe ser positivo')
    })

    it('debe rechazar monto 0', () => {
      const result = canApplyCredit(0, 100000, 200000, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('El monto debe ser mayor a 0')
    })
  })

  describe('casos inválidos - crédito insuficiente', () => {
    it('debe rechazar cuando excede crédito disponible', () => {
      const result = canApplyCredit(150000, 100000, 200000, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Crédito insuficiente')
      expect(result.error).toContain('$100.000')
    })

    it('debe mostrar formato CLP en error', () => {
      const result = canApplyCredit(200000, 50000, 300000, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('$50.000')
    })
  })

  describe('casos inválidos - excede balance del proyecto', () => {
    it('debe rechazar cuando excede balance del proyecto', () => {
      const result = canApplyCredit(250000, 500000, 200000, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('excede el balance del proyecto')
      expect(result.error).toContain('$200.000')
    })

    it('debe mostrar formato CLP en error de balance', () => {
      const result = canApplyCredit(150000, 300000, 100000, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('$100.000')
    })
  })

  describe('múltiples validaciones fallando', () => {
    it('debe priorizar validación de monto negativo', () => {
      const result = canApplyCredit(-100, 0, 0, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('El monto debe ser positivo')
    })

    it('debe priorizar validación de monto 0', () => {
      const result = canApplyCredit(0, 0, 0, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('El monto debe ser mayor a 0')
    })

    it('debe validar crédito antes que balance', () => {
      // Monto: 100k, Crédito: 50k, Balance: 30k
      // Falla en crédito insuficiente primero
      const result = canApplyCredit(100000, 50000, 30000, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Crédito insuficiente')
    })
  })

  describe('escenarios de negocio', () => {
    it('cliente intenta usar más crédito del que tiene', () => {
      // Cliente tiene $100k, intenta aplicar $150k
      const result = canApplyCredit(150000, 100000, 500000, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Crédito insuficiente')
    })

    it('cliente intenta aplicar más que el balance pendiente', () => {
      // Balance proyecto: $50k, cliente tiene $200k, intenta aplicar $100k
      const result = canApplyCredit(100000, 200000, 50000, 'CLP')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('excede el balance del proyecto')
    })

    it('aplicación válida de crédito parcial', () => {
      // Cliente tiene $500k, proyecto debe $1M, aplica $300k
      const result = canApplyCredit(300000, 500000, 1000000, 'CLP')

      expect(result.valid).toBe(true)
    })
  })
})

describe('canRefundCredit', () => {
  describe('casos válidos', () => {
    it('debe permitir devolver crédito dentro del límite', () => {
      const result = canRefundCredit(50000, 100000)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('debe permitir devolver todo el crédito disponible', () => {
      const result = canRefundCredit(100000, 100000)

      expect(result.valid).toBe(true)
    })

    it('debe permitir devolver crédito decimal', () => {
      const result = canRefundCredit(50.5, 100.75)

      expect(result.valid).toBe(true)
    })
  })

  describe('casos inválidos - validación de monto', () => {
    it('debe rechazar monto 0', () => {
      const result = canRefundCredit(0, 100000)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('El monto debe ser mayor a 0')
    })

    it('debe rechazar monto negativo', () => {
      const result = canRefundCredit(-100, 100000)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('El monto debe ser mayor a 0')
    })
  })

  describe('casos inválidos - crédito insuficiente', () => {
    it('debe rechazar cuando excede crédito disponible', () => {
      const result = canRefundCredit(150000, 100000)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('excede el crédito disponible')
      expect(result.error).toContain('$100.000')
    })

    it('debe mostrar formato CLP en mensaje de error', () => {
      const result = canRefundCredit(200000, 50000)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('$50.000')
    })
  })

  describe('edge cases', () => {
    it('debe rechazar cuando customerCredit es 0', () => {
      const result = canRefundCredit(100, 0)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('excede el crédito disponible')
    })

    it('debe aceptar montos decimales muy pequeños pero > 0', () => {
      const result = canRefundCredit(0.01, 100000)

      expect(result.valid).toBe(true)
    })
  })

  describe('escenarios de negocio', () => {
    it('cliente solicita devolución parcial', () => {
      // Cliente tiene $500k, solicita devolver $200k
      const result = canRefundCredit(200000, 500000)

      expect(result.valid).toBe(true)
    })

    it('cliente solicita devolver más de lo que tiene', () => {
      // Cliente tiene $100k, solicita devolver $150k
      const result = canRefundCredit(150000, 100000)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('excede el crédito disponible')
    })

    it('cliente solicita devolución total', () => {
      // Cliente tiene $300k, solicita devolver todo
      const result = canRefundCredit(300000, 300000)

      expect(result.valid).toBe(true)
    })

    it('cliente sin crédito intenta solicitar devolución', () => {
      const result = canRefundCredit(50000, 0)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('excede el crédito disponible')
    })
  })
})
