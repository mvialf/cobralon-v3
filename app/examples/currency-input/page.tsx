'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function CurrencyInputDemoPage() {
  const [basicValue, setBasicValue] = useState<number>(1234.56)
  const [currency, setCurrency] = useState<string>('EUR')
  const [priceValue, setPriceValue] = useState<number>(99.99)
  const [budgetValue, setBudgetValue] = useState<number>(5000)
  const [clpValue, setClpValue] = useState<number>(1234567)

  // Helper para formatear valores monetarios con consistencia
  const formatCurrency = (value: number, currencyCode: string = 'EUR') => {
    // Monedas sin decimales
    const currenciesWithoutDecimals = ['CLP', 'JPY', 'KRW']
    const useDecimals = !currenciesWithoutDecimals.includes(currencyCode)

    // Usar locale apropiado para CLP
    const locale = currencyCode === 'CLP' ? 'es-CL' : 'es-ES'

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: useDecimals ? 2 : 0,
      maximumFractionDigits: useDecimals ? 2 : 0,
    })

    // Intl.NumberFormat solo agrega separador de miles desde 10.000
    // Para números entre 1.000-9.999, forzamos el separador manualmente
    if (value >= 1000 && value < 10000) {
      const formatted = formatter.format(value)
      // Regex: Captura símbolo moneda, dígitos enteros, decimales, y sufijo
      // Ejemplo: "1234,56 €" → grupos: ["", "1234", ",56", " €"]
      const match = formatted.match(/^(\D*)(\d+)(,\d+)?(\D*)$/)
      if (match) {
        const [, prefix, integer, decimal = '', suffix] = match
        // Agregar punto cada 3 dígitos desde la derecha
        const withThousandsSep = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        return `${prefix}${withThousandsSep}${decimal}${suffix}`
      }
    }

    // Para valores < 1000 o >= 10000, usar comportamiento estándar
    return formatter.format(value)
  }

  return (
    <AppLayout
      pageTitle="Currency Input Demo"
      pageDescription="Ejemplos de uso del componente CurrencyInput"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/examples' },
        { label: 'Currency Input' },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ejemplo básico */}
        <Card>
          <CardHeader>
            <CardTitle>Ejemplo Básico</CardTitle>
            <CardDescription>CurrencyInput con EUR por defecto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Monto en Euros</Label>
              <CurrencyInput value={basicValue} onChange={setBasicValue} />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Valor actual:{' '}
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(basicValue)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Múltiples monedas */}
        <Card>
          <CardHeader>
            <CardTitle>Múltiples Monedas</CardTitle>
            <CardDescription>Cambiar moneda dinámicamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="GBP">GBP - Libra</SelectItem>
                  <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
                  <SelectItem value="JPY">JPY - Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <CurrencyInput
                value={basicValue}
                onChange={setBasicValue}
                currency={currency}
                locale={currency === 'CLP' ? 'es-CL' : 'es-ES'}
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                {currency}:{' '}
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(basicValue, currency)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Con validación min/max */}
        <Card>
          <CardHeader>
            <CardTitle>Con Validación</CardTitle>
            <CardDescription>Precio de producto (min: €0.01, max: €999.99)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Precio del Producto</Label>
              <CurrencyInput
                value={priceValue}
                onChange={setPriceValue}
                min={0.01}
                max={999.99}
                placeholder="€0.00"
              />
            </div>
            <div className="space-y-2 rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Límites: €0.01 - €999.99</p>
              <p className="text-sm text-muted-foreground">
                Precio actual:{' '}
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(priceValue)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Caso de uso real: Presupuesto */}
        <Card>
          <CardHeader>
            <CardTitle>Caso de Uso: Presupuesto</CardTitle>
            <CardDescription>Formulario de presupuesto mensual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Presupuesto Mensual</Label>
              <CurrencyInput value={budgetValue} onChange={setBudgetValue} min={0} max={100000} />
            </div>
            <div className="space-y-2 rounded-md bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mensual:</span>
                <span className="font-mono font-semibold">{formatCurrency(budgetValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Anual:</span>
                <span className="font-mono font-semibold">{formatCurrency(budgetValue * 12)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ejemplo específico: Peso Chileno (CLP) */}
        <Card>
          <CardHeader>
            <CardTitle>Peso Chileno (CLP)</CardTitle>
            <CardDescription>Moneda sin decimales, separador de miles con punto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Precio en Pesos Chilenos</Label>
              <CurrencyInput
                value={clpValue}
                onChange={setClpValue}
                currency="CLP"
                locale="es-CL"
                min={0}
              />
            </div>
            <div className="space-y-2 rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                CLP no usa decimales (eliminados desde 1984)
              </p>
              <p className="text-sm text-muted-foreground">
                Valor actual:{' '}
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(clpValue, 'CLP')}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Formato: Separador de miles con punto (.) - Ejemplo: $1.234.567
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información técnica */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Información Técnica</CardTitle>
          <CardDescription>Características del componente CurrencyInput</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>
                <strong>Formateo automático:</strong> El valor se formatea cuando el input pierde el
                foco (blur), permitiendo escribir números sin distracciones
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>
                <strong>Múltiples monedas:</strong> Soporta cualquier código de moneda ISO 4217
                (EUR, USD, GBP, CLP, JPY, etc.). Maneja automáticamente monedas sin decimales (CLP,
                JPY, KRW)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>
                <strong>Validación integrada:</strong> Props <code>min</code> y <code>max</code>{' '}
                para limitar valores permitidos
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>
                <strong>Locale configurable:</strong> Ajusta el formato según el idioma/región
                (es-ES, en-US, etc.)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>
                <strong>Sin dependencias extras:</strong> Usa <code>Intl.NumberFormat</code> nativo
                del navegador
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>
                <strong>Basado en shadcn/ui:</strong> Usa el componente <code>Input</code> base,
                sigue los mismos patrones de estilo
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
