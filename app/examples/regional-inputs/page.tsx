'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { Settings, ArrowRight, CheckCircle2 } from 'lucide-react'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'

import { PhoneInput } from '@/components/ui/phone-input'
import { RutInput } from '@/components/ui/rut-input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { rutSchema, rutSchemaOptional, rutHelpers } from '@/lib/rut-validations'
import { useConfiguration } from '@/hooks/use-configuration'

// Schema para formulario de RUT
const rutFormSchema = z.object({
  rutObligatorio: rutSchema,
  rutOpcional: rutSchemaOptional,
  rutSinFormateo: rutSchema,
})

type RutFormValues = z.infer<typeof rutFormSchema>

export default function RegionalInputsPage() {
  // ========================================
  // PHONE INPUT STATES
  // ========================================
  const [phoneDefault, setPhoneDefault] = useState('')
  const [phoneChile, setPhoneChile] = useState('')
  const [phoneValidation, setPhoneValidation] = useState('')
  const [phoneNoPrefix, setPhoneNoPrefix] = useState('')
  const [phoneNoAutoAdd, setPhoneNoAutoAdd] = useState('')

  // ========================================
  // RUT INPUT STATES
  // ========================================
  const [standaloneRut, setStandaloneRut] = useState('')
  const [_rutWithIcon, setRutWithIcon] = useState('')
  const [_rutNoFormat, setRutNoFormat] = useState('')
  const [submittedRutData, setSubmittedRutData] = useState<RutFormValues | null>(null)

  const rutForm = useForm<RutFormValues>({
    resolver: zodResolver(rutFormSchema),
    defaultValues: {
      rutObligatorio: '',
      rutOpcional: '',
      rutSinFormateo: '',
    },
  })

  function onRutSubmit(data: RutFormValues) {
    console.log('RUT Form submitted:', data)
    setSubmittedRutData(data)
  }

  // ========================================
  // CURRENCY INPUT STATES
  // ========================================
  const [basicValue, setBasicValue] = useState<number>(1234.56)
  const [currency, setCurrency] = useState<string>('EUR')
  const [priceValue, setPriceValue] = useState<number>(99.99)
  const [budgetValue, setBudgetValue] = useState<number>(5000)
  const [clpValue, setClpValue] = useState<number>(1234567)

  // Currency + Configuration
  const { configuration } = useConfiguration()
  const [precio, setPrecio] = useState(125000)
  const [precioOverride, setPrecioOverride] = useState(1500.5)

  // Helper para formatear valores monetarios con consistencia
  const formatCurrency = (value: number, currencyCode: string = 'EUR') => {
    const currenciesWithoutDecimals = ['CLP', 'JPY', 'KRW']
    const useDecimals = !currenciesWithoutDecimals.includes(currencyCode)
    const locale = currencyCode === 'CLP' ? 'es-CL' : 'es-ES'

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: useDecimals ? 2 : 0,
      maximumFractionDigits: useDecimals ? 2 : 0,
    })

    if (value >= 1000 && value < 10000) {
      const formatted = formatter.format(value)
      const match = formatted.match(/^(\D*)(\d+)(,\d+)?(\D*)$/)
      if (match) {
        const [, prefix, integer, decimal = '', suffix] = match
        const withThousandsSep = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        return `${prefix}${withThousandsSep}${decimal}${suffix}`
      }
    }

    return formatter.format(value)
  }

  return (
    <AppLayout
      pageTitle="Regional Inputs"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/examples' },
        { label: 'Regional Inputs' },
      ]}
    >
      <div className="space-y-12">
        {/* ========================================
            HERO SECTION
        ======================================== */}
        <Card>
          <CardHeader>
            <CardTitle>Inputs Regionales de Chile</CardTitle>
            <CardDescription>
              Componentes especializados para datos regionales chilenos con validación y formateo
              automático
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">📞 Phone Input</h3>
                <p className="text-xs text-muted-foreground">
                  Formato E.164 (+56), validación de 9 dígitos, acepta celular/fijo
                </p>
                <a href="#phone-input" className="text-xs text-primary hover:underline">
                  Ver ejemplos →
                </a>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">🆔 RUT Input</h3>
                <p className="text-xs text-muted-foreground">
                  Formateo automático, validación de dígito verificador, schemas Zod
                </p>
                <a href="#rut-input" className="text-xs text-primary hover:underline">
                  Ver ejemplos →
                </a>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">💰 Currency Input</h3>
                <p className="text-xs text-muted-foreground">
                  Múltiples monedas, formateo Intl.NumberFormat, validación min/max
                </p>
                <a href="#currency-input" className="text-xs text-primary hover:underline">
                  Ver ejemplos →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========================================
            PHONE INPUT SECTION
        ======================================== */}
        <section id="phone-input" className="scroll-mt-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">📞 Phone Input</h2>
            <p className="text-muted-foreground">
              Componente especializado para números telefónicos chilenos con formato E.164
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {/* Ejemplo 1: Default */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Default (desde configuración)</CardTitle>
                <CardDescription className="text-sm">
                  Lee el país por defecto del contexto de configuración global
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-default">Teléfono</Label>
                  <PhoneInput
                    id="phone-default"
                    value={phoneDefault}
                    onChange={setPhoneDefault}
                    placeholder="Ingrese su número"
                  />
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm">
                    <strong>Valor:</strong> <code>{phoneDefault || '(vacío)'}</code>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Formato E.164 estándar internacional
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ejemplo 2: Chile explícito */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chile Explícito (CL)</CardTitle>
                <CardDescription className="text-sm">
                  Override manual con prop defaultCountry="CL"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-chile">Teléfono (Chile)</Label>
                  <PhoneInput
                    id="phone-chile"
                    value={phoneChile}
                    onChange={setPhoneChile}
                    defaultCountry="CL"
                  />
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm">
                    <strong>Valor:</strong> <code>{phoneChile || '(vacío)'}</code>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">Código de país: +56 (Chile)</p>
                </div>
              </CardContent>
            </Card>

            {/* Ejemplo 3: Con validación visual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Con Validación Visual</CardTitle>
                <CardDescription className="text-sm">
                  Muestra ícono de validación en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-validation">Teléfono</Label>
                  <PhoneInput
                    id="phone-validation"
                    value={phoneValidation}
                    onChange={setPhoneValidation}
                    showValidationIcon
                    placeholder="Ej: +56 9 8765 4321"
                  />
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm">
                    <strong>Valor:</strong> <code>{phoneValidation || '(vacío)'}</code>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    ✓ verde = válido | ✗ rojo = inválido
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ejemplo 4: Sin prefijo visual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sin Prefijo Visual</CardTitle>
                <CardDescription className="text-sm">
                  Ocultar el prefijo +56 (se agrega al value)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-no-prefix">Teléfono</Label>
                  <PhoneInput
                    id="phone-no-prefix"
                    value={phoneNoPrefix}
                    onChange={setPhoneNoPrefix}
                    showCountryPrefix={false}
                    placeholder="9 1234 5678"
                  />
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm">
                    <strong>Valor:</strong> <code>{phoneNoPrefix || '(vacío)'}</code>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    El prefijo +56 se agrega automáticamente al value
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ejemplo 5: Sin auto-add */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sin Auto-Add de Prefijo</CardTitle>
                <CardDescription className="text-sm">
                  Usuario debe escribir el prefijo manualmente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-no-auto">Teléfono</Label>
                  <PhoneInput
                    id="phone-no-auto"
                    value={phoneNoAutoAdd}
                    onChange={setPhoneNoAutoAdd}
                    autoAddPrefix={false}
                    showValidationIcon
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm">
                    <strong>Valor:</strong> <code>{phoneNoAutoAdd || '(vacío)'}</code>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Usuario debe incluir +56 manualmente
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Phone Input Features */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Características PhoneInput</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm md:grid-cols-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Formato E.164 estándar internacional</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Validación: +56 + 9 dígitos exactos</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Acepta celular (9), fijo RM (2), fijo regiones (32-75)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Prefijo visual configurable</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Auto-add de prefijo configurable</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Validación visual opcional (✓/✗)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-12" />

        {/* ========================================
            RUT INPUT SECTION
        ======================================== */}
        <section id="rut-input" className="scroll-mt-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">🆔 RUT Input</h2>
            <p className="text-muted-foreground">
              Componente para RUT chileno con formateo automático (12.345.678-9) y validación de
              dígito verificador
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Ejemplo 1: Uso Standalone Simple */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uso Standalone Simple</CardTitle>
                <CardDescription className="text-sm">
                  Input sin React Hook Form, con formateo automático
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">RUT</Label>
                  <RutInput
                    placeholder="12.345.678-9"
                    onRutChange={setStandaloneRut}
                    className="mt-1.5"
                  />
                  <p className="text-muted-foreground mt-2 text-sm">
                    Valor limpio:{' '}
                    <code className="text-foreground">{standaloneRut || '(vacío)'}</code>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Válido:{' '}
                    <code className="text-foreground">
                      {rutHelpers.validate(standaloneRut) ? '✅ Sí' : '❌ No'}
                    </code>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ejemplo 2: Con Validación Visual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Con Indicador de Validación</CardTitle>
                <CardDescription className="text-sm">
                  Muestra checkmark verde cuando el RUT es válido
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">RUT con validación visual</Label>
                  <RutInput
                    placeholder="Escribe un RUT válido"
                    onRutChange={setRutWithIcon}
                    showValidationIcon
                    className="mt-1.5"
                  />
                  <p className="text-muted-foreground mt-2 text-sm">
                    Intenta: <code className="text-foreground">12345678-9</code> o{' '}
                    <code className="text-foreground">11111111-1</code>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ejemplo 3: Sin Formateo On-Change */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formateo Solo en Blur</CardTitle>
                <CardDescription className="text-sm">
                  Solo formatea cuando pierdes el foco (útil para copy/paste)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">RUT (formatea solo en blur)</Label>
                  <RutInput
                    placeholder="Escribe y haz click fuera"
                    onRutChange={setRutNoFormat}
                    formatOnChange={false}
                    showValidationIcon
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulario Completo con React Hook Form */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Formulario con React Hook Form + Zod</CardTitle>
              <CardDescription>Integración completa con validación de formularios</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...rutForm}>
                <form onSubmit={rutForm.handleSubmit(onRutSubmit)} className="space-y-6">
                  {/* RUT Obligatorio */}
                  <FormField
                    control={rutForm.control}
                    name="rutObligatorio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RUT (obligatorio)</FormLabel>
                        <FormControl>
                          <RutInput
                            value={field.value}
                            onRutChange={field.onChange}
                            showValidationIcon
                            placeholder="12.345.678-9"
                          />
                        </FormControl>
                        <FormDescription>
                          Este campo es obligatorio y debe ser un RUT válido
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* RUT Opcional */}
                  <FormField
                    control={rutForm.control}
                    name="rutOpcional"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RUT Opcional</FormLabel>
                        <FormControl>
                          <RutInput
                            value={field.value}
                            onRutChange={field.onChange}
                            placeholder="(opcional)"
                          />
                        </FormControl>
                        <FormDescription>
                          Este campo es opcional, pero si lo completas debe ser válido
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="submit">Enviar Formulario</Button>
                    <Button type="button" variant="outline" onClick={() => rutForm.reset()}>
                      Limpiar
                    </Button>
                  </div>
                </form>
              </Form>

              {submittedRutData && (
                <Alert className="mt-6">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Formulario enviado:</p>
                    <pre className="text-xs bg-muted p-2 rounded">
                      {JSON.stringify(submittedRutData, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* RUT Features */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Características RutInput</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm md:grid-cols-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Formateo automático: 12.345.678-9</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Validación de dígito verificador</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Schemas Zod: rutSchema, rutSchemaOptional</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Helpers: validate(), format(), clean()</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Validación visual opcional (✓/✗)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Formateo configurable (on-change o on-blur)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-12" />

        {/* ========================================
            CURRENCY INPUT SECTION
        ======================================== */}
        <section id="currency-input" className="scroll-mt-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">💰 Currency Input</h2>
            <p className="text-muted-foreground">
              Componente para entrada de moneda con formateo automático, múltiples monedas y
              validación
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Ejemplo básico */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ejemplo Básico</CardTitle>
                <CardDescription className="text-sm">
                  CurrencyInput con EUR por defecto
                </CardDescription>
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
                <CardTitle className="text-base">Múltiples Monedas</CardTitle>
                <CardDescription className="text-sm">Cambiar moneda dinámicamente</CardDescription>
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
                <CardTitle className="text-base">Con Validación</CardTitle>
                <CardDescription className="text-sm">
                  Precio de producto (min: €0.01, max: €999.99)
                </CardDescription>
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

            {/* Caso de uso: Presupuesto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Caso de Uso: Presupuesto</CardTitle>
                <CardDescription className="text-sm">
                  Formulario de presupuesto mensual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Presupuesto Mensual</Label>
                  <CurrencyInput
                    value={budgetValue}
                    onChange={setBudgetValue}
                    min={0}
                    max={100000}
                  />
                </div>
                <div className="space-y-2 rounded-md bg-muted p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mensual:</span>
                    <span className="font-mono font-semibold">{formatCurrency(budgetValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Anual:</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(budgetValue * 12)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Peso Chileno (CLP) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Peso Chileno (CLP)</CardTitle>
                <CardDescription className="text-sm">
                  Moneda sin decimales, separador de miles con punto
                </CardDescription>
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Currency Features */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Características CurrencyInput</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm md:grid-cols-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Formateo automático con Intl.NumberFormat</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Múltiples monedas: EUR, USD, CLP, JPY, etc.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Manejo automático de monedas sin decimales</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Validación integrada: min/max</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Locale configurable (es-ES, es-CL, en-US)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    ✓
                  </Badge>
                  <span>Sin dependencias extras (API nativa)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-12" />

        {/* ========================================
            CURRENCY + CONFIGURATION SECTION
        ======================================== */}
        <section id="currency-config" className="scroll-mt-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">⚙️ Currency + Configuración Regional</h2>
            <p className="text-muted-foreground">
              Integración de CurrencyInput con el sistema de configuración regional para derivar
              automáticamente moneda y locale
            </p>
          </div>

          {/* Alert de información */}
          <Alert className="mb-6">
            <CheckCircle2 className="size-4" />
            <AlertTitle>Sistema de Configuración Regional</AlertTitle>
            <AlertDescription>
              El CurrencyInput ahora se adapta automáticamente según el país configurado en{' '}
              <Link href="/settings" className="font-medium underline">
                /settings
              </Link>
              . Cambia el país allí y verás cómo se actualiza el formato aquí.
            </AlertDescription>
          </Alert>

          {/* Card con estado actual */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Configuración Actual</CardTitle>
              <CardDescription>
                Valores derivados automáticamente del país seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label className="text-muted-foreground text-xs">País</Label>
                  <p className="font-medium text-sm">{configuration.pais.toUpperCase()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Moneda</Label>
                  <p className="font-medium text-sm">{configuration.currency}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Locale</Label>
                  <p className="font-medium text-sm">{configuration.locale}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Timezone</Label>
                  <p className="font-medium text-sm">{configuration.timezone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Ejemplo 1: Automático desde configuración */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Automático desde Configuración</CardTitle>
                <CardDescription className="text-sm">
                  Sin props de currency/locale → usa contexto global
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Label htmlFor="precio-auto">Precio (automático)</Label>
                  <CurrencyInput
                    id="precio-auto"
                    value={precio}
                    onChange={setPrecio}
                    placeholder="Ingresa un precio"
                  />
                  <p className="text-muted-foreground text-sm">
                    💡 Usa configuración global ({configuration.currency})
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Valor raw: <code className="rounded bg-muted px-1">{precio}</code>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ejemplo 2: Override manual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Override Manual con Props</CardTitle>
                <CardDescription className="text-sm">
                  Props currency="EUR" locale="es-ES" → ignora contexto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Label htmlFor="precio-override">Precio en EUR (override)</Label>
                  <CurrencyInput
                    id="precio-override"
                    value={precioOverride}
                    onChange={setPrecioOverride}
                    currency="EUR"
                    locale="es-ES"
                    placeholder="Precio en euros"
                  />
                  <p className="text-muted-foreground text-sm">
                    💡 Props fijos ignoran configuración global
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Valor raw: <code className="rounded bg-muted px-1">{precioOverride}</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Testing guide */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Prueba el Sistema</CardTitle>
              <CardDescription>
                Sigue estos pasos para ver la configuración en acción
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="ml-4 list-decimal space-y-2 text-sm">
                <li>
                  Observa el formato actual del primer input (
                  {configuration.currency === 'CLP' ? 'sin decimales' : 'con decimales'})
                </li>
                <li>
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1 font-medium underline"
                  >
                    Ve a Configuración
                    <ArrowRight className="size-3" />
                  </Link>
                </li>
                <li>Cambia el país (cuando agregues Argentina, México, etc.)</li>
                <li>Vuelve a esta página</li>
                <li>
                  El primer input ahora debería mostrar el formato de la nueva moneda
                  automáticamente
                </li>
                <li>El segundo input (EUR) no cambia porque tiene props fijos</li>
              </ol>

              <div className="mt-4 flex gap-2">
                <Button asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 size-4" />
                    Ir a Configuración
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Technical details */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Detalles Técnicos</CardTitle>
              <CardDescription>Cómo funciona la integración</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="mb-2 font-semibold">Prioridad de configuración:</h4>
                  <code className="block rounded bg-muted p-2">
                    Props &gt; Context &gt; Defaults (EUR/es-ES)
                  </code>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Context usado:</h4>
                  <code className="block rounded bg-muted p-2">
                    ConfigurationProvider → ConfigurationContext → useConfiguration()
                  </code>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Persistencia:</h4>
                  <code className="block rounded bg-muted p-2">
                    localStorage ('user-configuration') + Context API
                  </code>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Monedas sin decimales:</h4>
                  <code className="block rounded bg-muted p-2">CLP, JPY, KRW</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  )
}
