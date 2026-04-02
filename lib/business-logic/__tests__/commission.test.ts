/**
 * Tests para lib/business-logic/commission.ts
 *
 * Valida:
 * - findApplicableTier()
 * - calculateCommission()
 * - computePaymentCommission()
 * - distributeNetToInstallments()
 */

import { describe, it, expect } from 'vitest'
import {
  findApplicableTier,
  calculateCommission,
  computePaymentCommission,
  distributeNetToInstallments,
  type CommissionTierData,
} from '../commission'

// ============================================================================
// findApplicableTier
// ============================================================================

describe('findApplicableTier', () => {
  const baseTier: CommissionTierData = {
    minInstallments: null,
    maxInstallments: null,
    percentageFee: 2.95,
    fixedFee: 0,
  }

  const tier4to6: CommissionTierData = {
    minInstallments: 4,
    maxInstallments: 6,
    percentageFee: 5,
    fixedFee: 0,
  }

  const tier7to12: CommissionTierData = {
    minInstallments: 7,
    maxInstallments: 12,
    percentageFee: 8,
    fixedFee: 0,
  }

  const allTiers = [baseTier, tier4to6, tier7to12]

  it('debe retornar null si no hay tiers', () => {
    expect(findApplicableTier([], null)).toBeNull()
    expect(findApplicableTier([], 3)).toBeNull()
  })

  it('debe retornar tier base para contado (null)', () => {
    const result = findApplicableTier(allTiers, null)
    expect(result).toBe(baseTier)
  })

  it('debe retornar tier base para 1 cuota', () => {
    const result = findApplicableTier(allTiers, 1)
    expect(result).toBe(baseTier)
  })

  it('debe retornar tier base como fallback si no hay tramo específico', () => {
    // 3 cuotas no tiene tramo específico → usa base
    const result = findApplicableTier(allTiers, 3)
    expect(result).toBe(baseTier)
  })

  it('debe retornar tramo específico para 5 cuotas (rango 4-6)', () => {
    const result = findApplicableTier(allTiers, 5)
    expect(result).toBe(tier4to6)
  })

  it('debe retornar tramo específico para 4 cuotas (límite inferior)', () => {
    const result = findApplicableTier(allTiers, 4)
    expect(result).toBe(tier4to6)
  })

  it('debe retornar tramo específico para 6 cuotas (límite superior)', () => {
    const result = findApplicableTier(allTiers, 6)
    expect(result).toBe(tier4to6)
  })

  it('debe retornar tramo 7-12 para 10 cuotas', () => {
    const result = findApplicableTier(allTiers, 10)
    expect(result).toBe(tier7to12)
  })

  it('debe retornar null si solo hay tramos y no hay base ni tramo aplicable', () => {
    const onlyRanged = [tier4to6, tier7to12]
    const result = findApplicableTier(onlyRanged, 1)
    expect(result).toBeNull()
  })
})

// ============================================================================
// calculateCommission
// ============================================================================

describe('calculateCommission', () => {
  it('debe retornar comisión 0 si tier es null', () => {
    const result = calculateCommission(100000, null)
    expect(result.commissionAmount).toBe(0)
    expect(result.netAmount).toBe(100000)
    expect(result.percentageFee).toBe(0)
    expect(result.fixedFee).toBe(0)
  })

  it('debe calcular comisión porcentual (Transbank 2.95%)', () => {
    const tier: CommissionTierData = {
      minInstallments: null,
      maxInstallments: null,
      percentageFee: 2.95,
      fixedFee: 0,
    }

    const result = calculateCommission(100000, tier)
    expect(result.commissionAmount).toBe(2950)
    expect(result.netAmount).toBe(97050)
    expect(result.percentageFee).toBe(2.95)
    expect(result.fixedFee).toBe(0)
  })

  it('debe calcular comisión mixta (% + fijo)', () => {
    const tier: CommissionTierData = {
      minInstallments: null,
      maxInstallments: null,
      percentageFee: 3.49,
      fixedFee: 350,
    }

    const result = calculateCommission(100000, tier)
    // 350 + (100000 * 3.49 / 100) = 350 + 3490 = 3840
    expect(result.commissionAmount).toBe(3840)
    expect(result.netAmount).toBe(96160)
  })

  it('debe calcular comisión solo fija', () => {
    const tier: CommissionTierData = {
      minInstallments: null,
      maxInstallments: null,
      percentageFee: 0,
      fixedFee: 500,
    }

    const result = calculateCommission(50000, tier)
    expect(result.commissionAmount).toBe(500)
    expect(result.netAmount).toBe(49500)
  })

  it('debe redondear comisión al entero más cercano', () => {
    const tier: CommissionTierData = {
      minInstallments: null,
      maxInstallments: null,
      percentageFee: 1.2,
      fixedFee: 0,
    }

    // 33333 * 1.2 / 100 = 399.996 → round → 400
    const result = calculateCommission(33333, tier)
    expect(result.commissionAmount).toBe(400)
    expect(result.netAmount).toBe(32933)
  })
})

