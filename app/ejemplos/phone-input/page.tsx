'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'

export default function PhoneInputExamplePage() {
  const [phoneDefault, setPhoneDefault] = useState('')
  const [phoneChile, setPhoneChile] = useState('')
  const [phoneValidation, setPhoneValidation] = useState('')

  return (
    <AppLayout
      pageTitle="Phone Input - Ejemplos"
      pageDescription="Componente de entrada de teléfono con validación y formato internacional"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/ejemplos' },
        { label: 'Phone Input' },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Ejemplo 1: Default (lee del contexto) */}
        <Card>
          <CardHeader>
            <CardTitle>Default (desde configuración)</CardTitle>
            <CardDescription>
              Lee el país por defecto del contexto de configuración global (
              <code>useConfiguration</code>)
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
            <CardTitle>Chile Explícito (CL)</CardTitle>
            <CardDescription>
              Override manual del país con prop <code>defaultCountry="CL"</code>
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
            <CardTitle>Con Validación Visual</CardTitle>
            <CardDescription>
              Muestra ícono de validación en tiempo real con <code>showValidationIcon</code>
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
      </div>

      {/* Características */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Características</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-2 text-sm">
            <li>
              <strong>Centralizado:</strong> Lee el país por defecto de{' '}
              <code>useConfiguration()</code>
            </li>
            <li>
              <strong>Validación visual (opcional):</strong> Muestra ✓ verde o ✗ rojo en tiempo real
              con <code>showValidationIcon</code>
            </li>
            <li>
              <strong>Enfocado en Chile:</strong> Optimizado para apps chilenas (código +56)
            </li>
            <li>
              <strong>Sin selector internacional:</strong> Campo simple sin complejidad innecesaria
            </li>
            <li>
              <strong>Ligero:</strong> Sin flags (~20KB vs ~70KB con selector completo)
            </li>
            <li>
              <strong>Validación automática:</strong> Formatea y valida números chilenos
            </li>
            <li>
              <strong>Consistente:</strong> API igual a RutInput y CurrencyInput
            </li>
            <li>
              <strong>Formato E.164:</strong> Retorna número en formato estándar internacional (ej:{' '}
              +56912345678)
            </li>
            <li>
              <strong>Accesible:</strong> Usa <code>aria-invalid</code> para screen readers
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Uso */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            {`import { PhoneInput } from '@/components/ui/phone-input'

function MyForm() {
  const [phone, setPhone] = useState('')

  return (
    <PhoneInput
      value={phone}
      onChange={setPhone}
      showValidationIcon      // Opcional: muestra ✓ o ✗
      defaultCountry="CL"     // Opcional: lee de configuración si se omite
    />
  )
}

// Con React Hook Form
<FormField
  control={form.control}
  name="phone"
  render={({ field }) => (
    <PhoneInput {...field} showValidationIcon />
  )}
/>`}
          </pre>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
