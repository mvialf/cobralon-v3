import { describe, expect, it } from 'vitest'

import { calculateSalesSubtotalOverlay } from '../dashboard-revenue-chart'

describe('calculateSalesSubtotalOverlay', () => {
  it('calcula el segmento interno proporcional al subtotal dentro de ventas', () => {
    expect(
      calculateSalesSubtotalOverlay({
        x: 10,
        y: 20,
        width: 30,
        height: 100,
        sales: 200,
        salesSubtotal: 150,
      })
    ).toEqual({
      x: 13,
      y: 45,
      width: 24,
      height: 75,
    })
  })

  it('no dibuja segmento interno cuando ventas o subtotal son cero', () => {
    expect(
      calculateSalesSubtotalOverlay({
        x: 10,
        y: 20,
        width: 30,
        height: 100,
        sales: 0,
        salesSubtotal: 150,
      })
    ).toBeNull()

    expect(
      calculateSalesSubtotalOverlay({
        x: 10,
        y: 20,
        width: 30,
        height: 100,
        sales: 200,
        salesSubtotal: 0,
      })
    ).toBeNull()
  })

  it('limita el segmento interno a la altura maxima de ventas si subtotal supera total', () => {
    expect(
      calculateSalesSubtotalOverlay({
        x: 10,
        y: 20,
        width: 30,
        height: 100,
        sales: 200,
        salesSubtotal: 250,
      })
    ).toEqual({
      x: 13,
      y: 20,
      width: 24,
      height: 100,
    })
  })
})