// ============================================================================
// computePaymentCommission
// ============================================================================

describe('computePaymentCommission', () => {
  const tiers: CommissionTierData[] = [
    { minInstallments: null, maxInstallments: null, percentageFee: 2.95, fixedFee: 0 },
    { minInstallments: 4, maxInstallments: 6, percentageFee: 5, fixedFee: 0 },
    { minInstallments: 7, maxInstallments: 12, percentageFee: 8, fixedFee: 0 },
  ]

  it('debe retornar null si no hay tiers', () => {
    expect(computePaymentCommission(100000, [], null)).toBeNull()
  })

  it('debe usar tier base para contado', () => {
    const result = computePaymentCommission(100000, tiers, null)
    expect(result).not.toBeNull()
    expect(result!.commissionAmount).toBe(2950)
  })

  it('debe usar tier base para 3 cuotas (sin tramo específico)', () => {
    const result = computePaymentCommission(100000, tiers, 3)
    expect(result).not.toBeNull()
    expect(result!.percentageFee).toBe(2.95)
  })

  it('debe usar tramo 4-6 para 5 cuotas', () => {
    const result = computePaymentCommission(100000, tiers, 5)
    expect(result).not.toBeNull()
    expect(result!.commissionAmount).toBe(5000)
    expect(result!.percentageFee).toBe(5)
  })

  it('debe usar tramo 7-12 para 10 cuotas', () => {
    const result = computePaymentCommission(100000, tiers, 10)
    expect(result).not.toBeNull()
    expect(result!.commissionAmount).toBe(8000)
    expect(result!.percentageFee).toBe(8)
  })
})

// ============================================================================
// distributeNetToInstallments
// ============================================================================

describe('distributeNetToInstallments', () => {
  it('debe retornar array vacío si no hay cuotas', () => {
    expect(distributeNetToInstallments([], 0)).toEqual([])
  })

  it('debe retornar neto total para 1 cuota', () => {
    expect(distributeNetToInstallments([100000], 97000)).toEqual([97000])
  })

  it('debe distribuir proporcionalmente entre cuotas iguales', () => {
    // 3 cuotas de ~33333, neto 97000
    const result = distributeNetToInstallments([33334, 33333, 33333], 97000)

    expect(result).toHaveLength(3)
    // Suma debe ser exacta
    const sum = result.reduce((s, v) => s + v, 0)
    expect(sum).toBe(97000)
  })

  it('debe garantizar que la suma del neto sea exacta', () => {
    // Caso con centavos difíciles
    const installments = [33334, 33333, 33333]
    const netTotal = 97050

    const result = distributeNetToInstallments(installments, netTotal)
    const sum = result.reduce((s, v) => s + v, 0)
    expect(sum).toBe(netTotal)
  })

  it('debe manejar cuotas desiguales proporcionalmente', () => {
    // Primera cuota más grande
    const installments = [50000, 25000, 25000]
    const netTotal = 97000

    const result = distributeNetToInstallments(installments, netTotal)

    // La primera cuota (50%) debería tener ~48500 neto
    expect(result[0]).toBeGreaterThan(result[1])
    // Suma exacta
    expect(result.reduce((s, v) => s + v, 0)).toBe(97000)
  })

  it('debe manejar monto 0', () => {
    const result = distributeNetToInstallments([0, 0, 0], 0)
    expect(result).toEqual([0, 0, 0])
  })
})
